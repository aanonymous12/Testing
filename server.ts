import express, { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import DOMPurify from 'isomorphic-dompurify';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { google } from 'googleapis';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import * as Sentry from '@sentry/node';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] || fallback;
  if (!value && !fallback && !['SENTRY_DSN', 'GMAIL_APP_PASSWORD', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SMTP_HOST'].includes(key)) {
    console.warn(`Warning: Environment variable ${key} is missing.`);
  }
  return (value || '').trim().replace(/^["']|["']$/g, '');
};

const smtpHost = getEnv('SMTP_HOST');
const gmailPass = getEnv('GMAIL_APP_PASSWORD');
const adminEmail = getEnv('ADMIN_EMAIL');

const config = {
  url: getEnv('VITE_APP_URL', 'https://janakpanthi.com'),
  supabase: {
    url: getEnv('VITE_SUPABASE_URL'),
    serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  smtp: {
    host: smtpHost || (gmailPass ? 'smtp.gmail.com' : ''),
    port: parseInt(getEnv('SMTP_PORT', smtpHost ? '587' : '465')),
    secure: getEnv('SMTP_SECURE') === 'true' || (gmailPass && !smtpHost ? true : false),
    auth: {
      user: getEnv('SMTP_USER', adminEmail),
      pass: getEnv('SMTP_PASS', gmailPass),
    },
    from: {
      name: getEnv('SMTP_FROM_NAME', 'Janak Panthi'),
      email: getEnv('SMTP_FROM_EMAIL', adminEmail),
    },
  },
  admin: {
    email: adminEmail,
  },
  google: {
    serviceAccountEmail: getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: getEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    siteUrl: getEnv('GSC_SITE_URL'),
  },
  security: {
    bcryptRounds: 12,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageDomains: ['supabase.co', 'janakpanthi.com'],
    imageTimeout: 5000, // 5 seconds
  },
};

// ============================================
// SENTRY ERROR TRACKING
// ============================================
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 1.0,
  });
}

// ============================================
// SUPABASE CLIENT (SERVICE ROLE)
// ============================================
let supabaseClient: any = null;
const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabase.url || 'https://placeholder.supabase.co', config.supabase.serviceKey || 'placeholder', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
};

// ============================================
// DISTRIBUTED RATE LIMITING (UPSTASH)
// ============================================
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const rateLimiters = {
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
      })
    : null,

  contact: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '60 m'),
        analytics: true,
        prefix: 'ratelimit:contact',
      })
    : null,

  upload: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, '60 m'),
        analytics: true,
        prefix: 'ratelimit:upload',
      })
    : null,

  general: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(200, '1 m'),
        analytics: true,
        prefix: 'ratelimit:general',
      })
    : null,
};

const createRateLimitMiddleware = (limiterName: keyof typeof rateLimiters) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const limiter = rateLimiters[limiterName];

    if (!limiter) {
      return next();
    }

    const identifier = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', reset.toString());

    if (!success) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      });
    }

    next();
  };
};

// ============================================
// SMTP TRANSPORTER
// ============================================
let transporter: any = null;
const getTransporter = () => {
  if (!transporter) {
    const { from, ...transportOptions } = config.smtp;
    transporter = nodemailer.createTransport(transportOptions as any);
  }
  return transporter;
};

// ============================================
// MULTER FILE UPLOAD
// ============================================
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.security.maxFileSize,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

export async function initApp() {
  const app = express();
  const PORT = 3000;

  // Security headers
  const cspConfig = {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "*.supabase.co", "https://images.unsplash.com", "https://picsum.photos"],
      connectSrc: ["'self'", "*.supabase.co", "https://www.google-analytics.com", "https://stats.g.doubleclick.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://*.google.com", "https://*.run.app"], // Allow preview iframe
      frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com", "https://*.run.app"], // Allow AI Studio to frame us
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  };

  app.use(helmet({
    contentSecurityPolicy: cspConfig,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));
  app.use(hpp()); // Prevent HTTP Parameter Pollution
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' })); // Restricted size for security
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // SECURITY: Global Input Sanitization Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return DOMPurify.sanitize(obj);
        } else if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        } else if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = {};
          for (const key in obj) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
          return sanitized;
        }
        return obj;
      };
      req.body = sanitizeObject(req.body);
    }
    next();
  });

  // ============================================
  // VALIDATION SCHEMAS
  // ============================================
  const schemas = {
    contact: z.object({
      name: z.string().min(1).max(100).trim(),
      email: z.string().email().max(255).trim(),
      phone: z.string().max(20).trim().optional(),
      subject: z.string().min(1).max(200).trim(),
      message: z.string().min(1).max(5000).trim(),
    }),

    cvRequest: z.object({
      name: z.string().min(1).max(100).trim(),
      email: z.string().email().max(255).trim(),
      reason: z.string().min(1).max(1000).trim(),
    }),

    passwordVerify: z.object({
      password: z.string().min(1).max(100),
      type: z.enum(['cv', 'notepad']).optional(),
    }),

    notify: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('message'),
        data: z.object({
          name: z.string().min(1).max(100),
          email: z.string().email(),
          subject: z.string().min(1).max(200),
          message: z.string().min(1).max(5000),
        }),
      }),
      z.object({
        type: z.literal('cv_request'),
        data: z.object({
          name: z.string().min(1).max(100),
          company: z.string().min(1).max(100),
          email: z.string().email(),
          reason: z.string().min(1).max(1000),
        }),
      }),
      z.object({
        type: z.literal('todo_notification'),
        data: z.object({
          task: z.string().min(1).max(500),
          priority: z.string().optional(),
          due_date: z.string().optional(),
        }),
      }),
      z.object({
        type: z.literal('contact_exchange'),
        data: z.object({
          name: z.string().min(1).max(100),
          phone: z.string().max(20),
          email: z.string().email().optional(),
          note: z.string().max(500).optional(),
        }),
      }),
      z.object({
        type: z.literal('broadcast_blog'),
        data: z.object({
          title: z.string().min(1).max(200),
          summary: z.string().min(1).max(1000),
          slug: z.string().min(1).max(200),
        }),
      }),
      z.object({
        type: z.literal('cv_approval'),
        data: z.object({
          name: z.string().min(1).max(100),
          email: z.string().email(),
          password: z.string().min(1),
          downloadUrl: z.string().min(1), // Relaxed from .url() to handle potential protocol issues
        }),
      }),
      z.object({
        type: z.literal('admin_reply'),
        data: z.object({
          name: z.string().min(1).max(100),
          email: z.string().email(),
          subject: z.string().min(1).max(200),
          message: z.string().min(1).max(5000),
        }),
      }),
      z.object({
        type: z.literal('send_vcf'),
        data: z.object({
          userName: z.string().min(1).max(100),
          userEmail: z.string().email(),
          adminPhone: z.string().min(1).max(20),
          adminEmail: z.string().email(),
        }),
      })
    ]),

    analyticsQuery: z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dimension: z.enum(['date', 'query', 'page', 'country', 'device', 'searchAppearance']).optional(),
    }),

    notepadSave: z.object({
      content: z.string().max(100000),
      password: z.string().max(100).optional(),
    }),

    adminPasswordUpdate: z.object({
      key: z.enum(['cv_password', 'notepad_password', 'admin_password']),
      password: z.string().min(4).max(100),
    }),

    notePasswordUpdate: z.object({
      password: z.string().min(4).max(100).or(z.literal('')),
    }),

    unlockNote: z.object({
      id: z.string().uuid(),
      password: z.string().max(100),
    }),

    trackingUpdate: z.object({
      gtmId: z.string().regex(/^GTM-[A-Z0-9]+$/, 'Invalid GTM ID format').or(z.literal('')),
      gaId: z.string().regex(/^G-[A-Z0-9]+$/, 'Invalid GA ID format').or(z.literal('')),
    }),

    newsletterSubscribe: z.object({
      email: z.string().email().max(255).trim().toLowerCase(),
    }),

    newsletterUnsubscribe: z.object({
      email: z.string().email(),
      token: z.string().uuid(),
    }),

    broadcast: z.object({
      title: z.string().min(1).max(200),
      summary: z.string().max(2000).optional(),
      slug: z.string().min(1).max(200),
    }),
  };

  // ============================================
  // MIDDLEWARE: RATE LIMITING
  // ============================================
  const newsletterRateLimit = createRateLimitMiddleware('contact');

  // ============================================
  // ADMIN AUTHENTICATION MIDDLEWARE
  // ============================================
  const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized: No token provided' });

      const token = authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Unauthorized: Invalid token format' });

      const { data: { user }, error } = await getSupabase().auth.getUser(token);

      if (error || !user) return res.status(401).json({ error: 'Unauthorized: Invalid session' });
      
      // Critical security check: email must be verified
      if (!user.email_confirmed_at) return res.status(403).json({ error: 'Forbidden: Email not verified' });

      const { data: adminCheck } = await getSupabase()
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!adminCheck) {
        console.warn(`[SECURITY] Unauthorized admin access attempt by ${user.email} from ${req.ip}`);
        return res.status(403).json({ error: 'Forbidden: You do not have admin access' });
      }

      (req as any).user = user;
      next();
    } catch (err) {
      console.error('Auth check error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  async function getSecurePassword(key: string): Promise<string | null> {
    const { data, error } = await getSupabase()
      .from('secure_passwords')
      .select('hashed_value')
      .eq('key', key)
      .single();

    if (error || !data) return null;
    return data.hashed_value;
  }

  async function recordFailedAttempt(key: string): Promise<boolean> {
    const { data } = await getSupabase()
      .from('secure_passwords')
      .select('failed_attempts, locked_until')
      .eq('key', key)
      .single();

    if (!data) return false;

    if (data.locked_until && new Date(data.locked_until) > new Date()) return true;

    const newAttempts = (data.failed_attempts || 0) + 1;
    const shouldLock = newAttempts >= 5;

    await getSupabase()
      .from('secure_passwords')
      .update({
        failed_attempts: newAttempts,
        locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null,
      })
      .eq('key', key);

    return shouldLock;
  }

  async function resetFailedAttempts(key: string): Promise<void> {
    await getSupabase()
      .from('secure_passwords')
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_verified_at: new Date().toISOString(),
      })
      .eq('key', key);
  }

  async function sendEmailNotification(to: string, subject: string, templateKey: string, templateData: Record<string, any>) {
    try {
      const { data: template } = await getSupabase()
        .from('site_settings')
        .select('value')
        .eq('key', templateKey)
        .single();

      let html = template?.value;

      if (!html) {
        // Fallback templates
        if (templateKey === 'email_template_cv_approval') {
          html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #da755b;">CV Access Approved</h2>
              <p>Hello \${data.name},</p>
              <p>Your request to access Janak Panthi's CV has been approved.</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin-top: 0;"><strong>Access Details:</strong></p>
                <p>Password: <code style="background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 1.1em; color: #da755b;">\${data.password}</code></p>
                <p style="margin-bottom: 0;">Download URL: <a href="\${data.downloadUrl}" style="color: #da755b;">Click here to download</a></p>
              </div>
              <p>This password is for your use only. If you have any further questions, feel free to reply to this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999;">Best Regards,<br/>Janak Panthi</p>
            </div>
          `;
        } else if (templateKey === 'email_template_admin_reply') {
          html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #da755b;">Reply to: \${data.subject}</h2>
              <p>Hello \${data.name},</p>
              <p>Thank you for reaching out. Here is the response to your message:</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap;">
                \${data.message}
              </div>
              <p>Best Regards,<br/>Janak Panthi</p>
            </div>
          `;
        } else if (templateKey === 'email_template_vcf') {
          html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #da755b;">Contact Information Shared</h2>
              <p>Hello \${data.userName},</p>
              <p>Janak Panthi has shared his digital business card (VCF) with you as requested.</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Contact Details:</strong></p>
                <p>Email: \${data.adminEmail}</p>
                <p>Phone: \${data.adminPhone}</p>
              </div>
              <p>Please save this information to your contacts.</p>
              <p>Best Regards,<br/>Janak Panthi</p>
            </div>
          `;
        } else if (templateKey === 'email_template_contact') {
          html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #da755b;">New Message: \${data.subject}</h2>
              <p><strong>From:</strong> \${data.name} (\${data.email})</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap;">
                \${data.message}
              </div>
              <p style="font-size: 12px; color: #999;">Sent from your portfolio contact form.</p>
            </div>
          `;
        } else if (templateKey === 'email_template_cv_request') {
          html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #da755b;">CV Request</h2>
              <p><strong>Name:</strong> \${data.name}</p>
              <p><strong>Email:</strong> \${data.email}</p>
              <p><strong>Reason/Company:</strong> \${data.reason || data.company}</p>
              <p style="font-size: 12px; color: #999;">Login to your admin panel to approve or deny this request.</p>
            </div>
          `;
        } else if (templateKey === 'email_template_todo') {
          html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #da755b;">Todo Reminder</h2>
              <p><strong>Task:</strong> \${data.task}</p>
              <p><strong>Priority:</strong> \${data.priority}</p>
              <p><strong>Due Date:</strong> \${data.due_date || 'None'}</p>
            </div>
          `;
        } else {
          return; // Still return if it's completely missing and no fallback
        }
      }

      for (const [key, value] of Object.entries(templateData)) {
        const regex = new RegExp(`\\$\\{data\\.${key}\\}`, 'g');
        html = html.replace(regex, sanitizeHtml(String(value)));
      }

      await getTransporter().sendMail({
        from: `"${config.smtp.from.name}" <${config.smtp.from.email}>`,
        to,
        subject: sanitizeHtml(subject),
        html,
      });
    } catch (err) {
      console.error('Email error:', err);
      Sentry.captureException(err);
    }
  }

  // ============================================
  // API ROUTES
  // ============================================
  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0' });
  });

  app.post('/api/v1/admin/notes/:id/password', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = schemas.notePasswordUpdate.parse(req.body);
      
      let password_hash = null;
      if (password) {
        password_hash = await bcrypt.hash(password, 10);
      }

      const { error } = await getSupabase()
        .from('notes')
        .update({ 
          password_hash,
          is_locked: !!password_hash 
        })
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') 
        });
      }
      console.error('Note password update error:', err);
      res.status(500).json({ error: 'Failed to update note password' });
    }
  });

  app.post('/api/v1/auth/verify-password', createRateLimitMiddleware('auth'), async (req, res) => {
    try {
      const { password, type } = schemas.passwordVerify.parse(req.body);
      const key = type === 'cv' ? 'cv_password' : 'notepad_password';
      
      // Special case: cv_password might be in site_settings for visibility
      if (key === 'cv_password') {
        const { data: settingsData } = await getSupabase()
          .from('site_settings')
          .select('value')
          .eq('key', 'cv_password')
          .single();
        
        if (settingsData?.value) {
          if (password === settingsData.value) {
            return res.json({ valid: true, success: true });
          }
        }
      }

      const { data: passwordData, error } = await getSupabase()
        .from('secure_passwords')
        .select('hashed_value, failed_attempts, locked_until')
        .eq('key', key)
        .single();

      if (error || !passwordData) {
        return res.status(500).json({ error: 'Security credentials not found or configured' });
      }

      // Check if account is locked
      if (passwordData.locked_until && new Date(passwordData.locked_until) > new Date()) {
        return res.status(423).json({ 
          error: 'Account locked due to too many failed attempts.',
          lockedUntil: passwordData.locked_until
        });
      }

      const isValid = await verifyPassword(password, passwordData.hashed_value);
      
      if (!isValid) {
        const isLocked = await recordFailedAttempt(key);
        return res.status(401).json({ 
          error: 'Invalid password',
          attemptsRemaining: isLocked ? 0 : 5 - ((passwordData.failed_attempts || 0) + 1)
        });
      }

      await resetFailedAttempts(key);
      res.json({ valid: true, success: true });
    } catch (err) {
      console.error('Verify error:', err);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  app.post('/api/v1/admin/settings/tracking', verifyAdmin, async (req, res) => {
    try {
      const { gtmId, gaId } = schemas.trackingUpdate.parse(req.body);
      
      const { error: gtmError } = await getSupabase()
        .from('site_settings')
        .upsert({ key: 'gtm_id', value: gtmId }, { onConflict: 'key' });
      
      if (gtmError) throw gtmError;

      const { error: gaError } = await getSupabase()
        .from('site_settings')
        .upsert({ key: 'ga_id', value: gaId }, { onConflict: 'key' });

      if (gaError) throw gaError;

      res.json({ success: true, message: 'Tracking IDs updated successfully' });
    } catch (err) {
      console.error('Tracking update error:', err);
      res.status(400).json({ error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid tracking ID format' });
    }
  });

  app.post('/api/v1/cv/signed-url', createRateLimitMiddleware('auth'), async (req, res) => {
    try {
      const { password } = schemas.passwordVerify.parse(req.body);
      
      // 1. Verify CV Password
      const { data: passwordData } = await getSupabase()
        .from('secure_passwords')
        .select('hashed_value, locked_until')
        .eq('key', 'cv_password')
        .single();

      if (!passwordData) return res.status(500).json({ error: 'CV access not configured' });
      if (passwordData.locked_until && new Date(passwordData.locked_until) > new Date()) return res.status(423).json({ error: 'Locked' });

      const isValid = await verifyPassword(password, passwordData.hashed_value);
      if (!isValid) {
        await recordFailedAttempt('cv_password');
        return res.status(401).json({ error: 'Invalid password' });
      }

      await resetFailedAttempts('cv_password');

      // 2. Get CV path from settings
      const { data: cvSetting } = await getSupabase()
        .from('site_settings')
        .select('value')
        .eq('key', 'cv_url')
        .single();

      if (!cvSetting?.value) return res.status(404).json({ error: 'CV not found' });

      // 3. Generate signed URL from private bucket
      // We assume cv_url is the path in the 'cv_private' bucket
      const { data, error } = await getSupabase()
        .storage
        .from('cv_private')
        .createSignedUrl(cvSetting.value, 60);

      if (error) throw error;
      res.json({ url: data.signedUrl });
    } catch (err) {
      console.error('CV Signed URL error:', err);
      res.status(500).json({ error: 'Failed to generate access URL' });
    }
  });

  app.get('/api/v1/cv/download/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      
      const { data: request, error } = await getSupabase()
        .from('cv_requests')
        .select('status')
        .eq('id', requestId)
        .single();
      
      if (error || !request || request.status !== 'approved') {
        return res.status(403).send('<h1>Access Denied</h1><p>This CV request has not been approved or does not exist.</p>');
      }

      const { data: cvSetting } = await getSupabase()
        .from('site_settings')
        .select('value')
        .eq('key', 'cv_url')
        .single();

      if (!cvSetting?.value) return res.status(404).send('CV not found');

      const { data, error: signedError } = await getSupabase()
        .storage
        .from('cv_private')
        .createSignedUrl(cvSetting.value, 300); // 5 minutes

      if (signedError) throw signedError;
      res.redirect(data.signedUrl);
    } catch (err) {
      console.error('Download error:', err);
      res.status(500).send('Internal Server Error');
    }
  });

  app.post('/api/v1/admin/auth/update-password', createRateLimitMiddleware('auth'), verifyAdmin, async (req, res) => {
    try {
      const { key, password } = schemas.adminPasswordUpdate.parse(req.body);
      const hashed = await bcrypt.hash(password, config.security.bcryptRounds);

      // SECURITY: Ensure we only update valid keys
      const validKeys = ['cv_password', 'notepad_password', 'admin_password'];
      if (!validKeys.includes(key)) {
        return res.status(400).json({ error: 'Invalid password key' });
      }

      // If it's CV or Notepad password, also store in site_settings for admin visibility
      if (key === 'cv_password' || key === 'notepad_password') {
        await getSupabase()
          .from('site_settings')
          .upsert({ 
            key, 
            value: password,
            updated_at: new Date().toISOString(),
            updated_by: (req as any).user.id 
          }, { onConflict: 'key' });
      } else {
        // Ensure legacy plain text is removed if it existed for other keys (like admin_password)
        await getSupabase().from('site_settings').delete().eq('key', key);
      }

      const { error } = await getSupabase()
        .from('secure_passwords')
        .upsert({
          key,
          hashed_value: hashed,
          salt: 'auto',
          algorithm: 'bcrypt',
          updated_by: (req as any).user.id,
          updated_at: new Date().toISOString(),
          rotation_required_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          failed_attempts: 0,
          locked_until: null
        }, { onConflict: 'key' });

      if (error) throw error;

      res.json({ success: true, message: 'Password updated and secured' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') 
        });
      }
      console.error('Password Update error:', err);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.post('/api/v1/auth/verify-cv', createRateLimitMiddleware('auth'), async (req, res) => {
    // Redirect to consolidated verify-password endpoint logic internally
    req.body.type = 'cv';
    const { password } = schemas.passwordVerify.parse(req.body);
    const key = 'cv_password';
    
    // Check site_settings first for plain-text comparison (admin visibility preference)
    const { data: settingsData } = await getSupabase()
      .from('site_settings')
      .select('value')
      .eq('key', 'cv_password')
      .single();
    
    if (settingsData?.value && password === settingsData.value) {
      return res.json({ valid: true, success: true });
    }

    const { data: passwordData, error } = await getSupabase()
      .from('secure_passwords')
      .select('hashed_value, locked_until')
      .eq('key', key)
      .single();

    if (error || !passwordData) return res.status(500).json({ error: 'Not configured' });
    if (passwordData.locked_until && new Date(passwordData.locked_until) > new Date()) return res.status(423).json({ error: 'Locked' });

    const isValid = await verifyPassword(password, passwordData.hashed_value);
    if (!isValid) {
      await recordFailedAttempt(key);
      return res.status(401).json({ error: 'Invalid', success: false });
    }

    await resetFailedAttempts(key);
    res.json({ valid: true, success: true });
  });

  app.post('/api/v1/auth/verify-notepad', createRateLimitMiddleware('auth'), async (req, res) => {
    try {
      const { id, password } = schemas.unlockNote.parse(req.body);
      
      const { data: note, error } = await getSupabase()
        .from('notes')
        .select('id, content, is_locked, password_hash')
        .eq('id', id)
        .single();

      if (error || !note) return res.status(404).json({ error: 'Note not found' });
      if (!note.is_locked) return res.json({ success: true, content: note.content });

      if (!note.password_hash) {
        return res.status(500).json({ error: 'Note is locked but no password is set' });
      }

      const isValid = await bcrypt.compare(password, note.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Invalid password' });

      res.json({ success: true, content: note.content });
    } catch (err) {
      console.error('Unlock error:', err);
      res.status(500).json({ error: 'Failed to unlock note' });
    }
  });

  app.post('/api/v1/notify', createRateLimitMiddleware('general'), async (req, res) => {
    try {
      const { type, data } = schemas.notify.parse(req.body);
      
      let subject = 'New Notification';
      let templateKey = 'email_template_generic';

      if (type === 'message') {
        subject = `New Message from ${data.name}: ${data.subject}`;
        templateKey = 'email_template_contact';
      } else if (type === 'cv_request') {
        subject = `CV Request from ${data.name} (${data.company})`;
        templateKey = 'email_template_cv_request';
      } else if (type === 'cv_approval') {
        subject = 'CV Access Approved - Janak Panthi';
        templateKey = 'email_template_cv_approval';
      } else if (type === 'todo_notification') {
        subject = `Todo Reminder: ${data.task}`;
        templateKey = 'email_template_todo';
      } else if (type === 'admin_reply') {
        subject = `Re: ${data.subject}`;
        templateKey = 'email_template_admin_reply';
      } else if (type === 'send_vcf') {
        subject = 'Digital Business Card - Janak Panthi';
        templateKey = 'email_template_vcf';
      }

      const { data: settings } = await getSupabase().from('site_settings').select('value').eq('key', 'contact_email').single();
      const adminEmail = settings?.value || config.admin.email;

      // For approvals and replies, send to user, otherwise send to admin
      const recipient = (type === 'cv_approval' || type === 'admin_reply') ? data.email : 
                        (type === 'send_vcf') ? data.userEmail : adminEmail;

      await sendEmailNotification(recipient, subject, templateKey, data);
      res.json({ success: true });
    } catch (err) {
      console.error('Notification error:', err);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // ============================================
  // HEALTH CHECK
  // ============================================
  app.get('/api/v1/health', async (req, res) => {
    const status: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      database: 'checking...',
      googleSearchConsole: !!config.google.privateKey && !!config.google.serviceAccountEmail,
      email: !!config.smtp.auth.pass,
    };

    try {
      const { error } = await getSupabase().from('site_settings').select('key').limit(1);
      status.database = error ? `Error: ${error.message}` : 'connected';
    } catch (e: any) {
      status.database = `Failed: ${e.message}`;
    }

    res.json(status);
  });

  app.post('/api/v1/newsletter/subscribe', newsletterRateLimit, async (req, res) => {
    try {
      const { email } = schemas.newsletterSubscribe.parse(req.body);
      
      const supabase = getSupabase();
      
      // Clean previous attempts or duplicates if they were unsubscribed
      await supabase.from('newsletter_subscribers').delete().eq('email', email).eq('status', 'unsubscribed');

      const { data: existing, error: fetchError } = await supabase
        .from('newsletter_subscribers')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) throw new Error(`Database fetch error: ${fetchError.message}`);

      if (existing && existing.status === 'active') {
        return res.json({ success: true, message: 'Already subscribed' });
      }

      const token = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .upsert([{ email, token, status: 'active' }], { onConflict: 'email' });

      if (insertError) throw new Error(`Database insert error: ${insertError.message}`);

      // Send welcome email
      const { data: templateData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'email_template_newsletter_welcome')
        .maybeSingle();

      if (templateData?.value) {
        try {
          await getTransporter().sendMail({
            from: `"${config.smtp.from.name}" <${config.smtp.from.email}>`,
            to: email,
            subject: 'Welcome to Janak Panthi Newsletter!',
            html: templateData.value,
          });
        } catch (mailErr: any) {
          console.error('Welcome mail failed:', mailErr);
        }
      }

      res.json({ success: true, message: 'Subscribed successfully' });
    } catch (err: any) {
      console.error('Newsletter error:', err);
      res.status(500).json({ 
        error: 'Subscription failed', 
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      });
    }
  });

  app.get('/api/v1/newsletter/unsubscribe', async (req, res) => {
    try {
      const { email, token } = req.query;
      if (!email || !token) return res.status(400).send('Invalid request');

      const { error } = await getSupabase()
        .from('newsletter_subscribers')
        .update({ status: 'unsubscribed' })
        .eq('email', email)
        .eq('token', token);

      if (error) throw error;

      res.send('<h1>Unsubscribed</h1><p>You have been successfully removed from our list.</p>');
    } catch (err) {
      res.status(500).send('Error processing request');
    }
  });

  app.get('/api/v1/admin/newsletter/subscribers', verifyAdmin, async (req, res) => {
    try {
      const { data, error } = await getSupabase()
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DATABASE ERROR] Failed to fetch newsletter subscribers:', error);
        throw error;
      }
      res.json(data);
    } catch (err: any) {
      console.error('[FETCH ERROR] newsletter subscribers:', err.message);
      res.status(500).json({ error: 'Failed to fetch subscribers: ' + (err.message || 'Unknown error') });
    }
  });

  app.post('/api/v1/admin/newsletter/subscribers/:id/toggle', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = z.object({ 
        status: z.enum(['active', 'unsubscribed']) 
      }).parse(req.body);
      
      console.log(`Toggling subscriber ${id} to ${status}`);
      
      const { error } = await getSupabase()
        .from('newsletter_subscribers')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Database error during toggle:', error);
        throw error;
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('Toggle error:', err.message);
      res.status(500).json({ error: err.message || 'Failed to toggle status' });
    }
  });

  app.delete('/api/v1/admin/newsletter/subscribers/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Deleting subscriber ${id}`);
      
      const { error } = await getSupabase()
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database error during delete:', error);
        throw error;
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete error:', err.message);
      res.status(500).json({ error: err.message || 'Failed to delete subscriber' });
    }
  });

  app.post('/api/v1/admin/newsletter/broadcast', verifyAdmin, async (req, res) => {
    try {
      console.log('Starting Newsletter Broadcast:', { 
        title: req.body.title, 
        slug: req.body.slug,
        admin: (req as any).user?.email 
      });

      const { title, summary, slug } = schemas.broadcast.parse(req.body);
      
      const { data: subscribers, error } = await getSupabase()
        .from('newsletter_subscribers')
        .select('email, token')
        .eq('status', 'active');

      if (error) throw error;
      
      if (!subscribers?.length) {
        return res.json({ success: true, sent: 0, failed: 0 });
      }

      const { data: templateData } = await getSupabase()
        .from('site_settings')
        .select('value')
        .eq('key', 'email_template_newsletter_broadcast')
        .single();

      const template = templateData?.value;
      if (!template) {
        return res.status(400).json({ error: 'Newsletter broadcast template not found. Please ensure it exists in Site Settings.' });
      }

      const baseUrl = config.url || 'https://janakpanthi.com';
      const BATCH_SIZE = 25;
      const results = { success: 0, failed: 0 };

      // Process batches sequentially to avoid overwhelming SMTP
      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (sub) => {
          try {
            const unsubLink = `${baseUrl}/api/v1/newsletter/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${sub.token}`;
            
            let html = template;
            const placeholders = {
              title,
              summary: summary || 'A new dev log has been posted.',
              link: `${baseUrl}/logs/${slug}`,
              unsubscribe_link: unsubLink
            };

            for (const [key, value] of Object.entries(placeholders)) {
              const regex = new RegExp(`\\$\\{data\\.${key}\\}`, 'g');
              html = html.replace(regex, DOMPurify.sanitize(String(value)));
            }

            await getTransporter().sendMail({
              from: `"${config.smtp.from.name}" <${config.smtp.from.email}>`,
              to: sub.email,
              subject: `Update: ${title}`,
              html,
            });
            results.success++;
          } catch (e: any) {
            console.error(`Failed sending to ${sub.email}:`, e.message);
            results.failed++;
          }
        }));
      }

      res.json({ success: true, sent: results.success, failed: results.failed });
    } catch (err: any) {
      console.error('Newsletter Broadcast Error:', err);
      res.status(500).json({ error: err.message || 'Failed to broadcast newsletter' });
    }
  });

  app.post('/api/v1/contact', createRateLimitMiddleware('contact'), async (req, res) => {
    try {
      const data = schemas.contact.parse(req.body);
      const { error: dbError } = await getSupabase().from('messages').insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
      });

      if (dbError) throw dbError;

      const { data: notify } = await getSupabase().from('site_settings').select('value').eq('key', 'notify_new_message').single();
      if (notify?.value === 'true') {
        await sendEmailNotification(config.admin.email, `New Message: ${data.subject}`, 'email_template_contact', data);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Error' });
    }
  });

  app.post('/api/v1/cv/request', createRateLimitMiddleware('contact'), async (req, res) => {
    try {
      const data = schemas.cvRequest.parse(req.body);
      const { error: dbError } = await getSupabase().from('cv_requests').insert(data);
      if (dbError) throw dbError;

      await sendEmailNotification(config.admin.email, `CV Request: ${data.name}`, 'email_template_cv_request', data);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Error' });
    }
  });

  app.post('/api/v1/upload', createRateLimitMiddleware('upload'), upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file' });
      
      // SECURITY: Explicit bucket allowlist
      const allowedBuckets = ['images', 'gallery', 'pdfs'];
      const isPrivate = req.body.isPrivate === 'true' || req.body.bucket === 'cv';
      const bucket = isPrivate ? 'cv_private' : (req.body.bucket || 'images');
      
      if (!allowedBuckets.includes(req.body.bucket || 'images') && !isPrivate) {
        return res.status(403).json({ error: 'Forbidden bucket' });
      }

      // SECURITY: Ensure only admins can upload to private bucket
      if (isPrivate) {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const { data: { user } } = await getSupabase().auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        
        const { data: adminCheck } = await getSupabase().from('admin_users').select('user_id').eq('user_id', user.id).eq('is_active', true).single();
        if (!adminCheck) return res.status(403).json({ error: 'Forbidden' });
      }

      // SECURITY: Randomize filename to prevent collisions/traversal
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const filePath = `${crypto.randomUUID()}${fileExt}`;

      const { data, error } = await getSupabase().storage.from(bucket).upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

      if (error) throw error;
      
      if (isPrivate) {
        // Return only the path for private files, not public URL
        res.json({ path: data.path });
      } else {
        const { data: { publicUrl } } = getSupabase().storage.from(bucket).getPublicUrl(data.path);
        res.json({ url: publicUrl });
      }
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.get('/api/v1/gsc/stats', createRateLimitMiddleware('general'), async (req, res) => {
    try {
      const { startDate, endDate, dimension } = schemas.analyticsQuery.parse(req.query);
      
      if (!config.google.serviceAccountEmail || !config.google.privateKey) {
        throw new Error('Google Service Account credentials missing');
      }

      const auth = new google.auth.JWT({
        email: config.google.serviceAccountEmail,
        key: config.google.privateKey,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });
      
      const sc = google.searchconsole({ version: 'v1', auth });
      
      let siteUrl = config.google.siteUrl;
      // Auto-prefix with sc-domain: if it looks like a domain and lacks protocol
      if (siteUrl && !siteUrl.startsWith('http') && !siteUrl.startsWith('sc-domain:')) {
        siteUrl = `sc-domain:${siteUrl}`;
      }

      const queryParams = {
        siteUrl: siteUrl,
        requestBody: {
          startDate: (startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: (endDate as string) || new Date().toISOString().split('T')[0],
          dimensions: dimension ? [dimension as string] : ['date'],
          rowLimit: 1000,
        },
      };

      try {
        const response = await sc.searchanalytics.query(queryParams);
        res.json(response.data);
      } catch (innerErr: any) {
        // Try without sc-domain: if it failed and we added it
        if (siteUrl.startsWith('sc-domain:') && innerErr.message?.includes('not found')) {
          const fallbackUrl = siteUrl.replace('sc-domain:', 'https://') + '/';
          queryParams.siteUrl = fallbackUrl;
          const retryResponse = await sc.searchanalytics.query(queryParams);
          return res.json(retryResponse.data);
        }
        throw innerErr;
      }
    } catch (err: any) {
      console.error('GSC Analytics error:', err);
      res.status(500).json({ 
        error: 'Analytics failed', 
        details: err.message,
        hint: 'Ensure Service Account Email has Permission for this site in GSC'
      });
    }
  });

  // ============================================
  // GLOBAL ERROR HANDLERS
  // ============================================
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[SERVER ERROR]:', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ 
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
    });
  });

  // ============================================
  // VITE MIDDLEWARE OR STATIC SERVING
  // ============================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// For local development and non-Vercel environments
if (!process.env.VERCEL) {
  initApp().then(app => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

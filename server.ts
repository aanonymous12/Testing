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
  if (!value && !fallback && key !== 'SENTRY_DSN') {
    console.warn(`Warning: Environment variable ${key} is missing.`);
  }
  return value || '';
};

const config = {
  supabase: {
    url: getEnv('VITE_SUPABASE_URL'),
    serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  smtp: {
    host: getEnv('SMTP_HOST'),
    port: parseInt(getEnv('SMTP_PORT', '587')),
    secure: getEnv('SMTP_SECURE') === 'true',
    auth: {
      user: getEnv('SMTP_USER'),
      pass: getEnv('SMTP_PASS'),
    },
    from: {
      name: getEnv('SMTP_FROM_NAME', 'Janak Panthi'),
      email: getEnv('SMTP_FROM_EMAIL'),
    },
  },
  admin: {
    email: getEnv('ADMIN_EMAIL'),
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

async function startServer() {
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
  }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
      password: z.string().min(8).max(100),
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
  };

  // ============================================
  // MIDDLEWARE
  // ============================================
  const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await getSupabase().auth.getUser(token);

      if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

      const { data: adminCheck } = await getSupabase()
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!adminCheck) return res.status(403).json({ error: 'Forbidden' });

      (req as any).user = user;
      next();
    } catch (err) {
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

      if (!template?.value) return;

      let html = template.value;
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
    } catch (err) {
      console.error('Note password update error:', err);
      res.status(500).json({ error: 'Failed to update note password' });
    }
  });

  app.post('/api/v1/auth/verify-password', createRateLimitMiddleware('auth'), async (req, res) => {
    try {
      const { password, type } = schemas.passwordVerify.parse(req.body);
      const key = type === 'cv' ? 'cv_password' : 'notepad_password';
      
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

      // Ensure legacy plain text is removed if it existed
      await getSupabase().from('site_settings').delete().eq('key', key);

      res.json({ success: true, message: 'Password updated and secured' });
    } catch (err) {
      console.error('Password Update error:', err);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  app.post('/api/v1/auth/verify-cv', createRateLimitMiddleware('auth'), async (req, res) => {
    // Redirect to consolidated verify-password endpoint logic internally
    req.body.type = 'cv';
    const { password } = schemas.passwordVerify.parse(req.body);
    const key = 'cv_password';
    
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
      } else if (type === 'todo_notification') {
        subject = `Todo Reminder: ${data.task}`;
        templateKey = 'email_template_todo';
      }

      const { data: settings } = await getSupabase().from('site_settings').select('value').eq('key', 'contact_email').single();
      const adminEmail = settings?.value || config.admin.email;

      await sendEmailNotification(adminEmail, subject, templateKey, data);
      res.json({ success: true });
    } catch (err) {
      console.error('Notification error:', err);
      res.status(500).json({ error: 'Failed to send notification' });
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
      
      const auth = new google.auth.JWT({
        email: config.google.serviceAccountEmail,
        key: config.google.privateKey,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });
      
      const sc = google.searchconsole({ version: 'v1', auth });
      const response = await sc.searchanalytics.query({
        siteUrl: config.google.siteUrl,
        requestBody: {
          startDate: (startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: (endDate as string) || new Date().toISOString().split('T')[0],
          dimensions: dimension ? [dimension as string] : ['date'],
          rowLimit: 1000,
        },
      });
      res.json(response.data);
    } catch (err) {
      console.error('GSC Analytics error:', err);
      res.status(500).json({ error: 'Analytics failed', details: err instanceof Error ? err.message : String(err) });
    }
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

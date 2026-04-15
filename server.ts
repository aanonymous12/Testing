import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import multer from "multer";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { z } from "zod";

dotenv.config();

// Validation Schemas
const MessageSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).trim(),
  subject: z.string().min(2).max(200).trim().optional(),
  message: z.string().min(1).max(5000).trim(),
});

const CVRequestSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  company: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).trim(),
  reason: z.string().min(5).max(1000).trim(),
});

const ContactExchangeSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  phone: z.string().min(7).max(20).trim(),
  email: z.string().email().max(255).trim().optional().or(z.literal('')),
  note: z.string().max(1000).trim().optional().or(z.literal('')),
});

const VerifyCVSchema = z.object({
  password: z.string().min(1).max(100),
});

const VerifyNotepadSchema = z.object({
  cellId: z.string().uuid().or(z.string().min(1).max(100)),
  password: z.string().min(1).max(100),
});

const LoginSchema = z.object({
  email: z.string().email().max(255).trim(),
  password: z.string().min(1).max(100),
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("################################################################");
  console.error("CRITICAL ERROR: Supabase environment variables are missing!");
  console.error("Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
  console.error("################################################################");
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder'
);

// Rate limiters
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 messages per hour
  message: { error: "Too many messages sent. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per 15 minutes
  message: { error: "Too many attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: { error: "Too many uploads. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Multer configuration for strict validation
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only common image and document types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// Service Account Auth
const getServiceAccountAuth = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  
  if (privateKey) {
    // Handle potential quotes and escaped newlines
    privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    
    // If the key is all on one line (except headers), it might be missing newlines
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----') && !privateKey.includes('\n', privateKey.indexOf('-----BEGIN PRIVATE KEY-----') + 27)) {
      const header = '-----BEGIN PRIVATE KEY-----';
      const footer = '-----END PRIVATE KEY-----';
      const content = privateKey.replace(header, '').replace(footer, '').replace(/\s/g, '');
      const chunks = content.match(/.{1,64}/g) || [];
      privateKey = `${header}\n${chunks.join('\n')}\n${footer}\n`;
    }
  }

  if (!clientEmail || !privateKey) {
    console.warn("Service Account credentials missing:", { 
      hasEmail: !!clientEmail, 
      hasKey: !!privateKey 
    });
    return null;
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
  });
};

const app = express();

// Trust proxy if behind a reverse proxy (like Cloud Run/Nginx/Vercel)
app.set('trust proxy', 1);

app.use(express.json());

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    supabase: !!process.env.VITE_SUPABASE_URL
  });
});

// Test route
app.get("/api/v1/test", (req, res) => {
  res.json({ message: "API is working correctly", timestamp: new Date().toISOString() });
});

// File upload endpoint with strict validation
app.post("/api/v1/upload", uploadLimiter, (req, res, next) => {
  console.log("Upload request received");
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "File too large. Max size is 5MB." });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      console.error("Unknown upload error:", err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `public/${fileName}`;

    console.log(`Uploading file to Supabase: ${fileName} (${file.mimetype})`);

    // Upload to Supabase from server
    const { data, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase storage error:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    console.log("Upload successful:", publicUrl);
    res.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Upload processing error:", error);
    res.status(500).json({ error: error.message || "Failed to upload file to storage" });
  }
});

// API routes
app.post("/api/v1/notify", contactLimiter, async (req, res) => {
    const { type, data: rawData } = req.body;
    const recipient = process.env.ADMIN_EMAIL || "prankytv736@gmail.com";

    // Validate and sanitize data based on type
    let validatedData: any = rawData;
    try {
      if (type === "message") {
        validatedData = MessageSchema.parse(rawData);
      } else if (type === "cv_request") {
        validatedData = CVRequestSchema.parse(rawData);
      } else if (type === "contact_exchange") {
        validatedData = ContactExchangeSchema.parse(rawData);
      }
      // Note: Admin-triggered types (cv_approval, admin_reply, todo_notification) 
      // are trusted but could be added here if needed.
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid or malformed data", details: error.issues });
      }
      return res.status(400).json({ error: "Data validation failed" });
    }

    const data = validatedData;
    console.log(`Received notification request: type=${type}`, data);

    // Check notification preferences for admin-bound notifications
    const adminBoundTypes: Record<string, string> = {
      "message": "notify_new_message",
      "cv_request": "notify_cv_request",
      "contact_exchange": "notify_contact_exchange",
      "todo_notification": "notify_todo_reminder"
    };

    if (adminBoundTypes[type]) {
      try {
        const { data: prefData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', adminBoundTypes[type])
          .single();
        
        if (prefData && prefData.value === 'false') {
          console.log(`Admin notifications for ${type} are disabled. Skipping.`);
          return res.status(200).json({ status: "skipped", reason: "disabled_by_user" });
        }
      } catch (e) {
        console.error("Error checking notification preferences:", e);
      }
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("Gmail credentials missing. Skipping email notification.");
      return res.status(200).json({ status: "skipped", reason: "credentials_missing" });
    }

    // Helper to get template from Supabase or fallback to default
    const getTemplate = async (key: string, defaultHtml: string) => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', key)
          .single();
        
        if (!error && data && data.value) {
          // Replace variables in the template
          let template = data.value;
          Object.keys(data).forEach(k => {
            // This is a bit tricky since we need to replace ${data.name} etc.
            // We'll handle this manually for each type below to be safe.
          });
          return template;
        }
      } catch (e) {
        console.error(`Error fetching template ${key}:`, e);
      }
      return defaultHtml;
    };

    let subject = "";
    let html = "";

    const commonStyles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background-color: #242424;
          font-family: 'Georgia', 'Times New Roman', serif;
          padding: 40px 16px;
        }
        .email-wrapper {
          max-width: 580px;
          margin: 0 auto;
          background-color: #1a1a18;
          border: 1px solid rgba(242, 240, 228, 0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .email-header {
          background-color: #2e2d2a;
          border-bottom: 1px solid rgba(242, 240, 228, 0.08);
          padding: 28px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-name {
          font-family: 'Georgia', serif;
          font-size: 18px;
          font-weight: normal;
          color: #f2f0e4;
          letter-spacing: 0.04em;
        }
        .logo-sub {
          font-size: 11px;
          color: #7a7570;
          margin-top: 3px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .status-pill {
          background-color: rgba(218, 117, 91, 0.12);
          color: #da755b;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 6px 14px;
          border: 1px solid rgba(218, 117, 91, 0.3);
          border-radius: 2px;
          font-family: 'Courier New', monospace;
        }
        .divider-bar {
          height: 3px;
          background: linear-gradient(90deg, #da755b 0%, rgba(218, 117, 91, 0.3) 60%, transparent 100%);
        }
        .email-body {
          padding: 40px 36px;
        }
        .greeting {
          font-size: 13px;
          color: #7a7570;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 10px;
          font-family: 'Courier New', monospace;
        }
        .headline {
          font-size: 26px;
          color: #f2f0e4;
          font-weight: normal;
          line-height: 1.3;
          margin-bottom: 24px;
          letter-spacing: 0.01em;
        }
        .body-text {
          font-size: 15px;
          color: #7a7570;
          line-height: 1.8;
          margin-bottom: 24px;
        }
        .data-card {
          background-color: #2e2d2a;
          border: 1px solid rgba(242, 240, 228, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin: 28px 0;
        }
        .data-card-header {
          background-color: rgba(218, 117, 91, 0.08);
          border-bottom: 1px solid rgba(242, 240, 228, 0.08);
          padding: 12px 20px;
          font-size: 10px;
          color: #da755b;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: 'Courier New', monospace;
        }
        .data-row {
          display: flex;
          align-items: flex-start;
          padding: 15px 20px;
          border-bottom: 1px solid rgba(242, 240, 228, 0.08);
        }
        .data-row:last-child {
          border-bottom: none;
        }
        .data-key {
          font-size: 11px;
          color: #7a7570;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-family: 'Courier New', monospace;
          width: 90px;
          flex-shrink: 0;
          padding-top: 2px;
        }
        .data-val {
          font-size: 14px;
          color: #f2f0e4;
          line-height: 1.5;
        }
        .data-val.email {
          color: #da755b;
          font-family: 'Courier New', monospace;
          font-size: 13px;
        }
        .code-block {
          background-color: #2e2d2a;
          border: 1px solid rgba(242, 240, 228, 0.08);
          border-left: 3px solid #da755b;
          padding: 24px 28px;
          margin: 28px 0;
        }
        .code-label {
          font-size: 10px;
          color: #7a7570;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-family: 'Courier New', monospace;
          margin-bottom: 10px;
        }
        .code-value {
          font-family: 'Courier New', monospace;
          font-size: 30px;
          color: #da755b;
          letter-spacing: 0.22em;
          font-weight: bold;
        }
        .message-section {
          margin: 20px 0 28px;
        }
        .message-label {
          font-size: 10px;
          color: #7a7570;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: 'Courier New', monospace;
          margin-bottom: 10px;
        }
        .message-box {
          background-color: #2e2d2a;
          border: 1px solid rgba(242, 240, 228, 0.08);
          border-left: 3px solid #da755b;
          padding: 20px 22px;
          min-height: 80px;
          font-size: 15px;
          color: #7a7570;
          line-height: 1.8;
          font-style: italic;
        }
        .message-empty {
          color: rgba(122, 117, 112, 0.4);
          font-size: 13px;
        }
        .cta-link {
          display: inline-block;
          margin: 20px 0 28px;
          padding: 13px 28px;
          background-color: #da755b;
          color: #1a1a18;
          text-decoration: none;
          font-size: 13px;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-radius: 2px;
        }
        .small-note {
          font-size: 13px;
          color: #7a7570;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .rule {
          border: none;
          border-top: 1px solid rgba(242, 240, 228, 0.08);
          margin: 28px 0;
        }
        .sign-off {
          font-size: 14px;
          color: #7a7570;
          line-height: 1.8;
        }
        .sign-off strong {
          color: #f2f0e4;
          font-weight: normal;
          display: block;
          margin-top: 4px;
          font-size: 15px;
          letter-spacing: 0.02em;
        }
        .email-footer {
          background-color: #1a1a18;
          border-top: 1px solid rgba(242, 240, 228, 0.08);
          padding: 18px 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .footer-left {
          font-size: 12px;
          color: rgba(122, 117, 112, 0.5);
          font-family: 'Courier New', monospace;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .footer-right {
          font-size: 12px;
          color: rgba(122, 117, 112, 0.35);
          font-family: 'Courier New', monospace;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
      </style>
    `;

    if (type === "message") {
      subject = `New Message from ${data.name}: ${data.subject || 'No Subject'}`;
      const defaultHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${commonStyles}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <div>
                <div class="logo-name">Janak Panthi</div>
                <div class="logo-sub">Portfolio Notification</div>
              </div>
              <div class="status-pill">New Message</div>
            </div>
            <div class="divider-bar"></div>
            <div class="email-body">
              <div class="greeting">Contact Form</div>
              <div class="headline">New Message<br>Received</div>
              <p class="body-text">Someone reached out via the contact form on your portfolio. The details are below.</p>
              <div class="data-card">
                <div class="data-card-header">Sender Details</div>
                <div class="data-row">
                  <div class="data-key">Name</div>
                  <div class="data-val">\${data.name}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Email</div>
                  <div class="data-val email">\${data.email}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Subject</div>
                  <div class="data-val">\${data.subject || 'No Subject'}</div>
                </div>
              </div>
              <div class="message-section">
                <div class="message-label">Message</div>
                <div class="message-box">
                  \${data.message ? \`<span style="white-space: pre-wrap;">\${data.message}</span>\` : '<span class="message-empty">No message body was included with this submission.</span>'}
                </div>
              </div>
              <a class="cta-link" href="mailto:\${data.email}">Reply to \${data.name}</a>
              <p class="small-note">Use the button above to reply directly to <strong>\${data.email}</strong>.</p>
            </div>
            <div class="email-footer">
              <div class="footer-left">Portfolio Bot</div>
              <div class="footer-right">janakpanthi.com.np</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const template = await getTemplate('email_template_message', defaultHtml);
      html = template
        .replace(/\${data.name}/g, data.name)
        .replace(/\${data.email}/g, data.email)
        .replace(/\${data.subject}/g, data.subject || 'No Subject')
        .replace(/\${data.message}/g, data.message || '');
    } else if (type === "cv_request") {
      subject = `New CV Request from ${data.name}`;
      const defaultHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${commonStyles}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <div>
                <div class="logo-name">Janak Panthi</div>
                <div class="logo-sub">Portfolio Notification</div>
              </div>
              <div class="status-pill">New Request</div>
            </div>
            <div class="divider-bar"></div>
            <div class="email-body">
              <div class="greeting">Incoming Request</div>
              <div class="headline">New CV Request<br>Received</div>
              <p class="body-text">Someone submitted a CV access request from your portfolio. Review the details below and approve or decline from your dashboard.</p>
              <div class="data-card">
                <div class="data-card-header">Request Details</div>
                <div class="data-row">
                  <div class="data-key">Name</div>
                  <div class="data-val">\${data.name}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Company</div>
                  <div class="data-val">\${data.company}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Email</div>
                  <div class="data-val email">\${data.email}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Reason</div>
                  <div class="data-val">\${data.reason}</div>
                </div>
              </div>
              <a class="cta-link" href="https://janakpanthi.com.np/admin">Approve Request</a>
              <p class="small-note">Log in to your portfolio dashboard to approve or decline this request and generate a unique access code for the requester.</p>
            </div>
            <div class="email-footer">
              <div class="footer-left">Portfolio Bot</div>
              <div class="footer-right">janakpanthi.com.np</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const template = await getTemplate('email_template_cv_request', defaultHtml);
      html = template
        .replace(/\${data.name}/g, data.name)
        .replace(/\${data.company}/g, data.company)
        .replace(/\${data.email}/g, data.email)
        .replace(/\${data.reason}/g, data.reason);
    } else if (type === "cv_approval") {
      subject = `CV Access Granted - Janak Panthi Portfolio`;
      const defaultHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${commonStyles}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <div>
                <div class="logo-name">Janak Panthi</div>
                <div class="logo-sub">Portfolio and CV Access</div>
              </div>
              <div class="status-pill">Access Granted</div>
            </div>
            <div class="divider-bar"></div>
            <div class="email-body">
              <div class="greeting">Hello, \${data.name}</div>
              <div class="headline">Your CV Access<br>Has Been Approved</div>
              <p class="body-text">Your request for CV access has been approved. You can now download the CV using the access code below.</p>
              <div class="code-block">
                <div class="code-label">Your Access Code</div>
                <div class="code-value">\${data.password}</div>
              </div>
              <p class="body-text">Visit the portfolio site to download your copy:</p>
              <a class="cta-link" href="https://janakpanthi.com.np">Janak Panthi Portfolio</a>
              <p class="small-note">This code is unique to your request. If you have any trouble accessing the file, simply reply to this email and assistance will be provided directly.</p>
              <hr class="rule">
              <div class="sign-off">
                Best regards,
                <strong>Janak Panthi</strong>
              </div>
            </div>
            <div class="email-footer">
              <div class="footer-left">Automated Notice</div>
              <div class="footer-right">Do Not Reply</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const template = await getTemplate('email_template_cv_approval', defaultHtml);
      html = template
        .replace(/\${data.name}/g, data.name)
        .replace(/\${data.password}/g, data.password);
    } else if (type === "contact_exchange") {
      subject = `New Contact Exchange from ${data.name}`;
      const defaultHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${commonStyles}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <div>
                <div class="logo-name">Janak Panthi</div>
                <div class="logo-sub">Portfolio Notification</div>
              </div>
              <div class="status-pill">New Exchange</div>
            </div>
            <div class="divider-bar"></div>
            <div class="email-body">
              <div class="greeting">Incoming Contact</div>
              <div class="headline">New Contact Exchange<br>Received</div>
              <p class="body-text">Someone shared their contact details with you from your portfolio.</p>
              <div class="data-card">
                <div class="data-card-header">Contact Details</div>
                <div class="data-row">
                  <div class="data-key">Name</div>
                  <div class="data-val">\${data.name}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Phone</div>
                  <div class="data-val">\${data.phone}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Email</div>
                  <div class="data-val email">\${data.email}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Date</div>
                  <div class="data-val">\${new Date().toLocaleString()}</div>
                </div>
              </div>
              <a class="cta-link" href="https://janakpanthi.com.np/admin">View in Dashboard</a>
            </div>
            <div class="email-footer">
              <div class="footer-left">Portfolio Bot</div>
              <div class="footer-right">janakpanthi.com.np</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const template = await getTemplate('email_template_contact_exchange', defaultHtml);
      html = template
        .replace(/\${data.name}/g, data.name)
        .replace(/\${data.phone}/g, data.phone)
        .replace(/\${data.email}/g, data.email || 'N/A')
        .replace(/\${data.note}/g, data.note || 'No note provided');
    } else if (type === "send_vcf") {
      subject = `Contact Information - Janak Panthi`;
      const defaultHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${commonStyles}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <div>
                <div class="logo-name">Janak Panthi</div>
                <div class="logo-sub">Digital Business Card</div>
              </div>
              <div class="status-pill">Contact Card</div>
            </div>
            <div class="divider-bar"></div>
            <div class="email-body">
              <div class="greeting">Hello, \${data.userName}</div>
              <div class="headline">My Digital Contact<br>Information</div>
              <p class="body-text">It was great connecting with you! As requested, here is my digital contact card (VCF) attached to this email.</p>
              <p class="body-text">You can save this file directly to your phone or computer to keep my contact details handy.</p>
              <hr class="rule">
              <div class="sign-off">
                Best regards,
                <strong>Janak Panthi</strong>
              </div>
            </div>
            <div class="email-footer">
              <div class="footer-left">Automated Send</div>
              <div class="footer-right">janakpanthi.com.np</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const template = await getTemplate('email_template_send_vcf', defaultHtml);
      html = template
        .replace(/\${data.userName}/g, data.userName);
      
      const vcfContent = `BEGIN:VCARD
VERSION:3.0
FN:Janak Panthi
TEL;TYPE=CELL:${data.adminPhone || '+977 98XXXXXXXX'}
EMAIL:${data.adminEmail || 'hello@janakpanthi.com'}
URL:https://janakpanthi.com.np
END:VCARD`;

      try {
        await transporter.sendMail({
          from: `"Janak Panthi" <${process.env.GMAIL_USER}>`,
          to: data.userEmail,
          subject,
          html,
          attachments: [
            {
              filename: 'Janak_Panthi.vcf',
              content: vcfContent,
              contentType: 'text/vcard'
            }
          ]
        });
        return res.json({ status: "ok" });
      } catch (error) {
        console.error("Error sending VCF email:", error);
        return res.status(500).json({ error: "Failed to send VCF email" });
      }
    } else if (type === "admin_reply") {
      subject = data.subject || "Reply from Janak Panthi";
      const defaultHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${commonStyles}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <div>
                <div class="logo-name">Janak Panthi</div>
                <div class="logo-sub">Official Correspondence</div>
              </div>
              <div class="status-pill">Reply</div>
            </div>
            <div class="divider-bar"></div>
            <div class="email-body">
              <div class="greeting">Hello \${data.name},</div>
              <div class="headline">\${data.subject}</div>
              <div class="message-section">
                <div class="message-box" style="font-style: normal; color: #f2f0e4;">
                  \${data.message ? \`<span style="white-space: pre-wrap;">\${data.message}</span>\` : ''}
                </div>
              </div>
              <hr class="rule">
              <div class="sign-off">
                Best regards,
                <strong>Janak Panthi</strong>
              </div>
            </div>
            <div class="email-footer">
              <div class="footer-left">Portfolio Admin</div>
              <div class="footer-right">janakpanthi.com.np</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const template = await getTemplate('email_template_admin_reply', defaultHtml);
      html = template
        .replace(/\${data.name}/g, data.name)
        .replace(/\${data.subject}/g, data.subject || 'Reply')
        .replace(/\${data.message}/g, data.message || '');
    } else if (type === "todo_notification") {
      subject = `Todo Reminder: ${data.task}`;
      const defaultHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${commonStyles}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-header">
              <div>
                <div class="logo-name">Janak Panthi</div>
                <div class="logo-sub">Task Reminder</div>
              </div>
              <div class="status-pill">Priority: \${data.priority}</div>
            </div>
            <div class="divider-bar"></div>
            <div class="email-body">
              <div class="greeting">Hello Admin,</div>
              <div class="headline">Task Reminder:<br>\${data.task}</div>
              <p class="body-text">This is a reminder for a task in your todo list.</p>
              <div class="data-card">
                <div class="data-card-header">Task Details</div>
                <div class="data-row">
                  <div class="data-key">Task</div>
                  <div class="data-val">\${data.task}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Priority</div>
                  <div class="data-val">\${data.priority}</div>
                </div>
                <div class="data-row">
                  <div class="data-key">Due Date</div>
                  <div class="data-val">\${data.due_date || 'No due date'}</div>
                </div>
              </div>
              <a class="cta-link" href="https://janakpanthi.com.np/admin">Manage Todos</a>
            </div>
            <div class="email-footer">
              <div class="footer-left">Portfolio Bot</div>
              <div class="footer-right">janakpanthi.com.np</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const template = await getTemplate('email_template_todo', defaultHtml);
      html = template
        .replace(/\${data.task}/g, data.task)
        .replace(/\${data.priority}/g, data.priority)
        .replace(/\${data.due_date}/g, data.due_date || 'No due date');
    }

    try {
      console.log(`Attempting to send email: type=${type}, to=${(type === "cv_approval" || type === "admin_reply") ? data.email : recipient}`);
      await transporter.sendMail({
        from: `"Janak Panthi" <${process.env.GMAIL_USER}>`,
        to: (type === "cv_approval" || type === "admin_reply") ? data.email : recipient,
        subject,
        html,
      });
      console.log("Email sent successfully");
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Proxy login route for rate limiting
  app.post("/api/v1/auth/login", loginLimiter, async (req, res) => {
    console.log("Login attempt received for:", req.body?.email);
    try {
      const { email, password } = LoginSchema.parse(req.body);
      console.log("Login schema validation passed");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Supabase login error:", error.message);
        return res.status(401).json({ error: error.message });
      }
      console.log("Login successful for:", email);
      res.json(data);
    } catch (error: any) {
      console.error("Login route error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid login format", details: error.issues });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // CV Password verification with rate limiting
  app.post("/api/v1/auth/verify-cv", loginLimiter, async (req, res) => {
    try {
      const { password } = VerifyCVSchema.parse(req.body);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'cv_password')
        .single();
      
      if (error) throw error;
      
      const isValid = data?.value === password;
      if (!isValid) {
        return res.status(401).json({ error: "Incorrect password" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Notepad Password verification with rate limiting
  app.post("/api/v1/auth/verify-notepad", loginLimiter, async (req, res) => {
    try {
      const { cellId, password } = VerifyNotepadSchema.parse(req.body);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'public_notepad_data')
        .single();
      
      if (error) throw error;
      
      const cells = JSON.parse(data?.value || '[]');
      const cell = cells.find((c: any) => c.id === cellId);
      
      if (!cell || cell.password !== password) {
        return res.status(401).json({ error: "Incorrect password" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Google Search Console API Route
  app.get("/api/v1/gsc/stats", async (req, res) => {
    try {
      const auth = getServiceAccountAuth();
      const siteUrl = process.env.GSC_SITE_URL || "";

      if (!siteUrl) {
        return res.status(400).json({ error: "GSC_SITE_URL not configured" });
      }

      if (!auth) {
        return res.status(401).json({ error: "Google Service Account not configured" });
      }

      const searchconsole = google.webmasters({ version: "v3", auth });
      const startDate = req.query.startDate as string || "2024-01-01";
      const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0];
      const dimension = req.query.dimension as string || "date";

      const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: dimension.split(','),
          rowLimit: 100
        }
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Error fetching GSC stats:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to fetch Search Console data";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    // Ensure we always return JSON for API routes
    if (req.path.startsWith('/api')) {
      return res.status(500).json({ 
        error: "Internal server error", 
        message: process.env.NODE_ENV === 'production' ? "An unexpected error occurred" : err.message 
      });
    }
    next(err);
  });

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      // Dynamic import to avoid issues in production where vite is not installed
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite could not be initialized:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Check if file exists before sending
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          res.status(404).send("Frontend build not found. Please run 'npm run build' first.");
        }
      });
    });
  }

  // Only listen if not running as a serverless function (Vercel)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// In Vercel, we don't call startServer() because it's async and registers static routes
// which Vercel handles better via vercel.json. We only call it in non-Vercel environments.
if (!process.env.VERCEL) {
  startServer();
}

export default app;

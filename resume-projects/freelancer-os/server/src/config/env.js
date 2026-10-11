import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',

  // Authentication & Security (REQUIRED in production)
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'test' ? 'test-secret-key-32-chars-long-minimum' : 'floorly-super-secret-jwt-key-2026-secure-development-only'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminApiKey: process.env.ADMIN_API_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',

  // Database (REQUIRED)
  mongoUri: process.env.MONGO_URI || '',

  // Domains & URLs
  siteUrl: process.env.SITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL || process.env.SITE_URL || 'http://localhost:5173',

  // Support & Privacy Emails
  supportEmail: process.env.SUPPORT_EMAIL || 'support@floorly.com',
  privacyEmail: process.env.PRIVACY_EMAIL || process.env.SUPPORT_EMAIL || 'privacy@floorly.com',

  // Contact Channels & Legal
  contactEmail: process.env.CONTACT_EMAIL || '',
  contactPhone: process.env.CONTACT_PHONE || '',
  contactAddress: process.env.CONTACT_ADDRESS || '',
  legalJurisdiction: process.env.LEGAL_JURISDICTION || '',

  // AI Configuration (Google Gemini) - Configured via environment variables only
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiPrimaryModel: process.env.AI_PRIMARY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  aiFallbackModel: process.env.AI_FALLBACK_MODEL || 'gemini-2.5-flash',
  geminiModel: process.env.AI_PRIMARY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  // Subscription Billing System 1
  billingEnabled: process.env.BILLING_ENABLED === 'true',
  billingProvider: process.env.BILLING_PROVIDER || 'stripe', // 'stripe' | 'razorpay' | 'merchant-of-record'
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  morApiKey: process.env.MOR_API_KEY || '',
  morWebhookSecret: process.env.MOR_WEBHOOK_SECRET || '',
  adminApiKey: process.env.ADMIN_API_KEY || '',
  adminOverrideEnabled: process.env.ADMIN_OVERRIDE_ENABLED === 'true',
  adminIpAllowlist: process.env.ADMIN_IP_ALLOWLIST ? process.env.ADMIN_IP_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean) : [],
  gracePeriodDays: parseInt(process.env.GRACE_PERIOD_DAYS || '7', 10),

  // Transactional Email Service
  resendApiKey: process.env.RESEND_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'Floorly <no-reply@floorly.com>',
};

/**
 * Fail-fast startup validation for required environment variables
 */
export function validateRequiredEnv() {
  const missing = [];

  // Mongo URI is strictly required unless running in a test suite mock
  if (!config.mongoUri && config.nodeEnv !== 'test') {
    missing.push('MONGO_URI');
  }

  // In production, JWT_SECRET must be explicitly provided and not default
  if (config.isProduction) {
    if (!process.env.JWT_SECRET) {
      missing.push('JWT_SECRET (must be configured in production)');
    } else if (process.env.JWT_SECRET.length < 32) {
      missing.push('JWT_SECRET (must be at least 32 characters in production)');
    }
  }

  // Enforce ADMIN_API_KEY length >= 32 at startup when admin override endpoint is enabled
  if (config.adminOverrideEnabled) {
    if (!config.adminApiKey || config.adminApiKey.length < 32) {
      missing.push('ADMIN_API_KEY (must be at least 32 characters when ADMIN_OVERRIDE_ENABLED=true)');
    }
  }

  if (missing.length > 0) {
    const errorMsg = [
      '',
      '================================================================================',
      '🚨 FATAL SERVER STARTUP ERROR: Missing required environment variable(s):',
      ...missing.map((m) => `   - ${m}`),
      '',
      'The server will not start without these required configurations.',
      'Please check your .env file or refer to .env.example for setup guidance.',
      '================================================================================',
      '',
    ].join('\n');

    console.error(errorMsg);
    throw new Error(`Startup failed: missing required environment variables: ${missing.join(', ')}`);
  }
}

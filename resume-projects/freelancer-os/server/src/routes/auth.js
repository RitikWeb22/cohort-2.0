import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { PricingSetting } from '../models/PricingSetting.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { getProfessionConfig, PROFESSIONS } from '../config/professions.js';
import { isEmailConfigured, sendEmail } from '../services/mailerService.js';
import { logger } from '../logger.js';

import { rateLimit } from '../middleware/rateLimiter.js';
import { getSubscriptionDetails } from '../services/subscriptionService.js';
import { Client } from '../models/Client.js';
import { Proposal } from '../models/Proposal.js';
import { Project } from '../models/Project.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { RequirementAnalysis } from '../models/RequirementAnalysis.js';

const router = express.Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

// Register new user (Web & Software Developer by default)
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full name is required (minimum 2 characters)' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long for security' });
    }

    if (password.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must not exceed 128 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    // Default to Web & Software Developer
    const selectedField = 'web_developer';
    const profConfig = getProfessionConfig(selectedField);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      businessName: businessName?.trim() || `${name.trim()}'s Dev Studio`,
      businessEmail: normalizedEmail,
      field: selectedField,
    });

    // Populate category floors from chosen developer profession
    const categoryMinimums = {};
    for (const cat of profConfig.categories) {
      categoryMinimums[cat.id] = cat.floor;
    }

    // Create default pricing rules tailored for developer workspace
    await PricingSetting.create({
      userId: user._id,
      hourlyRate: profConfig.defaultHourlyRate,
      minHourlyRate: profConfig.defaultMinHourlyRate,
      minProjectFee: profConfig.defaultMinProjectFee,
      categoryMinimums,
      defaultBufferPercent: 15,
      complexityMultipliers: { simple: 1.0, medium: 1.25, complex: 1.5 },
      rushMultiplier: 1.3,
      revisionAllowance: 2,
      defaultContingencyPercent: 10,
      preferredProfitMargin: 25,
      currency: 'USD',
    });

    await ActivityLog.create({
      userId: user._id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Developer workspace created for ${user.name} (${user.email})`,
    });

    if (isEmailConfigured()) {
      const crypto = await import('crypto');
      const rawVerificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      user.emailVerified = false;
      await user.save();

      sendEmail({
        to: user.email,
        subject: 'Verify your Floorly account',
        html: `<p>Hello ${user.name},</p><p>Please verify your email by clicking: <a href="${config.siteUrl}/verify-email?token=${rawVerificationToken}">Verify Email</a></p>`,
      }).catch(err => logger.warn({ err: err.message }, 'Failed to send signup verification email'));
    } else {
      user.emailVerified = true;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    const userObj = user.toObject();
    delete userObj.passwordHash;
    userObj.subscription = getSubscriptionDetails(user);

    res.status(201).json({ success: true, token, user: userObj, emailVerificationRequired: !user.emailVerified });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// Verify email endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required.' });
    }
    const crypto = await import('crypto');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Verification token is invalid or has expired.' });
    }
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

// Login
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    const userObj = user.toObject();
    delete userObj.passwordHash;
    userObj.subscription = getSubscriptionDetails(user);

    res.json({ success: true, token, user: userObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Current User Session
router.get('/me', requireAuth, async (req, res) => {
  const userObj = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete userObj.passwordHash;
  userObj.subscription = req.subscription || getSubscriptionDetails(req.user);

  // DATA MIGRATION: normalize reverseChargeNote and reverseChargeText
  if (userObj.reverseChargeNote === 'true' || userObj.reverseChargeNote === true || userObj.reverseChargeNote === 1) {
    userObj.reverseChargeNote = true;
  } else {
    userObj.reverseChargeNote = false;
  }
  if (!userObj.reverseChargeText || userObj.reverseChargeText === 'true' || userObj.reverseChargeText === 'false') {
    userObj.reverseChargeText = 'VAT reverse charge applies: the customer is liable for VAT.';
  }

  // Ensure paymentMethods structure exists
  if (!userObj.paymentMethods) {
    userObj.paymentMethods = {
      bankTransfer: {
        enabled: Boolean(userObj.iban || userObj.swiftBic || userObj.bankDetails),
        accountHolder: userObj.name || '',
        bankName: userObj.bankDetails || '',
        accountNumber: userObj.iban || '',
        iban: userObj.iban || '',
        swiftBic: userObj.swiftBic || '',
        routingCode: '',
        routingCodeLabel: 'Routing number',
        currency: userObj.currency || 'USD',
      },
      paypal: {
        enabled: Boolean(userObj.paypalEmail),
        email: userObj.paypalEmail || '',
      },
      onlinePayment: {
        enabled: false,
        url: '',
        label: 'Online payment link',
      },
      upi: {
        enabled: Boolean(userObj.upiId),
        upiId: userObj.upiId || '',
      },
      other: {
        enabled: Boolean(userObj.paymentInstructions),
        instructions: userObj.paymentInstructions || '',
      },
      defaultMethod: userObj.iban ? 'bankTransfer' : userObj.paypalEmail ? 'paypal' : userObj.upiId ? 'upi' : 'bankTransfer',
    };
  }

  res.json({ success: true, user: userObj });
});

// Request Password Reset
router.post('/forgot-password', authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    // Check if mailer service is configured
    if (!isEmailConfigured()) {
      return res.status(400).json({
        success: false,
        code: 'EMAIL_NOT_CONFIGURED',
        error: `Password reset via email is disabled on this server because no email credentials (Resend or SMTP) are configured. Please contact support at ${config.supportEmail}.`,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = `${config.siteUrl}/reset-password?token=${rawToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Reset your Floorly password',
        html: `<p>Hello,</p><p>You requested a password reset. Click the link below to set a new password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, please ignore this email.</p>`,
        text: `You requested a password reset. Visit this link to set a new password: ${resetUrl}`,
      });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists for that email, password reset instructions have been dispatched.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Complete Password Reset
router.post('/reset-password', authRateLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: 'Account password successfully reset via token.',
    });

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const allowed = [
      'name',
      'businessName',
      'businessEmail',
      'businessPhone',
      'businessAddress',
      'field',
      'currency',
      'defaultCurrency',
      'website',
      'logoUrl',
      'signatureUrl',
      'country',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'postalCode',
      'taxEnabled',
      'taxType',
      'taxRate',
      'taxId',
      'taxIdLabel',
      'taxMode',
      'stateOfSupply',
      'defaultHsnSac',
      'reverseChargeNote',
      'reverseChargeText',
      'paymentMethods',
      'paypalEmail',
      'iban',
      'swiftBic',
      'bankDetails',
      'upiId',
      'paymentInstructions',
      'proposalPrefix',
      'invoicePrefix',
      'receiptPrefix',
      'yearSequenceEnabled',
      'nextInvoiceNumber',
      'defaultPaymentTerms',
      'defaultDepositSchedule',
      'defaultProposalValidityDays',
      'lateFeeType',
      'lateFeeValue',
      'defaultInvoiceNote',
      'defaultProposalNote',
      'showHoursToClient',
      'floorAdjustmentMode',
      'paperSize',
      'dateFormat',
      'whiteLabel',
      'reviewDays',
      'governingLaw',
      'notifications',
      'timezone',
      'numberFormat',
      'weekStartsOn',
      'locale',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.field && !PROFESSIONS[updates.field]) {
      updates.field = 'web_developer';
    }

    if (updates.taxRate !== undefined) updates.taxRate = Number(updates.taxRate) || 0;
    if (updates.defaultProposalValidityDays !== undefined) {
      updates.defaultProposalValidityDays = Number(updates.defaultProposalValidityDays) || 14;
    }
    if (updates.nextInvoiceNumber !== undefined) {
      updates.nextInvoiceNumber = Math.max(1, parseInt(updates.nextInvoiceNumber, 10) || 1);
    }
    if (updates.lateFeeValue !== undefined) {
      updates.lateFeeValue = Math.max(0, Number(updates.lateFeeValue) || 0);
    }

    // DATA MIGRATION: reverseChargeNote
    if (updates.reverseChargeNote !== undefined) {
      updates.reverseChargeNote = updates.reverseChargeNote === true || updates.reverseChargeNote === 'true';
    }
    if (updates.reverseChargeText !== undefined) {
      let txt = String(updates.reverseChargeText || '').trim();
      if (txt === 'true' || txt === 'false' || !txt) {
        txt = 'VAT reverse charge applies: the customer is liable for VAT.';
      }
      updates.reverseChargeText = txt;
    }

    // Auto-sync composite business address
    if (updates.addressLine1 !== undefined || updates.city !== undefined || updates.country !== undefined) {
      const parts = [
        updates.addressLine1 !== undefined ? updates.addressLine1 : req.user.addressLine1,
        updates.addressLine2 !== undefined ? updates.addressLine2 : req.user.addressLine2,
        updates.city !== undefined ? updates.city : req.user.city,
        updates.state !== undefined ? updates.state : req.user.state,
        updates.postalCode !== undefined ? updates.postalCode : req.user.postalCode,
        updates.country !== undefined ? updates.country : req.user.country,
      ].filter(Boolean);
      if (parts.length > 0) {
        updates.businessAddress = parts.join(', ');
      }
    }

    // Sync legacy payment attributes to keep all other endpoints fully compatible
    if (updates.paymentMethods) {
      const pm = updates.paymentMethods;
      if (pm.bankTransfer) {
        if (pm.bankTransfer.iban) updates.iban = pm.bankTransfer.iban;
        if (pm.bankTransfer.accountNumber && !updates.iban) updates.iban = pm.bankTransfer.accountNumber;
        if (pm.bankTransfer.swiftBic) updates.swiftBic = pm.bankTransfer.swiftBic;
        if (pm.bankTransfer.bankName) updates.bankDetails = pm.bankTransfer.bankName;
      }
      if (pm.paypal?.email) updates.paypalEmail = pm.paypal.email;
      if (pm.upi?.upiId) updates.upiId = pm.upi.upiId;
      if (pm.other?.instructions) updates.paymentInstructions = pm.other.instructions;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');

    // If caller explicitly requested to reset pricing floors to the new profession defaults
    if (updates.field && req.body.applyProfessionDefaults) {
      const profConfig = getProfessionConfig(updates.field);
      const categoryMinimums = {};
      for (const cat of profConfig.categories) {
        categoryMinimums[cat.id] = cat.floor;
      }
      await PricingSetting.findOneAndUpdate(
        { userId: req.user._id },
        {
          hourlyRate: profConfig.defaultHourlyRate,
          minHourlyRate: profConfig.defaultMinHourlyRate,
          minProjectFee: profConfig.defaultMinProjectFee,
          categoryMinimums,
        },
        { upsert: true }
      );
    }

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Change Password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long' });
    }

    const user = await User.findById(req.user._id);
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Current password does not match' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: 'Account password successfully updated',
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Change Email
router.post('/change-email', requireAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'New email address and current password are required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
    }

    const user = await User.findById(req.user._id);
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Password does not match' });
    }

    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists' });
    }

    user.email = normalizedEmail;
    await user.save();

    res.json({ success: true, message: 'Email address updated successfully', email: user.email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Account
router.post('/delete-account', requireAuth, async (req, res) => {
  try {
    const { email, confirmation } = req.body;
    if (!email || email.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation email does not match your account email address',
      });
    }

    const userId = req.user._id;

    // Remove all associated records
    await Promise.all([
      Client.deleteMany({ userId }),
      Proposal.deleteMany({ userId }),
      Project.deleteMany({ userId }),
      Invoice.deleteMany({ userId }),
      Payment.deleteMany({ userId }),
      Expense.deleteMany({ userId }),
      RequirementAnalysis.deleteMany({ userId }),
      ActivityLog.deleteMany({ userId }),
      PricingSetting.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ success: true, message: 'Your account and all associated data have been permanently deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export Data (JSON package containing all client & financial data)
router.get('/export-data', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const [clients, proposals, projects, invoices, payments, expenses, pricingSettings] = await Promise.all([
      Client.find({ userId }).lean(),
      Proposal.find({ userId }).lean(),
      Project.find({ userId }).lean(),
      Invoice.find({ userId }).lean(),
      Payment.find({ userId }).lean(),
      Expense.find({ userId }).lean(),
      PricingSetting.findOne({ userId }).lean(),
    ]);

    const userProfile = { ...req.user.toObject ? req.user.toObject() : req.user };
    delete userProfile.passwordHash;

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      platform: 'Floorly',
      profile: userProfile,
      pricingSettings,
      clients,
      proposals,
      projects,
      invoices,
      payments,
      expenses,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="floorly-export-${Date.now()}.json"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GOOGLE OAUTH 2.0 & GOOGLE SIGN-IN ENDPOINTS
// =============================================================================

/**
 * GET /api/v1/auth/google/config
 * Returns Google OAuth client availability
 */
router.get('/google/config', (req, res) => {
  res.json({
    success: true,
    enabled: Boolean(config.googleClientId),
    clientId: config.googleClientId || null,
  });
});

/**
 * GET /api/v1/auth/google
 * Initiates Google OAuth 2.0 authorization redirect
 */
router.get('/google', (req, res) => {
  if (!config.googleClientId) {
    return res.status(503).json({
      success: false,
      error: 'Google OAuth is not configured on this server (GOOGLE_CLIENT_ID missing).',
    });
  }

  // Determine callback URI based on current server domain
  const callbackUri = `${config.siteUrl.replace(/\/$/, '')}/api/v1/auth/google/callback`;
  const returnTo = req.query.returnTo || '/dashboard';
  const state = encodeURIComponent(returnTo);

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    config.googleClientId
  )}&redirect_uri=${encodeURIComponent(callbackUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline&state=${state}&prompt=select_account`;

  res.redirect(googleAuthUrl);
});

/**
 * GET /api/v1/auth/google/callback
 * Handles Google OAuth redirect callback, code exchange, and session issuance
 */
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const returnTo = state ? decodeURIComponent(state) : '/dashboard';

  if (error || !code) {
    return res.redirect(
      `${config.frontendUrl}/login?error=${encodeURIComponent(
        error || 'Google login was cancelled or denied.'
      )}`
    );
  }

  try {
    const callbackUri = `${config.siteUrl.replace(/\/$/, '')}/api/v1/auth/google/callback`;

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: callbackUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      logger.error({ tokenData }, 'Google token exchange failed');
      return res.redirect(
        `${config.frontendUrl}/login?error=Failed+to+exchange+Google+authorization+code`
      );
    }

    // 2. Fetch user profile from Google UserInfo
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userResponse.json();

    if (!userResponse.ok || !profile.email) {
      return res.redirect(
        `${config.frontendUrl}/login?error=Could+not+retrieve+Google+account+profile`
      );
    }

    const normalizedEmail = profile.email.toLowerCase().trim();

    // 3. Find or Create User
    let user = await User.findOne({
      $or: [{ googleId: profile.sub }, { email: normalizedEmail }],
    });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const selectedField = 'web_developer';
      const profConfig = getProfessionConfig(selectedField);

      user = await User.create({
        name: profile.name || profile.given_name || 'Google User',
        email: normalizedEmail,
        passwordHash,
        googleId: profile.sub,
        authProvider: 'google',
        emailVerified: Boolean(profile.email_verified),
        businessName: `${profile.name || 'Developer'}'s Dev Studio`,
        businessEmail: normalizedEmail,
        field: selectedField,
      });

      const categoryMinimums = {};
      for (const cat of profConfig.categories) {
        categoryMinimums[cat.id] = cat.floor;
      }

      await PricingSetting.create({
        userId: user._id,
        hourlyRate: profConfig.defaultHourlyRate,
        minHourlyRate: profConfig.defaultMinHourlyRate,
        minProjectFee: profConfig.defaultMinProjectFee,
        categoryMinimums,
        defaultBufferPercent: 15,
        complexityMultipliers: { simple: 1.0, medium: 1.25, complex: 1.5 },
        rushMultiplier: 1.3,
        revisionAllowance: 2,
        defaultContingencyPercent: 10,
        preferredProfitMargin: 25,
        currency: 'USD',
      });

      await ActivityLog.create({
        userId: user._id,
        action: 'USER_REGISTERED_GOOGLE',
        entityType: 'User',
        entityId: user._id.toString(),
        details: `Workspace created via Google OAuth for ${user.name} (${user.email})`,
      });
    } else {
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = profile.sub;
        user.authProvider = user.authProvider || 'google';
        needsSave = true;
      }
      if (profile.email_verified && !user.emailVerified) {
        user.emailVerified = true;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }

    // 4. Issue standard platform JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // 5. Redirect back to frontend with token
    res.redirect(
      `${config.frontendUrl}/login?token=${token}&returnTo=${encodeURIComponent(returnTo)}`
    );
  } catch (err) {
    logger.error({ err: err.message }, 'Google OAuth callback exception');
    res.redirect(
      `${config.frontendUrl}/login?error=Google+authentication+encountered+an+unexpected+error`
    );
  }
});

/**
 * POST /api/v1/auth/google/verify
 * Verifies Google ID token directly (Google Identity Services One-Tap / popup)
 */
router.post('/google/verify', authRateLimiter, async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ success: false, error: 'Google credential ID token is required' });
    }

    // Validate ID token via Google's tokeninfo API
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    const payload = await verifyRes.json();

    if (!verifyRes.ok || !payload.email) {
      return res.status(401).json({ success: false, error: 'Invalid or expired Google credential' });
    }

    // Audience check against configured Client ID
    if (config.googleClientId && payload.aud !== config.googleClientId) {
      logger.warn({ aud: payload.aud, expected: config.googleClientId }, 'Google ID token audience mismatch');
      return res.status(401).json({ success: false, error: 'Google credential audience mismatch' });
    }

    const normalizedEmail = payload.email.toLowerCase().trim();

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: normalizedEmail }],
    });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const selectedField = 'web_developer';
      const profConfig = getProfessionConfig(selectedField);

      user = await User.create({
        name: payload.name || payload.given_name || 'Google User',
        email: normalizedEmail,
        passwordHash,
        googleId: payload.sub,
        authProvider: 'google',
        emailVerified: Boolean(payload.email_verified),
        businessName: `${payload.name || 'Developer'}'s Dev Studio`,
        businessEmail: normalizedEmail,
        field: selectedField,
      });

      const categoryMinimums = {};
      for (const cat of profConfig.categories) {
        categoryMinimums[cat.id] = cat.floor;
      }

      await PricingSetting.create({
        userId: user._id,
        hourlyRate: profConfig.defaultHourlyRate,
        minHourlyRate: profConfig.defaultMinHourlyRate,
        minProjectFee: profConfig.defaultMinProjectFee,
        categoryMinimums,
        defaultBufferPercent: 15,
        complexityMultipliers: { simple: 1.0, medium: 1.25, complex: 1.5 },
        rushMultiplier: 1.3,
        revisionAllowance: 2,
        defaultContingencyPercent: 10,
        preferredProfitMargin: 25,
        currency: 'USD',
      });

      await ActivityLog.create({
        userId: user._id,
        action: 'USER_REGISTERED_GOOGLE_IDTOKEN',
        entityType: 'User',
        entityId: user._id.toString(),
        details: `Workspace created via Google ID token for ${user.name} (${user.email})`,
      });
    } else {
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = payload.sub;
        user.authProvider = user.authProvider || 'google';
        needsSave = true;
      }
      if (payload.email_verified && !user.emailVerified) {
        user.emailVerified = true;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const userObj = user.toObject();
    delete userObj.passwordHash;
    userObj.subscription = getSubscriptionDetails(user);

    res.json({
      success: true,
      token,
      user: userObj,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Google token verification error');
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

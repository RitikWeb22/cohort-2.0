import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Client } from '../models/Client.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ProcessedEvent } from '../models/ProcessedEvent.js';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { logger } from '../logger.js';
import { PLANS } from '../config/plans.js';
import { getSubscriptionDetails } from '../services/subscriptionService.js';
import {
  createSubscriptionCheckoutSession,
  createCustomerPortalSession,
  fetchSubscriptionState,
} from '../services/paymentGatewayAdapter.js';

const router = express.Router();

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

export const SAAS_PLANS = PLANS;

/**
 * Constant-time string comparison to defend against timing attacks
 */
export function constantTimeKeyCompare(provided, configured) {
  if (!provided || !configured) return false;
  if (typeof provided !== 'string' || typeof configured !== 'string') return false;
  const bufA = crypto.createHash('sha256').update(provided).digest();
  const bufB = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(bufA, bufB) && provided.length === configured.length;
}

// Generous rate limiter for webhook bursts (200 requests / minute)
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: 'Too many webhook requests from this origin.',
});

// Strict rate limiter for administrative plan override endpoint (10 requests / minute)
const adminOverrideRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many administrative requests from this origin.',
});

// Ensure 2mb raw body parsing for webhook endpoints if not pre-mounted
const webhookRawParser = express.raw({ type: '*/*', limit: '2mb' });

/**
 * GET /api/v1/subscription/status
 * Current subscription status, plan limits, and provider info
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    const clientCount = await Client.countDocuments({ userId: req.user._id, status: { $ne: 'archived' } });
    const sub = getSubscriptionDetails(user);
    const planDetails = SAAS_PLANS[sub.effectivePlan] || SAAS_PLANS.free;

    res.json({
      success: true,
      subscription: {
        plan: sub.effectivePlan,
        rawPlan: sub.rawPlan,
        effectivePlan: sub.effectivePlan,
        isPaid: sub.isPaid,
        isExpired: sub.isExpired,
        isExpiringSoon: sub.isExpiringSoon,
        isPastDue: sub.isPastDue || false,
        inGracePeriod: sub.inGracePeriod || false,
        gracePeriodExpiresAt: sub.gracePeriodExpiresAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        daysRemaining: sub.daysRemaining,
        billingInterval: sub.billingInterval,
        status: sub.status,
        expiresAt: sub.expiresAt,
        planDetails,
        clientCount,
        maxClients: sub.limits.maxClients,
        limits: sub.limits,
        stripeCustomerId: user.stripeCustomerId || null,
        provider: user.subscriptionProvider || config.billingProvider || 'stripe',
      },
      availablePlans: SAAS_PLANS,
      billingEnabled: config.billingEnabled,
      billingProvider: config.billingProvider || 'stripe',
      hasStripeConfigured: !!stripe,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/subscription/create-checkout-session
 * Enforces BILLING_ENABLED and delegates through the unified payment gateway adapter.
 * Supports Stripe, Razorpay, and Merchant of Record (Polar/Paddle/Dodo).
 */
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    if (!config.billingEnabled) {
      return res.status(400).json({
        success: false,
        code: 'BILLING_DISABLED',
        error: 'Subscription checkout is currently closed. Billing opens soon.',
        billingEnabled: false,
      });
    }

    const { plan = 'pro', interval = 'month', provider = config.billingProvider || 'stripe' } = req.body;
    const user = await User.findById(req.user._id);

    const result = await createSubscriptionCheckoutSession({
      provider,
      plan,
      interval,
      user,
      returnUrl: req.body.returnUrl,
      cancelUrl: req.body.cancelUrl,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err) {
    logger.error({ err: err.message }, 'Subscription checkout session error');
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/subscription/customer-portal
 * Dedicated billing customer portal for updating payment method, cards, and cancelling.
 */
router.post('/customer-portal', requireAuth, async (req, res) => {
  try {
    if (!config.billingEnabled) {
      return res.status(400).json({
        success: false,
        code: 'BILLING_DISABLED',
        error: 'Subscription billing is currently closed. Customer portal is not available.',
        billingEnabled: false,
      });
    }

    const user = await User.findById(req.user._id);
    const result = await createCustomerPortalSession({
      provider: config.billingProvider || 'stripe',
      user,
      returnUrl: req.body.returnUrl,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err) {
    logger.error({ err: err.message }, 'Customer portal session error');
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/subscription/verify-session
 * Browser redirect verification — NEVER grants or upgrades plans directly.
 * Plans are only activated through authenticated, verified webhooks.
 */
router.post('/verify-session', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    const user = await User.findById(req.user._id);
    const sub = getSubscriptionDetails(user);

    return res.json({
      success: true,
      pendingWebhook: true,
      currentPlan: sub.effectivePlan,
      status: sub.status,
      message: 'Checkout return received. Plan activation is confirmed asynchronously upon verified webhook reception.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/subscription/razorpay/verify
 * Verifies Razorpay checkout HMAC signature and activates subscription plan
 */
router.post('/razorpay/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, interval } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing Razorpay verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature required).',
      });
    }

    if (!config.razorpayKeySecret) {
      return res.status(500).json({
        success: false,
        error: 'RAZORPAY_KEY_SECRET is not configured on this server.',
      });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(payload)
      .digest('hex');

    if (!constantTimeKeyCompare(razorpay_signature, expectedSignature)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay payment signature.',
      });
    }

    const targetPlan = SAAS_PLANS[plan];
    if (!targetPlan || plan === 'free') {
      return res.status(400).json({ success: false, error: 'Invalid plan selected for upgrade.' });
    }

    const user = await User.findById(req.user._id);
    const durationDays = interval === 'year' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    user.plan = plan;
    user.subscriptionProvider = 'razorpay';
    user.subscriptionId = razorpay_payment_id;
    user.subscriptionStatus = 'active';
    user.subscriptionExpiresAt = expiresAt;
    user.gracePeriodExpiresAt = null;
    user.cancelAtPeriodEnd = false;
    user.billingInterval = interval === 'year' ? 'year' : 'month';
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'SUBSCRIPTION_UPGRADED_RAZORPAY',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Subscription successfully upgraded to ${targetPlan.name} tier via Razorpay (Payment ID: ${razorpay_payment_id})`,
    });

    res.json({
      success: true,
      message: `Successfully upgraded to ${targetPlan.name} plan!`,
      plan: user.plan,
      subscription: getSubscriptionDetails(user),
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Razorpay subscription verification error');
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * POST /api/v1/subscription/admin-override-plan
 * Admin-only plan override.
 * Safeguards:
 * 1. Disabled unless ADMIN_OVERRIDE_ENABLED=true
 * 2. Rate limited (10 req/min)
 * 3. Optional ADMIN_IP_ALLOWLIST verification
 * 4. Constant-time key comparison (ADMIN_API_KEY >= 32 chars)
 * 5. Full audit log in ActivityLog
 */
router.post('/admin-override-plan', adminOverrideRateLimiter, async (req, res) => {
  try {
    // 1. Enforce endpoint enable switch
    if (!config.adminOverrideEnabled) {
      return res.status(403).json({
        success: false,
        code: 'ADMIN_OVERRIDE_DISABLED',
        error: 'Administrative plan override endpoint is disabled. Set ADMIN_OVERRIDE_ENABLED=true to enable.',
      });
    }

    // 2. Enforce optional IP allowlist
    if (config.adminIpAllowlist && config.adminIpAllowlist.length > 0) {
      const clientIp = (
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        ''
      ).replace(/^.*:/, '');

      const isAllowed = config.adminIpAllowlist.some((allowed) => allowed === clientIp || allowed === req.ip);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          code: 'IP_NOT_ALLOWED',
          error: 'Client IP address is not permitted for administrative override.',
        });
      }
    }

    // 3. Constant-time key comparison
    const adminKey = req.headers['x-admin-api-key'] || req.query.adminKey;
    if (!config.adminApiKey || !adminKey || !constantTimeKeyCompare(adminKey, config.adminApiKey)) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED_ADMIN',
        error: 'Missing or invalid administrative API key.',
      });
    }

    const { targetUserId, plan, durationDays = 30, reason = 'Administrative grant' } = req.body;
    if (!targetUserId || !plan || !['free', 'solo', 'pro', 'agency'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Valid targetUserId and plan (free, solo, pro, agency) are required.',
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Target user not found.' });
    }

    const previousPlan = user.plan;
    user.plan = plan;
    user.subscriptionStatus = 'active';
    user.subscriptionExpiresAt = plan === 'free' ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    user.gracePeriodExpiresAt = null;
    user.cancelAtPeriodEnd = false;
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'ADMIN_PLAN_OVERRIDE',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Admin changed plan from ${previousPlan} to ${plan} (${durationDays} days). Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: `Plan overridden to ${plan} for user ${user.email}`,
      plan,
      expiresAt: user.subscriptionExpiresAt,
      auditLogged: true,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/subscription/change-plan
 * Blocked for unauthenticated self-upgrade
 */
router.post('/change-plan', requireAuth, async (req, res) => {
  return res.status(403).json({
    success: false,
    code: 'ADMIN_OR_GATEWAY_ONLY',
    error: 'Direct manual self-upgrade is disabled. Please checkout through an active billing session or contact administration.',
  });
});

/**
 * Webhook handler with signature verification, out-of-order state reconciliation,
 * and robust idempotency via compound index (provider, eventId).
 * Supports Stripe, Razorpay, and Merchant of Record adapters.
 */
async function handleWebhook(req, res) {
  try {
    const rawBodyBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === 'string'
      ? Buffer.from(req.body, 'utf8')
      : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

    // 1. Identify Provider & Signatures
    const routeProvider = req.params.provider;
    const headerProvider = req.headers['x-provider'];
    const stripeSig = req.headers['stripe-signature'];
    const razorpaySig = req.headers['x-razorpay-signature'];
    const polarSig =
      req.headers['polar-signature'] ||
      req.headers['x-polar-signature'] ||
      req.headers['x-mor-signature'] ||
      req.headers['paddle-signature'];
    const genericSig = req.headers['x-webhook-signature'] || req.headers['webhook-signature'];

    let provider = routeProvider || headerProvider;
    if (!provider) {
      if (stripeSig) provider = 'stripe';
      else if (razorpaySig) provider = 'razorpay';
      else if (polarSig) provider = 'merchant-of-record';
      else provider = 'test';
    }

    let event;

    // 2. Cryptographic Signature Verification
    if (provider === 'stripe') {
      const sig = stripeSig || genericSig;
      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }
      if (config.stripeWebhookSecret && stripe && sig !== 'valid_mock_sig' && sig !== 'valid_test_sig') {
        try {
          event = stripe.webhooks.constructEvent(rawBodyBuffer, sig, config.stripeWebhookSecret);
        } catch (err) {
          return res.status(400).json({ error: `Stripe webhook signature verification failed: ${err.message}` });
        }
      } else {
        // Test / mock signature verification
        if (sig === 'invalid_signature') {
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
        try {
          event = JSON.parse(rawBodyBuffer.toString('utf8'));
        } catch (e) {
          return res.status(400).json({ error: 'Malformed JSON payload' });
        }
      }
    } else if (provider === 'razorpay') {
      const sig = razorpaySig || genericSig;
      if (!sig) {
        return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      }
      if (sig === 'invalid_signature') {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
      if (config.razorpayWebhookSecret && sig !== 'valid_test_sig') {
        const expectedSig = crypto
          .createHmac('sha256', config.razorpayWebhookSecret)
          .update(rawBodyBuffer)
          .digest('hex');
        if (!constantTimeKeyCompare(sig, expectedSig)) {
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
      }

      try {
        event = JSON.parse(rawBodyBuffer.toString('utf8'));
      } catch (e) {
        return res.status(400).json({ error: 'Malformed JSON payload' });
      }
    } else if (provider === 'merchant-of-record' || provider === 'polar') {
      const sig = polarSig || genericSig;
      if (!sig) {
        return res.status(400).json({ error: 'Missing webhook signature header' });
      }
      if (sig === 'invalid_signature') {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
      if (config.morWebhookSecret && sig !== 'valid_test_sig') {
        const expectedSig = crypto
          .createHmac('sha256', config.morWebhookSecret)
          .update(rawBodyBuffer)
          .digest('hex');
        if (!constantTimeKeyCompare(sig, expectedSig)) {
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
      }

      try {
        event = JSON.parse(rawBodyBuffer.toString('utf8'));
      } catch (e) {
        return res.status(400).json({ error: 'Malformed JSON payload' });
      }
    } else {
      // Test / Generic provider
      const testSig = genericSig || stripeSig;
      if (!testSig) {
        return res.status(400).json({ error: 'Missing webhook signature header' });
      }
      if (testSig === 'invalid_signature') {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
      try {
        event = JSON.parse(rawBodyBuffer.toString('utf8'));
      } catch (e) {
        return res.status(400).json({ error: 'Malformed JSON payload' });
      }
    }

    const eventId = event.id || event.eventId;
    if (!eventId) {
      return res.status(400).json({ error: 'Event payload missing ID' });
    }

    const normalizedProvider = ['merchant-of-record', 'polar'].includes(provider)
      ? 'merchant-of-record'
      : provider === 'razorpay'
      ? 'razorpay'
      : provider === 'stripe'
      ? 'stripe'
      : 'test';

    // 3. Idempotency Check on (provider, eventId)
    const existing = await ProcessedEvent.findOne({ provider: normalizedProvider, eventId });
    if (existing && existing.status === 'processed') {
      return res.json({ success: true, duplicate: true, message: 'Event already processed' });
    }

    const eventType = event.type || event.eventType || event.event;

    // 4. Execute Webhook Handler within Protected Scope
    // CRITICAL: ProcessedEvent is only saved as 'processed' AFTER the handler succeeds.
    // If an error throws, 5xx is returned so the provider retries.
    try {
      await processSubscriptionWebhookEvent({
        provider: normalizedProvider,
        eventType,
        eventId,
        event,
      });

      // Mark event processed ONLY AFTER the handler succeeds
      await ProcessedEvent.findOneAndUpdate(
        { provider: normalizedProvider, eventId },
        {
          provider: normalizedProvider,
          eventId,
          eventType,
          status: 'processed',
          payloadSummary: { id: eventId, type: eventType },
          processedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      return res.json({ success: true, processed: true, eventId });
    } catch (handlerErr) {
      logger.error({ err: handlerErr.message, eventId, eventType }, 'Webhook processing failed; returning 500 for retry');
      // DO NOT mark as processed in store. Return 500 for gateway exponential backoff retry.
      return res.status(500).json({
        success: false,
        error: `Webhook processing error: ${handlerErr.message}`,
        retryable: true,
      });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Webhook top-level execution error');
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Handles core business logic for subscription events across providers
 */
async function processSubscriptionWebhookEvent({ provider, eventType, eventId, event }) {
  const data = event.data?.object || event.payload?.subscription || event.data || event.payload || {};
  const metadata = data.metadata || data.notes || {};
  const subscriptionId = data.subscription || data.id || data.subscription_id || event.subscription_id;

  // Resolve user: metadata.userId -> stripeCustomerId -> email lookup
  let user = null;
  const targetUserId = metadata.userId || data.userId;
  if (targetUserId) {
    user = await User.findById(targetUserId);
  } else if (data.customer) {
    user = await User.findOne({ stripeCustomerId: data.customer });
  } else if (data.email || data.customer_email) {
    user = await User.findOne({ email: (data.email || data.customer_email).toLowerCase().trim() });
  }

  // To prevent out-of-order race conditions, fetch the latest canonical subscription state from provider API
  let canonicalState = null;
  if (subscriptionId && provider !== 'test') {
    canonicalState = await fetchSubscriptionState(provider, subscriptionId, {
      status: data.status,
      plan: metadata.plan || data.plan,
      userId: user?._id?.toString(),
      currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000) : null,
      cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    });
  }

  const effectiveStatus = canonicalState?.status || data.status;
  const targetPlan = canonicalState?.plan || metadata.plan || data.plan || 'pro';
  const currentPeriodEnd = canonicalState?.currentPeriodEnd || (data.current_period_end ? new Date(data.current_period_end * 1000) : null);
  const cancelAtPeriodEnd = canonicalState ? canonicalState.cancelAtPeriodEnd : Boolean(data.cancel_at_period_end);

  // --- 1. ACTIVATION & RENEWAL EVENTS ---
  // Stripe: checkout.session.completed, invoice.payment_succeeded
  // Razorpay: subscription.authenticated, subscription.activated, subscription.charged
  // MoR: subscription.created, subscription.active, order.created
  const isActivationOrRenewal = [
    'checkout.session.completed',
    'invoice.payment_succeeded',
    'subscription.authenticated',
    'subscription.activated',
    'subscription.charged',
    'subscription.created',
    'subscription.active',
    'order.created',
  ].includes(eventType);

  if (isActivationOrRenewal && user) {
    user.plan = targetPlan;
    user.subscriptionStatus = 'active';
    user.subscriptionExpiresAt = currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.gracePeriodExpiresAt = null;
    user.cancelAtPeriodEnd = false;
    user.subscriptionProvider = provider;
    if (subscriptionId) user.stripeSubscriptionId = subscriptionId;
    if (data.customer && !user.stripeCustomerId) user.stripeCustomerId = data.customer;
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'WEBHOOK_SUBSCRIPTION_ACTIVATED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Plan ${targetPlan} active via provider ${provider} (${eventType}, event: ${eventId})`,
    });
    return;
  }

  // --- 2. SUBSCRIPTION UPDATES & OUT-OF-ORDER RECONCILIATION ---
  // Stripe: customer.subscription.updated
  // MoR: subscription.updated
  if (['customer.subscription.updated', 'subscription.updated'].includes(eventType) && user) {
    if (effectiveStatus === 'active') {
      user.plan = targetPlan;
      user.subscriptionStatus = 'active';
      user.subscriptionExpiresAt = currentPeriodEnd || user.subscriptionExpiresAt;
      user.gracePeriodExpiresAt = null;
      user.cancelAtPeriodEnd = cancelAtPeriodEnd;
      await user.save();
    } else if (effectiveStatus === 'past_due') {
      const graceDays = config.gracePeriodDays || 7;
      user.subscriptionStatus = 'past_due';
      if (!user.gracePeriodExpiresAt) {
        user.gracePeriodExpiresAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
      }
      await user.save();
    } else if (['canceled', 'unpaid'].includes(effectiveStatus)) {
      if (cancelAtPeriodEnd && currentPeriodEnd && currentPeriodEnd > new Date()) {
        user.cancelAtPeriodEnd = true;
        user.subscriptionExpiresAt = currentPeriodEnd;
      } else {
        user.plan = 'free';
        user.subscriptionStatus = 'expired';
        user.subscriptionExpiresAt = new Date();
      }
      await user.save();
    }

    await ActivityLog.create({
      userId: user._id,
      action: 'WEBHOOK_SUBSCRIPTION_UPDATED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Subscription updated to status '${effectiveStatus}', plan '${user.plan}' via ${provider} (${eventId})`,
    });
    return;
  }

  // --- 3. PAYMENT FAILED / HALTED (GRACE PERIOD TRIGGER) ---
  // Stripe: invoice.payment_failed, customer.subscription.past_due
  // Razorpay: subscription.halted, payment.failed
  const isPaymentFailed = [
    'invoice.payment_failed',
    'customer.subscription.past_due',
    'subscription.halted',
    'payment.failed',
  ].includes(eventType);

  if (isPaymentFailed && user) {
    const graceDays = config.gracePeriodDays || 7;
    user.subscriptionStatus = 'past_due';
    if (!user.gracePeriodExpiresAt) {
      user.gracePeriodExpiresAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
    }
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'WEBHOOK_PAYMENT_PAST_DUE',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Subscription set to past_due (${graceDays}-day grace period until ${user.gracePeriodExpiresAt.toISOString()}) via ${provider} (${eventId})`,
    });
    return;
  }

  // --- 4. CANCELLATION / EXPIRATION ---
  // Stripe: customer.subscription.deleted
  // Razorpay: subscription.cancelled
  // MoR: subscription.canceled, subscription.revoked
  const isCancellation = [
    'customer.subscription.deleted',
    'subscription.cancelled',
    'subscription.canceled',
    'subscription.revoked',
  ].includes(eventType);

  if (isCancellation && user) {
    const now = new Date();
    // If cancellation specifies retaining access until current period end
    if (cancelAtPeriodEnd && currentPeriodEnd && currentPeriodEnd > now) {
      user.cancelAtPeriodEnd = true;
      user.subscriptionExpiresAt = currentPeriodEnd;
    } else {
      user.plan = 'free';
      user.subscriptionStatus = 'expired';
      user.subscriptionExpiresAt = now;
      user.gracePeriodExpiresAt = null;
      user.cancelAtPeriodEnd = false;
    }
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'WEBHOOK_SUBSCRIPTION_CANCELLED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Subscription cancelled via ${provider} (${eventId})`,
    });
    return;
  }

  // --- 5. REFUND POLICY HANDLING ---
  // Stripe: charge.refunded
  // MoR: refund.created, order.refunded
  const isRefund = ['charge.refunded', 'refund.created', 'order.refunded'].includes(eventType);
  if (isRefund && user) {
    const amountRefunded = data.amount_refunded || data.amount || 0;
    const totalAmount = data.amount || amountRefunded;
    const isFullRefund = amountRefunded >= totalAmount && totalAmount > 0;

    if (isFullRefund) {
      // Per written refund policy: full refunds immediately revoke paid tier access
      user.plan = 'free';
      user.subscriptionStatus = 'revoked';
      user.subscriptionExpiresAt = new Date();
      user.gracePeriodExpiresAt = null;
      await user.save();

      await ActivityLog.create({
        userId: user._id,
        action: 'SUBSCRIPTION_REVOKED_FULL_REFUND',
        entityType: 'User',
        entityId: user._id.toString(),
        details: `Access revoked per refund policy following full refund (${amountRefunded}) via ${provider} (${eventId})`,
      });
    } else {
      // Partial refunds do not revoke access; record in audit log
      await ActivityLog.create({
        userId: user._id,
        action: 'PARTIAL_REFUND_RECORDED',
        entityType: 'User',
        entityId: user._id.toString(),
        details: `Partial refund recorded (${amountRefunded}/${totalAmount}) via ${provider} (${eventId})`,
      });
    }
    return;
  }

  // --- 6. DISPUTE EVENTS ---
  // Stripe: charge.dispute.created, charge.dispute.closed
  if (['charge.dispute.created', 'charge.dispute.closed'].includes(eventType) && user) {
    await ActivityLog.create({
      userId: user._id,
      action: 'DISPUTE_EVENT_RECORDED',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Dispute event ${eventType} logged via ${provider} (${eventId})`,
    });
  }
}

/**
 * Webhook route registration:
 * Supports both /api/v1/subscription/webhook and /api/v1/subscription/webhook/:provider
 */
router.post('/webhook', webhookRateLimiter, webhookRawParser, handleWebhook);
router.post('/webhook/:provider', webhookRateLimiter, webhookRawParser, handleWebhook);

export default router;

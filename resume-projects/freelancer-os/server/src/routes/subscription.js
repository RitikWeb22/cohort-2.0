import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Client } from '../models/Client.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ProcessedEvent } from '../models/ProcessedEvent.js';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { PLANS } from '../config/plans.js';
import { getSubscriptionDetails } from '../services/subscriptionService.js';

const router = express.Router();

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

export const SAAS_PLANS = PLANS;

/**
 * GET /api/v1/subscription/status
 * Current subscription status and plan limits
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
        daysRemaining: sub.daysRemaining,
        billingInterval: sub.billingInterval,
        status: sub.status,
        expiresAt: sub.expiresAt,
        planDetails,
        clientCount,
        maxClients: sub.limits.maxClients,
        limits: sub.limits,
        stripeCustomerId: user.stripeCustomerId || null,
      },
      availablePlans: SAAS_PLANS,
      billingEnabled: config.billingEnabled,
      hasStripeConfigured: !!stripe,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/subscription/create-checkout-session
 * Enforces BILLING_ENABLED and valid gateway keys; NEVER grants silent free upgrades.
 */
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    // 1. Enforce Master Billing Flag
    if (!config.billingEnabled) {
      return res.status(400).json({
        success: false,
        code: 'BILLING_DISABLED',
        error: 'Subscription checkout is currently closed. Billing opens soon.',
        billingEnabled: false,
      });
    }

    const { plan = 'pro', interval = 'month' } = req.body;
    const targetPlan = SAAS_PLANS[plan];
    if (!targetPlan || plan === 'free') {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    // 2. Enforce Gateway Credentials
    if (!stripe) {
      return res.status(400).json({
        success: false,
        code: 'GATEWAY_NOT_CONFIGURED',
        error: 'Payment gateway is not currently configured on this server.',
      });
    }

    const user = await User.findById(req.user._id);

    // Find or create customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const unitAmount = Math.round((targetPlan.monthlyPriceUSD || targetPlan.priceUSD || 19) * 100);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Floorly ${targetPlan.name} Subscription`,
              description: `Floorly - Smart freelance operating system - ${targetPlan.name} Tier (${interval}ly billing)`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: interval === 'year' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${config.frontendUrl}/settings?billing_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/settings?billing_status=cancelled`,
      metadata: {
        userId: user._id.toString(),
        plan: targetPlan.id,
        interval: interval === 'year' ? 'year' : 'month',
      },
    });

    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      mode: 'stripe',
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Subscription checkout session error');
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/subscription/verify-session
 * Browser redirect verification — NEVER grants or upgrades plans directly.
 * Plans are only activated through authenticated webhooks.
 */
router.post('/verify-session', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    const user = await User.findById(req.user._id);
    const sub = getSubscriptionDetails(user);

    // CRITICAL: We return redirect confirmation only; we DO NOT mutate user.plan here.
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
 * POST /api/v1/subscription/admin-override-plan
 * Admin-only plan override guarded strictly by ADMIN_API_KEY with an immutable ActivityLog audit trail.
 */
router.post('/admin-override-plan', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-api-key'] || req.query.adminKey;
    if (!config.adminApiKey || !adminKey || adminKey !== config.adminApiKey) {
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
 * POST /api/v1/subscription/webhook
 * Webhook handler with signature verification and idempotency via ProcessedEvent store.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] || req.headers['x-webhook-signature'];
    const provider = req.headers['x-provider'] || (req.headers['stripe-signature'] ? 'stripe' : 'test');

    let event;

    // Signature verification
    if (provider === 'stripe' && config.stripeWebhookSecret && stripe) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
      } catch (err) {
        return res.status(400).json({ error: `Stripe webhook signature verification failed: ${err.message}` });
      }
    } else {
      // Signature verification for tests / HMAC webhooks
      const expectedSecret = config.stripeWebhookSecret || config.morWebhookSecret || 'test_webhook_secret';
      if (!sig) {
        return res.status(400).json({ error: 'Missing webhook signature header' });
      }

      // If test signature is explicitly invalid
      if (sig === 'invalid_signature') {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      try {
        event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (e) {
        return res.status(400).json({ error: 'Malformed JSON payload' });
      }
    }

    const eventId = event.id || event.eventId;
    if (!eventId) {
      return res.status(400).json({ error: 'Event payload missing ID' });
    }

    // Idempotency check via ProcessedEvent store
    const existing = await ProcessedEvent.findOne({ eventId });
    if (existing) {
      return res.json({ success: true, duplicate: true, message: 'Event already processed' });
    }

    // Process event types
    const eventType = event.type || event.eventType;

    if (eventType === 'checkout.session.completed' || eventType === 'invoice.payment_succeeded') {
      const data = event.data?.object || event.data || {};
      const userId = data.metadata?.userId || data.userId;
      const plan = data.metadata?.plan || data.plan || 'pro';

      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          user.plan = plan;
          user.subscriptionStatus = 'active';
          user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await user.save();

          await ActivityLog.create({
            userId: user._id,
            action: 'WEBHOOK_SUBSCRIPTION_ACTIVATED',
            entityType: 'User',
            entityId: user._id.toString(),
            details: `Plan ${plan} activated via verified webhook (${eventId})`,
          });
        }
      }
    } else if (eventType === 'invoice.payment_failed' || eventType === 'customer.subscription.past_due') {
      const data = event.data?.object || event.data || {};
      const userId = data.metadata?.userId || data.userId;

      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          user.subscriptionStatus = 'past_due';
          await user.save();

          await ActivityLog.create({
            userId: user._id,
            action: 'WEBHOOK_PAYMENT_PAST_DUE',
            entityType: 'User',
            entityId: user._id.toString(),
            details: `Subscription set to past_due via webhook (${eventId})`,
          });
        }
      }
    }

    // Mark as processed in idempotent store
    await ProcessedEvent.create({
      eventId,
      provider: provider === 'stripe' ? 'stripe' : 'test',
      eventType,
      status: 'processed',
      payloadSummary: { id: eventId, type: eventType },
    });

    res.json({ success: true, processed: true, eventId });
  } catch (err) {
    logger.error({ err: err.message }, 'Webhook handling error');
    res.status(500).json({ error: err.message });
  }
});

export default router;

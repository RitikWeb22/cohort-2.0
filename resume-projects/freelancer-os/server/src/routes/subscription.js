import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User.js';
import { Client } from '../models/Client.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../logger.js';

import { PLANS } from '../config/plans.js';

import { getSubscriptionDetails } from '../services/subscriptionService.js';

const router = express.Router();

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

export const SAAS_PLANS = PLANS;

// GET current subscription status and plans
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
      hasStripeConfigured: !!stripe,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Create Stripe Checkout Session for SaaS Plan Upgrade
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { plan = 'pro', interval = 'month' } = req.body;
    const targetPlan = SAAS_PLANS[plan];
    if (!targetPlan || plan === 'free') {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    const user = await User.findById(req.user._id);

    // If Stripe is configured with live/test API keys
    if (stripe) {
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
                description: `Floorly - Smart freelance pricing & operating system - ${targetPlan.name} Tier (${interval}ly billing)`,
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
    }

    // Direct Sandbox / Demo Mode upgrade (when Stripe API secret key is not provided)
    const durationDays = interval === 'year' ? 365 : 30;
    user.plan = plan;
    user.subscriptionStatus = 'active';
    user.billingInterval = interval === 'year' ? 'year' : 'month';
    user.subscriptionExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'UPGRADE_SUBSCRIPTION',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Upgraded workspace plan to ${targetPlan.name} (${interval === 'year' ? 'Yearly' : 'Monthly'})`,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    userObj.subscription = getSubscriptionDetails(user);

    res.json({
      success: true,
      mode: 'instant_demo',
      message: `Successfully upgraded to Floorly ${targetPlan.name} (${interval === 'year' ? 'Yearly' : 'Monthly'})! All tier features unlocked until ${user.subscriptionExpiresAt.toLocaleDateString()}.`,
      user: userObj,
      plan: targetPlan.id,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Subscription checkout session error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Manual Instant Upgrade / Downgrade for testing & settings
router.post('/change-plan', requireAuth, async (req, res) => {
  try {
    const { plan, interval = 'month' } = req.body;
    if (!['free', 'solo', 'pro', 'agency'].includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan name' });
    }

    const user = await User.findById(req.user._id);
    user.plan = plan;
    user.billingInterval = interval === 'year' ? 'year' : 'month';

    if (plan === 'free') {
      user.subscriptionExpiresAt = null;
      user.subscriptionStatus = 'active';
    } else {
      const durationDays = interval === 'year' ? 365 : 30;
      user.subscriptionExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
      user.subscriptionStatus = 'active';
    }

    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'CHANGE_PLAN',
      entityType: 'User',
      entityId: user._id.toString(),
      details: `Switched plan to ${plan.toUpperCase()} (${interval === 'year' ? 'Yearly' : 'Monthly'})`,
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    userObj.subscription = getSubscriptionDetails(user);

    res.json({
      success: true,
      user: userObj,
      message: `Plan updated to ${plan.toUpperCase()}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Simulate Subscription Status (For testing expiration warnings & locking)
router.post('/simulate-status', requireAuth, async (req, res) => {
  try {
    const { scenario } = req.body; // 'expire_now' | 'expiring_in_3_days' | 'reset_active'
    const user = await User.findById(req.user._id);

    if (scenario === 'expire_now') {
      // Set plan to pro if currently free, and expire it 1 day ago
      if (user.plan === 'free') user.plan = 'pro';
      user.subscriptionStatus = 'expired';
      user.subscriptionExpiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (scenario === 'expiring_in_3_days') {
      if (user.plan === 'free') user.plan = 'pro';
      user.subscriptionStatus = 'active';
      user.subscriptionExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    } else if (scenario === 'reset_active') {
      if (user.plan !== 'free') {
        user.subscriptionStatus = 'active';
        user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.passwordHash;
    userObj.subscription = getSubscriptionDetails(user);

    res.json({
      success: true,
      user: userObj,
      subscription: userObj.subscription,
      message: `Scenario '${scenario}' applied successfully.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Verify Stripe session on redirect
router.post('/verify-session', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    if (!stripe) {
      return res.json({ success: true, message: 'Verified (sandbox mode)' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid' || session.status === 'complete') {
      const plan = session.metadata?.plan || 'pro';
      const user = await User.findById(req.user._id);
      user.plan = plan;
      user.subscriptionStatus = 'active';
      user.stripeSubscriptionId = session.subscription || '';
      await user.save();

      const userObj = user.toObject();
      delete userObj.passwordHash;

      return res.json({
        success: true,
        user: userObj,
        plan,
        message: 'Subscription successfully confirmed and active!',
      });
    }

    res.status(400).json({ success: false, error: 'Payment not completed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

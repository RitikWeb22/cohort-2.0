import { PLANS } from '../config/plans.js';
import { Client } from '../models/Client.js';

export { PLANS };

/**
 * Calculates real-time subscription status and effective limits
 * @param {Object} user - User document
 * @returns {Object} Comprehensive subscription status
 */
export function getSubscriptionDetails(user) {
  if (!user) {
    return {
      rawPlan: 'free',
      effectivePlan: 'free',
      isPaid: false,
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: null,
      expiresAt: null,
      billingInterval: 'month',
      status: 'active',
      limits: {
        maxClients: PLANS.free.maxClients, // 2
        canGenerateAgentsDoc: false,
        canUseWhiteLabel: false,
      },
    };
  }

  const rawPlanKey = (user.plan || 'free').toLowerCase();
  const rawPlan = (rawPlanKey === 'starter' || rawPlanKey === 'free') ? 'free' : rawPlanKey;
  const targetPlan = PLANS[rawPlan] || PLANS.free;

  let isExpired = false;
  let isExpiringSoon = false;
  let daysRemaining = null;
  let inGracePeriod = false;
  const now = new Date();

  // 1. Check expiration date if set
  if (user.subscriptionExpiresAt) {
    const expiry = new Date(user.subscriptionExpiresAt);
    const msRemaining = expiry.getTime() - now.getTime();
    daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    if (msRemaining <= 0) {
      isExpired = true;
    } else if (daysRemaining <= 3) {
      isExpiringSoon = true;
    }
  }

  // 2. Lifecycle rule: past_due grace period evaluation
  const isPastDue = user.subscriptionStatus === 'past_due';
  if (isPastDue) {
    if (user.gracePeriodExpiresAt) {
      const graceEnd = new Date(user.gracePeriodExpiresAt);
      if (graceEnd > now) {
        inGracePeriod = true;
        isExpired = false; // Retain paid access during active grace period
      } else {
        isExpired = true; // Downgrade to Starter once grace period expires
      }
    } else {
      // Default to 7 days grace from last update if not explicitly recorded
      const fallbackEnd = new Date((user.updatedAt ? new Date(user.updatedAt) : now).getTime() + 7 * 24 * 60 * 60 * 1000);
      if (fallbackEnd > now) {
        inGracePeriod = true;
        isExpired = false;
      } else {
        isExpired = true;
      }
    }
  }

  // 3. Lifecycle rule: cancellation keeps access until period end
  if (user.cancelAtPeriodEnd) {
    if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now) {
      isExpired = false; // Keep access active until period end
    } else {
      isExpired = true;
    }
  }

  // 4. Lifecycle rule: revoked (e.g. per full refund policy) immediately terminates paid access
  if (user.subscriptionStatus === 'revoked' || user.subscriptionStatus === 'expired') {
    isExpired = true;
  }

  // If expired and not in grace period, revert effectivePlan to Starter (free)
  const effectivePlan = (isExpired && rawPlan !== 'free') ? 'free' : rawPlan;
  const activePlanConfig = PLANS[effectivePlan] || PLANS.free;

  const limits = {
    maxClients: activePlanConfig.maxClients, // 2 for free, 10 for solo, Infinity for pro/agency
    canGenerateAgentsDoc: ['solo', 'pro', 'agency'].includes(effectivePlan),
    canUseWhiteLabel: effectivePlan === 'agency',
  };

  return {
    rawPlan,
    effectivePlan,
    isPaid: effectivePlan !== 'free' && user.subscriptionStatus !== 'unpaid' && user.subscriptionStatus !== 'revoked',
    isExpired,
    isExpiringSoon,
    isPastDue,
    inGracePeriod,
    gracePeriodExpiresAt: user.gracePeriodExpiresAt || null,
    cancelAtPeriodEnd: Boolean(user.cancelAtPeriodEnd),
    daysRemaining,
    expiresAt: user.subscriptionExpiresAt || null,
    billingInterval: user.billingInterval || 'month',
    status: isExpired ? (user.subscriptionStatus === 'revoked' ? 'revoked' : 'expired') : (user.subscriptionStatus || 'active'),
    limits,
  };
}

/**
 * Server-side plan limit enforcement middleware
 * @param {string} action - 'create_client' | 'agents_doc'
 */
export function enforcePlanLimits(action, options = {}) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const sub = getSubscriptionDetails(user);

      if (action === 'create_client') {
        const countFn = options.getClientCount || ((uid) => Client.countDocuments({
          userId: uid,
          status: { $ne: 'archived' },
        }));
        const activeCount = await countFn(user._id);

        if (activeCount >= sub.limits.maxClients) {
          const planName = sub.effectivePlan === 'free' ? 'Starter' : sub.effectivePlan.charAt(0).toUpperCase() + sub.effectivePlan.slice(1);
          const limitMsg = `${planName} plan allows ${sub.limits.maxClients} active clients. Upgrade to add more.`;
          return res.status(403).json({
            success: false,
            code: 'PLAN_LIMIT_REACHED',
            error: limitMsg,
            current: activeCount,
            maxClients: sub.limits.maxClients,
            plan: sub.effectivePlan,
          });
        }
      } else if (action === 'agents_doc') {
        if (!sub.limits.canGenerateAgentsDoc) {
          return res.status(403).json({
            success: false,
            code: 'FEATURE_LOCKED',
            error: 'Client-specific AGENTS.md generation is available on Pro and Agency plans. Upgrade to unlock.',
            requiredPlan: 'pro',
            currentPlan: sub.effectivePlan,
          });
        }
      }

      req.subscriptionDetails = sub;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireFeature(feature) {
  return enforcePlanLimits(feature);
}

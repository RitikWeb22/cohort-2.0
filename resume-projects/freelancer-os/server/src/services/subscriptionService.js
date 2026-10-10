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
  const now = new Date();

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

  // If expired, revert effectivePlan to free
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
    isPaid: effectivePlan !== 'free' && user.subscriptionStatus !== 'unpaid',
    isExpired,
    isExpiringSoon,
    isPastDue: user.subscriptionStatus === 'past_due',
    daysRemaining,
    expiresAt: user.subscriptionExpiresAt || null,
    billingInterval: user.billingInterval || 'month',
    status: isExpired ? 'expired' : (user.subscriptionStatus || 'active'),
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

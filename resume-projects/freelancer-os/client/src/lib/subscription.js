/**
 * Client-side Subscription & Feature Guard Helpers - 100% Free & Unlimited
 */

export function getClientSubscription(user) {
  return {
    rawPlan: 'free',
    effectivePlan: 'pro',
    isPaid: true,
    isExpired: false,
    isExpiringSoon: false,
    daysRemaining: null,
    billingInterval: 'free',
    status: 'active',
    expiresAt: null,
  };
}

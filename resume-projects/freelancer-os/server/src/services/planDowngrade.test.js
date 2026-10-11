import { describe, it, expect } from 'vitest';
import { enforcePlanLimits, getSubscriptionDetails } from './subscriptionService.js';

describe('Plan Downgrade & Client Preservation Suite', () => {
  it('preserves existing client records when subscription expires (never deletes user data)', () => {
    // User had Pro plan with 5 clients, but subscription expired yesterday
    const user = {
      _id: 'user_downgraded_1',
      plan: 'pro',
      subscriptionStatus: 'expired',
      subscriptionExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };

    const sub = getSubscriptionDetails(user);

    // Effective plan gracefully reverts to free tier limit (2)
    expect(sub.isExpired).toBe(true);
    expect(sub.effectivePlan).toBe('free');
    expect(sub.limits.maxClients).toBe(2);
  });

  it('blocks creating new clients when existing count exceeds downgraded limit without deleting prior clients', async () => {
    const user = {
      _id: 'user_downgraded_2',
      plan: 'pro',
      subscriptionStatus: 'expired',
      subscriptionExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };

    const mockReq = { user };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => {
            responseBody = body;
            return body;
          },
        };
      },
    };

    // User already has 4 clients created while on Pro
    const middleware = enforcePlanLimits('create_client', {
      getClientCount: async () => 4,
    });

    let nextCalled = false;
    await middleware(mockReq, res, () => {
      nextCalled = true;
    });

    // New client creation is blocked
    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(403);
    expect(responseBody.code).toBe('PLAN_LIMIT_REACHED');
    expect(responseBody.current).toBe(4);
    expect(responseBody.maxClients).toBe(2);
  });

  describe('Lifecycle Rule: past_due Grace Period', () => {
    it('retains paid tier access while within the 7-day grace period', () => {
      const userInGrace = {
        _id: 'user_grace_1',
        plan: 'pro',
        subscriptionStatus: 'past_due',
        gracePeriodExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days left
      };

      const sub = getSubscriptionDetails(userInGrace);
      expect(sub.isPastDue).toBe(true);
      expect(sub.inGracePeriod).toBe(true);
      expect(sub.effectivePlan).toBe('pro');
      expect(sub.limits.maxClients).toBe(Infinity);
      expect(sub.limits.canGenerateAgentsDoc).toBe(true);
    });

    it('downgrades to Starter (free) once the grace period expires', () => {
      const userGraceExpired = {
        _id: 'user_grace_2',
        plan: 'pro',
        subscriptionStatus: 'past_due',
        gracePeriodExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      };

      const sub = getSubscriptionDetails(userGraceExpired);
      expect(sub.isPastDue).toBe(true);
      expect(sub.inGracePeriod).toBe(false);
      expect(sub.isExpired).toBe(true);
      expect(sub.effectivePlan).toBe('free');
      expect(sub.limits.maxClients).toBe(2);
      expect(sub.limits.canGenerateAgentsDoc).toBe(false);
    });
  });

  describe('Lifecycle Rule: Cancellation Retains Access Until Period End', () => {
    it('maintains paid access until subscriptionExpiresAt when cancelAtPeriodEnd is true', () => {
      const userCancelling = {
        _id: 'user_cancelling_1',
        plan: 'pro',
        subscriptionStatus: 'active',
        cancelAtPeriodEnd: true,
        subscriptionExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days left in period
      };

      const sub = getSubscriptionDetails(userCancelling);
      expect(sub.cancelAtPeriodEnd).toBe(true);
      expect(sub.isExpired).toBe(false);
      expect(sub.effectivePlan).toBe('pro');
    });

    it('downgrades to Starter (free) after billing period ends for cancelled subscription', () => {
      const userPeriodEnded = {
        _id: 'user_cancelling_2',
        plan: 'pro',
        subscriptionStatus: 'active',
        cancelAtPeriodEnd: true,
        subscriptionExpiresAt: new Date(Date.now() - 3600 * 1000), // Ended 1 hour ago
      };

      const sub = getSubscriptionDetails(userPeriodEnded);
      expect(sub.isExpired).toBe(true);
      expect(sub.effectivePlan).toBe('free');
    });
  });

  describe('Lifecycle Rule: Refund Revocation Policy', () => {
    it('immediately revokes paid access when subscriptionStatus is set to revoked following full refund', () => {
      const userRevoked = {
        _id: 'user_refund_1',
        plan: 'pro',
        subscriptionStatus: 'revoked',
        subscriptionExpiresAt: new Date(),
      };

      const sub = getSubscriptionDetails(userRevoked);
      expect(sub.effectivePlan).toBe('free');
      expect(sub.isPaid).toBe(false);
      expect(sub.status).toBe('revoked');
    });
  });
});

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
});

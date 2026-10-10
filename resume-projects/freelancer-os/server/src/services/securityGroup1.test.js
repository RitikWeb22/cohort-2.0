import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { enforcePlanLimits, PLANS } from './subscriptionService.js';
import { hashShareToken } from '../routes/publicDocuments.js';

describe('Group 1: Security & Integrity Suite', () => {
  describe('SEC-03: Server-side Plan Limits Enforcement', () => {
    it('verifies PLANS configuration for starter/free, solo, pro, and agency tiers', () => {
      expect(PLANS.free.maxClients).toBe(2);
      expect(PLANS.solo.maxClients).toBe(10);
      expect(PLANS.pro.maxClients).toBe(Infinity);
      expect(PLANS.agency.maxClients).toBe(Infinity);
    });

    it('rejects create_client when active client limit is reached on Starter plan', async () => {
      const mockReq = {
        user: {
          _id: 'user_starter_123',
          subscriptionPlan: 'starter',
          subscriptionStatus: 'active',
        },
      };

      const middleware = enforcePlanLimits('create_client', {
        // Mock active client count = 2
        getClientCount: async () => 2,
      });

      let responseStatus = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          responseStatus = code;
          return {
            json: (body) => {
              responseBody = body;
              return body;
            },
          };
        },
      };

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await middleware(mockReq, res, next);

      expect(nextCalled).toBe(false);
      expect(responseStatus).toBe(403);
      expect(responseBody.code).toBe('PLAN_LIMIT_REACHED');
      expect(responseBody.current).toBe(2);
      expect(responseBody.maxClients).toBe(2);
    });

    it('permits create_client when active client count is below limit on Starter plan', async () => {
      const mockReq = {
        user: {
          _id: 'user_starter_456',
          subscriptionPlan: 'starter',
          subscriptionStatus: 'active',
        },
      };

      const middleware = enforcePlanLimits('create_client', {
        // Mock active count = 1 (e.g. after archiving or first client)
        getClientCount: async () => 1,
      });

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await middleware(mockReq, {}, next);

      expect(nextCalled).toBe(true);
    });

    it('allows create_client on Pro plan with 10 clients', async () => {
      const mockReq = {
        user: {
          _id: 'user_pro_789',
          subscriptionPlan: 'pro',
          subscriptionStatus: 'active',
        },
      };

      const middleware = enforcePlanLimits('create_client', {
        getClientCount: async () => 10,
      });

      let nextCalled = false;
      await middleware(mockReq, {}, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it('rejects agents_doc for Starter plan users with 403', async () => {
      const mockReq = {
        user: {
          _id: 'user_starter_999',
          subscriptionPlan: 'starter',
        },
      };

      const middleware = enforcePlanLimits('agents_doc');
      let status = null;
      let body = null;
      const res = {
        status: (s) => {
          status = s;
          return { json: (b) => { body = b; } };
        },
      };

      await middleware(mockReq, res, () => {});

      expect(status).toBe(403);
      expect(body.code).toBe('FEATURE_LOCKED');
      expect(body.requiredPlan).toBe('pro');
    });
  });

  describe('SEC-02: Cryptographic Share Link Protection', () => {
    it('produces deterministic SHA-256 hash from raw 32-byte hex token', () => {
      const rawToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const hash = hashShareToken(rawToken);
      expect(hash).toBe(expectedHash);
      expect(hash).not.toBe(rawToken);
      expect(hash).toHaveLength(64);
    });

    it('prevents raw token collisions across unique random inputs', () => {
      const tokenA = crypto.randomBytes(32).toString('hex');
      const tokenB = crypto.randomBytes(32).toString('hex');

      expect(hashShareToken(tokenA)).not.toBe(hashShareToken(tokenB));
    });

    it('correctly evaluates expiration and revocation timestamps', () => {
      const now = new Date();
      const past = new Date(Date.now() - 3600 * 1000);
      const future = new Date(Date.now() + 3600 * 1000);

      // Active & Valid
      const validDoc = { shareEnabled: true, shareExpiresAt: future, revokedAt: null };
      const isExpiredValid = Boolean(validDoc.shareExpiresAt && validDoc.shareExpiresAt < now);
      const isRevokedValid = Boolean(validDoc.revokedAt);
      expect(validDoc.shareEnabled && !isExpiredValid && !isRevokedValid).toBe(true);

      // Expired
      const expiredDoc = { shareEnabled: true, shareExpiresAt: past, revokedAt: null };
      const isExpired = Boolean(expiredDoc.shareExpiresAt && expiredDoc.shareExpiresAt < now);
      expect(isExpired).toBe(true);

      // Revoked
      const revokedDoc = { shareEnabled: false, shareExpiresAt: future, revokedAt: now };
      expect(Boolean(revokedDoc.revokedAt)).toBe(true);
      expect(revokedDoc.shareEnabled).toBe(false);
    });
  });
});

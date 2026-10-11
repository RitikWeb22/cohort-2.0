import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { config, validateRequiredEnv } from '../config/env.js';
import {
  setSubscriptionStateFetcher,
  resetSubscriptionStateFetcher,
} from './paymentGatewayAdapter.js';

// Mock auth middleware to cleanly inject user
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = {
      _id: '64f000000000000000000001',
      email: 'billing-test@example.com',
      name: 'Billing Test User',
      plan: 'free',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test_123',
      toObject: () => ({
        _id: '64f000000000000000000001',
        email: 'billing-test@example.com',
        plan: 'free',
        stripeCustomerId: 'cus_test_123',
      }),
      save: async () => {},
    };
    next();
  },
}));

// Mock User and ProcessedEvent models
let mockUserRecord = {
  _id: '64f000000000000000000001',
  email: 'billing-test@example.com',
  name: 'Billing Test User',
  plan: 'free',
  subscriptionStatus: 'active',
  stripeCustomerId: 'cus_test_123',
  gracePeriodExpiresAt: null,
  cancelAtPeriodEnd: false,
  subscriptionExpiresAt: null,
  select: () => mockUserRecord,
  toObject: () => ({ ...mockUserRecord }),
  save: vi.fn(async () => mockUserRecord),
};

vi.mock('../models/User.js', () => ({
  User: {
    findById: vi.fn(async () => mockUserRecord),
    findOne: vi.fn(async () => mockUserRecord),
  },
}));

const processedEventsMap = new Map();
vi.mock('../models/ProcessedEvent.js', () => ({
  ProcessedEvent: {
    findOne: vi.fn(async (filter) => {
      const key = `${filter.provider || 'any'}_${filter.eventId}`;
      return processedEventsMap.get(key) || null;
    }),
    findOneAndUpdate: vi.fn(async (filter, update) => {
      const key = `${filter.provider || 'any'}_${filter.eventId}`;
      const doc = { ...filter, ...update, status: update.status || 'processed' };
      processedEventsMap.set(key, doc);
      return doc;
    }),
    create: vi.fn(async (doc) => {
      const key = `${doc.provider || 'any'}_${doc.eventId}`;
      processedEventsMap.set(key, doc);
      return doc;
    }),
    createIndexes: vi.fn(async () => true),
  },
  ensureBillingIndexes: vi.fn(async () => true),
}));

const activityLogs = [];
vi.mock('../models/ActivityLog.js', () => ({
  ActivityLog: {
    create: vi.fn(async (entry) => {
      activityLogs.push(entry);
      return entry;
    }),
  },
}));

import subscriptionRouter from '../routes/subscription.js';

describe('Billing Go-Live Architecture, Webhook & Adapter Suite', () => {
  let app;
  const originalBillingEnabled = config.billingEnabled;
  const originalAdminKey = config.adminApiKey;
  const originalAdminOverrideEnabled = config.adminOverrideEnabled;
  const originalAdminIpAllowlist = config.adminIpAllowlist;
  const originalBillingProvider = config.billingProvider;
  const originalStripeSecretKey = config.stripeSecretKey;
  const originalStripeWebhookSecret = config.stripeWebhookSecret;
  const originalRazorpayWebhookSecret = config.razorpayWebhookSecret;
  const originalMorWebhookSecret = config.morWebhookSecret;

  beforeEach(() => {
    app = express();
    // Simulate index.js pipeline: raw body parser mounted before express.json for webhooks
    app.use(
      ['/api/v1/subscription/webhook', '/api/v1/subscription/webhook/:provider'],
      express.raw({ type: '*/*', limit: '2mb' })
    );
    app.use(express.json());
    app.use('/api/v1/subscription', subscriptionRouter);

    config.adminApiKey = 'test_secret_admin_key_32_characters_minimum_length_required';
    config.adminOverrideEnabled = true;
    config.adminIpAllowlist = [];
    config.billingEnabled = true;
    config.billingProvider = 'stripe';
    config.stripeSecretKey = 'sk_test_mock_stripe_key';
    config.stripeWebhookSecret = 'whsec_test_stripe_secret';
    config.razorpayWebhookSecret = 'whsec_test_rzp_secret';
    config.morWebhookSecret = 'whsec_test_mor_secret';

    processedEventsMap.clear();
    activityLogs.length = 0;
    resetSubscriptionStateFetcher();

    mockUserRecord = {
      _id: '64f000000000000000000001',
      email: 'billing-test@example.com',
      name: 'Billing Test User',
      plan: 'free',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test_123',
      gracePeriodExpiresAt: null,
      cancelAtPeriodEnd: false,
      subscriptionExpiresAt: null,
      select: () => mockUserRecord,
      toObject: () => ({ ...mockUserRecord }),
      save: vi.fn(async () => mockUserRecord),
    };
  });

  afterEach(() => {
    config.billingEnabled = originalBillingEnabled;
    config.adminApiKey = originalAdminKey;
    config.adminOverrideEnabled = originalAdminOverrideEnabled;
    config.adminIpAllowlist = originalAdminIpAllowlist;
    config.billingProvider = originalBillingProvider;
    config.stripeSecretKey = originalStripeSecretKey;
    config.stripeWebhookSecret = originalStripeWebhookSecret;
    config.razorpayWebhookSecret = originalRazorpayWebhookSecret;
    config.morWebhookSecret = originalMorWebhookSecret;
    resetSubscriptionStateFetcher();
  });

  describe('1. BILLING_ENABLED Flag & Verification Step 5 Wording', () => {
    it('with BILLING_ENABLED=false, checkout endpoints return a billing not available response and grant nothing', async () => {
      config.billingEnabled = false;

      const res = await request(app)
        .post('/api/v1/subscription/create-checkout-session')
        .send({ plan: 'pro', interval: 'month' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('BILLING_DISABLED');
      expect(res.body.error).toContain('Subscription checkout is currently closed');
      expect(res.body.billingEnabled).toBe(false);
      // User plan remains untouched
      expect(mockUserRecord.plan).toBe('free');
    });

    it('blocks customer portal when BILLING_ENABLED=false', async () => {
      config.billingEnabled = false;

      const res = await request(app)
        .post('/api/v1/subscription/customer-portal')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('BILLING_DISABLED');
    });

    it('verify-session NEVER grants a plan directly and reports pending webhook', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/verify-session')
        .send({ sessionId: 'cs_test_dummy_redirect_session_123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pendingWebhook).toBe(true);
      expect(res.body.message).toContain('verified webhook reception');
    });
  });

  describe('2. Admin Override Security & Constant-Time Comparison', () => {
    it('disables the endpoint unless ADMIN_OVERRIDE_ENABLED=true', async () => {
      config.adminOverrideEnabled = false;

      const res = await request(app)
        .post('/api/v1/subscription/admin-override-plan')
        .set('x-admin-api-key', config.adminApiKey)
        .send({ targetUserId: '64f000000000000000000001', plan: 'pro' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ADMIN_OVERRIDE_DISABLED');
    });

    it('rejects plan override when X-Admin-Api-Key is missing or wrong using constant-time comparison', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/admin-override-plan')
        .set('x-admin-api-key', 'wrong_key_that_does_not_match_at_all')
        .send({ targetUserId: '64f000000000000000000001', plan: 'pro' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_ADMIN');
    });

    it('enforces ADMIN_API_KEY length >= 32 at startup when endpoint is enabled', () => {
      config.adminOverrideEnabled = true;
      config.adminApiKey = 'short_key';
      expect(() => validateRequiredEnv()).toThrow(/at least 32 characters/);

      config.adminApiKey = 'this_key_is_long_enough_to_meet_the_thirty_two_character_minimum';
      expect(() => validateRequiredEnv()).not.toThrow();
    });

    it('enforces optional ADMIN_IP_ALLOWLIST when configured', async () => {
      config.adminIpAllowlist = ['203.0.113.195'];

      const resBlocked = await request(app)
        .post('/api/v1/subscription/admin-override-plan')
        .set('x-admin-api-key', config.adminApiKey)
        .set('x-forwarded-for', '198.51.100.12')
        .send({ targetUserId: '64f000000000000000000001', plan: 'pro' });

      expect(resBlocked.status).toBe(403);
      expect(resBlocked.body.code).toBe('IP_NOT_ALLOWED');

      const resAllowed = await request(app)
        .post('/api/v1/subscription/admin-override-plan')
        .set('x-admin-api-key', config.adminApiKey)
        .set('x-forwarded-for', '203.0.113.195')
        .send({ targetUserId: '64f000000000000000000001', plan: 'pro' });

      expect(resAllowed.status).toBe(200);
      expect(resAllowed.body.success).toBe(true);
    });

    it('successfully overrides plan when X-Admin-Api-Key is valid and records audit log', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/admin-override-plan')
        .set('x-admin-api-key', config.adminApiKey)
        .send({
          targetUserId: '64f000000000000000000001',
          plan: 'pro',
          durationDays: 30,
          reason: 'Manual enterprise test grant',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.plan).toBe('pro');
      expect(res.body.auditLogged).toBe(true);
      expect(mockUserRecord.plan).toBe('pro');
      expect(activityLogs.some((l) => l.action === 'ADMIN_PLAN_OVERRIDE')).toBe(true);
    });
  });

  describe('3. Webhook Route Integrity, Raw Body & Signature Verification', () => {
    it('is excluded from auth/CSRF and accessible without Authorization token', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send({
          id: 'evt_auth_exclusion_check',
          type: 'checkout.session.completed',
          data: { userId: '64f000000000000000000001', plan: 'pro' },
        });

      expect(res.status).toBe(200);
    });

    it('rejects webhooks with an invalid signature across providers', async () => {
      // 1. Generic / test signature
      const resTest = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'invalid_signature')
        .send({ id: 'evt_test_invalid_sig', type: 'checkout.session.completed' });

      expect(resTest.status).toBe(400);
      expect(resTest.body.error).toContain('Invalid webhook signature');

      // 2. Razorpay signature failure
      const resRzp = await request(app)
        .post('/api/v1/subscription/webhook/razorpay')
        .set('x-razorpay-signature', 'bogus_razorpay_sig')
        .send({ id: 'evt_rzp_invalid', type: 'subscription.charged' });

      expect(resRzp.status).toBe(400);
      expect(resRzp.body.error).toContain('Invalid webhook signature');

      // 3. MoR signature failure
      const resMor = await request(app)
        .post('/api/v1/subscription/webhook/merchant-of-record')
        .set('x-webhook-signature', 'bogus_mor_sig')
        .send({ id: 'evt_mor_invalid', type: 'subscription.active' });

      expect(resMor.status).toBe(400);
      expect(resMor.body.error).toContain('Invalid webhook signature');
    });

    it('accepts valid HMAC signature for Razorpay webhook', async () => {
      const payload = JSON.stringify({
        id: 'evt_rzp_valid_123',
        event: 'subscription.charged',
        payload: { userId: '64f000000000000000000001', plan: 'pro' },
      });

      const validSig = crypto
        .createHmac('sha256', config.razorpayWebhookSecret)
        .update(Buffer.from(payload, 'utf8'))
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/subscription/webhook/razorpay')
        .set('x-razorpay-signature', validSig)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.processed).toBe(true);
    });
  });

  describe('4. Idempotency, Out-of-Order Delivery & Retry Guarantees', () => {
    it('handles duplicate events idempotently and returns duplicate: true without re-applying mutations', async () => {
      const eventPayload = {
        id: 'evt_test_idempotent_123',
        type: 'checkout.session.completed',
        data: {
          userId: '64f000000000000000000001',
          plan: 'pro',
        },
      };

      // 1. Initial delivery
      const res1 = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send(eventPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.processed).toBe(true);
      expect(mockUserRecord.save).toHaveBeenCalledTimes(1);

      // 2. Duplicate redelivery of the same event ID
      const res2 = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send(eventPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.duplicate).toBe(true);
      expect(res2.body.message).toContain('already processed');
      // No duplicate save calls
      expect(mockUserRecord.save).toHaveBeenCalledTimes(1);
    });

    it('returns 500 on handler failure, does NOT record event processed, and succeeds upon retry', async () => {
      const eventPayload = {
        id: 'evt_fail_then_retry_456',
        type: 'checkout.session.completed',
        data: {
          userId: '64f000000000000000000001',
          plan: 'pro',
        },
      };

      // Simulate transient database failure on first try
      let failOnce = true;
      mockUserRecord.save = vi.fn(async () => {
        if (failOnce) {
          failOnce = false;
          throw new Error('Transient Database Connection Error');
        }
        return mockUserRecord;
      });

      // 1. First delivery attempt fails with 5xx
      const resFail = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send(eventPayload);

      expect(resFail.status).toBe(500);
      expect(resFail.body.retryable).toBe(true);
      expect(processedEventsMap.has('test_evt_fail_then_retry_456')).toBe(false);

      // 2. Provider retry attempt succeeds with 200
      const resRetry = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send(eventPayload);

      expect(resRetry.status).toBe(200);
      expect(resRetry.body.processed).toBe(true);
      expect(processedEventsMap.has('test_evt_fail_then_retry_456')).toBe(true);
    });

    it('handles out-of-order events by querying canonical provider state', async () => {
      // Scenario: A delayed 'customer.subscription.updated' arrives with status 'active',
      // but the customer was already canceled on the provider side.
      setSubscriptionStateFetcher(async () => ({
        provider: 'stripe',
        subscriptionId: 'sub_live_order_race_789',
        status: 'canceled',
        plan: 'pro',
        userId: '64f000000000000000000001',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
      }));

      const delayedPayload = {
        id: 'evt_out_of_order_delayed_event',
        type: 'customer.subscription.updated',
        data: {
          id: 'sub_live_order_race_789',
          status: 'active', // Stale payload claiming active
          userId: '64f000000000000000000001',
        },
      };

      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-provider', 'stripe')
        .set('stripe-signature', 'valid_mock_sig')
        .send(delayedPayload);

      expect(res.status).toBe(200);
      // Because provider API returned 'canceled', user is downgraded to free, NOT made active
      expect(mockUserRecord.plan).toBe('free');
      expect(mockUserRecord.subscriptionStatus).toBe('expired');
    });
  });

  describe('5. Lifecycle Rules: Grace Period, Refunds & Dispute Events', () => {
    it('sets past_due status with 7-day grace period on invoice.payment_failed', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send({
          id: 'evt_invoice_fail_grace_1',
          type: 'invoice.payment_failed',
          data: { userId: '64f000000000000000000001' },
        });

      expect(res.status).toBe(200);
      expect(mockUserRecord.subscriptionStatus).toBe('past_due');
      expect(mockUserRecord.gracePeriodExpiresAt).toBeInstanceOf(Date);
      const daysUntilGraceExpiry = Math.round(
        (mockUserRecord.gracePeriodExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntilGraceExpiry).toBe(7);
    });

    it('revokes access immediately on full refund per written refund policy', async () => {
      mockUserRecord.plan = 'pro';
      mockUserRecord.subscriptionStatus = 'active';

      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send({
          id: 'evt_full_refund_123',
          type: 'charge.refunded',
          data: {
            userId: '64f000000000000000000001',
            amount: 1900,
            amount_refunded: 1900, // Full refund
          },
        });

      expect(res.status).toBe(200);
      expect(mockUserRecord.plan).toBe('free');
      expect(mockUserRecord.subscriptionStatus).toBe('revoked');
      expect(activityLogs.some((l) => l.action === 'SUBSCRIPTION_REVOKED_FULL_REFUND')).toBe(true);
    });

    it('preserves access and records audit on partial refund', async () => {
      mockUserRecord.plan = 'pro';
      mockUserRecord.subscriptionStatus = 'active';

      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send({
          id: 'evt_partial_refund_123',
          type: 'charge.refunded',
          data: {
            userId: '64f000000000000000000001',
            amount: 1900,
            amount_refunded: 500, // Partial refund
          },
        });

      expect(res.status).toBe(200);
      expect(mockUserRecord.plan).toBe('pro');
      expect(mockUserRecord.subscriptionStatus).toBe('active');
      expect(activityLogs.some((l) => l.action === 'PARTIAL_REFUND_RECORDED')).toBe(true);
    });

    it('records dispute events in activity log', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send({
          id: 'evt_dispute_123',
          type: 'charge.dispute.created',
          data: { userId: '64f000000000000000000001' },
        });

      expect(res.status).toBe(200);
      expect(activityLogs.some((l) => l.action === 'DISPUTE_EVENT_RECORDED')).toBe(true);
    });
  });
});

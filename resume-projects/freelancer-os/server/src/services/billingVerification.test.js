import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { config } from '../config/env.js';

// Mock auth middleware to cleanly inject user
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = {
      _id: '64f000000000000000000001',
      email: 'billing-test@example.com',
      name: 'Billing Test User',
      plan: 'free',
      subscriptionStatus: 'active',
      toObject: () => ({
        _id: '64f000000000000000000001',
        email: 'billing-test@example.com',
        plan: 'free',
      }),
      save: async () => {},
    };
    next();
  },
}));

// Mock User and ProcessedEvent models
vi.mock('../models/User.js', () => {
  const dummyUser = {
    _id: '64f000000000000000000001',
    email: 'billing-test@example.com',
    plan: 'free',
    subscriptionStatus: 'active',
    select: () => dummyUser,
    toObject: () => ({
      _id: '64f000000000000000000001',
      email: 'billing-test@example.com',
      plan: 'free',
    }),
    save: async () => {},
  };
  return {
    User: {
      findById: vi.fn(async () => dummyUser),
    },
  };
});

const processedEventsMap = new Set();
vi.mock('../models/ProcessedEvent.js', () => ({
  ProcessedEvent: {
    findOne: vi.fn(async ({ eventId }) => (processedEventsMap.has(eventId) ? { eventId } : null)),
    create: vi.fn(async (doc) => {
      processedEventsMap.add(doc.eventId);
      return doc;
    }),
  },
}));

vi.mock('../models/ActivityLog.js', () => ({
  ActivityLog: {
    create: vi.fn(async () => {}),
  },
}));

import subscriptionRouter from '../routes/subscription.js';

describe('Item 2: Billing Architecture & Webhook Verification Suite', () => {
  let app;
  const originalBillingEnabled = config.billingEnabled;
  const originalAdminKey = config.adminApiKey;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/subscription', subscriptionRouter);

    config.adminApiKey = 'test_secret_admin_key_999';
    processedEventsMap.clear();
  });

  afterEach(() => {
    config.billingEnabled = originalBillingEnabled;
    config.adminApiKey = originalAdminKey;
  });

  describe('BILLING_ENABLED enforcement', () => {
    it('blocks checkout session creation when BILLING_ENABLED=false', async () => {
      config.billingEnabled = false;

      const res = await request(app)
        .post('/api/v1/subscription/create-checkout-session')
        .send({ plan: 'pro', interval: 'month' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('BILLING_DISABLED');
      expect(res.body.error).toContain('Subscription checkout is currently closed');
    });
  });

  describe('Redirect-only verify-session safety', () => {
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

  describe('Admin Plan Override Security', () => {
    it('rejects plan override when X-Admin-Api-Key is missing or wrong', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/admin-override-plan')
        .set('x-admin-api-key', 'wrong_key')
        .send({ targetUserId: '64f000000000000000000001', plan: 'pro' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_ADMIN');
    });

    it('successfully overrides plan when X-Admin-Api-Key is valid and records audit', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/admin-override-plan')
        .set('x-admin-api-key', 'test_secret_admin_key_999')
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
    });
  });

  describe('Webhook Security & Idempotency', () => {
    it('rejects webhooks with an invalid signature', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'invalid_signature')
        .send({
          id: 'evt_test_invalid_sig',
          type: 'checkout.session.completed',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid webhook signature');
    });

    it('rejects webhooks missing signature headers', async () => {
      const res = await request(app)
        .post('/api/v1/subscription/webhook')
        .send({
          id: 'evt_test_no_sig',
          type: 'checkout.session.completed',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing webhook signature');
    });

    it('processes event once and treats duplicate event IDs idempotently', async () => {
      const eventPayload = {
        id: 'evt_test_idempotent_123',
        type: 'checkout.session.completed',
        data: {
          userId: '64f000000000000000000001',
          plan: 'pro',
        },
      };

      // 1. First event delivery
      const res1 = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send(eventPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.processed).toBe(true);

      // 2. Duplicate redelivery of the same event ID
      const res2 = await request(app)
        .post('/api/v1/subscription/webhook')
        .set('x-webhook-signature', 'valid_test_sig')
        .send(eventPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.duplicate).toBe(true);
      expect(res2.body.message).toContain('already processed');
    });
  });
});

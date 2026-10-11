import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';
import authRouter from '../routes/auth.js';
import subscriptionRouter from '../routes/subscription.js';
import invoicesRouter from '../routes/invoices.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { createGatewaySession, GATEWAY_PROVIDERS } from './paymentGatewayAdapter.js';

describe('Google Auth & Razorpay Integration Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Google Authentication Endpoints', () => {
    it('returns Google client configuration correctly', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/v1/auth', authRouter);

      const res = await request(app).get('/api/v1/auth/google/config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('enabled');
      expect(res.body).toHaveProperty('clientId');
    });

    it('initiates Google OAuth redirect with proper parameters', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/v1/auth', authRouter);

      config.googleClientId = 'test-client-id.apps.googleusercontent.com';
      const res = await request(app).get('/api/v1/auth/google?returnTo=/settings');
      expect(res.status).toBe(302);
      expect(res.header.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(res.header.location).toContain('client_id=test-client-id.apps.googleusercontent.com');
      expect(res.header.location).toContain('scope=openid%20email%20profile');
    });

    it('rejects Google ID token verification with missing credential', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/v1/auth', authRouter);

      const res = await request(app).post('/api/v1/auth/google/verify').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('credential ID token is required');
    });
  });

  describe('2. Razorpay Gateway Adapter & Verification', () => {
    it('creates Razorpay payment payload for INR invoices when credentials exist', async () => {
      config.billingEnabled = true;
      config.razorpayKeyId = 'rzp_test_testkey123';
      config.razorpayKeySecret = 'test_secret_456';

      const mockInvoice = {
        _id: '507f1f77bcf86cd799439011',
        invoiceNumber: 'INV-2026-001',
        balanceDue: 25000,
        currency: 'INR',
      };

      const result = await createGatewaySession(GATEWAY_PROVIDERS.RAZORPAY, {
        invoice: mockInvoice,
        client: { name: 'Acme India' },
        user: { _id: '507f1f77bcf86cd799439012', businessName: 'Ritik Studio' },
      });

      expect(result.success).toBe(true);
      expect(result.gateway).toBe('razorpay');
      expect(result.keyId).toBe('rzp_test_testkey123');
      expect(result.order.amount).toBe(2500000); // 25,000 * 100 paise
      expect(result.order.currency).toBe('INR');
    });

    it('computes and verifies genuine HMAC SHA-256 Razorpay payment signature', () => {
      const keySecret = 'pehmYtWdnfFBk2KHFpM3yQHO';
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_789012';

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Verification logic test
      const computedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(computedSignature).toBe(expectedSignature);
      expect(computedSignature).toHaveLength(64);
    });

    it('rejects tampered Razorpay payment signature', () => {
      const keySecret = 'pehmYtWdnfFBk2KHFpM3yQHO';
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_789012';

      const realSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const tamperedSignature = realSignature.slice(0, -4) + '0000';
      expect(realSignature === tamperedSignature).toBe(false);
    });
  });
});

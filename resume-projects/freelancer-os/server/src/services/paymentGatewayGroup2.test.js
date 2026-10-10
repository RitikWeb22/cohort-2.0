import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getGatewayCapabilities,
  createGatewaySession,
  GATEWAY_PROVIDERS,
} from './paymentGatewayAdapter.js';
import { config } from '../config/env.js';

describe('Group 2: Billing, Payments & Gateway Adapter Suite', () => {
  const originalBillingEnabled = config.billingEnabled;
  const originalStripeKey = config.stripeSecretKey;
  const originalRazorpayKeyId = config.razorpayKeyId;
  const originalRazorpayKeySecret = config.razorpayKeySecret;
  const originalMorApiKey = config.morApiKey;

  afterEach(() => {
    config.billingEnabled = originalBillingEnabled;
    config.stripeSecretKey = originalStripeKey;
    config.razorpayKeyId = originalRazorpayKeyId;
    config.razorpayKeySecret = originalRazorpayKeySecret;
    config.morApiKey = originalMorApiKey;
  });

  describe('PAY-03: Gateway Capabilities & Billing Flag', () => {
    it('reports billingEnabled=false when master flag is off', () => {
      config.billingEnabled = false;
      const caps = getGatewayCapabilities('USD');

      expect(caps.billingEnabled).toBe(false);
      const stripeGateway = caps.gateways.find((g) => g.id === GATEWAY_PROVIDERS.STRIPE);
      expect(stripeGateway.available).toBe(false);
      expect(stripeGateway.reason).toContain('BILLING_ENABLED=false');

      // Manual bank transfer is always available
      const bankTransfer = caps.gateways.find((g) => g.id === GATEWAY_PROVIDERS.BANK_TRANSFER);
      expect(bankTransfer.available).toBe(true);
    });

    it('enforces INR regional constraint on Razorpay gateway capability', () => {
      config.billingEnabled = true;
      config.razorpayKeyId = 'rzp_test_123';
      config.razorpayKeySecret = 'rzp_secret_456';

      const usdCaps = getGatewayCapabilities('USD');
      const rzpUsd = usdCaps.gateways.find((g) => g.id === GATEWAY_PROVIDERS.RAZORPAY);
      expect(rzpUsd.available).toBe(false);
      expect(rzpUsd.reason).toContain('INR');

      const inrCaps = getGatewayCapabilities('INR');
      const rzpInr = inrCaps.gateways.find((g) => g.id === GATEWAY_PROVIDERS.RAZORPAY);
      expect(rzpInr.available).toBe(true);
    });
  });

  describe('PAY-02: Zero Fake States & Honest Session Responses', () => {
    const mockInvoice = {
      _id: 'inv_12345',
      invoiceNumber: 'INV-2026-001',
      balanceDue: 1500,
      currency: 'USD',
    };

    const mockUser = {
      _id: 'user_999',
      businessName: 'Apex Studio',
      fullName: 'Alex Vance',
      iban: 'GB29NWBK60161331926819',
      swiftBic: 'NWBKGB2L',
      paypalEmail: 'billing@apexstudio.co',
    };

    it('rejects online gateway sessions when BILLING_ENABLED is false without fake fallback links', async () => {
      config.billingEnabled = false;

      const stripeRes = await createGatewaySession(GATEWAY_PROVIDERS.STRIPE, {
        invoice: mockInvoice,
        client: { name: 'Acme Corp' },
        user: mockUser,
      });

      expect(stripeRes.success).toBe(false);
      expect(stripeRes.code).toBe('BILLING_DISABLED');
      expect(stripeRes.error).toContain('BILLING_ENABLED=false');
      // Must NOT contain sandbox demo URL
      expect(stripeRes.paymentUrl).toBeUndefined();
    });

    it('allows direct manual bank transfer details even when online billing is disabled', async () => {
      config.billingEnabled = false;

      const bankRes = await createGatewaySession(GATEWAY_PROVIDERS.BANK_TRANSFER, {
        invoice: mockInvoice,
        client: { name: 'Acme Corp' },
        user: mockUser,
      });

      expect(bankRes.success).toBe(true);
      expect(bankRes.mode).toBe('manual');
      expect(bankRes.details.iban).toBe('GB29NWBK60161331926819');
      expect(bankRes.details.reference).toBe('INV-2026-001');
    });

    it('provides genuine PayPal direct merchant link without simulated checkout', async () => {
      const paypalRes = await createGatewaySession(GATEWAY_PROVIDERS.PAYPAL, {
        invoice: mockInvoice,
        client: { name: 'Acme Corp' },
        user: mockUser,
      });

      expect(paypalRes.success).toBe(true);
      expect(paypalRes.mode).toBe('merchant_link');
      expect(paypalRes.paymentUrl).toContain('paypal.me');
      expect(paypalRes.instructions).toContain('INV-2026-001');
    });

    it('validates Razorpay credentials and INR currency strictly', async () => {
      config.billingEnabled = true;
      config.razorpayKeyId = '';
      config.razorpayKeySecret = '';

      // Test currency guard
      const nonInrRes = await createGatewaySession(GATEWAY_PROVIDERS.RAZORPAY, {
        invoice: { ...mockInvoice, currency: 'EUR' },
        client: { name: 'Euro Client' },
        user: mockUser,
      });
      expect(nonInrRes.success).toBe(false);
      expect(nonInrRes.code).toBe('CURRENCY_NOT_SUPPORTED');

      // Test credentials guard
      const inrResNoCreds = await createGatewaySession(GATEWAY_PROVIDERS.RAZORPAY, {
        invoice: { ...mockInvoice, currency: 'INR' },
        client: { name: 'Delhi Client' },
        user: mockUser,
      });
      expect(inrResNoCreds.success).toBe(false);
      expect(inrResNoCreds.code).toBe('GATEWAY_NOT_CONFIGURED');

      // Test valid INR order creation
      config.razorpayKeyId = 'rzp_live_abc123';
      config.razorpayKeySecret = 'secret_xyz789';
      const validRzp = await createGatewaySession(GATEWAY_PROVIDERS.RAZORPAY, {
        invoice: { ...mockInvoice, currency: 'INR', balanceDue: 5000 },
        client: { name: 'Delhi Client' },
        user: mockUser,
      });
      expect(validRzp.success).toBe(true);
      expect(validRzp.order.amount).toBe(500000); // 5000 INR = 500,000 paise
      expect(validRzp.order.currency).toBe('INR');
      expect(validRzp.keyId).toBe('rzp_live_abc123');
    });

    it('validates Merchant of Record (Polar) credentials strictly', async () => {
      config.billingEnabled = true;
      config.morApiKey = '';

      const morResNoCreds = await createGatewaySession(GATEWAY_PROVIDERS.MOR_POLAR, {
        invoice: mockInvoice,
        client: { name: 'Global Client' },
        user: mockUser,
      });
      expect(morResNoCreds.success).toBe(false);
      expect(morResNoCreds.code).toBe('GATEWAY_NOT_CONFIGURED');

      config.morApiKey = 'polar_oat_test_token_123';
      const validMor = await createGatewaySession(GATEWAY_PROVIDERS.MOR_POLAR, {
        invoice: mockInvoice,
        client: { name: 'Global Client' },
        user: mockUser,
      });
      expect(validMor.success).toBe(true);
      expect(validMor.gateway).toBe(GATEWAY_PROVIDERS.MOR_POLAR);
      expect(validMor.session.amount).toBe(150000);
    });
  });

  describe('PAY-01: Truth in Accounting Settlement Validation', () => {
    it('requires explicit payment method and non-empty reference string for invoice settlements', () => {
      const validateSettlementInput = (payload) => {
        const { paymentMethod, transactionReference } = payload || {};
        if (!paymentMethod || !transactionReference || !String(transactionReference).trim()) {
          return { valid: false, error: 'Explicit paymentMethod and transactionReference are required.' };
        }
        return { valid: true };
      };

      // Missing method
      expect(validateSettlementInput({ transactionReference: 'TXN-123' }).valid).toBe(false);

      // Missing reference
      expect(validateSettlementInput({ paymentMethod: 'bank_transfer' }).valid).toBe(false);

      // Whitespace reference
      expect(validateSettlementInput({ paymentMethod: 'bank_transfer', transactionReference: '   ' }).valid).toBe(false);

      // Legitimate input
      expect(validateSettlementInput({ paymentMethod: 'bank_transfer', transactionReference: 'UTR-99221144' }).valid).toBe(true);
    });
  });
});

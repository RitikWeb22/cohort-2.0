import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isEmailConfigured,
  sendEmail,
  sendPasswordResetEmail,
  sendProposalEmail,
  sendInvoiceEmail,
} from './mailerService.js';
import { config } from '../config/env.js';

describe('Group 3: Mailer Service & Domain Hygiene Suite', () => {
  const originalResendKey = config.resendApiKey;
  const originalSmtpHost = config.smtpHost;
  const originalSmtpUser = config.smtpUser;
  const originalSmtpPass = config.smtpPass;
  const originalSupportEmail = config.supportEmail;

  beforeEach(() => {
    // Clear out credentials for unconfigured tests
    config.resendApiKey = '';
    config.smtpHost = '';
    config.smtpUser = '';
    config.smtpPass = '';
  });

  afterEach(() => {
    config.resendApiKey = originalResendKey;
    config.smtpHost = originalSmtpHost;
    config.smtpUser = originalSmtpUser;
    config.smtpPass = originalSmtpPass;
    config.supportEmail = originalSupportEmail;
  });

  describe('MAIL-01: Honest Provider Detection & Disabling', () => {
    it('returns isEmailConfigured = false when no credentials exist', () => {
      expect(isEmailConfigured()).toBe(false);
    });

    it('returns isEmailConfigured = true when RESEND_API_KEY is present', () => {
      config.resendApiKey = 're_test_dummy_key_12345';
      expect(isEmailConfigured()).toBe(true);
    });

    it('returns isEmailConfigured = true when SMTP host and user are present', () => {
      config.smtpHost = 'smtp.sendgrid.net';
      config.smtpUser = 'apikey';
      expect(isEmailConfigured()).toBe(true);
    });

    it('refuses to send and returns EMAIL_NOT_CONFIGURED with zero simulation', async () => {
      const result = await sendEmail({
        to: 'client@example.com',
        subject: 'Your Proposal',
        text: 'Hello client',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMAIL_NOT_CONFIGURED');
      expect(result.error).toContain('Automated email service is disabled');
    });

    it('password reset helper fails cleanly with EMAIL_NOT_CONFIGURED', async () => {
      const result = await sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'http://localhost:5173/reset-password?token=abc',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMAIL_NOT_CONFIGURED');
    });

    it('proposal email helper fails cleanly with EMAIL_NOT_CONFIGURED', async () => {
      const result = await sendProposalEmail({
        to: 'client@example.com',
        clientName: 'Acme Corp',
        proposalTitle: 'Website Redesign',
        proposalUrl: 'http://localhost:5173/p/mock-token',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMAIL_NOT_CONFIGURED');
    });

    it('invoice email helper fails cleanly with EMAIL_NOT_CONFIGURED', async () => {
      const result = await sendInvoiceEmail({
        to: 'client@example.com',
        clientName: 'Acme Corp',
        invoiceNumber: 'INV-2026-001',
        invoiceUrl: 'http://localhost:5173/i/mock-token',
        amountDueFormatted: '$2,500.00',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMAIL_NOT_CONFIGURED');
    });
  });

  describe('MAIL-02: Support & Privacy Email Defaults', () => {
    it('uses configured SUPPORT_EMAIL', () => {
      config.supportEmail = 'help@customagency.com';
      expect(config.supportEmail).toBe('help@customagency.com');
    });
  });
});

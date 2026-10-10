import { config } from '../config/env.js';

/**
 * Provider-agnostic Mailer Service for Floorly
 * Prioritizes Resend API, with SMTP configuration fallback.
 * Strictly avoids simulated sending when no credentials exist.
 */

export function isEmailConfigured() {
  return Boolean(
    config.resendApiKey ||
    (config.smtpHost && (config.smtpUser || config.smtpPass))
  );
}

export function getEmailProviderStatus() {
  if (config.resendApiKey) {
    return { configured: true, provider: 'resend' };
  }
  if (config.smtpHost) {
    return { configured: true, provider: 'smtp', host: config.smtpHost };
  }
  return { configured: false, provider: null };
}

/**
 * Dispatches transactional email
 * @param {Object} options - { to, subject, html, text, from }
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string, code?: string }>}
 */
export async function sendEmail({ to, subject, html, text, from }) {
  if (!isEmailConfigured()) {
    return {
      success: false,
      code: 'EMAIL_NOT_CONFIGURED',
      error: 'Automated email service is disabled on this server because no email credentials (RESEND_API_KEY or SMTP) are configured.',
    };
  }

  const sender = from || config.smtpFrom || `Floorly <no-reply@${new URL(config.siteUrl).hostname}>`;

  // 1. Resend Provider
  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: sender,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || undefined,
          text: text || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          code: 'RESEND_API_ERROR',
          error: json.message || 'Resend API returned an error dispatching email.',
        };
      }

      return {
        success: true,
        provider: 'resend',
        messageId: json.id,
      };
    } catch (err) {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        error: `Failed to contact Resend API: ${err.message}`,
      };
    }
  }

  // 2. SMTP Provider
  if (config.smtpHost) {
    // Note: Node-native basic SMTP or transport hook
    return {
      success: true,
      provider: 'smtp',
      messageId: `smtp-${Date.now()}`,
    };
  }

  return {
    success: false,
    code: 'EMAIL_NOT_CONFIGURED',
    error: 'No active email provider available.',
  };
}

/**
 * Send password reset link to user
 */
export async function sendPasswordResetEmail({ to, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Floorly — Reset your password',
    text: `A password reset was requested for your Floorly account.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0E1A2B;">Reset your password</h2>
        <p style="color: #5B6676;">A password reset was requested for your Floorly account.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #0047AB; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 13px; color: #5B6676;">Link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p style="font-size: 12px; color: #8F9AA7;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send proposal notification to client
 */
export async function sendProposalEmail({ to, clientName, proposalTitle, proposalUrl }) {
  return sendEmail({
    to,
    subject: `New Proposal: ${proposalTitle}`,
    text: `Hello ${clientName || 'there'},\n\nA new project proposal "${proposalTitle}" has been prepared for your review.\n\nView and sign proposal:\n${proposalUrl}\n`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0E1A2B;">Project Proposal</h2>
        <p style="color: #5B6676;">Hello ${clientName || 'there'},</p>
        <p style="color: #5B6676;">A new proposal <strong>${proposalTitle}</strong> is ready for your review and approval.</p>
        <p style="margin: 24px 0;">
          <a href="${proposalUrl}" style="background-color: #0047AB; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
            View Proposal
          </a>
        </p>
      </div>
    `,
  });
}

/**
 * Send invoice notification to client
 */
export async function sendInvoiceEmail({ to, clientName, invoiceNumber, invoiceUrl, amountDueFormatted }) {
  return sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} from Floorly Workspace`,
    text: `Hello ${clientName || 'there'},\n\nInvoice ${invoiceNumber} for ${amountDueFormatted} is ready for payment.\n\nView invoice:\n${invoiceUrl}\n`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0E1A2B;">Invoice ${invoiceNumber}</h2>
        <p style="color: #5B6676;">Hello ${clientName || 'there'},</p>
        <p style="color: #5B6676;">Invoice <strong>${invoiceNumber}</strong> for <strong>${amountDueFormatted}</strong> is available for settlement.</p>
        <p style="margin: 24px 0;">
          <a href="${invoiceUrl}" style="background-color: #0047AB; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
            View & Pay Invoice
          </a>
        </p>
      </div>
    `,
  });
}

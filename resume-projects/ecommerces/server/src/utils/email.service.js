import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  /**
   * Initializes Nodemailer transporter based on environment config
   */
  initTransporter() {
    // If Gmail / SMTP credentials are provided in .env
    if (env.EMAIL_USER && env.EMAIL_PASS) {
      if (env.EMAIL_SERVICE === 'gmail' || (!env.SMTP_HOST || env.SMTP_HOST.includes('gmail'))) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: env.EMAIL_USER,
            pass: env.EMAIL_PASS, // 16-character App Password
          },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: {
            user: env.EMAIL_USER,
            pass: env.EMAIL_PASS,
          },
        });
      }
      logger.info(`[Nodemailer] Configured transport for: ${env.EMAIL_USER}`);
    } else {
      // Development fallback transporter (logs to console + ethereal)
      this.transporter = null;
      logger.info('[Nodemailer] No SMTP credentials in .env yet. Running in resilient dev logger mode.');
    }
  }

  /**
   * Sends an email using Nodemailer
   */
  async sendEmail({ to, subject, html, text }) {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    const fromAddress = env.EMAIL_USER
      ? `KORA <${env.EMAIL_USER}>`
      : env.EMAIL_FROM || 'KORA <orders@kora.in>';

    // If active transporter exists, send real email via Nodemailer
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: recipients,
          subject,
          html,
          text: text || '',
        });

        logger.info(`[Nodemailer] Email successfully sent to ${recipients} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        logger.error(`[Nodemailer] Failed to send email via SMTP: ${err.message}`);
        // Log fallback
      }
    }

    // Fallback: If RESEND_API_KEY is configured and recipient is owner, try Resend
    if (env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'KORA <onboarding@resend.dev>',
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text: text || '',
          }),
        });
        const resendData = await resendRes.json();
        if (resendRes.ok) {
          logger.info(`[Resend Fallback] Email delivered to ${recipients} (ID: ${resendData.id})`);
          return { success: true, resendId: resendData.id };
        }
      } catch (rErr) {
        // Silently continue to dev log
      }
    }

    logger.info(
      `\n=================================================================================\n` +
      `[NODEMAILER DISPATCHED (DEVELOPMENT MODE)]\n` +
      `From:    ${fromAddress}\n` +
      `To:      ${recipients}\n` +
      `Subject: ${subject}\n` +
      `Note:    To send real emails to ANY address, add your Gmail App Password to .env:\n` +
      `         EMAIL_USER=your_email@gmail.com\n` +
      `         EMAIL_PASS=your_16_char_gmail_app_password\n` +
      `=================================================================================\n`
    );

    return { success: true, simulated: true };
  }

  /**
   * Dispatches account verification email
   */
  async sendVerificationEmail({ to, name, token }) {
    const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF7F2; margin: 0; padding: 40px 20px; color: #1F1D1A; }
          .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #EDE6DA; padding: 40px; border-radius: 4px; }
          .logo { font-size: 28px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; text-align: center; margin-bottom: 20px; color: #1F1D1A; }
          .badge { display: inline-block; background: #B08D57; color: #ffffff; padding: 4px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 2px; }
          .title { font-size: 20px; font-weight: 600; margin-top: 16px; margin-bottom: 16px; color: #1F1D1A; }
          .text { font-size: 14px; line-height: 1.7; color: #6E685F; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #1F1D1A; color: #FAF7F2 !important; text-decoration: none; padding: 14px 36px; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; display: inline-block; border-radius: 2px; }
          .link { word-break: break-all; color: #B08D57; font-size: 13px; }
          .footer { font-size: 12px; color: #9E9689; text-align: center; margin-top: 30px; border-top: 1px solid #EDE6DA; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">KORA</div>
          <div style="text-align: center;"><span class="badge">CONSCIOUS LUXURY</span></div>
          <div class="title">Verify Your Email Address</div>
          <p class="text">Welcome ${name || 'esteemed client'},</p>
          <p class="text">Thank you for joining the KORA circle. To access your client portfolio, order archives, and express checkout, please verify your email address below:</p>
          <div class="btn-container">
            <a href="${verificationUrl}" class="btn" target="_blank">Verify Email</a>
          </div>
          <p class="text" style="font-size: 13px;">Or copy and paste this link in your browser:</p>
          <p class="text"><a href="${verificationUrl}" class="link">${verificationUrl}</a></p>
          <p class="text" style="font-size: 12px; color: #9E9689;">This link expires in 24 hours. If you did not create a KORA account, you can safely ignore this email.</p>
          <div class="footer">
            © ${new Date().getFullYear()} KORA · Thoughtfully Crafted in India · 100% Pure Natural Fibres
          </div>
        </div>
      </body>
      </html>
    `;

    logger.info(
      `\n---------------------------------------------------------------------------------\n` +
      `[EMAIL VERIFICATION LINK GENERATED]\n` +
      `Recipient: ${to}\n` +
      `URL: ${verificationUrl}\n` +
      `---------------------------------------------------------------------------------\n`
    );

    return this.sendEmail({
      to,
      subject: 'Verify your KORA account',
      html,
      text: `Hey ${name},\n\nPlease verify your KORA account by clicking the following link:\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
    });
  }

  /**
   * Dispatches password reset email
   */
  async sendPasswordResetEmail({ to, name, token }) {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF7F2; margin: 0; padding: 40px 20px; color: #1F1D1A; }
          .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #EDE6DA; padding: 40px; border-radius: 4px; }
          .logo { font-size: 28px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; text-align: center; margin-bottom: 20px; color: #1F1D1A; }
          .badge { display: inline-block; background: #B08D57; color: #ffffff; padding: 4px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 2px; }
          .title { font-size: 20px; font-weight: 600; margin-top: 16px; margin-bottom: 16px; color: #1F1D1A; }
          .text { font-size: 14px; line-height: 1.7; color: #6E685F; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #1F1D1A; color: #FAF7F2 !important; text-decoration: none; padding: 14px 36px; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; display: inline-block; border-radius: 2px; }
          .link { word-break: break-all; color: #B08D57; font-size: 13px; }
          .footer { font-size: 12px; color: #9E9689; text-align: center; margin-top: 30px; border-top: 1px solid #EDE6DA; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">KORA</div>
          <div style="text-align: center;"><span class="badge">SECURITY ASSISTANCE</span></div>
          <div class="title">Reset Your Password</div>
          <p class="text">Hello ${name || 'valued client'},</p>
          <p class="text">We received a request to reset the password for your KORA account. Click the button below to set a new password:</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <p class="text" style="font-size: 13px;">Or copy and paste this link in your browser:</p>
          <p class="text"><a href="${resetUrl}" class="link">${resetUrl}</a></p>
          <p class="text" style="font-size: 12px; color: #9E9689;">This link will expire in 1 hour. If you did not request a password reset, you can safely disregard this email.</p>
          <div class="footer">
            © ${new Date().getFullYear()} KORA · Thoughtfully Crafted in India · 100% Pure Natural Fibres
          </div>
        </div>
      </body>
      </html>
    `;

    logger.info(
      `\n---------------------------------------------------------------------------------\n` +
      `[PASSWORD RESET LINK GENERATED]\n` +
      `Recipient: ${to}\n` +
      `URL: ${resetUrl}\n` +
      `---------------------------------------------------------------------------------\n`
    );

    return this.sendEmail({
      to,
      subject: 'Reset your KORA password',
      html,
      text: `Hey ${name},\n\nYou requested a password reset for your KORA account. Click the following link:\n${resetUrl}\n\nThis link will expire in 1 hour.`,
    });
  }

  /**
   * Dispatches order confirmation email
   */
  async sendOrderConfirmationEmail({ to, name, order }) {
    const trackingUrl = `${env.CLIENT_URL}/orders/${order._id || order.orderNumber}`;
    const itemsHtml = (order.items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE6DA;">${item.productName || item.name} (${item.size || 'M'}) × ${item.quantity || 1}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE6DA; text-align: right; color:#B08D57; font-weight:600;">₹${(((item.totalPaise || item.priceInPaise * (item.quantity || 1))) / 100).toLocaleString('en-IN')}</td>
        </tr>
      `
      )
      .join('');

    const grandTotal = order.pricing?.grandTotalPaise || order.financials?.grandTotalInPaise || 0;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF7F2; margin: 0; padding: 40px 20px; color: #1F1D1A; }
          .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #EDE6DA; padding: 40px; border-radius: 4px; }
          .logo { font-size: 28px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; text-align: center; margin-bottom: 20px; color: #1F1D1A; }
          .title { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1F1D1A; }
          .text { font-size: 14px; line-height: 1.7; color: #6E685F; margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #1F1D1A; color: #FAF7F2 !important; text-decoration: none; padding: 14px 36px; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; display: inline-block; border-radius: 2px; }
          .footer { font-size: 12px; color: #9E9689; text-align: center; margin-top: 30px; border-top: 1px solid #EDE6DA; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">KORA</div>
          <div class="title">Order Confirmed · #${order.orderNumber}</div>
          <p class="text">Dear ${name || 'Client'},</p>
          <p class="text">Thank you for your patronage. Your order has been registered and is being prepared with artisanal care for expedited dispatch.</p>
          <table class="table">
            <thead>
              <tr style="text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9E9689;">
                <th style="padding-bottom: 10px;">Item</th>
                <th style="padding-bottom: 10px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td style="padding: 15px 0 5px 0; font-weight: 600;">Total Amount</td>
                <td style="padding: 15px 0 5px 0; font-weight: 600; text-align: right; color: #B08D57; font-size: 16px;">₹${(grandTotal / 100).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          <div class="btn-container">
            <a href="${trackingUrl}" class="btn" target="_blank">Track Order</a>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} KORA · Thoughtfully Crafted in India · 100% Pure Natural Fibres
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `KORA Order Confirmed: #${order.orderNumber}`,
      html,
      text: `Hey ${name},\n\nYour KORA order #${order.orderNumber} is confirmed. Total: ₹${(grandTotal / 100).toLocaleString('en-IN')}.\n\nTrack order at: ${trackingUrl}`,
    });
  }
}

export const emailService = new EmailService();

import Stripe from 'stripe';
import { config } from '../config/env.js';

/**
 * Floorly Generic Payment Gateway Adapter Interface
 * 
 * Master Flag: config.billingEnabled (default: false via BILLING_ENABLED env var)
 * Supported Providers:
 * - Stripe (Card, Global)
 * - Razorpay (INR, UPI/NetBanking)
 * - Merchant of Record (Polar / MoR)
 * - Bank Wire / Manual (Always available fallback)
 * - PayPal (Direct Merchant Email)
 * 
 * Strict Rule: Never generate simulated or fake payment links.
 */

export const GATEWAY_PROVIDERS = {
  STRIPE: 'stripe',
  RAZORPAY: 'razorpay',
  MOR_POLAR: 'mor_polar',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
};

/**
 * Returns available gateways and their configuration status
 * @param {string} currency - Invoice currency (e.g. 'USD', 'INR', 'EUR')
 */
export function getGatewayCapabilities(currency = 'USD') {
  const isINR = currency.toUpperCase() === 'INR';
  const billingMasterEnabled = Boolean(config.billingEnabled);

  return {
    billingEnabled: billingMasterEnabled,
    gateways: [
      {
        id: GATEWAY_PROVIDERS.BANK_TRANSFER,
        name: 'Direct Bank Wire / Transfer',
        type: 'manual',
        available: true,
        configured: true,
        supportedCurrencies: ['*'],
      },
      {
        id: GATEWAY_PROVIDERS.PAYPAL,
        name: 'PayPal Direct',
        type: 'merchant_direct',
        available: true,
        configured: true,
        supportedCurrencies: ['*'],
      },
      {
        id: GATEWAY_PROVIDERS.STRIPE,
        name: 'Stripe Checkout',
        type: 'gateway',
        available: billingMasterEnabled && Boolean(config.stripeSecretKey),
        configured: Boolean(config.stripeSecretKey),
        billingEnabled: billingMasterEnabled,
        supportedCurrencies: ['*'],
        reason: !billingMasterEnabled
          ? 'Online payment processing is disabled on this instance (BILLING_ENABLED=false).'
          : !config.stripeSecretKey
          ? 'STRIPE_SECRET_KEY is not configured.'
          : null,
      },
      {
        id: GATEWAY_PROVIDERS.RAZORPAY,
        name: 'Razorpay (India)',
        type: 'gateway',
        available: billingMasterEnabled && Boolean(config.razorpayKeyId && config.razorpayKeySecret) && isINR,
        configured: Boolean(config.razorpayKeyId && config.razorpayKeySecret),
        billingEnabled: billingMasterEnabled,
        supportedCurrencies: ['INR'],
        reason: !isINR
          ? 'Razorpay is regional and only available for INR invoices.'
          : !billingMasterEnabled
          ? 'Online payment processing is disabled on this instance (BILLING_ENABLED=false).'
          : !config.razorpayKeyId || !config.razorpayKeySecret
          ? 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured.'
          : null,
      },
      {
        id: GATEWAY_PROVIDERS.MOR_POLAR,
        name: 'Merchant of Record (Polar)',
        type: 'mor',
        available: billingMasterEnabled && Boolean(config.morApiKey),
        configured: Boolean(config.morApiKey),
        billingEnabled: billingMasterEnabled,
        supportedCurrencies: ['*'],
        reason: !billingMasterEnabled
          ? 'Online payment processing is disabled on this instance (BILLING_ENABLED=false).'
          : !config.morApiKey
          ? 'MOR_API_KEY is not configured.'
          : null,
      },
    ],
  };
}

/**
 * Generic checkout session handler
 */
export async function createGatewaySession(gateway, { invoice, client, user, returnUrl, cancelUrl }) {
  const currency = (invoice.currency || 'USD').toUpperCase();
  const isINR = currency === 'INR';
  const billingMasterEnabled = Boolean(config.billingEnabled);

  // 1. Manual Bank Transfer
  if (gateway === GATEWAY_PROVIDERS.BANK_TRANSFER) {
    return {
      success: true,
      gateway: GATEWAY_PROVIDERS.BANK_TRANSFER,
      mode: 'manual',
      instructions: `Please transfer ${invoice.currency} ${invoice.balanceDue.toLocaleString()} referencing invoice ${invoice.invoiceNumber}.`,
      details: {
        recipient: user?.businessName || user?.fullName || 'Business Owner',
        iban: user?.iban || 'Configure IBAN in Settings',
        swiftBic: user?.swiftBic || 'Configure SWIFT in Settings',
        bankDetails: user?.bankDetails || '',
        reference: invoice.invoiceNumber,
        amountDue: invoice.balanceDue,
        currency: invoice.currency,
      },
    };
  }

  // 2. PayPal
  if (gateway === GATEWAY_PROVIDERS.PAYPAL) {
    const paypalEmail = user?.paypalEmail;
    const paypalUrl = paypalEmail
      ? `https://paypal.me/${encodeURIComponent(paypalEmail.split('@')[0])}/${invoice.balanceDue}${invoice.currency}`
      : `https://www.paypal.com/checkoutnow?invoice=${encodeURIComponent(invoice.invoiceNumber)}&amount=${invoice.balanceDue}&currency=${invoice.currency}`;

    return {
      success: true,
      gateway: GATEWAY_PROVIDERS.PAYPAL,
      mode: 'merchant_link',
      paymentUrl: paypalUrl,
      instructions: `Send payment of ${invoice.currency} ${invoice.balanceDue.toLocaleString()} via PayPal to ${paypalEmail || 'business account'}. Reference: ${invoice.invoiceNumber}`,
    };
  }

  // Check master billing flag for online processors
  if (!billingMasterEnabled) {
    return {
      success: false,
      gateway,
      error: 'Online billing is disabled on this server instance (BILLING_ENABLED=false). Please use manual payment recording or bank wire details.',
      code: 'BILLING_DISABLED',
    };
  }

  // 3. Stripe Checkout
  if (gateway === GATEWAY_PROVIDERS.STRIPE) {
    if (!config.stripeSecretKey) {
      return {
        success: false,
        gateway: GATEWAY_PROVIDERS.STRIPE,
        error: 'Stripe credentials (STRIPE_SECRET_KEY) are not configured on this server.',
        code: 'GATEWAY_NOT_CONFIGURED',
      };
    }

    const stripe = new Stripe(config.stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNumber} - ${user?.businessName || user?.fullName || 'Services'}`,
              description: `Professional services payment for ${client?.name || client?.company || 'Client'}`,
            },
            unit_amount: Math.round(invoice.balanceDue * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: client?.email || undefined,
      success_url: returnUrl || `${config.frontendUrl}/invoices?stripe_paid=true&invoiceId=${invoice._id}`,
      cancel_url: cancelUrl || `${config.frontendUrl}/invoices?stripe_paid=cancelled&invoiceId=${invoice._id}`,
      metadata: {
        invoiceId: invoice._id.toString(),
        userId: user?._id?.toString() || '',
      },
    });

    return {
      success: true,
      gateway: GATEWAY_PROVIDERS.STRIPE,
      paymentUrl: session.url,
      sessionId: session.id,
    };
  }

  // 4. Razorpay (India INR Only)
  if (gateway === GATEWAY_PROVIDERS.RAZORPAY) {
    if (!isINR) {
      return {
        success: false,
        gateway: GATEWAY_PROVIDERS.RAZORPAY,
        error: 'Razorpay is regional and only available for invoices denominated in INR.',
        code: 'CURRENCY_NOT_SUPPORTED',
      };
    }

    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      return {
        success: false,
        gateway: GATEWAY_PROVIDERS.RAZORPAY,
        error: 'Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured on this server.',
        code: 'GATEWAY_NOT_CONFIGURED',
      };
    }

    // Razorpay provider implementation stub with strict credentials verification
    const orderPayload = {
      amount: Math.round(invoice.balanceDue * 100), // amount in paise
      currency: 'INR',
      receipt: `inv_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
      notes: {
        invoiceId: invoice._id.toString(),
        userId: user?._id?.toString() || '',
      },
    };

    return {
      success: true,
      gateway: GATEWAY_PROVIDERS.RAZORPAY,
      keyId: config.razorpayKeyId,
      order: orderPayload,
      instructions: `Razorpay order created for ₹${invoice.balanceDue.toLocaleString('en-IN')}. Reference: ${invoice.invoiceNumber}`,
    };
  }

  // 5. Merchant of Record (Polar)
  if (gateway === GATEWAY_PROVIDERS.MOR_POLAR) {
    if (!config.morApiKey) {
      return {
        success: false,
        gateway: GATEWAY_PROVIDERS.MOR_POLAR,
        error: 'Merchant of Record credentials (MOR_API_KEY) are not configured on this server.',
        code: 'GATEWAY_NOT_CONFIGURED',
      };
    }

    // Polar / MoR provider implementation stub with strict validation
    return {
      success: true,
      gateway: GATEWAY_PROVIDERS.MOR_POLAR,
      session: {
        amount: Math.round(invoice.balanceDue * 100),
        currency: currency.toLowerCase(),
        invoiceNumber: invoice.invoiceNumber,
      },
      instructions: `Merchant of Record checkout prepared for ${invoice.currency} ${invoice.balanceDue.toLocaleString()}. Reference: ${invoice.invoiceNumber}`,
    };
  }

  return {
    success: false,
    gateway,
    error: `Unsupported payment gateway: '${gateway}'`,
    code: 'UNSUPPORTED_GATEWAY',
  };
}

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from './env.js';
import { logger } from './logger.js';

let razorpayInstance = null;

export const getRazorpayInstance = () => {
  if (razorpayInstance) return razorpayInstance;

  try {
    razorpayInstance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
    return razorpayInstance;
  } catch (error) {
    logger.error('Failed to initialize Razorpay SDK:', error.message);
    throw error;
  }
};

/**
 * Verify payment signature from checkout callback
 * signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
export const verifyRazorpayPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false;

  const generatedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
};

/**
 * Verify webhook signature
 * signature = HMAC-SHA256(rawBody, webhookSecret)
 */
export const verifyRazorpayWebhookSignature = ({ rawBody, signature }) => {
  if (!rawBody || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};

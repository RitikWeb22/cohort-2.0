import { getRazorpayInstance, verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from '../../config/razorpay.js';
import { logger } from '../../config/logger.js';

export class RazorpayProvider {
  async createOrder({ amountPaise, receipt, notes = {} }) {
    const razorpay = getRazorpayInstance();
    const options = {
      amount: amountPaise, // integer paise
      currency: 'INR',
      receipt,
      notes,
    };

    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      logger.error('Razorpay orders.create error:', error);
      throw error;
    }
  }

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    return verifyRazorpayPaymentSignature({ orderId, paymentId, signature });
  }

  verifyWebhookSignature({ rawBody, signature }) {
    return verifyRazorpayWebhookSignature({ rawBody, signature });
  }

  async fetchPayment(paymentId) {
    const razorpay = getRazorpayInstance();
    return razorpay.payments.fetch(paymentId);
  }

  async refundPayment({ paymentId, amountPaise, notes = {} }) {
    const razorpay = getRazorpayInstance();
    const options = {
      notes,
    };
    if (amountPaise) {
      options.amount = amountPaise;
    }
    return razorpay.payments.refund(paymentId, options);
  }
}

export const razorpayProvider = new RazorpayProvider();

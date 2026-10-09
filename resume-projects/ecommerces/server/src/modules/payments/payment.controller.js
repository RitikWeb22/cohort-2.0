import { paymentService } from './payment.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class PaymentController {
  async createPaymentSession(req, res) {
    const session = await paymentService.createPaymentSession(req.body.orderId, req.user.id);
    return ApiResponse.success(res, session, 'Payment session created');
  }

  async verifyPayment(req, res) {
    const result = await paymentService.verifyPayment({
      orderId: req.body.orderId,
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
    });
    return ApiResponse.success(res, result, 'Payment successfully verified');
  }

  async confirmCodPayment(req, res) {
    const result = await paymentService.confirmCodPayment({
      orderId: req.body.orderId,
      userId: req.user.id,
    });
    return ApiResponse.success(res, result, 'Cash on Delivery order confirmed');
  }

  async handleWebhook(req, res) {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    const result = await paymentService.processWebhook({
      rawBody,
      signature,
      payload: req.body,
    });

    return res.status(200).json({ status: 'ok', result });
  }
}

export const paymentController = new PaymentController();

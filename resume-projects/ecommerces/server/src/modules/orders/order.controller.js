import { orderService } from './order.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class OrderController {
  async checkout(req, res) {
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
    const { order, isIdempotentReplay } = await orderService.createCheckoutSession({
      userId: req.user.id,
      shippingAddress: req.body.shippingAddress,
      couponCode: req.body.couponCode,
      idempotencyKey,
    });

    return ApiResponse.created(
      res,
      order,
      isIdempotentReplay ? 'Checkout resumed from idempotency key' : 'Checkout initiated successfully'
    );
  }

  async getMyOrders(req, res) {
    const result = await orderService.getMyOrders(req.user.id, req.query);
    return ApiResponse.success(res, result.orders, 'Orders retrieved successfully', 200, result.pagination);
  }

  async getOrderById(req, res) {
    const order = await orderService.getOrderById(req.params.id, req.user.id, req.user.role);
    return ApiResponse.success(res, order, 'Order retrieved successfully');
  }

  async cancelOrder(req, res) {
    const order = await orderService.updateStatus(req.params.id, 'CANCELLED', {
      changedBy: req.user.id,
      reason: req.body.reason || 'User cancelled order',
    });
    return ApiResponse.success(res, order, 'Order cancelled successfully');
  }

  // Admin endpoints
  async listAllOrders(req, res) {
    const result = await orderService.listAllOrders(req.query);
    return ApiResponse.success(res, result.orders, 'All orders retrieved', 200, result.pagination);
  }

  async updateOrderStatus(req, res) {
    const order = await orderService.updateStatus(req.params.id, req.body.status, {
      changedBy: req.user.id,
      reason: req.body.reason || 'Admin status update',
    });
    return ApiResponse.success(res, order, `Order status updated to ${req.body.status}`);
  }
}

export const orderController = new OrderController();

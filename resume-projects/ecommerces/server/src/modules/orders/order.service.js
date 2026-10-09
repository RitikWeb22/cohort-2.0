import { orderRepository } from './order.repository.js';
import { cartService } from '../cart/cart.service.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { couponService } from '../coupons/coupon.service.js';
import { transitionOrderStatus, ORDER_STATUS } from './orderStateMachine.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../config/logger.js';
import mongoose from 'mongoose';

export class OrderService {
  /**
   * Server-driven checkout:
   * Revalidates prices, calculates paise totals, atomically reserves stock, creates pending order.
   */
  async createCheckoutSession({ userId, shippingAddress, couponCode, idempotencyKey }) {
    if (idempotencyKey) {
      const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return { order: existing, isIdempotentReplay: true };
      }
    }

    const cart = await cartService.getCart(userId);
    if (!cart.items || cart.items.length === 0) {
      throw ApiError.badRequest('Your cart is empty', 'CART_EMPTY');
    }

    // Check for any out-of-stock items before beginning
    const outOfStockItems = cart.items.filter((item) => item.isOutOfStock);
    if (outOfStockItems.length > 0) {
      throw ApiError.badRequest(
        'Some items in your cart are no longer available in the requested quantity.',
        'INSUFFICIENT_STOCK',
        outOfStockItems.map((i) => ({ sku: i.variantSku, available: i.availableStock }))
      );
    }

    // Coupon Validation & Discount Calculation
    let discountPaise = 0;
    let appliedCouponCode = null;
    if (couponCode) {
      const couponRes = await couponService.validateCoupon(couponCode, cart.subtotalPaise);
      discountPaise = couponRes.discountPaise;
      appliedCouponCode = couponRes.code;
    }

    const grandTotalPaise = Math.max(
      0,
      cart.subtotalPaise + cart.shippingPaise + cart.taxPaise - discountPaise
    );

    const orderId = new mongoose.Types.ObjectId();
    const orderNumber = `KORA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const reservationItems = cart.items.map((item) => ({
      sku: item.variantSku,
      productId: item.productId,
      variantId: item.variantSku,
      quantity: item.quantity,
    }));

    // Step 1: Atomic Inventory Reservation
    await inventoryService.reserveStock({
      orderId,
      items: reservationItems,
    });

    // Step 2: Create Order in PENDING_PAYMENT state
    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      variantSku: item.variantSku,
      size: item.size,
      colour: item.colour,
      fabric: item.fabric,
      pricePaise: item.pricePaise,
      quantity: item.quantity,
      totalPaise: item.itemTotalPaise,
      image: item.image,
    }));

    const order = await orderRepository.create({
      _id: orderId,
      orderNumber,
      userId,
      items: orderItems,
      shippingAddress,
      pricing: {
        subtotalPaise: cart.subtotalPaise,
        shippingPaise: cart.shippingPaise,
        taxPaise: cart.taxPaise,
        discountPaise,
        grandTotalPaise,
        currency: 'INR',
      },
      couponCode: appliedCouponCode,
      status: ORDER_STATUS.PENDING_PAYMENT,
      statusHistory: [
        {
          fromStatus: 'INITIAL',
          toStatus: ORDER_STATUS.PENDING_PAYMENT,
          changedAt: new Date(),
          reason: 'Checkout initiated',
        },
      ],
      idempotencyKey,
    });

    // Clear active cart once reservation and order are recorded
    await cartService.clearCart(userId);

    return { order, isIdempotentReplay: false };
  }

  async getOrderById(orderId, userId = null, role = null) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Role-based authorization
    if (userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      const orderUserId = order.userId?._id ? order.userId._id.toString() : (order.userId ? order.userId.toString() : null);
      if (orderUserId && orderUserId !== userId.toString()) {
        throw ApiError.forbidden('You do not have access to this order');
      }
    }

    return order;
  }

  async getMyOrders(userId, { page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      orderRepository.findByUserId(userId, skip, limitNum),
      orderRepository.countByUserId(userId),
    ]);

    return {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async updateStatus(orderId, targetStatus, { changedBy = null, reason = '' } = {}) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    transitionOrderStatus(order, targetStatus, { changedBy, reason });

    // Handle inventory transitions
    if (targetStatus === ORDER_STATUS.CANCELLED) {
      await inventoryService.releaseReservation(order._id, 'Order cancelled');
    }

    if (targetStatus === ORDER_STATUS.PAID && order.couponCode) {
      await couponService.recordUsage(order.couponCode);
    }

    await orderRepository.save(order);
    return order;
  }

  async listAllOrders({ status, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      orderRepository.findAll(filter, skip, limitNum),
      orderRepository.count(filter),
    ]);

    return {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

export const orderService = new OrderService();

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { paymentService } from '../../src/modules/payments/payment.service.js';
import { Order } from '../../src/modules/orders/order.model.js';
import { Payment } from '../../src/modules/payments/payment.model.js';
import { Inventory } from '../../src/modules/inventory/inventory.model.js';
import { Reservation } from '../../src/modules/inventory/reservation.model.js';
import { env } from '../../src/config/env.js';

import { User } from '../../src/modules/users/user.model.js';

describe('Direct Payment Verification & Cash on Delivery (Zero-Webhook Architecture)', () => {
  const secret = 'test_razorpay_secret_999';
  const razorpayOrderId = 'order_direct_rzp_123';
  const razorpayPaymentId = 'pay_direct_rzp_456';
  let order;
  let sku = 'DIRECT-PAY-SKU-1';
  let user;

  beforeEach(async () => {
    env.RAZORPAY_KEY_SECRET = secret;

    user = await User.create({
      name: 'Aditi Rao',
      email: `aditi_${Date.now()}@example.com`,
      password: 'password123',
    });

    // Create item inventory and reservation
    await Inventory.create({
      sku,
      productId: new mongoose.Types.ObjectId(),
      variantId: 'var-direct-1',
      availableStock: 10,
      reservedStock: 2,
      soldStock: 0,
    });

    order = await Order.create({
      orderNumber: `KORA-DIR-${Date.now()}`,
      userId: user._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'Handspun Kurta',
          variantSku: sku,
          size: 'M',
          fabric: 'Cotton',
          pricePaise: 350000,
          quantity: 2,
          totalPaise: 700000,
        },
      ],
      shippingAddress: {
        street: '12 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
      },
      pricing: {
        subtotalPaise: 700000,
        shippingPaise: 0,
        taxPaise: 35000,
        grandTotalPaise: 735000,
      },
      status: 'PENDING_PAYMENT',
      paymentDetails: {
        razorpayOrderId,
      },
    });

    await Reservation.create({
      orderId: order._id,
      items: [{ sku, productId: order.items[0].productId, variantId: 'var-direct-1', quantity: 2 }],
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      status: 'ACTIVE',
    });

    await Payment.create({
      orderId: order._id,
      userId: order.userId,
      provider: 'RAZORPAY',
      providerOrderId: razorpayOrderId,
      amountPaise: 735000,
      currency: 'INR',
      status: 'CREATED',
    });
  });

  it('successfully verifies direct HMAC SHA-256 signature without any webhook and transitions order to PAID', async () => {
    // Generate valid HMAC SHA-256 signature
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const result = await paymentService.verifyPayment({
      orderId: order._id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: validSignature,
    });

    expect(result.success).toBe(true);

    // Verify order is transitioned to PAID
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('PAID');
    expect(updatedOrder.paymentDetails.razorpayPaymentId).toBe(razorpayPaymentId);

    // Verify inventory reservation was converted into sold stock
    const inv = await Inventory.findOne({ sku });
    expect(inv.reservedStock).toBe(0);
    expect(inv.soldStock).toBe(2);

    const resRecord = await Reservation.findOne({ orderId: order._id });
    expect(resRecord.status).toBe('CONFIRMED');
  });

  it('rejects tampered or invalid direct payment signature', async () => {
    await expect(
      paymentService.verifyPayment({
        orderId: order._id,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: 'invalid_tampered_signature_xyz',
      })
    ).rejects.toThrow();

    const currentOrder = await Order.findById(order._id);
    expect(currentOrder.status).toBe('PENDING_PAYMENT');
  });

  it('successfully confirms Cash on Delivery (COD) order without payment gateway', async () => {
    const result = await paymentService.confirmCodPayment({
      orderId: order._id,
      userId: order.userId,
    });

    expect(result.success).toBe(true);

    // Verify order transitioned to PROCESSING
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('PROCESSING');
    expect(updatedOrder.paymentDetails.method).toBe('CASH_ON_DELIVERY');

    // Verify inventory reservation converted into sold stock
    const inv = await Inventory.findOne({ sku });
    expect(inv.reservedStock).toBe(0);
    expect(inv.soldStock).toBe(2);
  });

  it('verifies sandbox fallback orders cleanly', async () => {
    const sandboxOrderId = `order_sandbox_12345678_${Date.now()}`;
    const result = await paymentService.verifyPayment({
      orderId: order._id,
      razorpayOrderId: sandboxOrderId,
      razorpayPaymentId: 'pay_sandbox_test',
      razorpaySignature: 'sandbox_verified',
    });

    expect(result.success).toBe(true);
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('PAID');
  });
});

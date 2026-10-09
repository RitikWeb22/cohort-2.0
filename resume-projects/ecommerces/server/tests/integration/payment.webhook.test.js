import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { paymentService } from '../../src/modules/payments/payment.service.js';
import { Order } from '../../src/modules/orders/order.model.js';
import { Payment } from '../../src/modules/payments/payment.model.js';
import { Inventory } from '../../src/modules/inventory/inventory.model.js';
import { Reservation } from '../../src/modules/inventory/reservation.model.js';
import { env } from '../../src/config/env.js';

describe('Razorpay Webhook Verification & Idempotency', () => {
  const secret = 'webhook_mock_secret_123';
  const razorpayOrderId = 'order_mock_rzp_999';
  const razorpayPaymentId = 'pay_mock_rzp_111';
  let order;
  let sku = 'WEBHOOK-SKU-1';

  beforeEach(async () => {
    env.RAZORPAY_WEBHOOK_SECRET = secret;

    // Create item inventory and active reservation
    await Inventory.create({
      sku,
      productId: new mongoose.Types.ObjectId(),
      variantId: 'var-wh-1',
      availableStock: 5,
      reservedStock: 2,
      soldStock: 0,
    });

    order = await Order.create({
      orderNumber: 'KORA-WH-001',
      userId: new mongoose.Types.ObjectId(),
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'Silk Stole',
          variantSku: sku,
          size: 'ONE_SIZE',
          fabric: 'Silk',
          pricePaise: 200000,
          quantity: 2,
          totalPaise: 400000,
        },
      ],
      shippingAddress: {
        street: 'Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110001',
      },
      pricing: {
        subtotalPaise: 400000,
        shippingPaise: 0,
        taxPaise: 20000,
        grandTotalPaise: 420000,
      },
      status: 'PENDING_PAYMENT',
      paymentDetails: {
        razorpayOrderId,
      },
    });

    await Reservation.create({
      orderId: order._id,
      items: [{ sku, productId: order.items[0].productId, variantId: 'var-wh-1', quantity: 2 }],
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 600000),
    });

    await Payment.create({
      orderId: order._id,
      userId: order.userId,
      provider: 'RAZORPAY',
      providerOrderId: razorpayOrderId,
      amountPaise: 420000,
      status: 'CREATED',
    });
  });

  const generateSignature = (payloadString) => {
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  };

  it('successfully processes valid webhook and updates order to PAID', async () => {
    const payload = {
      id: 'event_wh_test_1',
      event: 'order.paid',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 420000,
            status: 'captured',
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    const result = await paymentService.processWebhook({
      rawBody,
      signature,
      payload,
    });

    expect(result.success).toBe(true);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('PAID');
    expect(updatedOrder.paymentDetails.razorpayPaymentId).toBe(razorpayPaymentId);

    // Verify inventory confirmed
    const inventory = await Inventory.findOne({ sku });
    expect(inventory.reservedStock).toBe(0);
    expect(inventory.soldStock).toBe(2);
  });

  it('rejects webhook with invalid signature', async () => {
    const payload = { id: 'event_fake', event: 'order.paid' };
    const rawBody = JSON.stringify(payload);
    const invalidSignature = 'tampered_signature_invalid';

    await expect(
      paymentService.processWebhook({
        rawBody,
        signature: invalidSignature,
        payload,
      })
    ).rejects.toThrow();
  });

  it('guarantees webhook idempotency when receiving duplicate events', async () => {
    const payload = {
      id: 'event_duplicate_test_99',
      event: 'order.paid',
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateSignature(rawBody);

    // First delivery
    const firstDelivery = await paymentService.processWebhook({
      rawBody,
      signature,
      payload,
    });
    expect(firstDelivery.success).toBe(true);

    // Second delivery (duplicate)
    const secondDelivery = await paymentService.processWebhook({
      rawBody,
      signature,
      payload,
    });

    expect(secondDelivery.duplicate).toBe(true);

    // Ensure order remains PAID without crashing or duplicate status history entries
    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.status).toBe('PAID');
  });
});

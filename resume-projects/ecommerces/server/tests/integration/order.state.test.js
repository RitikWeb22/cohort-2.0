import { describe, it, expect } from 'vitest';
import { transitionOrderStatus, ORDER_STATUS } from '../../src/modules/orders/orderStateMachine.js';
import { ApiError } from '../../src/utils/ApiError.js';

describe('Order State Machine Invariants', () => {
  const createMockOrder = (status = ORDER_STATUS.PENDING_PAYMENT) => ({
    status,
    statusHistory: [],
  });

  it('allows valid state progression: PENDING_PAYMENT -> PAID -> PROCESSING -> SHIPPED -> DELIVERED', () => {
    let order = createMockOrder(ORDER_STATUS.PENDING_PAYMENT);

    order = transitionOrderStatus(order, ORDER_STATUS.PAID);
    expect(order.status).toBe(ORDER_STATUS.PAID);
    expect(order.statusHistory.length).toBe(1);

    order = transitionOrderStatus(order, ORDER_STATUS.PROCESSING);
    expect(order.status).toBe(ORDER_STATUS.PROCESSING);
    expect(order.statusHistory.length).toBe(2);

    order = transitionOrderStatus(order, ORDER_STATUS.SHIPPED);
    expect(order.status).toBe(ORDER_STATUS.SHIPPED);
    expect(order.statusHistory.length).toBe(3);

    order = transitionOrderStatus(order, ORDER_STATUS.DELIVERED);
    expect(order.status).toBe(ORDER_STATUS.DELIVERED);
    expect(order.statusHistory.length).toBe(4);
  });

  it('rejects invalid state jump: PENDING_PAYMENT -> DELIVERED', () => {
    const order = createMockOrder(ORDER_STATUS.PENDING_PAYMENT);

    expect(() => {
      transitionOrderStatus(order, ORDER_STATUS.DELIVERED);
    }).toThrow(ApiError);
  });

  it('rejects backwards state transition: DELIVERED -> PENDING_PAYMENT', () => {
    const order = createMockOrder(ORDER_STATUS.DELIVERED);

    expect(() => {
      transitionOrderStatus(order, ORDER_STATUS.PENDING_PAYMENT);
    }).toThrow(ApiError);
  });

  it('rejects transitions out of terminal state CANCELLED', () => {
    const order = createMockOrder(ORDER_STATUS.CANCELLED);

    expect(() => {
      transitionOrderStatus(order, ORDER_STATUS.PAID);
    }).toThrow(ApiError);
  });

  it('allows valid cancellation from PENDING_PAYMENT', () => {
    const order = createMockOrder(ORDER_STATUS.PENDING_PAYMENT);
    const updated = transitionOrderStatus(order, ORDER_STATUS.CANCELLED, { reason: 'User cancelled' });

    expect(updated.status).toBe(ORDER_STATUS.CANCELLED);
    expect(updated.statusHistory[0].reason).toBe('User cancelled');
  });

  it('allows valid refund from PAID', () => {
    const order = createMockOrder(ORDER_STATUS.PAID);
    const updated = transitionOrderStatus(order, ORDER_STATUS.REFUNDED, { reason: 'Return processed' });

    expect(updated.status).toBe(ORDER_STATUS.REFUNDED);
  });
});

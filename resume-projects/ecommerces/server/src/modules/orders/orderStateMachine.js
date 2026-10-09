import { ApiError } from '../../utils/ApiError.js';

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

// Allowed status transitions mapping
export const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.PAID, ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REFUNDED]: [],
};

/**
 * Validates and executes an explicit state machine transition on an order document.
 * Never sets order.status directly without going through this transition.
 */
export const transitionOrderStatus = (order, targetStatus, { changedBy = null, reason = '' } = {}) => {
  const currentStatus = order.status;

  if (currentStatus === targetStatus) {
    return order;
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw ApiError.badRequest(
      `Invalid order status transition from '${currentStatus}' to '${targetStatus}'.`,
      'INVALID_STATUS_TRANSITION',
      { currentStatus, targetStatus, allowedTransitions: allowedNext }
    );
  }

  order.statusHistory.push({
    fromStatus: currentStatus,
    toStatus: targetStatus,
    changedAt: new Date(),
    changedBy,
    reason,
  });

  order.status = targetStatus;
  return order;
};

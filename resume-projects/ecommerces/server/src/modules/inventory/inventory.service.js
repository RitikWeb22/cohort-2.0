import { inventoryRepository } from './inventory.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../config/logger.js';

export class InventoryService {
  /**
   * Concurrency-safe atomic reservation for multiple items.
   * If any item is out of stock, cleanly rolls back previous items.
   */
  async reserveStock({ orderId, items }) {
    if (!items || items.length === 0) {
      throw ApiError.badRequest('No items provided for reservation', 'EMPTY_ITEMS');
    }

    const reservedItems = [];

    for (const item of items) {
      const { sku, quantity, productId, variantId } = item;

      const updated = await inventoryRepository.reserveAtomic(sku, quantity);

      if (!updated) {
        // Rollback already reserved items in this transaction
        logger.warn(`Insufficient stock for SKU ${sku}. Rolling back ${reservedItems.length} reserved items.`);
        for (const rolledBack of reservedItems) {
          await inventoryRepository.releaseAtomic(rolledBack.sku, rolledBack.quantity);
          await inventoryRepository.createAudit({
            sku: rolledBack.sku,
            previousAvailableStock: 0,
            newAvailableStock: 0,
            difference: rolledBack.quantity,
            action: 'RELEASE',
            reason: `Rollback after SKU ${sku} reservation failure`,
          });
        }

        throw ApiError.badRequest(
          `Item with SKU '${sku}' has insufficient available stock.`,
          'INSUFFICIENT_STOCK',
          { sku, requestedQuantity: quantity }
        );
      }

      reservedItems.push({ sku, quantity, productId, variantId });

      // Audit trail for reservation
      await inventoryRepository.createAudit({
        sku,
        previousAvailableStock: updated.availableStock + quantity,
        newAvailableStock: updated.availableStock,
        difference: -quantity,
        action: 'RESERVE',
        reason: `Reserved for order ${orderId}`,
        metadata: { orderId },
      });
    }

    // Reservation valid for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const reservation = await inventoryRepository.createReservation({
      orderId,
      items: reservedItems,
      status: 'ACTIVE',
      expiresAt,
    });

    return reservation;
  }

  /**
   * Confirm reservation and convert reserved stock to sold stock
   */
  async confirmReservation(orderId) {
    const reservation = await inventoryRepository.findReservationByOrderId(orderId);
    if (!reservation) {
      logger.warn(`No active reservation found to confirm for order: ${orderId}`);
      return null;
    }

    for (const item of reservation.items) {
      await inventoryRepository.confirmSaleAtomic(item.sku, item.quantity);
      await inventoryRepository.createAudit({
        sku: item.sku,
        previousAvailableStock: 0,
        newAvailableStock: 0,
        difference: item.quantity,
        action: 'CONFIRM_SALE',
        reason: `Sale confirmed for order ${orderId}`,
        metadata: { orderId },
      });
    }

    await inventoryRepository.updateReservationStatus(reservation._id, 'CONFIRMED');
    return reservation;
  }

  /**
   * Release reserved stock back to available stock
   */
  async releaseReservation(orderId, reason = 'Checkout cancelled or expired') {
    const reservation = await inventoryRepository.findReservationByOrderId(orderId);
    if (!reservation || reservation.status !== 'ACTIVE') {
      return null;
    }

    for (const item of reservation.items) {
      await inventoryRepository.releaseAtomic(item.sku, item.quantity);
      await inventoryRepository.createAudit({
        sku: item.sku,
        previousAvailableStock: 0,
        newAvailableStock: 0,
        difference: item.quantity,
        action: 'RELEASE',
        reason: `${reason} for order ${orderId}`,
        metadata: { orderId },
      });
    }

    await inventoryRepository.updateReservationStatus(reservation._id, 'RELEASED');
    return reservation;
  }

  /**
   * Worker job to find and release all expired reservations
   */
  async releaseExpiredReservations() {
    const expiredReservations = await inventoryRepository.findExpiredReservations();
    logger.info(`Found ${expiredReservations.length} expired reservations to release.`);

    for (const res of expiredReservations) {
      for (const item of res.items) {
        await inventoryRepository.releaseAtomic(item.sku, item.quantity);
        await inventoryRepository.createAudit({
          sku: item.sku,
          previousAvailableStock: 0,
          newAvailableStock: 0,
          difference: item.quantity,
          action: 'RELEASE',
          reason: '10-minute reservation window expired',
          metadata: { orderId: res.orderId },
        });
      }
      await inventoryRepository.updateReservationStatus(res._id, 'EXPIRED');
    }

    return expiredReservations.length;
  }

  /**
   * Manual administrative stock adjustment with mandatory audit logging
   */
  async adjustStock({ sku, delta, adminId, reason }) {
    const existing = await inventoryRepository.findBySku(sku);
    if (!existing) {
      throw ApiError.notFound(`Inventory record for SKU '${sku}' not found`);
    }

    const prevStock = existing.availableStock;
    const updated = await inventoryRepository.adjustStock(sku, delta);
    if (!updated) {
      throw ApiError.badRequest('Cannot adjust stock below 0', 'INVALID_ADJUSTMENT');
    }

    await inventoryRepository.createAudit({
      sku,
      previousAvailableStock: prevStock,
      newAvailableStock: updated.availableStock,
      difference: delta,
      action: 'MANUAL_ADJUSTMENT',
      adminId,
      reason: reason || 'Manual admin inventory adjustment',
    });

    return updated;
  }

  async getInventoryBySku(sku) {
    const item = await inventoryRepository.findBySku(sku);
    if (!item) {
      throw ApiError.notFound(`Inventory for SKU '${sku}' not found`);
    }
    return item;
  }

  async getInventoryAudits(sku) {
    return inventoryRepository.getAuditsBySku(sku);
  }

  async getLowStock(threshold = 5) {
    return inventoryRepository.getLowStock(threshold);
  }

  async getAllInventory({ search } = {}) {
    const query = {};
    if (search) {
      query.sku = { $regex: search.toUpperCase(), $options: 'i' };
    }
    return inventoryRepository.findAll(query);
  }
}

export const inventoryService = new InventoryService();

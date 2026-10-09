import { Inventory } from './inventory.model.js';
import { Reservation } from './reservation.model.js';
import { InventoryAudit } from './inventoryAudit.model.js';

export class InventoryRepository {
  async findBySku(sku) {
    return Inventory.findOne({ sku });
  }

  async findByProductId(productId) {
    return Inventory.find({ productId });
  }

  async findBySkus(skus) {
    return Inventory.find({ sku: { $in: skus } });
  }

  async create(data) {
    return Inventory.create(data);
  }

  /**
   * Atomic conditional reservation
   */
  async reserveAtomic(sku, quantity) {
    return Inventory.findOneAndUpdate(
      {
        sku,
        availableStock: { $gte: quantity },
      },
      {
        $inc: {
          availableStock: -quantity,
          reservedStock: quantity,
        },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
  }

  /**
   * Release reserved stock back to available stock
   */
  async releaseAtomic(sku, quantity) {
    return Inventory.findOneAndUpdate(
      {
        sku,
        reservedStock: { $gte: quantity },
      },
      {
        $inc: {
          availableStock: quantity,
          reservedStock: -quantity,
        },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
  }

  /**
   * Finalize reservation to sold stock upon successful payment
   */
  async confirmSaleAtomic(sku, quantity) {
    return Inventory.findOneAndUpdate(
      {
        sku,
        reservedStock: { $gte: quantity },
      },
      {
        $inc: {
          reservedStock: -quantity,
          soldStock: quantity,
        },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
  }

  /**
   * Manual admin inventory adjustment
   */
  async adjustStock(sku, delta) {
    return Inventory.findOneAndUpdate(
      { sku, availableStock: { $gte: delta < 0 ? Math.abs(delta) : 0 } },
      {
        $inc: { availableStock: delta },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
  }

  /**
   * Upsert inventory for variant with absolute stock level
   */
  async upsertStock(sku, availableStock, productId, variantId) {
    return Inventory.findOneAndUpdate(
      { sku },
      {
        $set: {
          availableStock: Math.max(0, availableStock),
          productId,
          variantId,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          reservedStock: 0,
          soldStock: 0,
        },
      },
      { upsert: true, new: true }
    );
  }

  async createReservation(reservationData) {
    return Reservation.create(reservationData);
  }

  async findReservationById(id) {
    return Reservation.findById(id);
  }

  async findReservationByOrderId(orderId) {
    return Reservation.findOne({ orderId, status: 'ACTIVE' });
  }

  async updateReservationStatus(id, status) {
    return Reservation.findByIdAndUpdate(id, { status }, { new: true });
  }

  async findExpiredReservations(now = new Date()) {
    return Reservation.find({
      status: 'ACTIVE',
      expiresAt: { $lte: now },
    });
  }

  async createAudit(auditData) {
    return InventoryAudit.create(auditData);
  }

  async getAuditsBySku(sku, limit = 50) {
    return InventoryAudit.find({ sku }).sort({ createdAt: -1 }).limit(limit);
  }

  async getLowStock(threshold = 5) {
    return Inventory.find({ availableStock: { $lte: threshold } }).populate('productId');
  }

  async findAll(query = {}, sort = { availableStock: 1 }) {
    return Inventory.find(query).populate('productId').sort(sort);
  }
}

export const inventoryRepository = new InventoryRepository();

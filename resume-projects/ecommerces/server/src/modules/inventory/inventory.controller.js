import { inventoryService } from './inventory.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class InventoryController {
  async getAll(req, res) {
    const items = await inventoryService.getAllInventory(req.query);
    return ApiResponse.success(res, items, 'All inventory records retrieved');
  }

  async getBySku(req, res) {
    const item = await inventoryService.getInventoryBySku(req.params.sku.toUpperCase());
    return ApiResponse.success(res, item, 'Inventory item fetched');
  }

  async getAudits(req, res) {
    const audits = await inventoryService.getInventoryAudits(req.params.sku.toUpperCase());
    return ApiResponse.success(res, audits, 'Inventory audit trail retrieved');
  }

  async getLowStock(req, res) {
    const threshold = req.query.threshold ? parseInt(req.query.threshold, 10) : 5;
    const items = await inventoryService.getLowStock(threshold);
    return ApiResponse.success(res, items, 'Low stock items retrieved');
  }

  async adjustStock(req, res) {
    const { sku, delta, reason } = req.body;
    const updated = await inventoryService.adjustStock({
      sku: sku.toUpperCase(),
      delta: parseInt(delta, 10),
      adminId: req.user.id,
      reason,
    });
    return ApiResponse.success(res, updated, 'Inventory adjusted successfully');
  }

  async releaseExpired(req, res) {
    const releasedCount = await inventoryService.releaseExpiredReservations();
    return ApiResponse.success(res, { releasedCount }, `Released ${releasedCount} expired reservations`);
  }
}

export const inventoryController = new InventoryController();

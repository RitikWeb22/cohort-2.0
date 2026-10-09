import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Inventory } from '../../src/modules/inventory/inventory.model.js';
import { inventoryService } from '../../src/modules/inventory/inventory.service.js';

describe('Inventory Concurrency & Race Condition Guarantee', () => {
  const TEST_SKU = 'RACE-SKU-001';
  const productId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await Inventory.create({
      sku: TEST_SKU,
      productId,
      variantId: 'var-1',
      availableStock: 1, // EXACTLY 1 item in stock
      reservedStock: 0,
      soldStock: 0,
    });
  });

  it('prevents overselling when 50 concurrent requests compete for the last single item', async () => {
    const concurrentRequests = 50;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const orderId = new mongoose.Types.ObjectId();
      promises.push(
        inventoryService
          .reserveStock({
            orderId,
            items: [
              {
                sku: TEST_SKU,
                quantity: 1,
                productId,
                variantId: 'var-1',
              },
            ],
          })
          .then(() => ({ success: true, orderId }))
          .catch((err) => ({ success: false, error: err.message }))
      );
    }

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Exactly 1 reservation may succeed
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(concurrentRequests - 1);

    // Verify DB state
    const inventory = await Inventory.findOne({ sku: TEST_SKU });
    expect(inventory.availableStock).toBe(0);
    expect(inventory.reservedStock).toBe(1);
    expect(inventory.soldStock).toBe(0);
  });
});

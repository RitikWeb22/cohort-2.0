import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Register all Mongoose models for population
import '../src/modules/users/user.model.js';
import '../src/modules/categories/category.model.js';
import '../src/modules/products/product.model.js';
import '../src/modules/inventory/inventory.model.js';
import '../src/modules/inventory/reservation.model.js';
import '../src/modules/inventory/inventoryAudit.model.js';
import '../src/modules/orders/order.model.js';
import '../src/modules/payments/payment.model.js';
import '../src/modules/payments/paymentEvent.model.js';

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_123';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_123';
  process.env.RAZORPAY_KEY_ID = 'rzp_test_mock';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_mock_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_mock_secret_123';

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

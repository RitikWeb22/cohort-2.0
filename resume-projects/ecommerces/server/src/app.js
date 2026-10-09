import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';

// Route imports
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { productRoutes } from './modules/products/product.routes.js';
import { cartRoutes } from './modules/cart/cart.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { paymentRoutes } from './modules/payments/payment.routes.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { couponRoutes } from './modules/coupons/coupon.routes.js';
import { uploadRoutes } from './modules/upload/upload.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // 1. Security & headers
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-razorpay-signature'],
    })
  );

  // 2. Request body parsing with rawBody preservation for webhooks
  app.use(
    express.json({
      limit: '5mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());

  // 3. Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // 4. Rate Limiting
  app.use('/api', apiRateLimiter);

  // 5. Health Check Endpoint
  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      brand: 'KORA',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 6. Static Uploads Folder
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  // 7. API v1 Routes Mount
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/cart', cartRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/coupons', couponRoutes);
  app.use('/api/v1/upload', uploadRoutes);

  // 8. 404 Handler
  app.use((req, res, next) => {
    next(ApiError.notFound(`Endpoint ${req.method} ${req.originalUrl} not found`));
  });

  // 8. Central Error Handler
  app.use(errorHandler);

  return app;
};

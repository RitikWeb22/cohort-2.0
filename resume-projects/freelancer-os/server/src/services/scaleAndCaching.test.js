import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  ensureAllDatabaseIndexes,
  INDEXED_MODELS,
} from '../config/dbIndexes.js';
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPrefix,
  cacheMiddleware,
  getCacheStatus,
} from './redisService.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ConflictError,
  RateLimitError,
} from '../utils/errors.js';
import { errorHandler } from '../middleware/errorHandler.js';

describe('1M+ Scale Infrastructure: MongoDB Indexing, Redis Caching & Error Handling', () => {
  describe('Pillar 1: MongoDB Indexing Architecture for 1M+ Scale', () => {
    it('verifies all core collections have compound and unique indexes matching the ESR rule', () => {
      expect(INDEXED_MODELS.length).toBeGreaterThanOrEqual(10);

      // Verify User indexes
      const userIndexes = INDEXED_MODELS.find((m) => m.name === 'User').model.schema.indexes();
      expect(userIndexes.some((idx) => idx[0].stripeCustomerId === 1)).toBe(true);
      expect(userIndexes.some((idx) => idx[0].subscriptionStatus === 1 && idx[0].gracePeriodExpiresAt === 1)).toBe(true);

      // Verify Client compound index
      const clientIndexes = INDEXED_MODELS.find((m) => m.name === 'Client').model.schema.indexes();
      expect(clientIndexes.some((idx) => idx[0].userId === 1 && idx[0].createdAt === -1)).toBe(true);
      expect(clientIndexes.some((idx) => idx[0].userId === 1 && idx[0].status === 1)).toBe(true);

      // Verify Invoice compound index and unique invoice number
      const invoiceIndexes = INDEXED_MODELS.find((m) => m.name === 'Invoice').model.schema.indexes();
      expect(invoiceIndexes.some((idx) => idx[0].userId === 1 && idx[0].invoiceNumber === 1 && idx[1]?.unique)).toBe(true);
      expect(invoiceIndexes.some((idx) => idx[0].userId === 1 && idx[0].status === 1 && idx[0].dueDate === 1)).toBe(true);

      // Verify Project compound indexes
      const projectIndexes = INDEXED_MODELS.find((m) => m.name === 'Project').model.schema.indexes();
      expect(projectIndexes.some((idx) => idx[0].userId === 1 && idx[0].createdAt === -1)).toBe(true);
      expect(projectIndexes.some((idx) => idx[0].clientId === 1 && idx[0].userId === 1)).toBe(true);

      // Verify ActivityLog TTL index
      const activityIndexes = INDEXED_MODELS.find((m) => m.name === 'ActivityLog').model.schema.indexes();
      expect(activityIndexes.some((idx) => idx[0].timestamp === 1 && idx[1]?.expireAfterSeconds > 0)).toBe(true);

      // Verify ProcessedEvent compound index and TTL index
      const eventIndexes = INDEXED_MODELS.find((m) => m.name === 'ProcessedEvent').model.schema.indexes();
      expect(eventIndexes.some((idx) => idx[0].provider === 1 && idx[0].eventId === 1 && idx[1]?.unique)).toBe(true);
      expect(eventIndexes.some((idx) => idx[0].createdAt === 1 && idx[1]?.expireAfterSeconds > 0)).toBe(true);
    });

    it('successfully reconciles all indexes via ensureAllDatabaseIndexes() without throwing', async () => {
      const results = await ensureAllDatabaseIndexes();
      expect(Array.isArray(results)).toBe(true);
      expect(results.every((r) => ['ready', 'warning', 'skipped_disconnected'].includes(r.status))).toBe(true);
    });
  });

  describe('Pillar 2: Redis Caching Layer & Invalidation', () => {
    beforeEach(async () => {
      await cacheDelPrefix('test:');
    });

    it('stores, retrieves, and deletes values with TTL', async () => {
      await cacheSet('test:metric:user1', { totalBilled: 50000, activeClients: 12 }, 60);

      const cached = await cacheGet('test:metric:user1');
      expect(cached).toEqual({ totalBilled: 50000, activeClients: 12 });

      await cacheDel('test:metric:user1');
      const deleted = await cacheGet('test:metric:user1');
      expect(deleted).toBeNull();
    });

    it('invalidates multiple keys matching a user prefix on mutation', async () => {
      await cacheSet('test:user_999:dashboard', { val: 1 }, 60);
      await cacheSet('test:user_999:invoices', { val: 2 }, 60);
      await cacheSet('test:user_888:dashboard', { val: 3 }, 60);

      await cacheDelPrefix('test:user_999:');

      expect(await cacheGet('test:user_999:dashboard')).toBeNull();
      expect(await cacheGet('test:user_999:invoices')).toBeNull();
      // Unrelated user cache remains untouched
      expect(await cacheGet('test:user_888:dashboard')).toEqual({ val: 3 });
    });

    it('intercepts HTTP requests with cacheMiddleware serving MISS then HIT', async () => {
      const app = express();
      let dbComputeCount = 0;

      app.get(
        '/api/v1/test-cached-endpoint',
        cacheMiddleware({ ttl: 60, keyGenerator: () => 'test:http:endpoint' }),
        (req, res) => {
          dbComputeCount += 1;
          res.json({ computeCount: dbComputeCount, data: 'heavy_aggregation' });
        }
      );

      // 1. First call: Cache MISS (executes handler)
      const res1 = await request(app).get('/api/v1/test-cached-endpoint');
      expect(res1.status).toBe(200);
      expect(res1.headers['x-cache']).toBe('MISS');
      expect(res1.body.computeCount).toBe(1);

      // 2. Second call: Cache HIT (served from Redis / Memory in < 1ms without hitting DB)
      const res2 = await request(app).get('/api/v1/test-cached-endpoint');
      expect(res2.status).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');
      expect(res2.body.computeCount).toBe(1); // Handler was not re-run
    });

    it('reports cache status telemetry', () => {
      const status = getCacheStatus();
      expect(status).toHaveProperty('engine');
      expect(status).toHaveProperty('isRedisConnected');
      expect(status).toHaveProperty('memoryCacheEntries');
    });
  });

  describe('Pillar 3: Centralized Production Error Handling', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Route throwing NotFoundError
      app.get('/test-not-found', (req, res, next) => {
        next(new NotFoundError('Client record 123 not found'));
      });

      // Route throwing ValidationError
      app.post('/test-validation-error', (req, res, next) => {
        next(new ValidationError('Hourly rate cannot be negative', { hourlyRate: 'Must be >= 0' }));
      });

      // Route throwing Mongoose CastError
      app.get('/test-cast-error', (req, res, next) => {
        const castErr = new Error('Cast to ObjectId failed');
        castErr.name = 'CastError';
        castErr.path = 'clientId';
        next(castErr);
      });

      // Route throwing MongoDB Duplicate Key error (11000)
      app.post('/test-duplicate-key', (req, res, next) => {
        const dupErr = new Error('E11000 duplicate key error');
        dupErr.code = 11000;
        dupErr.keyValue = { invoiceNumber: 'INV-2026-001' };
        next(dupErr);
      });

      // Route throwing JWT error
      app.get('/test-jwt-error', (req, res, next) => {
        const jwtErr = new Error('invalid token');
        jwtErr.name = 'JsonWebTokenError';
        next(jwtErr);
      });

      // Route throwing unexpected unhandled error
      app.get('/test-unhandled-error', (req, res, next) => {
        next(new Error('Sensitive DB Connection details: secret_mongo_pass_leak'));
      });

      app.use(errorHandler);
    });

    it('formats NotFoundError as 404 with structured errorId', async () => {
      const res = await request(app).get('/test-not-found');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.error).toBe('Client record 123 not found');
      expect(res.body.errorId).toBeDefined();
    });

    it('formats ValidationError as 400 with field-level details', async () => {
      const res = await request(app).post('/test-validation-error');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toEqual({ hourlyRate: 'Must be >= 0' });
    });

    it('formats Mongoose CastError as 400 without crashing', async () => {
      const res = await request(app).get('/test-cast-error');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ID_FORMAT');
      expect(res.body.error).toContain('clientId');
    });

    it('formats MongoDB code 11000 duplicate key error as 409 Conflict', async () => {
      const res = await request(app).post('/test-duplicate-key');
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_KEY_CONFLICT');
      expect(res.body.error).toContain('invoiceNumber');
      expect(res.body.field).toBe('invoiceNumber');
    });

    it('formats JWT errors as 401 Unauthorized', async () => {
      const res = await request(app).get('/test-jwt-error');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('safely catches unexpected 500 errors and provides an errorId without leaking internal secrets', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const res = await request(app).get('/test-unhandled-error');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.errorId).toBeDefined();
      // Must NOT leak internal database connection secrets
      expect(res.body.error).not.toContain('secret_mongo_pass_leak');
      expect(res.body.error).toContain('unexpected internal server error');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});

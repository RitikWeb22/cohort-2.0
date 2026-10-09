import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { getRedisClient } from './config/redis.js';
import { logger } from './config/logger.js';
import { inventoryService } from './modules/inventory/inventory.service.js';

const app = createApp();

let server = null;
let reservationCleanupTimer = null;

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 1b. Auto-seed catalog if empty (ensures products always display in development)
    const { autoSeedIfEmpty } = await import('./config/seedData.js');
    await autoSeedIfEmpty();

    // 2. Initialize Redis Client
    getRedisClient();

    // 3. Periodic Background Worker for releasing expired reservations (every 60 seconds)
    reservationCleanupTimer = setInterval(async () => {
      try {
        await inventoryService.releaseExpiredReservations();
      } catch (err) {
        logger.error('Error during scheduled expired reservation cleanup:', err);
      }
    }, 60 * 1000);

    // 4. Start HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info(`✨ KORA API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down KORA server...`);

  if (reservationCleanupTimer) {
    clearInterval(reservationCleanupTimer);
  }

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

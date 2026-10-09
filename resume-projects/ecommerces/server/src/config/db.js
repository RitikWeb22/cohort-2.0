import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

// Resolve Windows / ISP DNS SRV record lookup issues with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS cannot be set
}

let isConnected = false;
let memoryServerInstance = null;

export const connectDB = async (uri = env.MONGODB_URI) => {
  if (isConnected) {
    return mongoose.connection;
  }

  // 1. Try connecting to configured MongoDB Atlas / URI
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    logger.info(`MongoDB Connected Successfully: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    logger.warn(`Primary MongoDB URI failed (${error.message}).`);

    // 2. In development or test, fallback seamlessly to in-memory MongoDB
    if (env.NODE_ENV !== 'production') {
      logger.info('⚡ Initializing embedded in-memory MongoDB for instant zero-config development...');

      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServerInstance = await MongoMemoryServer.create();
        const memUri = memoryServerInstance.getUri();

        const conn = await mongoose.connect(memUri, {
          autoIndex: true,
        });
        isConnected = true;
        logger.info(`✨ In-memory development MongoDB connected successfully.`);
        return conn.connection;
      } catch (memError) {
        logger.error('Failed to initialize in-memory fallback MongoDB:', memError);
        throw error;
      }
    }

    logger.error('Production MongoDB connection failed:', error);
    throw error;
  }
};

export const disconnectDB = async () => {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    isConnected = false;
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error('MongoDB disconnect error:', error);
    throw error;
  }
};

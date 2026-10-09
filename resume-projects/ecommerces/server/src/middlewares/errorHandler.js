import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If not an instance of ApiError, normalize it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    const code = error.code || (error.name === 'ValidationError' ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
    error = new ApiError(statusCode, message, code, error.details || null);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`Duplicate entry for ${field}. A record with this ${field} already exists.`, 'DUPLICATE_KEY');
  }

  // Log error with request ID and context
  const requestId = req.headers['x-request-id'] || 'no-request-id';
  if (error.statusCode >= 500) {
    logger.error(`[Req: ${requestId}] [${req.method} ${req.originalUrl}] ${error.message}`, {
      stack: err.stack,
      body: req.body,
      query: req.query,
      params: req.params,
    });
  } else {
    logger.warn(`[Req: ${requestId}] [${req.method} ${req.originalUrl}] ${error.message}`);
  }

  const responsePayload = {
    success: false,
    message: error.message,
    code: error.code,
  };

  if (error.details) {
    responsePayload.details = error.details;
  }

  // Stack trace only visible in development
  if (env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  return res.status(error.statusCode).json(responsePayload);
};

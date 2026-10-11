import crypto from 'crypto';
import { logger } from '../logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Production-ready centralized Express error handling middleware
 */
export function errorHandler(err, req, res, next) {
  const errorId = crypto.randomUUID();
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Structured Logging
  logger.error(
    {
      errorId,
      name: err.name,
      message: err.message,
      code: err.code,
      status: err.statusCode || err.status || 500,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: isProduction ? undefined : err.stack,
    },
    'API Request Error'
  );

  // 2. Custom AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      error: err.message,
      details: err.details || undefined,
      errorId,
    });
  }

  // 3. Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const fields = {};
    for (const key in err.errors) {
      fields[key] = err.errors[key].message;
    }
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Data validation failed',
      errors: fields,
      errorId,
    });
  }

  // 4. Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_ID_FORMAT',
      error: `Invalid resource identifier format for '${err.path}'`,
      errorId,
    });
  }

  // 5. MongoDB Duplicate Key Conflict (Error code 11000)
  if (err.code === 11000) {
    const duplicateKey = Object.keys(err.keyValue || {})[0] || 'field';
    const duplicateValue = err.keyValue ? err.keyValue[duplicateKey] : '';
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_KEY_CONFLICT',
      error: `A record with this ${duplicateKey} ('${duplicateValue}') already exists.`,
      field: duplicateKey,
      errorId,
    });
  }

  // 6. JSON Body Parser Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 'MALFORMED_JSON',
      error: 'Malformed JSON payload in request body.',
      errorId,
    });
  }

  // 7. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      error: 'Authentication token is invalid or malformed.',
      errorId,
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      error: 'Authentication token has expired. Please sign in again.',
      errorId,
    });
  }

  // 8. Default Internal Server Error (Sanitized in production)
  const statusCode = err.statusCode || err.status || 500;
  const message = isProduction && statusCode === 500
    ? 'An unexpected internal server error occurred. Please contact support.'
    : (err.message || 'Internal Server Error');

  return res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    error: message,
    errorId,
  });
}

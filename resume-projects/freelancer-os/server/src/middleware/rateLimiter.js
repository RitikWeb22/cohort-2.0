/**
 * In-memory sliding-window rate limiter for Express.
 * Protects auth and high-frequency endpoints against brute force and DDoS attacks.
 * Automatically evicts expired IP records to prevent memory leaks.
 */

export function rateLimit(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // default 15 mins
  const max = options.max || 100;
  const message = options.message || 'Too many requests from this IP, please try again later.';
  const statusCode = options.statusCode || 429;

  const hits = new Map();

  // Periodic cleanup every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref(); // Do not hold Node event loop open
  }

  return (req, res, next) => {
    // Determine client IP safely
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
               req.socket?.remoteAddress ||
               req.ip ||
               'unknown-ip';

    const now = Date.now();
    let record = hits.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(statusCode).json({
        success: false,
        error: message,
        retryAfterSeconds: resetSeconds,
      });
    }

    next();
  };
}

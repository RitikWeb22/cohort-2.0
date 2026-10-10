/**
 * Security Middleware Suite for Floorly API
 * - Standard HTTP Security Headers (NoSQL/XSS/Clickjacking protections)
 * - Deep object sanitizer against MongoDB operator injection ($gt, $where, etc.)
 */

// Deep sanitize an object to strip keys starting with '$' or containing '.'
export function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const clean = {};
  for (const key of Object.keys(data)) {
    // Drop keys that could be used for MongoDB operator injection
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeData(data[key]);
  }
  return clean;
}

// Middleware that applies deep sanitization to req.body, req.query, and req.params
export function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeData(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeData(req.params);
  }
  next();
}

// Middleware that sets standard security HTTP headers
export function securityHeaders(req, res, next) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking via iframes
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Legacy XSS filter activation
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Control referrer information leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable dangerous browser device features by default
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Remove X-Powered-By header if present
  res.removeHeader('X-Powered-By');

  next();
}

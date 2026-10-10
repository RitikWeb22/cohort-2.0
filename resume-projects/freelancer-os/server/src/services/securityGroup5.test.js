import { describe, it, expect } from 'vitest';
import { securityHeaders } from '../middleware/security.js';

describe('Group 5: Security Headers & SEO Suite', () => {
  it('sets Content-Security-Policy and standard security headers in Express middleware', () => {
    const headers = {};
    const req = {};
    const res = {
      setHeader: (key, val) => {
        headers[key] = val;
      },
      removeHeader: (key) => {
        delete headers[key];
      },
    };
    headers['X-Powered-By'] = 'Express';

    let nextCalled = false;
    securityHeaders(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(headers['Content-Security-Policy-Report-Only']).toBeDefined();
    expect(headers['Content-Security-Policy-Report-Only']).toContain("default-src 'self'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Powered-By']).toBeUndefined();
  });
});

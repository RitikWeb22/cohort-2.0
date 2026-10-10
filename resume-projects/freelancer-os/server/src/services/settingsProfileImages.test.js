import { describe, it, expect } from 'vitest';
import { sanitizeData } from '../middleware/security.js';

describe('Settings Profile & Image Upload Suite', () => {
  it('preserves base64 data URLs without stripping during deep object sanitization', () => {
    const rawPayload = {
      name: 'Alex Morgan',
      businessName: 'Apex Studio',
      logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      country: 'US',
      currency: 'USD',
      paymentMethods: {
        bankTransfer: {
          accountHolder: 'Alex Morgan',
          bankName: 'Chase',
          accountNumber: '123456789',
        },
      },
    };

    const sanitized = sanitizeData(rawPayload);

    expect(sanitized.logoUrl).toBe(rawPayload.logoUrl);
    expect(sanitized.signatureUrl).toBe(rawPayload.signatureUrl);
    expect(sanitized.businessName).toBe('Apex Studio');
    expect(sanitized.paymentMethods.bankTransfer.accountNumber).toBe('123456789');
  });

  it('correctly filters MongoDB operator keys while preserving image data', () => {
    const maliciousPayload = {
      $where: 'function() { return true; }',
      'malicious.key': true,
      logoUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
      name: 'Alex Morgan',
    };

    const sanitized = sanitizeData(maliciousPayload);

    expect(sanitized.$where).toBeUndefined();
    expect(sanitized['malicious.key']).toBeUndefined();
    expect(sanitized.logoUrl).toBe(maliciousPayload.logoUrl);
    expect(sanitized.name).toBe('Alex Morgan');
  });
});

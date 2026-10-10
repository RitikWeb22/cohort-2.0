import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

export function validateResetToken({ storedHashedToken, storedExpiresAt, providedPlainToken, now = new Date() }) {
  if (!providedPlainToken) {
    throw new Error('Token is required');
  }

  const hashedProvided = crypto.createHash('sha256').update(providedPlainToken).digest('hex');
  if (hashedProvided !== storedHashedToken) {
    throw new Error('Invalid token');
  }

  if (!storedExpiresAt || storedExpiresAt <= now) {
    throw new Error('Token expired');
  }

  return true;
}

describe('Password Reset Token Expiry & Reuse Protection Suite', () => {
  const plainToken = 'test_raw_reset_token_secret_12345';
  const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

  it('accepts valid, unexpired token', () => {
    const unexpiredDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const isValid = validateResetToken({
      storedHashedToken: hashedToken,
      storedExpiresAt: unexpiredDate,
      providedPlainToken: plainToken,
    });
    expect(isValid).toBe(true);
  });

  it('rejects expired token', () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second in the past
    expect(() =>
      validateResetToken({
        storedHashedToken: hashedToken,
        storedExpiresAt: pastDate,
        providedPlainToken: plainToken,
      })
    ).toThrow('Token expired');
  });

  it('rejects reused token when stored token is cleared', () => {
    const unexpiredDate = new Date(Date.now() + 60 * 60 * 1000);
    // After reset, stored token becomes null
    expect(() =>
      validateResetToken({
        storedHashedToken: null,
        storedExpiresAt: unexpiredDate,
        providedPlainToken: plainToken,
      })
    ).toThrow('Invalid token');
  });

  it('rejects tampered or mismatched token string', () => {
    const unexpiredDate = new Date(Date.now() + 60 * 60 * 1000);
    expect(() =>
      validateResetToken({
        storedHashedToken: hashedToken,
        storedExpiresAt: unexpiredDate,
        providedPlainToken: 'wrong_tampered_token_string',
      })
    ).toThrow('Invalid token');
  });
});

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { userRepository } from '../users/user.repository.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { emailService } from '../../utils/email.service.js';
import { logger } from '../../config/logger.js';

export class AuthService {
  generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );
  }

  async register({ name, email, password }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw ApiError.conflict('An account with this email already exists', 'EMAIL_EXISTS');
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await userRepository.create({
      name,
      email,
      password: hashedPassword,
      role: 'CUSTOMER',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
    });

    // Send verification email via Resend (async, does not block registration response)
    emailService.sendVerificationEmail({
      to: email,
      name,
      token: verificationToken,
    }).catch((err) => {
      logger.error(`Error sending verification email: ${err.message}`);
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await userRepository.updateRefreshToken(user._id, refreshToken);

    const userDoc = user.toObject();
    delete userDoc.password;
    delete userDoc.refreshToken;
    delete userDoc.emailVerificationToken;
    delete userDoc.emailVerificationExpiresAt;

    return { user: userDoc, accessToken, refreshToken, verificationToken };
  }

  async verifyEmail(token) {
    if (!token) {
      throw ApiError.badRequest('Verification token is required', 'TOKEN_REQUIRED');
    }

    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token', 'INVALID_TOKEN');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    logger.info(`User ${user.email} successfully verified email.`);
    return { success: true, message: 'Email successfully verified' };
  }

  async resendVerification(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.isEmailVerified) {
      return { success: true, message: 'Email is already verified', alreadyVerified: true };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken,
    });

    return { success: true, message: 'Verification email resent successfully' };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email, true);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'SUSPENDED') {
      throw ApiError.forbidden('Your account has been suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await userRepository.updateRefreshToken(user._id, refreshToken);

    const userDoc = user.toObject();
    delete userDoc.password;
    delete userDoc.refreshToken;

    return { user: userDoc, accessToken, refreshToken };
  }

  async refreshTokens(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw ApiError.unauthorized('Refresh token is required', 'TOKEN_REQUIRED');
    }

    let decoded;
    try {
      decoded = jwt.verify(incomingRefreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const user = await userRepository.findByIdWithRefreshToken(decoded.sub);
    if (!user || user.refreshToken !== incomingRefreshToken) {
      // Possible token reuse attack or invalid session
      if (user) {
        await userRepository.updateRefreshToken(user._id, null);
      }
      throw ApiError.unauthorized('Token reuse detected or session expired. Please log in again.', 'SESSION_EXPIRED');
    }

    if (user.status === 'SUSPENDED') {
      throw ApiError.forbidden('Your account has been suspended', 'ACCOUNT_SUSPENDED');
    }

    // Token rotation
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    await userRepository.updateRefreshToken(user._id, newRefreshToken);

    const userDoc = user.toObject();
    delete userDoc.password;
    delete userDoc.refreshToken;

    return { user: userDoc, accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId) {
    if (userId) {
      await userRepository.updateRefreshToken(userId, null);
    }
    return true;
  }

  async forgotPassword(email) {
    if (!email) {
      throw ApiError.badRequest('Email is required', 'EMAIL_REQUIRED');
    }

    const user = await userRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return { message: 'If an account exists with that email, a password reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 3600000); // 1 hour

    await userRepository.updateById(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: resetExpiresAt,
    });

    try {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: resetToken,
      });
    } catch (err) {
      logger.warn(`Failed to dispatch password reset email: ${err.message}`);
    }

    return {
      message: 'Password reset link has been sent to your email.',
      ...(env.NODE_ENV !== 'production' && { resetToken }),
    };
  }

  async resetPassword(token, newPassword) {
    if (!token) {
      throw ApiError.badRequest('Password reset token is required', 'TOKEN_REQUIRED');
    }
    if (!newPassword || newPassword.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters long', 'INVALID_PASSWORD');
    }

    const user = await userRepository.findByPasswordResetToken(token);
    if (!user) {
      throw ApiError.badRequest('Password reset token is invalid or has expired', 'INVALID_OR_EXPIRED_TOKEN');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updateById(user._id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      refreshToken: null,
    });

    logger.info(`Password successfully reset for user ${user.email}`);
    return { message: 'Password has been successfully reset. You can now sign in with your new password.' };
  }
}

export const authService = new AuthService();

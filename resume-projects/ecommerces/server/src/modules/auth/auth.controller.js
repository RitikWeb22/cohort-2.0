import { authService } from './auth.service.js';
import { userRepository } from '../users/user.repository.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { env } from '../../config/env.js';

const isHttps = env.CLIENT_URL?.startsWith('https://');

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
};

export class AuthController {
  async register(req, res) {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    setRefreshTokenCookie(res, refreshToken);
    return ApiResponse.created(res, { user, accessToken }, 'User registered successfully');
  }

  async login(req, res) {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshTokenCookie(res, refreshToken);
    return ApiResponse.success(res, { user, accessToken }, 'Login successful');
  }

  async refresh(req, res) {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    const { user, accessToken, refreshToken } = await authService.refreshTokens(token);
    setRefreshTokenCookie(res, refreshToken);
    return ApiResponse.success(res, { user, accessToken }, 'Tokens refreshed successfully');
  }

  async logout(req, res) {
    const userId = req.user ? req.user.id : null;
    await authService.logout(userId);
    clearRefreshTokenCookie(res);
    return ApiResponse.success(res, null, 'Logged out successfully');
  }

  async me(req, res) {
    const user = await userRepository.findById(req.user.id);
    return ApiResponse.success(res, { user: user || req.user }, 'Current user session');
  }

  async verifyEmail(req, res) {
    const token = req.query.token || req.body.token;
    const result = await authService.verifyEmail(token);
    return ApiResponse.success(res, result, 'Email verified successfully');
  }

  async resendVerification(req, res) {
    const userId = req.user.id;
    const result = await authService.resendVerification(userId);
    return ApiResponse.success(res, result, 'Verification email sent successfully');
  }

  async forgotPassword(req, res) {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return ApiResponse.success(res, result, result.message);
  }

  async resetPassword(req, res) {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    return ApiResponse.success(res, result, result.message);
  }
}

export const authController = new AuthController();

import { Router } from 'express';
import { authController } from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.validator.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler((req, res) => authController.register(req, res))
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler((req, res) => authController.login(req, res))
);

router.post(
  '/refresh',
  asyncHandler((req, res) => authController.refresh(req, res))
);

router.post(
  '/logout',
  auth,
  asyncHandler((req, res) => authController.logout(req, res))
);

router.get(
  '/me',
  auth,
  asyncHandler((req, res) => authController.me(req, res))
);

router.all(
  '/verify-email',
  asyncHandler((req, res) => authController.verifyEmail(req, res))
);

router.post(
  '/resend-verification',
  auth,
  authRateLimiter,
  asyncHandler((req, res) => authController.resendVerification(req, res))
);

router.post(
  '/forgot-password',
  authRateLimiter,
  asyncHandler((req, res) => authController.forgotPassword(req, res))
);

router.post(
  '/reset-password',
  authRateLimiter,
  asyncHandler((req, res) => authController.resetPassword(req, res))
);

export const authRoutes = router;

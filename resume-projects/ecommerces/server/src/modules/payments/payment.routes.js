import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { paymentRateLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

// Webhook endpoint (must accept raw body, no auth middleware)
router.post(
  '/webhook',
  asyncHandler((req, res) => paymentController.handleWebhook(req, res))
);

// Customer endpoints
router.post(
  '/create-session',
  auth,
  paymentRateLimiter,
  asyncHandler((req, res) => paymentController.createPaymentSession(req, res))
);

router.post(
  '/verify',
  auth,
  paymentRateLimiter,
  asyncHandler((req, res) => paymentController.verifyPayment(req, res))
);

router.post(
  '/cod-confirm',
  auth,
  paymentRateLimiter,
  asyncHandler((req, res) => paymentController.confirmCodPayment(req, res))
);

export const paymentRoutes = router;

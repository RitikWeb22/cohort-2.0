import { Router } from 'express';
import { couponController } from './coupon.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

// Public / Client validation route (must be authenticated user)
router.post(
  '/validate',
  auth,
  asyncHandler((req, res) => couponController.validate(req, res))
);

// Admin-only management routes
router.get(
  '/',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => couponController.getAll(req, res))
);

router.post(
  '/',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => couponController.create(req, res))
);

router.patch(
  '/:id',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => couponController.update(req, res))
);

router.patch(
  '/:id/toggle',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => couponController.toggleStatus(req, res))
);

router.delete(
  '/:id',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => couponController.delete(req, res))
);

export const couponRoutes = router;

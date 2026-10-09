import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

router.use(auth);
router.use(rbac('ADMIN', 'SUPER_ADMIN'));

router.get(
  '/metrics',
  asyncHandler((req, res) => adminController.getMetrics(req, res))
);

export const adminRoutes = router;

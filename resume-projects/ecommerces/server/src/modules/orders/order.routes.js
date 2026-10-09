import { Router } from 'express';
import { orderController } from './order.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

router.use(auth);

// Customer endpoints
router.post(
  '/checkout',
  asyncHandler((req, res) => orderController.checkout(req, res))
);

router.get(
  '/my-orders',
  asyncHandler((req, res) => orderController.getMyOrders(req, res))
);

router.get(
  '/:id',
  asyncHandler((req, res) => orderController.getOrderById(req, res))
);

router.post(
  '/:id/cancel',
  asyncHandler((req, res) => orderController.cancelOrder(req, res))
);

// Admin endpoints
router.get(
  '/admin/all',
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => orderController.listAllOrders(req, res))
);

router.patch(
  '/admin/:id/status',
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => orderController.updateOrderStatus(req, res))
);

export const orderRoutes = router;

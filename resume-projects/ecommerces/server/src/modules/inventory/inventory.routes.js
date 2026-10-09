import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

router.use(auth);
router.use(rbac('ADMIN', 'SUPER_ADMIN'));

router.get(
  '/',
  asyncHandler((req, res) => inventoryController.getAll(req, res))
);

router.get(
  '/low-stock',
  asyncHandler((req, res) => inventoryController.getLowStock(req, res))
);

router.get(
  '/sku/:sku',
  asyncHandler((req, res) => inventoryController.getBySku(req, res))
);

router.get(
  '/sku/:sku/audits',
  asyncHandler((req, res) => inventoryController.getAudits(req, res))
);

router.post(
  '/adjust',
  asyncHandler((req, res) => inventoryController.adjustStock(req, res))
);

router.post(
  '/release-expired',
  asyncHandler((req, res) => inventoryController.releaseExpired(req, res))
);

export const inventoryRoutes = router;

import { Router } from 'express';
import { productController } from './product.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

router.get(
  '/',
  asyncHandler((req, res) => productController.getAll(req, res))
);

router.get(
  '/slug/:slug',
  asyncHandler((req, res) => productController.getBySlug(req, res))
);

router.get(
  '/:id',
  asyncHandler((req, res) => productController.getById(req, res))
);

router.post(
  '/',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => productController.create(req, res))
);

router.patch(
  '/:id',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => productController.update(req, res))
);

router.delete(
  '/:id',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => productController.delete(req, res))
);

export const productRoutes = router;

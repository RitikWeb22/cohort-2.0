import { Router } from 'express';
import { categoryController } from './category.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

router.get(
  '/',
  asyncHandler((req, res) => categoryController.getAll(req, res))
);

router.get(
  '/:slug',
  asyncHandler((req, res) => categoryController.getBySlug(req, res))
);

router.post(
  '/',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => categoryController.create(req, res))
);

router.patch(
  '/:id',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => categoryController.update(req, res))
);

router.delete(
  '/:id',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => categoryController.delete(req, res))
);

export const categoryRoutes = router;

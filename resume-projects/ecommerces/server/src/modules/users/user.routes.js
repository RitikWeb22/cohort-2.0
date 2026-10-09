import { Router } from 'express';
import { userController } from './user.controller.js';
import { updateProfileSchema, changePasswordSchema, addressSchema } from '../auth/auth.validator.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

router.use(auth);

router.get(
  '/profile',
  asyncHandler((req, res) => userController.getProfile(req, res))
);

router.patch(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler((req, res) => userController.updateProfile(req, res))
);

router.post(
  '/change-password',
  validate(changePasswordSchema),
  asyncHandler((req, res) => userController.changePassword(req, res))
);

router.post(
  '/addresses',
  validate(addressSchema),
  asyncHandler((req, res) => userController.addAddress(req, res))
);

// Admin-only User Management Routes
router.get(
  '/',
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => userController.getAllUsers(req, res))
);

router.patch(
  '/:id/role',
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => userController.updateRole(req, res))
);

router.delete(
  '/:id',
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => userController.deleteUser(req, res))
);

export const userRoutes = router;

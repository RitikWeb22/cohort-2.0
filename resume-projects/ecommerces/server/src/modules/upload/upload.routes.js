import { Router } from 'express';
import { uploadController } from './upload.controller.js';
import { auth } from '../../middlewares/auth.js';
import { rbac } from '../../middlewares/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const uploadRoutes = Router();

uploadRoutes.post(
  '/',
  auth,
  rbac('ADMIN', 'SUPER_ADMIN'),
  asyncHandler((req, res) => uploadController.uploadImage(req, res))
);

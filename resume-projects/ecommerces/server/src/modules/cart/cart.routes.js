import { Router } from 'express';
import { cartController } from './cart.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middlewares/auth.js';

const router = Router();

router.use(auth);

router.get(
  '/',
  asyncHandler((req, res) => cartController.getCart(req, res))
);

router.post(
  '/items',
  asyncHandler((req, res) => cartController.addItem(req, res))
);

router.patch(
  '/items',
  asyncHandler((req, res) => cartController.updateItemQuantity(req, res))
);

router.delete(
  '/items/:sku',
  asyncHandler((req, res) => cartController.removeItem(req, res))
);

router.delete(
  '/',
  asyncHandler((req, res) => cartController.clearCart(req, res))
);

export const cartRoutes = router;

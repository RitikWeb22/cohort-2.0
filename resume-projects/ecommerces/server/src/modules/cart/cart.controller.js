import { cartService } from './cart.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class CartController {
  async getCart(req, res) {
    const cart = await cartService.getCart(req.user.id);
    return ApiResponse.success(res, cart, 'Cart retrieved successfully');
  }

  async addItem(req, res) {
    const cart = await cartService.addItem(req.user.id, req.body);
    return ApiResponse.success(res, cart, 'Item added to cart');
  }

  async updateItemQuantity(req, res) {
    const cart = await cartService.updateItemQuantity(req.user.id, req.body);
    return ApiResponse.success(res, cart, 'Cart updated');
  }

  async removeItem(req, res) {
    const cart = await cartService.removeItem(req.user.id, req.params.sku);
    return ApiResponse.success(res, cart, 'Item removed from cart');
  }

  async clearCart(req, res) {
    const cart = await cartService.clearCart(req.user.id);
    return ApiResponse.success(res, cart, 'Cart cleared');
  }
}

export const cartController = new CartController();

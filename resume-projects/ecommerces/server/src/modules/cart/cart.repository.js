import { Cart } from './cart.model.js';

export class CartRepository {
  async findByUserId(userId) {
    return Cart.findOne({ userId }).populate('items.productId');
  }

  async findRawByUserId(userId) {
    return Cart.findOne({ userId });
  }

  async create(data) {
    return Cart.create(data);
  }

  async save(cart) {
    return cart.save();
  }

  async clearByUserId(userId) {
    return Cart.findOneAndUpdate({ userId }, { items: [] }, { new: true });
  }
}

export const cartRepository = new CartRepository();

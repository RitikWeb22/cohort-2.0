import { cartRepository } from './cart.repository.js';
import { productRepository } from '../products/product.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class CartService {
  async getOrCreateCart(userId) {
    let cart = await cartRepository.findRawByUserId(userId);
    if (!cart) {
      cart = await cartRepository.create({ userId, items: [] });
    }
    return cart;
  }

  /**
   * Hydrates cart items with fresh product details and current inventory levels from DB.
   * Calculations are strictly in integer paise.
   */
  async getCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    return this.hydrateCart(cart);
  }

  async hydrateCart(cart) {
    const validatedItems = [];
    let subtotalPaise = 0;

    for (const item of cart.items) {
      const product = await productRepository.findById(item.productId);
      if (!product || product.status !== 'ACTIVE') {
        continue; // skip unpublished or deleted items
      }

      const variant = product.variants.find((v) => v.sku === item.variantSku);
      if (!variant) {
        continue;
      }

      const inventory = await inventoryRepository.findBySku(item.variantSku);
      const availableStock = inventory ? inventory.availableStock : 0;

      const itemTotal = variant.price * item.quantity;
      subtotalPaise += itemTotal;

      validatedItems.push({
        productId: product._id,
        productName: product.name,
        slug: product.slug,
        image: variant.images[0]?.url || product.images[0]?.url || '',
        variantSku: variant.sku,
        size: variant.size,
        colour: variant.colour,
        fabric: variant.fabric,
        pricePaise: variant.price,
        quantity: item.quantity,
        availableStock,
        isOutOfStock: availableStock < item.quantity,
        itemTotalPaise: itemTotal,
      });
    }

    // Shipping policy: Free above ₹2,000 (200000 paise), else ₹150 (15000 paise)
    const shippingPaise = subtotalPaise >= 200000 || subtotalPaise === 0 ? 0 : 15000;
    // GST 5% for apparel in integer calculation
    const taxPaise = Math.round(subtotalPaise * 0.05);
    const grandTotalPaise = subtotalPaise + shippingPaise + taxPaise;

    return {
      items: validatedItems,
      subtotalPaise,
      shippingPaise,
      taxPaise,
      grandTotalPaise,
      itemCount: validatedItems.reduce((acc, curr) => acc + curr.quantity, 0),
    };
  }

  async addItem(userId, { productId, variantSku, quantity = 1 }) {
    if (quantity < 1) {
      throw ApiError.badRequest('Quantity must be at least 1');
    }

    const product = await productRepository.findById(productId);
    if (!product || product.status !== 'ACTIVE') {
      throw ApiError.notFound('Product not found or unavailable');
    }

    const variant = product.variants.find((v) => v.sku === variantSku.toUpperCase());
    if (!variant) {
      throw ApiError.notFound(`Variant '${variantSku}' not found on product`);
    }

    const inventory = await inventoryRepository.findBySku(variantSku);
    if (!inventory || inventory.availableStock < quantity) {
      throw ApiError.badRequest('Requested quantity exceeds available stock', 'INSUFFICIENT_STOCK');
    }

    const cart = await this.getOrCreateCart(userId);
    const existingIndex = cart.items.findIndex((item) => item.variantSku === variantSku.toUpperCase());

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (inventory.availableStock < newQty) {
        throw ApiError.badRequest('Requested total quantity exceeds available stock', 'INSUFFICIENT_STOCK');
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({
        productId: product._id,
        variantSku: variantSku.toUpperCase(),
        quantity,
      });
    }

    await cartRepository.save(cart);
    return this.hydrateCart(cart);
  }

  async updateItemQuantity(userId, { variantSku, quantity }) {
    const cart = await this.getOrCreateCart(userId);
    const itemIndex = cart.items.findIndex((item) => item.variantSku === variantSku.toUpperCase());

    if (itemIndex === -1) {
      throw ApiError.notFound('Item not in cart');
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const inventory = await inventoryRepository.findBySku(variantSku);
      if (!inventory || inventory.availableStock < quantity) {
        throw ApiError.badRequest('Requested quantity exceeds available stock', 'INSUFFICIENT_STOCK');
      }
      cart.items[itemIndex].quantity = quantity;
    }

    await cartRepository.save(cart);
    return this.hydrateCart(cart);
  }

  async removeItem(userId, variantSku) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = cart.items.filter((item) => item.variantSku !== variantSku.toUpperCase());
    await cartRepository.save(cart);
    return this.hydrateCart(cart);
  }

  async clearCart(userId) {
    await cartRepository.clearByUserId(userId);
    return { items: [], subtotalPaise: 0, grandTotalPaise: 0 };
  }
}

export const cartService = new CartService();

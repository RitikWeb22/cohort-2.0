import { Product } from './product.model.js';

export class ProductRepository {
  async find(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 20 } = {}) {
    return Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(filter = {}) {
    return Product.countDocuments(filter);
  }

  async findById(id) {
    return Product.findById(id).populate('category', 'name slug');
  }

  async findBySlug(slug) {
    return Product.findOne({ slug }).populate('category', 'name slug');
  }

  async findByVariantSku(sku) {
    return Product.findOne({ 'variants.sku': sku.toUpperCase() });
  }

  async create(data) {
    return Product.create(data);
  }

  async updateById(id, data) {
    return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('category', 'name slug');
  }

  async deleteById(id) {
    return Product.findByIdAndDelete(id);
  }
}

export const productRepository = new ProductRepository();

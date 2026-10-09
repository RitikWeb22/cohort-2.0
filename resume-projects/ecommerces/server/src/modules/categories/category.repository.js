import { Category } from './category.model.js';

export class CategoryRepository {
  async findAll(filter = { isActive: true }) {
    return Category.find(filter).sort({ name: 1 });
  }

  async findById(id) {
    return Category.findById(id);
  }

  async findBySlug(slug) {
    return Category.findOne({ slug });
  }

  async create(data) {
    return Category.create(data);
  }

  async updateById(id, data) {
    return Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteById(id) {
    return Category.findByIdAndDelete(id);
  }
}

export const categoryRepository = new CategoryRepository();

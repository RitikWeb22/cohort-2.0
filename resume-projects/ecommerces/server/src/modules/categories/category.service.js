import { categoryRepository } from './category.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheGet, cacheSet, cacheDel } from '../../config/redis.js';

const CACHE_KEY_CATEGORIES = 'kora:categories:all';

export class CategoryService {
  async getAllCategories() {
    const cached = await cacheGet(CACHE_KEY_CATEGORIES);
    if (cached) return cached;

    const categories = await categoryRepository.findAll();
    await cacheSet(CACHE_KEY_CATEGORIES, categories, 3600); // 1 hour TTL
    return categories;
  }

  async getCategoryBySlug(slug) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw ApiError.notFound(`Category with slug '${slug}' not found`);
    }
    return category;
  }

  async createCategory(data) {
    const existing = await categoryRepository.findBySlug(data.slug);
    if (existing) {
      throw ApiError.conflict(`Category slug '${data.slug}' already exists`);
    }

    const created = await categoryRepository.create(data);
    await cacheDel(CACHE_KEY_CATEGORIES);
    return created;
  }

  async updateCategory(id, data) {
    const updated = await categoryRepository.updateById(id, data);
    if (!updated) {
      throw ApiError.notFound('Category not found');
    }
    await cacheDel(CACHE_KEY_CATEGORIES);
    return updated;
  }

  async deleteCategory(id) {
    const deleted = await categoryRepository.deleteById(id);
    if (!deleted) {
      throw ApiError.notFound('Category not found');
    }
    await cacheDel(CACHE_KEY_CATEGORIES);
    return true;
  }
}

export const categoryService = new CategoryService();

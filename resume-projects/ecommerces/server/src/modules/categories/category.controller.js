import { categoryService } from './category.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class CategoryController {
  async getAll(req, res) {
    const categories = await categoryService.getAllCategories();
    return ApiResponse.success(res, categories, 'Categories fetched successfully');
  }

  async getBySlug(req, res) {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    return ApiResponse.success(res, category, 'Category fetched successfully');
  }

  async create(req, res) {
    const category = await categoryService.createCategory(req.body);
    return ApiResponse.created(res, category, 'Category created successfully');
  }

  async update(req, res) {
    const updated = await categoryService.updateCategory(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Category updated successfully');
  }

  async delete(req, res) {
    await categoryService.deleteCategory(req.params.id);
    return ApiResponse.success(res, null, 'Category deleted successfully');
  }
}

export const categoryController = new CategoryController();

import { productService } from './product.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class ProductController {
  async getAll(req, res) {
    const result = await productService.getProducts(req.query);
    return ApiResponse.success(res, result.products, 'Products retrieved successfully', 200, result.pagination);
  }

  async getBySlug(req, res) {
    const product = await productService.getProductBySlug(req.params.slug);
    return ApiResponse.success(res, product, 'Product retrieved successfully');
  }

  async getById(req, res) {
    const product = await productService.getProductById(req.params.id);
    return ApiResponse.success(res, product, 'Product retrieved successfully');
  }

  async create(req, res) {
    const created = await productService.createProduct(req.body);
    return ApiResponse.created(res, created, 'Product created successfully');
  }

  async update(req, res) {
    const updated = await productService.updateProduct(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Product updated successfully');
  }

  async delete(req, res) {
    await productService.deleteProduct(req.params.id);
    return ApiResponse.success(res, null, 'Product deleted successfully');
  }
}

export const productController = new ProductController();

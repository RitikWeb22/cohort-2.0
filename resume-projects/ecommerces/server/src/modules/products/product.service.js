import { productRepository } from './product.repository.js';
import { inventoryRepository } from '../inventory/inventory.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheGet, cacheSet, cacheDel } from '../../config/redis.js';

export class ProductService {
  async getProducts({
    category,
    search,
    minPrice,
    maxPrice,
    sort = 'newest',
    page = 1,
    limit = 12,
    status = 'ACTIVE',
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (category) filter.category = category;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = parseInt(minPrice, 10);
      if (maxPrice !== undefined) filter.price.$lte = parseInt(maxPrice, 10);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };

    const cacheKey = `kora:products:${JSON.stringify({ filter, sortObj, pageNum, limitNum })}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const [products, total] = await Promise.all([
      productRepository.find(filter, { sort: sortObj, skip, limit: limitNum }),
      productRepository.count(filter),
    ]);

    // Attach current variant inventory stock to each product
    const allSkus = products.flatMap((p) => p.variants?.map((v) => v.sku) || []);
    const inventories = await inventoryRepository.findBySkus(allSkus);
    const invMap = new Map(inventories.map((inv) => [inv.sku, inv]));

    const productsWithStock = products.map((p) => {
      const pObj = p.toObject ? p.toObject() : p;
      let totalStock = 0;
      pObj.variants = (pObj.variants || []).map((v) => {
        const inv = invMap.get(v.sku);
        const avail = inv ? inv.availableStock : 0;
        totalStock += avail;
        return {
          ...v,
          availableStock: avail,
          reservedStock: inv ? inv.reservedStock : 0,
          soldStock: inv ? inv.soldStock : 0,
        };
      });
      pObj.totalStock = totalStock;
      return pObj;
    });

    const result = {
      products: productsWithStock,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    await cacheSet(cacheKey, result, 120); // 2 mins cache
    return result;
  }

  async getProductBySlug(slug) {
    const cacheKey = `kora:product:slug:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw ApiError.notFound(`Product with slug '${slug}' not found`);
    }

    // Attach current inventory levels for each variant
    const variantSkus = product.variants.map((v) => v.sku);
    const inventories = await inventoryRepository.findBySkus(variantSkus);
    const inventoryMap = new Map(inventories.map((inv) => [inv.sku, inv]));

    const productObj = product.toObject();
    productObj.variants = productObj.variants.map((v) => {
      const inv = inventoryMap.get(v.sku);
      return {
        ...v,
        availableStock: inv ? inv.availableStock : 0,
      };
    });

    await cacheSet(cacheKey, productObj, 60);
    return productObj;
  }

  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    return product;
  }

  async createProduct(data) {
    const existing = await productRepository.findBySlug(data.slug);
    if (existing) {
      throw ApiError.conflict(`Product slug '${data.slug}' already exists`);
    }

    const product = await productRepository.create(data);

    // Initialize inventory for all variants
    if (data.variants && data.variants.length > 0) {
      for (const variant of product.variants) {
        const matched = data.variants.find(
          (v) => v.sku?.toUpperCase() === variant.sku.toUpperCase()
        );
        const initialStock = matched?.initialStock !== undefined
          ? matched.initialStock
          : (variant.initialStock !== undefined ? variant.initialStock : 20);

        await inventoryRepository.create({
          sku: variant.sku.toUpperCase(),
          productId: product._id,
          variantId: variant._id.toString(),
          availableStock: initialStock,
          reservedStock: 0,
          soldStock: 0,
        });
      }
    }

    await cacheDel('kora:products:*');
    return product;
  }

  async updateProduct(id, data) {
    const updated = await productRepository.updateById(id, data);
    if (!updated) {
      throw ApiError.notFound('Product not found');
    }

    // Sync inventory levels for updated/new variants
    if (data.variants && data.variants.length > 0) {
      for (const variant of updated.variants) {
        const matched = data.variants.find(
          (v) => v.sku?.toUpperCase() === variant.sku?.toUpperCase()
        );
        const newStock =
          matched?.initialStock !== undefined
            ? matched.initialStock
            : matched?.availableStock !== undefined
            ? matched.availableStock
            : matched?.stock !== undefined
            ? matched.stock
            : null;

        if (newStock !== null && !isNaN(newStock)) {
          await inventoryRepository.upsertStock(
            variant.sku.toUpperCase(),
            parseInt(newStock, 10),
            updated._id,
            variant._id?.toString()
          );
        }
      }
    }

    await cacheDel('kora:products:*');
    await cacheDel(`kora:product:slug:${updated.slug}`);
    return updated;
  }

  async deleteProduct(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    await productRepository.deleteById(id);
    await cacheDel('kora:products:*');
    await cacheDel(`kora:product:slug:${product.slug}`);
    return true;
  }
}

export const productService = new ProductService();

import { couponRepository } from './coupon.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class CouponService {
  /**
   * Validates a coupon code against an active subtotal (in paise).
   * Calculates the exact discount in paise without floating point inaccuracy.
   */
  async validateCoupon(code, subtotalPaise) {
    if (!code || typeof code !== 'string') {
      throw ApiError.badRequest('Please provide a coupon code');
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await couponRepository.findByCode(cleanCode);

    if (!coupon) {
      throw ApiError.notFound(`Coupon code '${cleanCode}' is invalid`);
    }

    if (!coupon.isActive) {
      throw ApiError.badRequest(`Coupon '${cleanCode}' is inactive`);
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      throw ApiError.badRequest(`Coupon '${cleanCode}' is not active yet`);
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
      throw ApiError.badRequest(`Coupon '${cleanCode}' has expired`);
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      throw ApiError.badRequest(`Coupon '${cleanCode}' has reached its maximum usage limit`);
    }

    if (coupon.minOrderValuePaise && subtotalPaise < coupon.minOrderValuePaise) {
      const minAmount = (coupon.minOrderValuePaise / 100).toLocaleString('en-IN');
      throw ApiError.badRequest(
        `Coupon '${cleanCode}' requires a minimum order subtotal of ₹${minAmount}`
      );
    }

    let discountPaise = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountPaise = Math.round(subtotalPaise * (coupon.discountValue / 100));
      if (coupon.maxDiscountPaise && discountPaise > coupon.maxDiscountPaise) {
        discountPaise = coupon.maxDiscountPaise;
      }
    } else {
      // FIXED
      discountPaise = Math.min(subtotalPaise, coupon.discountValue);
    }

    return {
      isValid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountPaise,
      description: coupon.description,
      message: `Coupon '${coupon.code}' applied: You save ₹${(discountPaise / 100).toLocaleString('en-IN')}!`,
    };
  }

  async getAllCoupons() {
    return couponRepository.findAll();
  }

  async createCoupon(data) {
    const existing = await couponRepository.findByCode(data.code);
    if (existing) {
      throw ApiError.conflict(`Coupon code '${data.code.toUpperCase()}' already exists`);
    }

    const cleanData = {
      ...data,
      code: data.code.trim().toUpperCase(),
    };

    return couponRepository.create(cleanData);
  }

  async updateCoupon(id, data) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    if (data.code && data.code.trim().toUpperCase() !== coupon.code) {
      const existing = await couponRepository.findByCode(data.code);
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict(`Coupon code '${data.code.toUpperCase()}' already exists`);
      }
      data.code = data.code.trim().toUpperCase();
    }

    return couponRepository.updateById(id, data);
  }

  async toggleCouponStatus(id) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }
    coupon.isActive = !coupon.isActive;
    return coupon.save();
  }

  async deleteCoupon(id) {
    const deleted = await couponRepository.deleteById(id);
    if (!deleted) {
      throw ApiError.notFound('Coupon not found');
    }
    return true;
  }

  async recordUsage(code) {
    if (!code) return;
    await couponRepository.incrementUsage(code);
  }
}

export const couponService = new CouponService();

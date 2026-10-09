import { couponService } from './coupon.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class CouponController {
  async validate(req, res) {
    const { code, subtotalPaise } = req.body;
    const result = await couponService.validateCoupon(code, parseInt(subtotalPaise || 0, 10));
    return ApiResponse.success(res, result, result.message);
  }

  async getAll(req, res) {
    const coupons = await couponService.getAllCoupons();
    return ApiResponse.success(res, coupons, 'Coupons retrieved successfully');
  }

  async create(req, res) {
    const coupon = await couponService.createCoupon(req.body);
    return ApiResponse.created(res, coupon, 'Coupon created successfully');
  }

  async update(req, res) {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    return ApiResponse.success(res, coupon, 'Coupon updated successfully');
  }

  async toggleStatus(req, res) {
    const coupon = await couponService.toggleCouponStatus(req.params.id);
    return ApiResponse.success(
      res,
      coupon,
      `Coupon marked as ${coupon.isActive ? 'Active' : 'Inactive'}`
    );
  }

  async delete(req, res) {
    await couponService.deleteCoupon(req.params.id);
    return ApiResponse.success(res, null, 'Coupon deleted successfully');
  }
}

export const couponController = new CouponController();

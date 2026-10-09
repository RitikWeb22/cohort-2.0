import { Coupon } from './coupon.model.js';

export class CouponRepository {
  async findByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase() });
  }

  async findById(id) {
    return Coupon.findById(id);
  }

  async findAll(filter = {}, sort = { createdAt: -1 }) {
    return Coupon.find(filter).sort(sort);
  }

  async create(data) {
    return Coupon.create(data);
  }

  async updateById(id, updateData) {
    return Coupon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async deleteById(id) {
    return Coupon.findByIdAndDelete(id);
  }

  async incrementUsage(code) {
    return Coupon.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $inc: { timesUsed: 1 } },
      { new: true }
    );
  }
}

export const couponRepository = new CouponRepository();

import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      default: 'PERCENTAGE',
    },
    // For PERCENTAGE: integer 1-100 (e.g., 10 for 10%)
    // For FIXED: amount in paise (e.g., 50000 for ₹500)
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    minOrderValuePaise: {
      type: Number,
      default: 0,
    },
    maxDiscountPaise: {
      type: Number,
      default: null, // Optional cap for percentage discounts
    },
    usageLimit: {
      type: Number,
      default: null, // Optional total usage limit
    },
    timesUsed: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Coupon = mongoose.model('Coupon', couponSchema);

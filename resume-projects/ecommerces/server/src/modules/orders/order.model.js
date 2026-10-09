import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: { type: String, required: true },
  variantSku: { type: String, required: true, uppercase: true },
  size: { type: String, required: true },
  colour: {
    name: { type: String, default: '' },
    hex: { type: String, default: '' },
  },
  fabric: { type: String, required: true },
  pricePaise: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPaise: { type: Number, required: true },
  image: { type: String, default: '' },
});

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  apartment: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, default: 'India' },
});

const statusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    pricing: {
      subtotalPaise: { type: Number, required: true },
      shippingPaise: { type: Number, required: true },
      taxPaise: { type: Number, required: true },
      discountPaise: { type: Number, default: 0 },
      grandTotalPaise: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
    },
    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'PAID',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
      ],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    statusHistory: [statusHistorySchema],
    paymentDetails: {
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: { type: String, index: true },
      razorpaySignature: { type: String },
      paidAt: { type: Date },
      method: { type: String },
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    couponCode: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);

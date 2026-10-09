import mongoose from 'mongoose';

const reservationItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const reservationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    items: [reservationItemSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire index (TTL index in MongoDB acts as safety net, while BullMQ worker handles state machine update)
reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 }); // retain for 24h for audit

export const Reservation = mongoose.model('Reservation', reservationSchema);

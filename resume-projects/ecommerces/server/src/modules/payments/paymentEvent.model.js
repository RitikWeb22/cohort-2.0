import mongoose from 'mongoose';

const paymentEventSchema = new mongoose.Schema(
  {
    providerEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'RAZORPAY',
    },
    eventType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED'],
      default: 'RECEIVED',
    },
    payloadSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentEvent = mongoose.model('PaymentEvent', paymentEventSchema);

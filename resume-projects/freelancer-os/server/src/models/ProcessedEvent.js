import mongoose from 'mongoose';

const processedEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['stripe', 'razorpay', 'merchant-of-record', 'polar', 'test'],
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['processed', 'ignored', 'failed'],
      default: 'processed',
    },
    payloadSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound unique index on (provider, eventId) to strictly prevent duplicate processing across providers
processedEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
// 60-day automated TTL data pruning to prevent table bloat at 1M+ scale
processedEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export const ProcessedEvent = mongoose.models.ProcessedEvent || mongoose.model('ProcessedEvent', processedEventSchema);

/**
 * Ensures database indexes are built and reconciled on startup
 */
export async function ensureBillingIndexes() {
  try {
    await ProcessedEvent.createIndexes();
    return true;
  } catch (err) {
    return false;
  }
}


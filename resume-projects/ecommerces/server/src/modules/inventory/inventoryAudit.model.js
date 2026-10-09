import mongoose from 'mongoose';

const inventoryAuditSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      index: true,
    },
    previousAvailableStock: {
      type: Number,
      required: true,
    },
    newAvailableStock: {
      type: Number,
      required: true,
    },
    difference: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      enum: ['RESERVE', 'RELEASE', 'CONFIRM_SALE', 'MANUAL_ADJUSTMENT', 'RESTOCK'],
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const InventoryAudit = mongoose.model('InventoryAudit', inventoryAuditSchema);

import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, default: 'bank_transfer' },
  transactionReference: { type: String, default: '' },
  notes: { type: String, default: '' },
  isDemo: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

// Production scale compound indexes (ESR rule)
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ invoiceId: 1, userId: 1 });
paymentSchema.index({ clientId: 1, userId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);

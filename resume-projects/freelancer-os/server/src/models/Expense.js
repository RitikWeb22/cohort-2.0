import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  category: {
    type: String,
    default: 'Software and subscriptions',
  },
  vendor: { type: String, default: '' },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  date: { type: Date, default: Date.now },
  billableToClient: { type: Boolean, default: false },
  billedOnInvoice: { type: String, default: '' },
  markupPercent: { type: Number, default: 0 },
  recurring: {
    interval: { type: String, enum: ['none', 'monthly', 'yearly'], default: 'none' },
    nextDate: { type: Date, default: null },
    isPaused: { type: Boolean, default: false },
  },
  taxDeductible: { type: Boolean, default: true },
  paymentMethod: { type: String, default: 'card' },
  notes: { type: String, default: '' },
  receiptUrl: { type: String, default: '' },
  isDemo: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

// Production scale compound indexes (ESR rule)
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, projectId: 1 });

export const Expense = mongoose.model('Expense', expenseSchema);

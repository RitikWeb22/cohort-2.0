import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  invoiceNumber: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  status: {
    type: String,
    enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'],
    default: 'sent',
  },
  currency: { type: String, default: 'USD' },
  taxType: { type: String, default: 'VAT' },
  taxId: { type: String, default: '' },
  taxMode: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
  reverseChargeNote: { type: Boolean, default: false },
  lateFeeTerms: { type: String, default: '1.5% late interest per month applies after due date' },
  paymentGateway: { type: String, enum: ['stripe', 'paypal', 'bank_transfer', 'upi', 'razorpay'], default: 'stripe' },
  lineItems: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  }],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  paymentTerms: { type: String, default: 'Net 15 days' },
  paymentInstructions: { type: String, default: '' },
  stripePaymentUrl: { type: String, default: '' },
  stripeSessionId: { type: String, default: '' },
  paypalPaymentUrl: { type: String, default: '' },
  isDemo: { type: Boolean, default: false, index: true },
  // Public secure share links (stored SHA-256 hashed)
  shareToken: { type: String, default: null, index: true },
  shareEnabled: { type: Boolean, default: false },
  shareExpiresAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  viewedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ userId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ clientId: 1, userId: 1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);

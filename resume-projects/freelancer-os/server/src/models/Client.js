import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  company: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  email: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  website: { type: String, default: '' },
  country: { type: String, default: '' },
  billingAddress: { type: String, default: '' },
  taxId: { type: String, default: '' },
  currency: { type: String, default: 'USD' },
  paymentTerms: { type: String, default: 'Due on receipt' },
  status: { type: String, enum: ['lead', 'active', 'completed', 'archived'], default: 'lead' },
  notes: { type: String, default: '' },
  notesList: [{
    id: { type: String },
    text: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  isDemo: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

// Production scale compound indexes (ESR rule)
clientSchema.index({ userId: 1, createdAt: -1 });
clientSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Client = mongoose.model('Client', clientSchema);

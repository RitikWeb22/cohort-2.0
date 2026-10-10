import mongoose from 'mongoose';

const clauseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: {
    type: String,
    required: true,
    enum: [
      'Payment',
      'Scope and changes',
      'Delivery and reviews',
      'Ownership and IP',
      'Third-party costs',
      'Support and warranty',
      'Legal',
      'Other',
    ],
    default: 'Other',
  },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  defaultOn: { type: Boolean, default: true },
  appliesTo: {
    type: [String],
    enum: ['proposals', 'invoices', 'change_orders'],
    default: ['proposals'],
  },
  order: { type: Number, default: 0 },
  isStarter: { type: Boolean, default: false },
  starterKey: { type: String, default: null },
  archived: { type: Boolean, default: false },
  version: { type: Number, default: 1 },
  history: [
    {
      version: { type: Number, required: true },
      title: { type: String },
      body: { type: String },
      category: { type: String },
      savedAt: { type: Date, default: Date.now },
    },
  ],
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

clauseSchema.index({ userId: 1, order: 1 });
clauseSchema.index({ userId: 1, archived: 1 });

export const Clause = mongoose.model('Clause', clauseSchema);

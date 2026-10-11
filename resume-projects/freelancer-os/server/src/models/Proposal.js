import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'RequirementAnalysis', default: null },
  proposalNumber: { type: String, required: true },
  version: { type: Number, default: 1 },
  title: { type: String, required: true },
  status: {
    type: String,
    enum: ['draft', 'internal_review', 'sent', 'viewed', 'revision_requested', 'accepted', 'rejected', 'expired'],
    default: 'draft',
  },
  lineItems: [{
    description: { type: String, required: true },
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  }],
  pricingBreakdown: {
    estimatedHours: { type: Number, default: 0 },
    baseLaborCost: { type: Number, default: 0 },
    adjustedLaborCost: { type: Number, default: 0 },
    fixedCosts: { type: Number, default: 0 },
    contingencyAmount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    minAcceptablePrice: { type: Number, default: 0 },
    recommendedPrice: { type: Number, default: 0 },
    premiumPrice: { type: Number, default: 0 },
  },
  paymentSchedule: [{
    milestone: { type: String },
    percentage: { type: Number },
    amount: { type: Number },
    dueTrigger: { type: String },
  }],
  projectType: { type: String, default: 'landing-pages' },
  selectedTier: { type: String, enum: ['minimum', 'recommended', 'premium', 'custom'], default: 'recommended' },
  paymentMethod: { type: String, default: 'upi' },
  paymentDetails: { type: String, default: '' },
  paymentScheduleType: { type: String, default: '50_50' },
  termsAndConditions: { type: String, default: '' },
  currency: { type: String, default: 'USD' },
  taxType: { type: String, default: 'VAT' },
  taxRate: { type: Number, default: 0 },
  taxId: { type: String, default: '' },
  validUntil: { type: Date },
  isDemo: { type: Boolean, default: false, index: true },
  // Public secure share links (stored SHA-256 hashed)
  shareToken: { type: String, default: null, index: true },
  shareEnabled: { type: Boolean, default: false },
  shareExpiresAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  viewedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  acceptedBy: { type: String, default: null },
  acceptedIpHash: { type: String, default: null },
  declinedAt: { type: Date, default: null },
  declinedReason: { type: String, default: null },
}, {
  timestamps: true,
});

proposalSchema.index({ userId: 1, proposalNumber: 1 }, { unique: true });
proposalSchema.index({ userId: 1, createdAt: -1 });
proposalSchema.index({ userId: 1, status: 1 });
proposalSchema.index({ clientId: 1, userId: 1 });

export const Proposal = mongoose.model('Proposal', proposalSchema);

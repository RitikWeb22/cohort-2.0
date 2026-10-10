import mongoose from 'mongoose';

const pricingSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  hourlyRate: { type: Number, default: 50 },
  minHourlyRate: { type: Number, default: 35 },
  minProjectFee: { type: Number, default: 300 },
  categoryMinimums: {
    type: Map,
    of: Number,
    default: {
      'landing-pages': 500,
      'business-websites': 1000,
      'react-nextjs': 2500,
      'e-commerce': 3000,
      'custom-web-apps': 5000,
      'api-backend': 2000,
      'ai-integrations': 3500,
      'saas-applications': 8000,
    },
  },
  defaultBufferPercent: { type: Number, default: 15 },
  complexityMultipliers: {
    simple: { type: Number, default: 1.0 },
    medium: { type: Number, default: 1.25 },
    complex: { type: Number, default: 1.5 },
  },
  tierMultipliers: {
    essential: { type: Number, default: 1.0 },
    standard: { type: Number, default: 1.20 },
    premium: { type: Number, default: 1.50 },
  },
  rushMultiplier: { type: Number, default: 1.3 },
  revisionAllowance: { type: Number, default: 2 },
  defaultContingencyPercent: { type: Number, default: 10 },
  preferredProfitMargin: { type: Number, default: 25 },
  currency: { type: String, default: 'USD' },
  version: { type: Number, default: 1 },
  roundingStep: { type: Number, default: 50 },
  profile: { type: String, default: 'web_developer' },
  projectTypes: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    typicalMinHours: { type: Number, default: 8 },
    typicalMaxHours: { type: Number, default: 14 },
    floor: { type: Number, default: 300 },
    archived: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  }],
  packageTiers: {
    essential: {
      name: { type: String, default: 'Essential' },
      multiplier: { type: Number, default: 1.0 },
      revisions: { type: Number, default: 1 },
      supportDays: { type: Number, default: 14 },
      description: { type: String, default: 'Baseline deliverables ensuring clean execution at your floor price.' },
    },
    standard: {
      name: { type: String, default: 'Standard' },
      multiplier: { type: Number, default: 1.20 },
      revisions: { type: Number, default: 3 },
      supportDays: { type: Number, default: 30 },
      description: { type: String, default: 'Comprehensive solution with dedicated support and refinement rounds.' },
    },
    premium: {
      name: { type: String, default: 'Premium' },
      multiplier: { type: Number, default: 1.50 },
      revisions: { type: Number, default: 5 },
      supportDays: { type: Number, default: 60 },
      description: { type: String, default: 'Full turnkey delivery, priority revisions, and extended SLA support.' },
    },
  },
  currencyOverrides: {
    type: Map,
    of: Object,
    default: {},
  },
}, {
  timestamps: true,
});

export const PricingSetting = mongoose.model('PricingSetting', pricingSettingSchema);

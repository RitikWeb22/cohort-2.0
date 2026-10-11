import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  googleId: { type: String, default: null, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  businessName: { type: String, default: '' },
  businessEmail: { type: String, default: '' },
  businessPhone: { type: String, default: '' },
  businessAddress: { type: String, default: '' },
  field: {
    type: String,
    enum: ['web_developer', 'graphic_designer', 'content_writer', 'ui_ux_designer', 'video_editor', 'digital_marketer'],
    default: 'web_developer'
  },
  currency: { type: String, default: 'USD' },
  taxType: { type: String, enum: ['VAT', 'GST', 'Sales Tax', 'None'], default: 'VAT' },
  taxRate: { type: Number, default: 0 },
  taxId: { type: String, default: '' },
  taxMode: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
  reverseChargeNote: { type: Boolean, default: false },
  reverseChargeText: { type: String, default: 'Reverse charge: Customer is liable for accounting and payment of tax.' },
  defaultPaymentTerms: { type: String, default: 'Net 15 days, 50% upfront deposit' },
  defaultProposalValidityDays: { type: Number, default: 14 },
  paypalEmail: { type: String, default: '' },
  iban: { type: String, default: '' },
  swiftBic: { type: String, default: '' },
  bankDetails: { type: String, default: '' },
  upiId: { type: String, default: '' },
  paymentInstructions: { type: String, default: 'Payment accepted via Stripe, PayPal, or international wire transfer.' },
  plan: { type: String, enum: ['free', 'solo', 'pro', 'agency'], default: 'free' },
  stripeCustomerId: { type: String, default: '' },
  stripeSubscriptionId: { type: String, default: '' },
  subscriptionProvider: { type: String, default: '' },
  subscriptionId: { type: String, default: '' },
  subscriptionStatus: { type: String, default: 'active' },
  subscriptionExpiresAt: { type: Date },
  gracePeriodExpiresAt: { type: Date, default: null },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  billingInterval: { type: String, enum: ['month', 'year'], default: 'month' },
  // Business Identity
  website: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  signatureUrl: { type: String, default: '' },
  country: { type: String, default: 'US' },
  addressLine1: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  postalCode: { type: String, default: '' },

  // Taxes
  taxEnabled: { type: Boolean, default: true },
  taxIdLabel: { type: String, default: 'Tax ID' },
  stateOfSupply: { type: String, default: '' },
  defaultHsnSac: { type: String, default: '998314' },

  // Payment Methods Object
  paymentMethods: {
    bankTransfer: {
      enabled: { type: Boolean, default: false },
      accountHolder: { type: String, default: '' },
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftBic: { type: String, default: '' },
      routingCode: { type: String, default: '' },
      routingCodeLabel: { type: String, default: 'Routing number' },
      currency: { type: String, default: 'USD' },
    },
    paypal: {
      enabled: { type: Boolean, default: false },
      email: { type: String, default: '' },
    },
    onlinePayment: {
      enabled: { type: Boolean, default: false },
      url: { type: String, default: '' },
      label: { type: String, default: 'Online payment' },
    },
    upi: {
      enabled: { type: Boolean, default: false },
      upiId: { type: String, default: '' },
    },
    other: {
      enabled: { type: Boolean, default: false },
      instructions: { type: String, default: '' },
    },
    defaultMethod: { type: String, default: 'bankTransfer' },
  },

  // Document Numbering & Defaults
  proposalPrefix: { type: String, default: 'PROP-' },
  invoicePrefix: { type: String, default: 'INV-' },
  receiptPrefix: { type: String, default: 'RCT-' },
  yearSequenceEnabled: { type: Boolean, default: true },
  nextInvoiceNumber: { type: Number, default: 1 },
  defaultDepositSchedule: { type: String, default: '50_50' },
  lateFeeType: { type: String, enum: ['none', 'percent', 'fixed'], default: 'none' },
  lateFeeValue: { type: Number, default: 0 },
  defaultInvoiceNote: { type: String, default: 'Thank you for your business.' },
  defaultProposalNote: { type: String, default: '' },
  showHoursToClient: { type: Boolean, default: true },
  floorAdjustmentMode: { type: String, enum: ['spread', 'separate'], default: 'spread' },
  paperSize: { type: String, enum: ['A4', 'Letter'], default: 'A4' },
  dateFormat: { type: String, default: 'auto' },
  whiteLabel: { type: Boolean, default: false },
  reviewDays: { type: Number, default: 5 },
  governingLaw: { type: String, default: '' },

  // Notifications
  notifications: {
    emailProposalViewed: { type: Boolean, default: true },
    emailProposalAccepted: { type: Boolean, default: true },
    emailInvoiceViewed: { type: Boolean, default: true },
    emailPaymentRecorded: { type: Boolean, default: true },
    emailInvoiceOverdue: { type: Boolean, default: true },
    emailWeeklySummary: { type: Boolean, default: false },
    remindersEnabled: { type: Boolean, default: false },
    reminderDaysBefore: { type: Number, default: 3 },
    reminderOnDueDate: { type: Boolean, default: true },
    reminderDaysAfter: { type: Number, default: 7 },
  },

  // Regional
  timezone: { type: String, default: 'UTC' },
  numberFormat: { type: String, default: 'auto' },
  weekStartsOn: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
  defaultCurrency: { type: String, default: 'USD' },
  locale: { type: String, default: 'en-US' },
}, {
  timestamps: true,
});

// Production scale indexes (1M+ users)
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });
userSchema.index({ subscriptionStatus: 1, gracePeriodExpiresAt: 1 });

export const User = mongoose.model('User', userSchema);

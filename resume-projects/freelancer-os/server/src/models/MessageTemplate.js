import mongoose from 'mongoose';

const messageTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  key: {
    type: String,
    required: true,
    enum: [
      'send_proposal',
      'proposal_followup',
      'send_invoice',
      'payment_reminder_friendly',
      'payment_reminder_firm',
      'payment_received',
      'change_order_sent',
    ],
  },
  title: { type: String, required: true },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  body: { type: String, required: true, trim: true, maxlength: 4000 },
  version: { type: Number, default: 1 },
  history: [
    {
      version: { type: Number, required: true },
      subject: { type: String },
      body: { type: String },
      savedAt: { type: Date, default: Date.now },
    },
  ],
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

messageTemplateSchema.index({ userId: 1, key: 1 }, { unique: true });

export const MessageTemplate = mongoose.model('MessageTemplate', messageTemplateSchema);

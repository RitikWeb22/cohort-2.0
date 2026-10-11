import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', default: null },
  title: { type: String, required: true },
  status: {
    type: String,
    enum: [
      'not_started',
      'in_progress',
      'in_review',
      'completed',
      'on_hold',
      'cancelled',
      // backward-compatibility
      'lead',
      'requirements',
      'proposal',
      'review',
      'delivered',
    ],
    default: 'not_started',
  },
  contractValue: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  startDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  milestones: [{
    id: { type: String },
    title: { type: String },
    dueDate: { type: String },
    percentage: { type: Number, default: 0 },
    dueTrigger: { type: String, default: '' },
    status: {
      type: String,
      enum: ['upcoming', 'ready_to_invoice', 'invoiced', 'paid', 'overdue', 'pending', 'in_progress', 'completed'],
      default: 'upcoming',
    },
    amount: { type: Number, default: 0 },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  }],
  tasks: [{
    id: { type: String },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
    },
    completed: { type: Boolean, default: false },
    estimatedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    isFromDeliverable: { type: Boolean, default: false },
    isFromChangeOrder: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date },
    timeEntries: [{
      id: { type: String },
      hours: { type: Number, required: true },
      note: { type: String, default: '' },
      date: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now },
    }],
  }],
  changeRequests: [{
    id: { type: String },
    title: { type: String, default: 'Scope Change Order' },
    description: { type: String },
    reason: { type: String, enum: ['client_request', 'unclear_brief', 'other'], default: 'client_request' },
    extraTasks: [{
      title: { type: String },
      estimatedHours: { type: Number, default: 0 },
    }],
    impactHours: { type: Number, default: 0 },
    impactCost: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'sent', 'approved', 'rejected', 'pending_approval'],
      default: 'draft',
    },
    createdAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
  }],
  activity: [{
    id: { type: String },
    action: { type: String },
    details: { type: String },
    actor: { type: String, default: 'Freelancer' },
    createdAt: { type: Date, default: Date.now },
  }],
  notes: { type: String, default: '' },
  isDemo: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

// Production scale compound indexes (ESR rule)
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ clientId: 1, userId: 1 });

export const Project = mongoose.model('Project', projectSchema);

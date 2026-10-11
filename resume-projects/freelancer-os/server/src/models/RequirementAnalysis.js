import mongoose from 'mongoose';

const requirementAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  projectTitle: { type: String, required: true },
  projectType: { type: String, default: 'custom-web-apps' },
  rawInput: { type: String, required: true },
  status: { type: String, enum: ['analyzed', 'approved', 'converted_to_proposal'], default: 'analyzed' },
  provider: { type: String, default: 'gemini' },
  clientObjectives: { type: String, default: '' },
  targetAudience: { type: String, default: '' },
  confirmedRequirements: [{ type: String }],
  unconfirmedAssumptions: [{ type: String }],
  functionalRequirements: [{ type: String }],
  nonFunctionalRequirements: [{ type: String }],
  pagesAndFeatures: [{
    name: { type: String },
    hours: { type: Number, default: 10 },
    complexity: { type: String, enum: ['simple', 'medium', 'complex'], default: 'medium' },
  }],
  backendRequirements: { type: String, default: '' },
  thirdPartyIntegrations: [{ type: String }],
  deliverables: [{ type: String }],
  exclusions: [{ type: String }],
  dependencies: [{ type: String }],
  clarificationQuestions: [{
    question: { type: String },
    answer: { type: String, default: '' },
    resolved: { type: Boolean, default: false },
  }],
  estimatedHours: { type: Number, default: 20 },
  complexity: { type: String, enum: ['simple', 'medium', 'complex'], default: 'medium' },
  projectRisks: [{ type: String }],
  suggestedMilestones: [{
    title: { type: String },
    hours: { type: Number },
    percentage: { type: Number },
  }],
  acceptanceCriteria: [{ type: String }],
  isDemo: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

// Production scale compound indexes (ESR rule)
requirementAnalysisSchema.index({ userId: 1, createdAt: -1 });
requirementAnalysisSchema.index({ clientId: 1, userId: 1 });

export const RequirementAnalysis = mongoose.model('RequirementAnalysis', requirementAnalysisSchema);

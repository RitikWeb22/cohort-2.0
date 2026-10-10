import express from 'express';
import { RequirementAnalysis } from '../models/RequirementAnalysis.js';
import { Client } from '../models/Client.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { AIRequirementAnalyzer } from '../services/aiAnalyzer.js';

import { config } from '../config/env.js';
import { getSubscriptionDetails } from '../services/subscriptionService.js';

const router = express.Router();

// Get AI Analyzer Engine configuration (returns real model from config/env)
router.get('/config', (req, res) => {
  res.json({
    success: true,
    modelName: config.geminiModel || 'gemini-1.5-flash',
    provider: 'Google Gemini API',
    hasKey: !!config.geminiApiKey,
  });
});

router.use(requireAuth);

// List user's analyses
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const analyses = await RequirementAnalysis.find({ userId }).sort({ createdAt: -1 });
    const formatted = analyses.map(a => {
      const obj = a.toObject();
      obj.id = a._id.toString();
      return obj;
    });
    res.json({ success: true, analyses: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Run new analysis
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const { rawText, clientId, projectType } = req.body;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ success: false, error: 'Raw client brief or message is required' });
    }



    // Per-user daily analysis quota by subscription plan
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await RequirementAnalysis.countDocuments({
      userId,
      createdAt: { $gte: todayStart },
    });

    const sub = getSubscriptionDetails(req.user);
    const dailyCap = sub.effectivePlan === 'free' ? 5 : (sub.effectivePlan === 'solo' ? 25 : 100);

    if (todayCount >= dailyCap) {
      return res.status(403).json({
        success: false,
        code: 'DAILY_AI_LIMIT_REACHED',
        error: `Daily analysis quota (${dailyCap}/day) reached on your ${sub.effectivePlan} plan. Upgrade to increase daily quota.`,
        current: todayCount,
        maxPerDay: dailyCap,
      });
    }

    // Run the 10-stage AI Scoping pipeline
    const analysisResult = await AIRequirementAnalyzer.analyze({
      rawText,
      projectType,
      field: req.user?.field || 'web_developer',
    });

    const newAnalysis = await RequirementAnalysis.create({
      userId,
      clientId: clientId || null,
      status: 'analyzed',
      ...analysisResult,
    });

    await ActivityLog.create({
      userId,
      action: 'ANALYZE_REQUIREMENTS',
      entityType: 'RequirementAnalysis',
      entityId: newAnalysis._id.toString(),
      details: `Analyzed requirements for "${newAnalysis.projectTitle}"`,
    });

    const obj = newAnalysis.toObject();
    obj.id = newAnalysis._id.toString();

    res.status(201).json({ success: true, analysis: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single analysis
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const analysis = await RequirementAnalysis.findOne({ _id: req.params.id, userId });
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Requirement analysis not found' });
    }

    const client = analysis.clientId ? await Client.findOne({ _id: analysis.clientId, userId }) : null;
    const obj = analysis.toObject();
    obj.id = analysis._id.toString();

    res.json({ success: true, analysis: obj, client });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update analysis (Human-in-the-loop review)
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const updatable = [
      'projectTitle',
      'projectType',
      'clientId',
      'clientObjectives',
      'targetAudience',
      'confirmedRequirements',
      'unconfirmedAssumptions',
      'functionalRequirements',
      'nonFunctionalRequirements',
      'pagesAndFeatures',
      'backendRequirements',
      'thirdPartyIntegrations',
      'deliverables',
      'exclusions',
      'dependencies',
      'clarificationQuestions',
      'estimatedHours',
      'complexity',
      'projectRisks',
      'suggestedMilestones',
      'acceptanceCriteria',
      'status',
    ];

    const updates = {};
    for (const f of updatable) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    const analysis = await RequirementAnalysis.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true }
    );

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Requirement analysis not found' });
    }

    const obj = analysis.toObject();
    obj.id = analysis._id.toString();

    res.json({ success: true, analysis: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Resolve clarification question
router.post('/:id/questions', async (req, res) => {
  try {
    const userId = req.user._id;
    const analysis = await RequirementAnalysis.findOne({ _id: req.params.id, userId });
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }

    const { questionIndex, answer, resolved } = req.body;
    if (analysis.clarificationQuestions && analysis.clarificationQuestions[questionIndex]) {
      if (answer !== undefined) analysis.clarificationQuestions[questionIndex].answer = answer;
      if (resolved !== undefined) analysis.clarificationQuestions[questionIndex].resolved = resolved;
      await analysis.save();
    }

    const obj = analysis.toObject();
    obj.id = analysis._id.toString();

    res.json({ success: true, analysis: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve analysis
router.post('/:id/approve', async (req, res) => {
  try {
    const userId = req.user._id;
    const analysis = await RequirementAnalysis.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'approved' },
      { new: true }
    );

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }

    await ActivityLog.create({
      userId,
      action: 'APPROVE_ANALYSIS',
      entityType: 'RequirementAnalysis',
      entityId: analysis._id.toString(),
      details: `Approved technical scope for "${analysis.projectTitle}"`,
    });

    const obj = analysis.toObject();
    obj.id = analysis._id.toString();

    res.json({ success: true, analysis: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

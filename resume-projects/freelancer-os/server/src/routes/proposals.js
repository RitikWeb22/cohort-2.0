import express from 'express';
import { Proposal } from '../models/Proposal.js';
import { PricingSetting } from '../models/PricingSetting.js';
import { Client } from '../models/Client.js';
import { RequirementAnalysis } from '../models/RequirementAnalysis.js';
import { Project } from '../models/Project.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { PricingEngine } from '../services/pricingEngine.js';
import { generateProposalPdf } from '../services/pdfService.js';

const router = express.Router();
router.use(requireAuth);

// List proposals
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposals = await Proposal.find({ userId }).populate('clientId').sort({ createdAt: -1 });

    const formatted = proposals.map(p => {
      const obj = p.toObject();
      obj.id = p._id.toString();
      obj.client = obj.clientId;
      return obj;
    });

    res.json({ success: true, proposals: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function getNextProposalNumber(userId) {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `PROP-${currentYear}-`;
  const existing = await Proposal.find({ userId, proposalNumber: new RegExp(`^${yearPrefix}`) }, { proposalNumber: 1 });
  let maxSeq = 0;
  for (const doc of existing) {
    if (doc.proposalNumber && doc.proposalNumber.startsWith(yearPrefix)) {
      const num = parseInt(doc.proposalNumber.substring(yearPrefix.length), 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  return `${yearPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

// Create proposal with server pricing floor validation
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await PricingSetting.findOne({ userId });
    if (!settings) settings = await PricingSetting.create({ userId });

    const {
      clientId,
      analysisId,
      title,
      lineItems,
      pricingBreakdown,
      paymentSchedule,
      termsAndConditions,
      validUntil,
      projectType,
      selectedTier,
      paymentMethod,
      paymentDetails,
      paymentScheduleType,
      currency
    } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ success: false, error: 'Client and proposal title are required' });
    }

    // Security check: Verify client belongs to current user
    const client = await Client.findOne({ _id: clientId, userId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or unauthorized' });
    }

    // Infer category if not explicitly provided
    const targetCategory = projectType || (
      title.toLowerCase().includes('landing') ? 'landing-pages' :
      title.toLowerCase().includes('shop') || title.toLowerCase().includes('ecommerce') ? 'e-commerce' :
      'business-websites'
    );

    // Server-side Line-Item Rate Guard Check
    const minHourlyRate = Number(settings.minHourlyRate) || 35;
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      for (const item of lineItems) {
        if (item.rate !== undefined && Number(item.rate) < minHourlyRate) {
          return res.status(422).json({
            success: false,
            error: `Line item "${item.description || 'Deliverable'}" rate (${item.rate}) is below your configured minimum rate of ${minHourlyRate}/hr`,
          });
        }
      }
    }

    // Server-side Pricing Floor Guard Check
    const subtotal = Number(pricingBreakdown?.totalAmount || pricingBreakdown?.subtotal || pricingBreakdown?.recommendedPrice || 0);
    const estimatedHours = Number(pricingBreakdown?.estimatedHours || 20);

    const floorCheck = PricingEngine.validateQuoteAgainstFloor(
      subtotal,
      { estimatedHours, projectType: targetCategory, complexity: 'medium' },
      settings.toObject()
    );

    if (!floorCheck.isValid) {
      return res.status(422).json({
        success: false,
        error: floorCheck.error,
        minimumFloor: floorCheck.minimumFloor,
      });
    }

    const rulesVersion = settings.version || 1;
    const rawAmount = floorCheck.calculation?.adjusted || subtotal;
    const floorUplift = floorCheck.calculation?.floorUplift || 0;

    const newProposal = await Proposal.create({
      userId,
      clientId,
      analysisId: analysisId || null,
      proposalNumber,
      version: 1,
      title,
      status: 'draft',
      currency: currency || req.user.currency || 'USD',
      taxType: req.user.taxType || 'VAT',
      taxRate: req.user.taxRate || 0,
      taxId: req.user.taxId || '',
      projectType: targetCategory,
      selectedTier: selectedTier || 'recommended',
      paymentMethod: paymentMethod || 'stripe',
      paymentDetails: paymentDetails || '',
      paymentScheduleType: paymentScheduleType || '50_50',
      lineItems: lineItems || [],
      pricingBreakdown: {
        ...(pricingBreakdown || {}),
        subtotal,
        totalAmount: subtotal,
        recommendedPrice: subtotal,
        minimumAcceptablePrice: floorCheck.minimumFloor,
        rulesVersion,
        rawAmount,
        floorUplift,
        finalPrice: subtotal,
      },
      paymentSchedule: paymentSchedule || [
        { milestone: 'Project Kickoff Deposit', percentage: 50, amount: Math.round(subtotal * 0.5), dueTrigger: 'Upon contract signing' },
        { milestone: 'Final Sign-off & Handover', percentage: 50, amount: Math.round(subtotal * 0.5), dueTrigger: 'Upon production launch' },
      ],
      termsAndConditions: termsAndConditions || 'Payment due within 15 days of invoice. Standard 2 rounds of design revisions included.',
      validUntil: validUntil || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    await ActivityLog.create({
      userId,
      action: 'CREATE_PROPOSAL',
      entityType: 'Proposal',
      entityId: newProposal._id.toString(),
      details: `Created proposal ${proposalNumber} for "${title}" (Rules v${rulesVersion})`,
    });

    const obj = newProposal.toObject();
    obj.id = newProposal._id.toString();

    res.status(201).json({ success: true, proposal: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single proposal
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOne({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const client = await Client.findOne({ _id: proposal.clientId, userId });
    const analysis = proposal.analysisId ? await RequirementAnalysis.findOne({ _id: proposal.analysisId, userId }) : null;

    const obj = proposal.toObject();
    obj.id = proposal._id.toString();

    res.json({
      success: true,
      proposal: obj,
      client,
      analysis,
      user: {
        name: req.user.name || req.user.fullName,
        fullName: req.user.fullName || req.user.name,
        businessName: req.user.businessName,
        businessEmail: req.user.businessEmail,
        businessPhone: req.user.businessPhone,
        businessAddress: req.user.businessAddress,
        logoUrl: req.user.logoUrl,
        signatureUrl: req.user.signatureUrl,
        currency: req.user.currency,
        taxId: req.user.taxId,
        taxType: req.user.taxType,
        taxRate: req.user.taxRate,
        plan: req.user.plan,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update proposal
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const fields = [
      'title',
      'status',
      'projectType',
      'selectedTier',
      'paymentMethod',
      'paymentDetails',
      'paymentScheduleType',
      'lineItems',
      'pricingBreakdown',
      'paymentSchedule',
      'termsAndConditions',
      'validUntil'
    ];
    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    let settings = await PricingSetting.findOne({ userId });
    if (!settings) settings = await PricingSetting.create({ userId });
    const minHourlyRate = Number(settings.minHourlyRate) || 35;

    if (Array.isArray(updates.lineItems)) {
      for (const item of updates.lineItems) {
        if (item.rate !== undefined && Number(item.rate) < minHourlyRate) {
          return res.status(422).json({
            success: false,
            error: `Line item "${item.description || 'Deliverable'}" rate (${item.rate}) is below your configured minimum rate of ${minHourlyRate}/hr`,
          });
        }
      }
    }

    if (updates.pricingBreakdown) {
      const subtotal = Number(updates.pricingBreakdown.totalAmount || updates.pricingBreakdown.subtotal || updates.pricingBreakdown.recommendedPrice || 0);
      const estimatedHours = Number(updates.pricingBreakdown.estimatedHours || 20);
      const targetCategory = updates.projectType || req.body.projectType || 'custom-web-apps';

      const floorCheck = PricingEngine.validateQuoteAgainstFloor(
        subtotal,
        { estimatedHours, projectType: targetCategory, complexity: 'medium' },
        settings.toObject()
      );

      if (!floorCheck.isValid) {
        return res.status(422).json({
          success: false,
          error: floorCheck.error,
          minimumFloor: floorCheck.minimumFloor,
        });
      }
    }

    const proposal = await Proposal.findOneAndUpdate({ _id: req.params.id, userId }, updates, { new: true });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    // Auto-update Client status to 'active' when a proposal is accepted (Requirement 4)
    if (updates.status === 'accepted' && proposal.clientId) {
      await Client.findByIdAndUpdate(proposal.clientId, { status: 'active' });
    }

    const obj = proposal.toObject();
    obj.id = proposal._id.toString();

    res.json({ success: true, proposal: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete proposal
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOneAndDelete({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    await ActivityLog.create({
      userId,
      action: 'DELETE_PROPOSAL',
      entityType: 'Proposal',
      entityId: proposal._id.toString(),
      details: `Deleted proposal "${proposal.title}" (${proposal.proposalNumber})`,
    });

    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Recalculate proposal pricing against current rules
router.post('/:id/recalculate', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOne({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    let settings = await PricingSetting.findOne({ userId });
    if (!settings) settings = await PricingSetting.create({ userId });

    const totalHours = (proposal.lineItems || []).reduce((acc, item) => acc + (Number(item.hours) || 0), 0) || Number(proposal.pricingBreakdown?.estimatedHours) || 20;

    const calc = PricingEngine.calculateQuotation(
      {
        estimatedHours: totalHours,
        projectType: proposal.projectType,
        complexity: 'medium',
      },
      settings.toObject()
    );

    const newSubtotal = proposal.selectedTier === 'essential' || proposal.selectedTier === 'minimum'
      ? calc.essential
      : (proposal.selectedTier === 'premium' ? calc.premium : calc.standard);

    proposal.pricingBreakdown = {
      ...(proposal.pricingBreakdown || {}),
      estimatedHours: totalHours,
      subtotal: newSubtotal,
      totalAmount: newSubtotal,
      recommendedPrice: calc.recommendedPrice,
      minAcceptablePrice: calc.minimumAcceptablePrice,
      rulesVersion: settings.version || 1,
      rawAmount: calc.adjustedLaborCost,
      floorUplift: calc.floorUplift,
      finalPrice: newSubtotal,
      essential: calc.essential,
      standard: calc.standard,
      premium: calc.premium,
    };

    await proposal.save();

    await ActivityLog.create({
      userId,
      action: 'RECALCULATE_PROPOSAL_PRICING',
      entityType: 'Proposal',
      entityId: proposal._id.toString(),
      details: `Recalculated proposal ${proposal.proposalNumber} with rules version ${settings.version || 1}`,
    });

    const obj = proposal.toObject();
    obj.id = proposal._id.toString();

    res.json({ success: true, proposal: obj, rulesVersion: settings.version || 1 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Convert accepted proposal to active Project
router.post('/:id/convert-to-project', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOne({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    proposal.status = 'accepted';
    await proposal.save();

    // Auto-update Client status to 'active' when proposal is converted/accepted
    if (proposal.clientId) {
      await Client.findByIdAndUpdate(proposal.clientId, { status: 'active' });
    }

    const contractValue =
      proposal.pricingBreakdown?.totalAmount ||
      proposal.pricingBreakdown?.subtotal ||
      proposal.pricingBreakdown?.recommendedPrice ||
      0;

    // Real tasks from proposal deliverables (NEVER generic placeholder tasks)
    const deliverableTasks = (proposal.lineItems || []).map((item, idx) => ({
      id: `task-${idx + 1}-${Date.now().toString(36)}`,
      title: item.description || `Deliverable ${idx + 1}`,
      description: item.description || '',
      status: 'todo',
      completed: false,
      estimatedHours: Number(item.hours) || 0,
      actualHours: 0,
      isFromDeliverable: true,
      priority: 'medium',
      timeEntries: [],
    }));

    // Real milestones from proposal payment schedule
    const scheduleMilestones = (proposal.paymentSchedule || []).map((p, idx) => ({
      id: `m-${idx + 1}-${Date.now().toString(36)}`,
      title: p.milestone || `Milestone ${idx + 1}`,
      dueDate: new Date(Date.now() + (idx + 1) * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      percentage: Number(p.percentage) || (proposal.paymentSchedule.length ? Math.round(100 / proposal.paymentSchedule.length) : 50),
      dueTrigger: p.dueTrigger || (idx === 0 ? 'Upon project kickoff deposit' : 'Upon final project sign-off and delivery'),
      status: idx === 0 ? 'ready_to_invoice' : 'upcoming',
      amount: Number(p.amount) || Math.round(contractValue * 0.5),
    }));

    const cleanTitle = (proposal.title || 'Client Project').replace(/^Proposal:\s*/i, '');

    const newProject = await Project.create({
      userId,
      clientId: proposal.clientId,
      proposalId: proposal._id,
      title: cleanTitle,
      status: 'not_started', // starts at not_started (0 tasks moved)
      contractValue,
      currency: proposal.currency || req.user.currency || 'USD',
      startDate: new Date(),
      dueDate: proposal.validUntil ? new Date(proposal.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      milestones: scheduleMilestones,
      tasks: deliverableTasks,
      changeRequests: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          action: 'PROJECT_CREATED',
          details: `Project created from accepted proposal ${proposal.proposalNumber}`,
          actor: req.user.name || 'Freelancer',
          createdAt: new Date(),
        },
      ],
      notes: `Generated from accepted proposal ${proposal.proposalNumber}`,
    });

    await ActivityLog.create({
      userId,
      action: 'CONVERT_PROPOSAL_TO_PROJECT',
      entityType: 'Project',
      entityId: newProject._id.toString(),
      details: `Created project "${newProject.title}" from accepted proposal ${proposal.proposalNumber}`,
    });

    const projectObj = newProject.toObject();
    projectObj.id = newProject._id.toString();

    res.status(201).json({ success: true, project: projectObj, proposal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export proposal PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOne({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const client = await Client.findOne({ _id: proposal.clientId, userId });

    const pdfBuffer = await generateProposalPdf({
      proposal: proposal.toObject ? proposal.toObject() : proposal,
      client: client ? (client.toObject ? client.toObject() : client) : null,
      user: req.user.toObject ? req.user.toObject() : req.user,
    });

    const propNum = proposal.proposalNumber || 'PROP';
    const effClient = client || proposal.client;
    const clientName = (effClient?.company || effClient?.name || 'Client')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const filename = `Proposal-${propNum}-${clientName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Proposal PDF export error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// -----------------------------------------------------------------------------
// PROPOSAL SHARE LINK MANAGEMENT (Auth Required)
// -----------------------------------------------------------------------------

// Generate / Regenerate secure share link
router.post('/:id/share-link', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOne({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    proposal.shareToken = hashedToken;
    proposal.shareEnabled = true;
    proposal.shareExpiresAt = defaultExpiry;
    proposal.revokedAt = null;
    await proposal.save();

    await ActivityLog.create({
      userId,
      action: 'PROPOSAL_SHARE_LINK_GENERATED',
      entityType: 'Proposal',
      entityId: proposal._id.toString(),
      details: `Generated secure share link for proposal ${proposal.proposalNumber}.`,
    });

    const shareUrl = `${config.siteUrl}/p/${rawToken}`;

    res.json({
      success: true,
      rawToken,
      shareUrl,
      expiresAt: proposal.shareExpiresAt,
      message: 'Share link created successfully. Show raw token once.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke share link
router.delete('/:id/share-link', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOne({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    proposal.shareEnabled = false;
    proposal.revokedAt = new Date();
    await proposal.save();

    await ActivityLog.create({
      userId,
      action: 'PROPOSAL_SHARE_LINK_REVOKED',
      entityType: 'Proposal',
      entityId: proposal._id.toString(),
      details: `Revoked share link for proposal ${proposal.proposalNumber}.`,
    });

    res.json({ success: true, message: 'Share link has been revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current share link metadata
router.get('/:id/share-link', async (req, res) => {
  try {
    const userId = req.user._id;
    const proposal = await Proposal.findOne({ _id: req.params.id, userId });
    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const now = new Date();
    const isExpired = Boolean(proposal.shareExpiresAt && proposal.shareExpiresAt < now);
    const isValid = Boolean(proposal.shareEnabled && !proposal.revokedAt && !isExpired);

    res.json({
      success: true,
      shareEnabled: proposal.shareEnabled,
      expiresAt: proposal.shareExpiresAt,
      revokedAt: proposal.revokedAt,
      viewedAt: proposal.viewedAt,
      isExpired,
      isValid,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

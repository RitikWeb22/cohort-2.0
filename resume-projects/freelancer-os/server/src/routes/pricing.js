import express from 'express';
import { User } from '../models/User.js';
import { PricingSetting } from '../models/PricingSetting.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { PricingEngine } from '../services/pricingEngine.js';
import { getProfessionConfig } from '../config/professions.js';

const router = express.Router();
router.use(requireAuth);

// Get Pricing Settings for authenticated user
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await PricingSetting.findOne({ userId });
    if (!settings) {
      settings = await PricingSetting.create({ userId });
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Pricing Settings
router.patch('/settings', async (req, res) => {
  try {
    const userId = req.user._id;
    const fields = [
      'hourlyRate',
      'minHourlyRate',
      'minProjectFee',
      'categoryMinimums',
      'defaultBufferPercent',
      'complexityMultipliers',
      'tierMultipliers',
      'rushMultiplier',
      'revisionAllowance',
      'defaultContingencyPercent',
      'preferredProfitMargin',
      'currency',
      'roundingStep',
      'profile',
      'projectTypes',
      'packageTiers',
      'currencyOverrides',
    ];

    const updates = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const errors = {};
    const stdRate = updates.hourlyRate !== undefined ? Number(updates.hourlyRate) : undefined;
    const minRate = updates.minHourlyRate !== undefined ? Number(updates.minHourlyRate) : undefined;
    const minFee = updates.minProjectFee !== undefined ? Number(updates.minProjectFee) : undefined;

    if (stdRate !== undefined && (isNaN(stdRate) || stdRate <= 0)) {
      errors.hourlyRate = 'Standard hourly rate must be greater than zero.';
    }
    if (minRate !== undefined && (isNaN(minRate) || minRate <= 0)) {
      errors.minHourlyRate = 'Lowest hourly rate must be greater than zero.';
    }
    if (stdRate !== undefined && minRate !== undefined && minRate > stdRate) {
      errors.minHourlyRate = 'Lowest hourly rate cannot exceed standard hourly rate.';
    }
    if (minFee !== undefined && (isNaN(minFee) || minFee <= 0)) {
      errors.minProjectFee = 'Minimum project fee must be greater than zero.';
    }

    // Complexity multipliers check
    if (updates.complexityMultipliers) {
      const s = Number(updates.complexityMultipliers.simple);
      const m = Number(updates.complexityMultipliers.medium);
      const c = Number(updates.complexityMultipliers.complex);
      if (isNaN(s) || s < 1.0) errors.complexitySimple = 'Simple complexity must be at least 1.00.';
      if (isNaN(m) || m < s) errors.complexityMedium = 'Medium complexity must be at least Simple.';
      if (isNaN(c) || c < m) errors.complexityComplex = 'Complex complexity must be at least Medium.';
    }

    // Tiers check
    if (updates.tierMultipliers) {
      const st = Number(updates.tierMultipliers.standard);
      const pr = Number(updates.tierMultipliers.premium);
      if (isNaN(st) || st <= 1.0) errors.standardMultiplier = 'Standard tier multiplier must be greater than 1.00.';
      if (isNaN(pr) || pr <= st) errors.premiumMultiplier = 'Premium tier multiplier must be greater than Standard tier.';
    }

    // Contingency
    if (updates.defaultContingencyPercent !== undefined) {
      const cont = Number(updates.defaultContingencyPercent);
      if (isNaN(cont) || cont < 0 || cont > 50) errors.contingencyPercent = 'Contingency buffer must be between 0% and 50%.';
    }

    // Target margin
    if (updates.preferredProfitMargin !== undefined) {
      const marg = Number(updates.preferredProfitMargin);
      if (isNaN(marg) || marg < 0 || marg > 80) errors.targetMargin = 'Target profit margin must be between 0% and 80%.';
    }

    // Rush multiplier
    if (updates.rushMultiplier !== undefined) {
      const rush = Number(updates.rushMultiplier);
      if (isNaN(rush) || rush < 1.0) errors.rushMultiplier = 'Rush multiplier must be at least 1.00.';
    }

    // Project types validation
    const checkMinFee = minFee ?? (await PricingSetting.findOne({ userId }).select('minProjectFee'))?.minProjectFee ?? 300;
    if (Array.isArray(updates.projectTypes)) {
      for (const pt of updates.projectTypes) {
        if (Number(pt.floor) < checkMinFee) {
          errors[`floor_${pt.id}`] = `Category floor for "${pt.name || pt.id}" cannot be below minimum project fee (${checkMinFee}).`;
        }
      }
    } else if (updates.categoryMinimums) {
      const catMins = updates.categoryMinimums instanceof Map 
        ? Object.fromEntries(updates.categoryMinimums) 
        : updates.categoryMinimums;
      for (const [cat, val] of Object.entries(catMins)) {
        if (Number(val) < checkMinFee) {
          errors[`floor_${cat}`] = `Category floor for "${cat}" (${val}) cannot be below minimum project fee (${checkMinFee}).`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: Object.values(errors)[0],
        errors,
      });
    }

    // Increment version
    const existing = await PricingSetting.findOne({ userId });
    updates.version = ((existing?.version || 1) + 1);

    const settings = await PricingSetting.findOneAndUpdate(
      { userId },
      updates,
      { new: true, upsert: true }
    );

    await ActivityLog.create({
      userId,
      action: 'UPDATE_PRICING_SETTINGS',
      entityType: 'PricingSetting',
      entityId: settings._id.toString(),
      details: `Updated pricing floor rules to version ${settings.version}`,
    });

    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Estimate Quotation (Deterministic calculation with 3 tiers)
router.post('/estimate', async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await PricingSetting.findOne({ userId });
    if (!settings) settings = await PricingSetting.create({ userId });

    const { estimatedHours, projectType, complexity, isRushDelivery, fixedCosts, contingencyPercent } = req.body;

    const quote = PricingEngine.calculateQuotation(
      {
        estimatedHours: Number(estimatedHours) || 20,
        projectType: projectType || 'custom-web-apps',
        complexity: complexity || 'medium',
        isRushDelivery: Boolean(isRushDelivery),
        fixedCosts: Number(fixedCosts) || 0,
        contingencyPercent: contingencyPercent !== undefined ? Number(contingencyPercent) : undefined,
      },
      settings.toObject()
    );

    res.json({ success: true, calculation: quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate Proposed Quote against Floor (Server Safeguard)
router.post('/validate-quote', async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await PricingSetting.findOne({ userId });
    if (!settings) settings = await PricingSetting.create({ userId });

    const { proposedAmount, estimatedHours, projectType, complexity, isRushDelivery, fixedCosts } = req.body;

    const validation = PricingEngine.validateQuoteAgainstFloor(
      proposedAmount,
      {
        estimatedHours: Number(estimatedHours) || 20,
        projectType: projectType || 'custom-web-apps',
        complexity: complexity || 'medium',
        isRushDelivery: Boolean(isRushDelivery),
        fixedCosts: Number(fixedCosts) || 0,
      },
      settings.toObject()
    );

    res.json({ success: true, validation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset Pricing to Profession Defaults
router.post('/reset-profession-defaults', async (req, res) => {
  try {
    const userId = req.user._id;
    const targetField = req.body.field || req.user.field || 'web_developer';
    const profConfig = getProfessionConfig(targetField);

    const categoryMinimums = {};
    for (const cat of profConfig.categories) {
      categoryMinimums[cat.id] = cat.floor;
    }

    const settings = await PricingSetting.findOneAndUpdate(
      { userId },
      {
        hourlyRate: profConfig.defaultHourlyRate,
        minHourlyRate: profConfig.defaultMinHourlyRate,
        minProjectFee: profConfig.defaultMinProjectFee,
        categoryMinimums,
      },
      { new: true, upsert: true }
    );

    // Keep user record in sync
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { field: targetField },
      { new: true }
    ).select('-passwordHash');

    await ActivityLog.create({
      userId,
      action: 'RESET_PROFESSION_PRICING',
      entityType: 'PricingSetting',
      entityId: settings._id.toString(),
      details: `Reset pricing presets to profession: ${profConfig.name}`,
    });

    res.json({ success: true, settings, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Guess Scope & Price Endpoint
router.post('/ai-guess', async (req, res) => {
  try {
    const userId = req.user._id;
    let settings = await PricingSetting.findOne({ userId });
    if (!settings) settings = await PricingSetting.create({ userId });

    const { title, description, category } = req.body;

    const result = await PricingEngine.aiGuessScopeAndPrice(
      { title, description, category, field: req.user.field },
      settings.toObject()
    );

    res.json({ success: true, aiGuess: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

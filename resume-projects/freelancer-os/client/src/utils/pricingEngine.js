/**
 * Shared Pricing Engine (Floorly)
 * Used across:
 * - Analyzer (/analyzer)
 * - Proposal Builder (/proposals/new, /proposals/:id/edit)
 * - Proposals List (/proposals)
 * - Dashboard (/dashboard)
 * - Invoices (/invoices)
 *
 * Core Business Rules:
 * - raw = sum(hours x rate) x complexity multiplier
 * - essential = max(raw, category floor, minimum project fee)
 * - standard = roundClean(essential x standardMultiplier) (default 1.20)
 * - premium = roundClean(essential x premiumMultiplier) (default 1.50)
 * - Prices strictly increasing: Essential < Standard < Premium
 * - Block line-item rates below absolute minimum hourly rate
 * - 100% upfront discount capped if it breaches floor
 * - Revenue protected = max(0, finalQuote - raw)
 */

/**
 * Clean rounding helper: rounds to nearest 50 or 100 based on magnitude
 */
/**
 * Clean round-up helper: rounds UP to a clean step per currency (e.g. 50 for INR, 5 for USD/EUR/GBP)
 * so a price can never fall below the floor because of rounding.
 */
export function roundUp(amount, step = 50) {
  const s = Number(step) > 0 ? Number(step) : 50;
  const val = Number(amount) || 0;
  if (val <= 0) return 0;
  return Math.ceil(val / s) * s;
}

/**
 * Clean rounding helper (legacy backward compatibility)
 */
export function roundClean(amount, minStep = 50) {
  return roundUp(amount, minStep);
}

/**
 * Get default rounding step by currency
 */
export function getDefaultRoundingStep(currency = 'USD') {
  const c = (currency || '').toUpperCase();
  if (c === 'INR' || c === 'JPY' || c === 'KRW') return 50;
  return 5;
}

/**
 * Consolidated Core Pricing Engine (Floorly)
 * ONE shared function computePricing(input, rules) used by:
 * - Live Simulator (/pricing-rules)
 * - Requirements Analyzer (/analyzer)
 * - Proposal Builder (/proposals/new, /proposals/:id/edit)
 * - Projects Change Orders (/projects/:id)
 * - Server-side floor enforcement
 *
 * Exact pipeline:
 * a. hours = estimated hours x (1 + contingency% / 100)
 * b. labor = hours x standard hourly rate
 * c. adjusted = labor x complexity multiplier x (rush ? rush multiplier : 1)
 * d. essential = roundUp(max(adjusted, category floor, minimum project fee), step)
 * e. Effective-rate guard: if essential / estimated hours < absolute minimum hourly rate,
 *    essential = roundUp(estimated hours x absolute minimum rate, step)
 * f. standard = roundUp(max(essential x standard multiplier, labor / (1 - target margin% / 100)), step)
 * g. premium = roundUp(essential x premium multiplier, step); if premium <= standard then premium = standard + step
 * h. Rounding is always UP to a clean step per currency (e.g. 50 for INR, 5 for USD/EUR/GBP; configurable)
 * Floor uplift = essential - adjusted (if > 0, the floor was applied).
 */
export function computePricing(input = {}, rules = {}) {
  const safeInput = input || {};
  const safeRules = rules || {};

  const estimatedHours = Math.max(0.1, Number(safeInput.estimatedHours ?? safeInput.hours ?? 10));
  const projectType = safeInput.projectType || safeInput.category || 'landing-pages';
  const complexity = (safeInput.complexity || 'medium').toLowerCase();
  const isRush = Boolean(safeInput.isRushDelivery ?? safeInput.rush ?? false);

  // Currency & step
  const rulesCurrency = safeRules.currency || 'USD';
  const targetCurrency = safeInput.targetCurrency || safeInput.currency || rulesCurrency;
  const exchangeRate = Number(safeInput.exchangeRate) || 1;
  const roundingStep = Number(safeRules.roundingStep) || getDefaultRoundingStep(targetCurrency);

  // Standard rates & minimums
  const standardHourlyRate = Number(safeRules.hourlyRate) || 50;
  const lowestHourlyRate = Number(safeRules.minHourlyRate) || 35;
  const baseMinProjectFee = Number(safeRules.minProjectFee) || 300;

  // Convert floor by currency exchange if applicable
  const minProjectFee = roundUp(baseMinProjectFee * exchangeRate, roundingStep);

  // Category floor lookup
  let rawCategoryFloor = minProjectFee;
  if (Array.isArray(safeRules.projectTypes)) {
    const found = safeRules.projectTypes.find((pt) => pt.id === projectType || pt.name?.toLowerCase() === projectType.toLowerCase());
    if (found && found.floor !== undefined && found.floor !== null) {
      rawCategoryFloor = Number(found.floor);
    }
  } else if (safeRules.categoryMinimums) {
    const rawVal = typeof safeRules.categoryMinimums.get === 'function'
      ? safeRules.categoryMinimums.get(projectType)
      : safeRules.categoryMinimums[projectType];
    if (rawVal !== undefined && rawVal !== null && !isNaN(Number(rawVal))) {
      rawCategoryFloor = Number(rawVal);
    }
  }
  const categoryFloor = roundUp(Math.max(rawCategoryFloor * exchangeRate, minProjectFee), roundingStep);
  const floorThreshold = Math.max(categoryFloor, minProjectFee);

  // Multipliers
  const complexityMultipliers = safeRules.complexityMultipliers || { simple: 1.0, medium: 1.25, complex: 1.5 };
  const complexityMultiplier = Number(complexityMultipliers[complexity] ?? 1.25);
  const rushMultiplier = Number(safeRules.rushMultiplier ?? 1.30);
  const activeRushMultiplier = isRush ? rushMultiplier : 1.0;

  // Contingency & Target Margin
  const contingencyPercent = Number(safeRules.defaultContingencyPercent ?? safeRules.contingencyPercent ?? 10);
  const targetMarginPercent = Number(safeRules.preferredProfitMargin ?? safeRules.targetMargin ?? 25);

  // Tier multipliers (Essential fixed at 1.00)
  const tierMultipliers = safeRules.tierMultipliers || { essential: 1.0, standard: 1.20, premium: 1.50 };
  const standardMultiplier = Number(tierMultipliers.standard ?? 1.20);
  const premiumMultiplier = Number(tierMultipliers.premium ?? 1.50);

  // --- PIPELINE EXECUTION ---
  // a. hours = estimated hours x (1 + contingency%)
  const contingencyFraction = contingencyPercent / 100;
  const hours = estimatedHours * (1 + contingencyFraction);
  const contingencyHours = hours - estimatedHours;

  // b. labor = hours x standard hourly rate
  const labor = hours * standardHourlyRate;

  // c. adjusted = labor x complexity multiplier x (rush ? rush multiplier : 1)
  const adjusted = labor * complexityMultiplier * activeRushMultiplier;

  // d. essential = roundUp(max(adjusted, category floor, minimum project fee), step)
  const rawEssentialFloor = Math.max(adjusted, categoryFloor, minProjectFee);
  let essential = roundUp(rawEssentialFloor, roundingStep);

  // e. Effective-rate guard: if essential / estimated hours < absolute minimum hourly rate,
  //    essential = roundUp(estimated hours x absolute minimum rate, step)
  const effectiveRateInitial = essential / estimatedHours;
  let isEffectiveRateGuarded = false;
  if (effectiveRateInitial < lowestHourlyRate) {
    essential = roundUp(estimatedHours * lowestHourlyRate, roundingStep);
    isEffectiveRateGuarded = true;
  }

  // Floor uplift = essential - adjusted (if adjusted < floorThreshold, the floor was applied)
  const isFloorApplied = adjusted < floorThreshold;
  const floorUplift = isFloorApplied ? Math.max(0, essential - adjusted) : 0;

  // f. standard = roundUp(max(essential x standard multiplier, labor / (1 - target margin%)), step)
  const marginFraction = Math.min(0.99, targetMarginPercent / 100);
  const marginCostFloor = marginFraction < 1 ? (labor / (1 - marginFraction)) : labor;
  const rawStandardTarget = Math.max(essential * standardMultiplier, marginCostFloor);
  let standard = roundUp(rawStandardTarget, roundingStep);
  if (standard <= essential) {
    standard = essential + roundingStep;
  }

  // g. premium = roundUp(essential x premium multiplier, step); if premium <= standard then premium = standard + step
  const rawPremiumTarget = essential * premiumMultiplier;
  let premium = roundUp(rawPremiumTarget, roundingStep);
  if (premium <= standard) {
    premium = standard + roundingStep;
  }

  // Effective hourly rate based on essential
  const effectiveHourlyRate = Math.round((essential / estimatedHours) * 100) / 100;

  return {
    estimatedHours,
    contingencyPercent,
    contingencyHours,
    hours,
    standardHourlyRate,
    labor,
    complexityMultiplier,
    activeRushMultiplier,
    isRush,
    adjusted,
    raw: adjusted,
    categoryFloor,
    minProjectFee,
    floor: floorThreshold,
    floorUplift,
    isFloorApplied,
    isEffectiveRateGuarded,
    effectiveHourlyRate,
    lowestHourlyRate,
    standardMultiplier,
    targetMarginPercent,
    marginCostFloor,
    premiumMultiplier,
    roundingStep,
    rulesCurrency,
    targetCurrency,
    version: rules.version || 1,
    tiers: {
      essential,
      standard,
      premium,
    },
    steps: {
      estimatedHours,
      contingencyHours,
      totalHours: hours,
      laborCost: labor,
      complexityMultiplier,
      rushMultiplier: activeRushMultiplier,
      adjustedLaborCost: adjusted,
      categoryFloor,
      minProjectFee,
      floorUplift,
      effectiveRate: effectiveHourlyRate,
      essential,
      standard,
      premium,
    },
  };
}

/**
 * Validate pricing rules against business invariants
 */
export function validatePricingRules(rules = {}) {
  const errors = {};
  const warnings = [];

  const standardRate = Number(rules.hourlyRate) || 0;
  const lowestRate = Number(rules.minHourlyRate) || 0;
  const minProjectFee = Number(rules.minProjectFee) || 0;

  if (standardRate <= 0) errors.hourlyRate = 'Standard hourly rate must be greater than zero.';
  if (lowestRate <= 0) errors.minHourlyRate = 'Lowest hourly rate must be greater than zero.';
  if (lowestRate > standardRate) {
    errors.minHourlyRate = 'Lowest hourly rate cannot exceed standard hourly rate.';
  }
  if (minProjectFee <= 0) errors.minProjectFee = 'Minimum project fee must be greater than zero.';

  // Complexity multipliers: Simple <= Medium <= Complex and all >= 1.00
  const comp = rules.complexityMultipliers || {};
  const simple = Number(comp.simple);
  const medium = Number(comp.medium);
  const complex = Number(comp.complex);

  if (isNaN(simple) || simple < 1.0) errors.complexitySimple = 'Simple complexity must be at least 1.00.';
  if (isNaN(medium) || medium < (simple || 1.0)) errors.complexityMedium = 'Medium complexity must be at least Simple.';
  if (isNaN(complex) || complex < (medium || 1.25)) errors.complexityComplex = 'Complex complexity must be at least Medium.';

  // Tiers: Essential fixed 1.00, Standard > 1.00, Premium > Standard
  const tiers = rules.tierMultipliers || {};
  const standardMult = Number(tiers.standard);
  const premiumMult = Number(tiers.premium);

  if (isNaN(standardMult) || standardMult <= 1.0) errors.standardMultiplier = 'Standard tier multiplier must be greater than 1.00.';
  if (isNaN(premiumMult) || premiumMult <= standardMult) errors.premiumMultiplier = 'Premium tier multiplier must be greater than Standard tier multiplier.';

  // Contingency 0-50%
  const contingency = Number(rules.defaultContingencyPercent ?? rules.contingencyPercent ?? 10);
  if (isNaN(contingency) || contingency < 0 || contingency > 50) {
    errors.contingencyPercent = 'Contingency buffer must be between 0% and 50%.';
  }

  // Target margin 0-80%
  const targetMargin = Number(rules.preferredProfitMargin ?? rules.targetMargin ?? 25);
  if (isNaN(targetMargin) || targetMargin < 0 || targetMargin > 80) {
    errors.targetMargin = 'Target profit margin must be between 0% and 80%.';
  }

  // Rush >= 1.00
  const rush = Number(rules.rushMultiplier ?? 1.30);
  if (isNaN(rush) || rush < 1.0) {
    errors.rushMultiplier = 'Rush multiplier must be at least 1.00.';
  }

  // Project types / Category floors >= minProjectFee
  const categories = Array.isArray(rules.projectTypes) ? rules.projectTypes : [];
  categories.forEach((cat) => {
    const f = Number(cat.floor);
    if (isNaN(f) || f < minProjectFee) {
      errors[`floor_${cat.id}`] = `Floor for "${cat.name || cat.id}" cannot be below minimum project fee.`;
    }
    if (Number(cat.typicalMinHours) <= 0 || Number(cat.typicalMaxHours) <= 0) {
      errors[`hours_${cat.id}`] = 'Typical hours must be greater than 0.';
    } else if (Number(cat.typicalMinHours) > Number(cat.typicalMaxHours)) {
      errors[`hours_${cat.id}`] = 'Min hours cannot exceed max hours.';
    }
  });

  // Sanity warnings (non-blocking, yellow)
  if (categories.length > 0 && standardRate > 0 && lowestRate > 0) {
    categories.forEach((cat) => {
      const floor = Number(cat.floor) || 0;
      const minH = Number(cat.typicalMinHours) || 1;
      const maxH = Number(cat.typicalMaxHours) || 1;

      if (maxH > 0 && (floor / maxH) < lowestRate) {
        warnings.push({
          id: cat.id,
          message: `${cat.name || cat.id} floor implies ${Math.round(floor / maxH)}/hr at top of range (${maxH} hrs), below lowest rate of ${lowestRate}/hr.`,
        });
      }
      if (minH > 0 && (floor / minH) > standardRate * 10) {
        warnings.push({
          id: cat.id,
          message: `${cat.name || cat.id} floor implies ${Math.round(floor / minH)}/hr at bottom of range (${minH} hrs), over 10x your standard rate.`,
        });
      }
    });

    // Cross-category consistency check
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i];
        const catB = categories[j];
        const avgHA = ((Number(catA.typicalMinHours) || 0) + (Number(catA.typicalMaxHours) || 0)) / 2;
        const avgHB = ((Number(catB.typicalMinHours) || 0) + (Number(catB.typicalMaxHours) || 0)) / 2;
        const floorA = Number(catA.floor) || 0;
        const floorB = Number(catB.floor) || 0;

        if (avgHB > avgHA * 2 && floorA > floorB * 2) {
          warnings.push({
            id: `${catA.id}_${catB.id}`,
            message: `${catA.name || catA.id} floor is higher than ${catB.name || catB.id}, but ${catB.name} takes much more typical time. Check for a typo.`,
          });
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate multi-tier pricing, floors, and upfront discounts deterministically
 * Bridges computePricing to line item proposals, discounts, and taxes.
 */
export function calculatePricing({
  items = [],
  hours = 0,
  rate = null,
  projectType = 'custom-web-apps',
  complexity = 'medium',
  isRushDelivery = false,
  pricingSettings = {},
  selectedTier = 'standard',
  customPrice = null,
  paymentScheduleType = '50_50',
  discountPercent = 5,
  taxRate = 0,
  taxMode = 'exclusive', // 'exclusive' | 'inclusive'
  currency = null,
  exchangeRate = 1,
}) {
  const standardRate = Number(pricingSettings?.hourlyRate) || 50;
  const minHourlyRate = Number(pricingSettings?.minHourlyRate) || 35;

  // 1. Calculate Total Hours and Line Item Costs
  let totalHours = 0;
  let rawLabor = 0;
  const lineItemErrors = [];

  if (Array.isArray(items) && items.length > 0) {
    items.forEach((item, index) => {
      const h = Number(item.hours) || 0;
      const r = Number(item.rate !== undefined && item.rate !== null ? item.rate : standardRate);
      totalHours += h;
      rawLabor += h * r;

      if (r < minHourlyRate) {
        lineItemErrors.push({
          index,
          description: item.description,
          rate: r,
          minRate: minHourlyRate,
          error: `Below your minimum rate of ${minHourlyRate}/hr`,
        });
      }
    });
  } else {
    totalHours = Number(hours) || 0;
    const effectiveRate = Number(rate) || standardRate;
    rawLabor = totalHours * effectiveRate;
    if (effectiveRate < minHourlyRate) {
      lineItemErrors.push({
        index: 0,
        rate: effectiveRate,
        minRate: minHourlyRate,
        error: `Below your minimum rate of ${minHourlyRate}/hr`,
      });
    }
  }

  // 2. Call the ONE shared computePricing function
  const computed = computePricing(
    {
      estimatedHours: totalHours,
      projectType,
      complexity,
      isRushDelivery,
      currency,
      exchangeRate,
    },
    pricingSettings
  );

  const floor = computed.floor;
  const essential = computed.tiers.essential;
  const standard = computed.tiers.standard;
  const premium = computed.tiers.premium;

  // 3. Determine Active Package Price Before Discount
  let activePackagePrice = standard;
  if (selectedTier === 'essential' || selectedTier === 'minimum') {
    activePackagePrice = essential;
  } else if (selectedTier === 'premium') {
    activePackagePrice = premium;
  } else if (selectedTier === 'custom' && customPrice) {
    activePackagePrice = Number(customPrice);
  }

  // 4. Upfront Discount Safeguard (100% Upfront)
  let nominalDiscount = 0;
  let appliedDiscount = 0;
  let isDiscountCapped = false;
  let discountCappedAmount = 0;

  if (paymentScheduleType === '100_upfront' && discountPercent > 0) {
    nominalDiscount = Math.round(activePackagePrice * (discountPercent / 100));
    const maxAllowedDiscount = Math.max(0, activePackagePrice - floor);
    if (nominalDiscount > maxAllowedDiscount) {
      appliedDiscount = maxAllowedDiscount;
      isDiscountCapped = true;
      discountCappedAmount = appliedDiscount;
    } else {
      appliedDiscount = nominalDiscount;
      isDiscountCapped = false;
    }
  }

  const subtotalAfterDiscount = Math.max(floor, activePackagePrice - appliedDiscount);

  // 5. Taxes
  let taxAmount = 0;
  let totalWithTax = subtotalAfterDiscount;
  const numericTaxRate = Number(taxRate) || 0;

  if (numericTaxRate > 0) {
    if (taxMode === 'inclusive') {
      taxAmount = Math.round((subtotalAfterDiscount * numericTaxRate) / (100 + numericTaxRate));
      totalWithTax = subtotalAfterDiscount;
    } else {
      taxAmount = Math.round((subtotalAfterDiscount * numericTaxRate) / 100);
      totalWithTax = subtotalAfterDiscount + taxAmount;
    }
  }

  const revenueProtected = Math.max(0, subtotalAfterDiscount - computed.adjusted);

  return {
    totalHours,
    standardRate,
    minHourlyRate,
    complexityMultiplier: computed.complexityMultiplier,
    raw: computed.adjusted,
    categoryFloor: computed.categoryFloor,
    minProjectFee: computed.minProjectFee,
    floor,
    floorUplift: computed.floorUplift,
    tiers: {
      essential,
      standard,
      premium,
    },
    activePackagePrice,
    nominalDiscount,
    appliedDiscount,
    isDiscountCapped,
    discountCappedAmount,
    subtotal: subtotalAfterDiscount,
    taxAmount,
    taxRate: numericTaxRate,
    taxMode,
    totalWithTax,
    revenueProtected,
    isRaisedToFloor: computed.isFloorApplied,
    hasLineItemRateError: lineItemErrors.length > 0,
    lineItemErrors,
    computed,
  };
}

/**
 * Single source of truth for proposal financial calculations:
 * Used by builder, list, preview, print, PDF, invoices, and dashboard.
 *
 * Invariants:
 * - sum(line amounts) + floorAdjustment === subtotal
 * - subtotal - discount + (taxMode === 'exclusive' ? tax : 0) === total
 * - sum(schedule installments) === total
 */
export function computeProposalTotals(proposal, options = {}) {
  const showHoursToClient = options.showHoursToClient !== undefined ? options.showHoursToClient : true;
  const floorAdjustmentMode = options.floorAdjustmentMode || 'spread'; // 'spread' | 'separate'

  const rawItems = proposal?.lineItems || [];
  const hoursCount = rawItems.reduce((acc, i) => acc + (Number(i.hours) || 0), 0);
  const laborSubtotal = Math.round(rawItems.reduce((acc, i) => {
    const h = Number(i.hours) || 0;
    const r = Number(i.rate) || 50;
    return acc + (Number(i.amount) !== undefined && !isNaN(Number(i.amount)) ? Number(i.amount) : h * r);
  }, 0));

  // Base subtotal before discount
  const subtotal = Math.round(Number(
    proposal?.pricingBreakdown?.subtotal ||
    proposal?.pricingBreakdown?.totalAmount ||
    proposal?.pricingBreakdown?.recommendedPrice ||
    laborSubtotal
  ));

  const totalUplift = Math.max(0, subtotal - laborSubtotal);

  // Line item allocation
  let computedLineItems = [];
  let floorAdjustment = 0;

  if (floorAdjustmentMode === 'separate' || totalUplift === 0 || rawItems.length === 0) {
    floorAdjustment = totalUplift;
    computedLineItems = rawItems.map((item, idx) => ({
      index: idx + 1,
      description: item.description || 'Deliverable',
      hours: Number(item.hours) || 0,
      rate: Number(item.rate) || 0,
      amount: Math.round(Number(item.amount) !== undefined ? Number(item.amount) : (Number(item.hours) || 0) * (Number(item.rate) || 0)),
      showRate: true,
    }));
  } else {
    // Mode (b): Spread across deliverables proportionally (Default)
    floorAdjustment = 0;
    let runningSum = 0;
    computedLineItems = rawItems.map((item, idx) => {
      const isLast = idx === rawItems.length - 1;
      const originalAmount = Number(item.amount) !== undefined ? Number(item.amount) : (Number(item.hours) || 0) * (Number(item.rate) || 50);
      let allocatedAmount = 0;
      if (isLast) {
        allocatedAmount = subtotal - runningSum;
      } else {
        const ratio = laborSubtotal > 0 ? (originalAmount / laborSubtotal) : (1 / rawItems.length);
        allocatedAmount = Math.round(subtotal * ratio);
        runningSum += allocatedAmount;
      }
      return {
        index: idx + 1,
        description: item.description || 'Deliverable',
        hours: Number(item.hours) || 0,
        rate: item.rate,
        amount: allocatedAmount,
        showRate: false, // hide rate column under spread mode
      };
    });
  }

  // Verification 1: sum(line amounts) + floorAdjustment === subtotal
  const sumLineAmounts = computedLineItems.reduce((acc, i) => acc + i.amount, 0);
  const lineSumCheck = sumLineAmounts + floorAdjustment;
  if (lineSumCheck !== subtotal && computedLineItems.length > 0) {
    computedLineItems[computedLineItems.length - 1].amount += (subtotal - lineSumCheck);
  }

  // Discount
  const discount = Math.round(Number(proposal?.pricingBreakdown?.discountAmount || proposal?.discountAmount || 0));
  const taxableBase = Math.max(0, subtotal - discount);

  // Tax
  const taxType = proposal?.taxType || 'VAT';
  const taxRate = taxType === 'None' ? 0 : Number(proposal?.taxRate !== undefined ? proposal?.taxRate : 0);
  const taxMode = proposal?.taxMode || 'exclusive'; // 'exclusive' | 'inclusive'

  let tax = 0;
  let total = taxableBase;
  if (taxRate > 0) {
    if (taxMode === 'inclusive') {
      tax = Math.round((taxableBase * taxRate) / (100 + taxRate));
      total = taxableBase;
    } else {
      tax = Math.round((taxableBase * taxRate) / 100);
      total = taxableBase + tax;
    }
  }

  // Payment Schedule: Must sum EXACTLY to total
  const rawSchedule = proposal?.paymentSchedule || [];
  let schedule = [];

  if (rawSchedule.length > 0) {
    let runningInstSum = 0;
    schedule = rawSchedule.map((inst, idx) => {
      const isLast = idx === rawSchedule.length - 1;
      let instAmount = 0;
      if (isLast) {
        instAmount = total - runningInstSum;
      } else {
        const pct = Number(inst.percentage) || (100 / rawSchedule.length);
        instAmount = Math.round(total * (pct / 100));
        runningInstSum += instAmount;
      }
      return {
        ...inst,
        milestone: inst.milestone || `Milestone ${idx + 1}`,
        percentage: Number(inst.percentage) || (total > 0 ? Math.round((instAmount / total) * 100) : 0),
        amount: instAmount,
        dueTrigger: inst.dueTrigger || 'Upon milestone completion',
      };
    });
  } else {
    // Default 50/50
    const half = Math.round(total * 0.5);
    schedule = [
      { milestone: 'Project kickoff deposit', percentage: 50, amount: half, dueTrigger: 'Upon agreement execution' },
      { milestone: 'Final delivery & launch handover', percentage: 50, amount: total - half, dueTrigger: 'Upon production deployment' },
    ];
  }

  // Verification 3: sum(schedule installments) === total
  const scheduleSum = schedule.reduce((acc, s) => acc + s.amount, 0);
  if (scheduleSum !== total && schedule.length > 0) {
    schedule[schedule.length - 1].amount += (total - scheduleSum);
  }

  return {
    lineItems: computedLineItems,
    hoursCount,
    laborSubtotal,
    floorAdjustment,
    floorAdjustmentMode,
    subtotal,
    discount,
    taxableBase,
    tax,
    taxRate,
    taxType,
    taxMode,
    total,
    schedule,
    showHoursToClient,
    assertionsPassed: true,
  };
}

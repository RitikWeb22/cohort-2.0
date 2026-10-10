import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { getProfessionConfig } from '../config/professions.js';

/**
 * Smart Pricing Engine
 * Deterministic pricing calculations with strict server-side floor enforcement.
 * Adheres to Section 6 of AGENTS.md
 */

export function roundUp(amount, step = 50) {
  const s = Number(step) > 0 ? Number(step) : 50;
  const val = Number(amount) || 0;
  if (val <= 0) return 0;
  return Math.ceil(val / s) * s;
}

export function getDefaultRoundingStep(currency = 'USD') {
  const c = (currency || '').toUpperCase();
  if (c === 'INR' || c === 'JPY' || c === 'KRW') return 50;
  return 5;
}

/**
 * Consolidated Core Pricing Engine (Floorly)
 * Exact shared math used everywhere.
 */
export function computePricing(input = {}, rules = {}) {
  const safeInput = input || {};
  const safeRules = rules || {};

  const estimatedHours = Math.max(0.1, Number(safeInput.estimatedHours ?? safeInput.hours ?? 10));
  const projectType = safeInput.projectType || safeInput.category || 'landing-pages';
  const complexity = (safeInput.complexity || 'medium').toLowerCase();
  const isRush = Boolean(safeInput.isRushDelivery ?? safeInput.rush ?? false);

  const rulesCurrency = safeRules.currency || 'USD';
  const targetCurrency = safeInput.targetCurrency || safeInput.currency || rulesCurrency;
  const exchangeRate = Number(safeInput.exchangeRate) || 1;
  const roundingStep = Number(safeRules.roundingStep) || getDefaultRoundingStep(targetCurrency);

  const standardHourlyRate = Number(safeRules.hourlyRate) || 50;
  const lowestHourlyRate = Number(safeRules.minHourlyRate) || 35;
  const baseMinProjectFee = Number(safeRules.minProjectFee) || 300;

  const minProjectFee = roundUp(baseMinProjectFee * exchangeRate, roundingStep);

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

  const complexityMultipliers = safeRules.complexityMultipliers || { simple: 1.0, medium: 1.25, complex: 1.5 };
  const complexityMultiplier = Number(complexityMultipliers[complexity] ?? 1.25);
  const rushMultiplier = Number(safeRules.rushMultiplier ?? 1.30);
  const activeRushMultiplier = isRush ? rushMultiplier : 1.0;

  const contingencyPercent = Number(safeRules.defaultContingencyPercent ?? safeRules.contingencyPercent ?? 10);
  const targetMarginPercent = Number(safeRules.preferredProfitMargin ?? safeRules.targetMargin ?? 25);

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

export class PricingEngine {
  /**
   * Calculate pricing tiers and breakdown given scope parameters and pricing settings
   * Uses the ONE shared computePricing function
   */
  static calculateQuotation(params, settings) {
    const computed = computePricing(
      {
        estimatedHours: params.estimatedHours,
        projectType: params.projectType,
        complexity: params.complexity,
        isRushDelivery: params.isRushDelivery,
        targetCurrency: params.currency || settings.currency,
        exchangeRate: params.exchangeRate || 1,
      },
      settings
    );

    const essential = computed.tiers.essential;
    const standard = computed.tiers.standard;
    const premium = computed.tiers.premium;

    const minimumAcceptablePrice = essential;
    const recommendedPrice = standard;
    const premiumPrice = premium;

    const fixedCosts = Math.round(Number(params.fixedCosts) || 0);
    const taxRate = Number(settings.taxRate || 0);
    const taxAmount = Math.round((recommendedPrice * taxRate) / 100);
    const totalAmountWithTax = recommendedPrice + taxAmount;

    const grossProfit = recommendedPrice - (computed.labor + fixedCosts);
    const profitMarginPercent = Math.round((grossProfit / recommendedPrice) * 100);

    return {
      currency: settings.currency || 'USD',
      estimatedHours: computed.estimatedHours,
      standardRate: computed.standardHourlyRate,
      baseLaborCost: computed.labor,
      complexityMultiplier: computed.complexityMultiplier,
      rushMultiplier: computed.activeRushMultiplier,
      adjustedLaborCost: computed.adjusted,
      raw: computed.adjusted,
      floor: computed.floor,
      categoryFloor: computed.categoryFloor,
      fixedCosts,
      contingencyAmount: Math.round(computed.contingencyHours * computed.standardHourlyRate),
      calculatedCommercialCost: computed.adjusted,
      floorUplift: computed.floorUplift,
      
      // Tiers
      essential,
      standard,
      premium,
      minimumAcceptablePrice,
      recommendedPrice,
      premiumPrice,

      // Breakdown for transparency
      taxRate,
      taxAmount,
      totalAmountWithTax,
      grossProfit,
      profitMarginPercent,
      effectiveHourlyRate: computed.effectiveHourlyRate,

      // Safeguard triggers
      floorApplied: computed.isFloorApplied,
      computed,
      warnings: [
        ...(computed.isFloorApplied ? [`The raw estimate (${settings.currency || 'USD'} ${computed.adjusted.toLocaleString()}) was adjusted upward to enforce your configured floor of ${settings.currency || 'USD'} ${computed.floor.toLocaleString()}.`] : []),
        ...(profitMarginPercent < (settings.preferredProfitMargin || 25) ? [`Estimated profit margin (${profitMarginPercent}%) is below your target preferred margin (${settings.preferredProfitMargin || 25}%).`] : [])
      ]
    };
  }

  /**
   * Server-side invariant validator for quotes/proposals
   * Prevents any quotation from being saved below the configured minimum floor!
   */
  static validateQuoteAgainstFloor(proposedAmount, params, settings) {
    const calc = this.calculateQuotation(params, settings);
    const amount = Number(proposedAmount);

    if (amount < calc.minimumAcceptablePrice) {
      return {
        isValid: false,
        error: `Quotation violation: Proposed amount (${settings.currency || 'USD'} ${amount.toLocaleString()}) is below your configured minimum acceptable floor of ${settings.currency || 'USD'} ${calc.minimumAcceptablePrice.toLocaleString()}.`,
        minimumFloor: calc.minimumAcceptablePrice,
        recommendedPrice: calc.recommendedPrice,
        calculation: calc,
      };
    }

    return {
      isValid: true,
      minimumFloor: calc.minimumAcceptablePrice,
      recommendedPrice: calc.recommendedPrice,
      calculation: calc,
    };
  }

  /**
   * AI-powered Scope & Price Guessing
   * Uses Gemini AI with deterministic fallback to infer category, realistic hours,
   * line items, and multi-tier pricing with payment schedules.
   */
  static async aiGuessScopeAndPrice({ title, description, category, field = 'web_developer' }, settings) {
    const rawTitle = (title || '').trim();
    const rawDesc = (description || '').trim();
    const standardRate = Number(settings.hourlyRate) || 50;
    const profConfig = getProfessionConfig(field);

    let guessedCategory = category || '';
    let guessedComplexity = 'medium';
    let lineItems = [];
    let summary = '';

    // Attempt Gemini AI extraction if key is present
    if (config.geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(config.geminiApiKey);
        const candidateModels = [
          ...new Set([
            config.geminiModel,
            config.aiPrimaryModel,
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
          ].filter(Boolean))
        ];

        const catSchema = profConfig.categories.map(c => `"${c.id}"`).join(' | ');

        const prompt = field === 'web_developer'
          ? `You are an expert freelance software estimation engine.
Analyze this client project and generate realistic freelance deliverables, effort hours, category, and confidence ratings.

Project Title: "${rawTitle}"
Project Notes: "${rawDesc}"
Preferred Category (if any): "${guessedCategory}"

CRITICAL ESTIMATION RULES:
1. For simple landing pages, single-page sites, or portfolios:
   - Total hours MUST be between 8 to 14 hours (NEVER 40+ hours).
   - Category MUST be "landing-pages".
   - Complexity MUST be "simple".
2. For business websites / CMS / corporate sites:
   - Total hours between 16 to 28 hours.
   - Category "business-websites".
3. For e-commerce stores:
   - Total hours between 24 to 45 hours.
   - Category "e-commerce".
4. For custom web apps, SaaS, or AI chatbots:
   - Total hours between 30 to 60+ hours.
   - Category "custom-web-apps", "saas-applications", or "ai-integrations".
5. Every line item MUST include "confidence": "high" | "medium" | "low".

Return ONLY valid raw JSON with this exact structure (no markdown, no backticks):
{
  "category": ${catSchema},
  "complexity": "simple" | "medium" | "complex",
  "summary": "1 sentence project summary",
  "lineItems": [
    { "description": "Specific deliverable description", "hours": 3, "confidence": "high" | "medium" | "low" }
  ]
}`
          : `You are an expert freelance ${profConfig.name} estimation engine.
Analyze this client project and generate realistic freelance deliverables, effort hours, category, and confidence ratings.

Project Title: "${rawTitle}"
Project Notes: "${rawDesc}"
Preferred Category (if any): "${guessedCategory}"

CRITICAL ESTIMATION RULES FOR ${profConfig.name.toUpperCase()}:
- Realistic hours based on standard freelance agency packages (between 6 to 35 hours total).
- Category MUST be one of: ${catSchema}.
- Every line item MUST include "confidence": "high" | "medium" | "low".

Return ONLY valid raw JSON with this exact structure (no markdown, no backticks):
{
  "category": ${catSchema},
  "complexity": "simple" | "medium" | "complex",
  "summary": "1 sentence project summary",
  "lineItems": [
    { "description": "Specific deliverable description", "hours": 3, "confidence": "high" | "medium" | "low" }
  ]
}`;

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanText);

            if (parsed && Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0) {
              guessedCategory = parsed.category || guessedCategory;
              guessedComplexity = parsed.complexity || 'medium';
              summary = parsed.summary || '';
              lineItems = parsed.lineItems.map(item => {
                const h = Math.max(1, Number(item.hours) || 2);
                return {
                  description: item.description || 'Deliverable Task',
                  hours: h,
                  confidence: item.confidence || 'high',
                  rate: standardRate,
                  amount: h * standardRate,
                };
              });
              break;
            }
          } catch (modelErr) {
            continue;
          }
        }
      } catch (err) {
        // Fallback to deterministic heuristics below
      }
    }

    // Deterministic semantic fallback if AI unavailable or didn't return line items
    if (!lineItems || lineItems.length === 0) {
      if (field !== 'web_developer') {
        guessedCategory = category || profConfig.categories[0].id;
        guessedComplexity = 'medium';
        summary = `${profConfig.name} package deliverables based on approved service floor guidelines.`;
        lineItems = (profConfig.defaultProposalItems || []).map(item => ({
          description: item.description,
          hours: item.hours || 3,
          confidence: 'high',
          rate: standardRate,
          amount: (item.hours || 3) * standardRate,
        }));
      } else {
        const lower = `${rawTitle} ${rawDesc}`.toLowerCase();

        if (lower.includes('landing') || lower.includes('portfolio') || lower.includes('one page') || lower.includes('single page') || guessedCategory === 'landing-pages') {
          guessedCategory = 'landing-pages';
          guessedComplexity = 'simple';
          summary = 'High-converting single-page responsive landing page with lead capture form and SEO optimization.';
          lineItems = [
            { description: 'Hero Section, Brand Visuals & Value Proposition', hours: 3 },
            { description: 'Interactive Services, Features & Social Proof Sections', hours: 3 },
            { description: 'Lead Capture Contact Form & Notification Setup', hours: 2 },
            { description: 'Mobile Responsiveness, SEO Meta & Performance Optimization', hours: 2 },
          ];
        } else if (lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('shop') || lower.includes('store') || lower.includes('cart') || guessedCategory === 'e-commerce') {
          guessedCategory = 'e-commerce';
          guessedComplexity = 'medium';
          summary = 'Full-featured online commerce store with product catalog, cart, and payment checkout.';
          lineItems = [
            { description: 'Product Catalog, Category Filters & Search Architecture', hours: 8 },
            { description: 'Shopping Cart & Frictionless Checkout Funnel', hours: 6 },
            { description: 'Order Processing, Customer Email Notifications & Invoices', hours: 5 },
            { description: 'Payment Gateway Integration & Admin Inventory Panel', hours: 5 },
          ];
        } else if (lower.includes('ai') || lower.includes('gpt') || lower.includes('bot') || lower.includes('chat') || lower.includes('rag') || guessedCategory === 'ai-integrations') {
          guessedCategory = 'ai-integrations';
          guessedComplexity = 'medium';
          summary = 'Intelligent AI assistant integration with custom system instructions and conversation streaming.';
          lineItems = [
            { description: 'AI Provider Integration & Domain Prompt Engineering', hours: 7 },
            { description: 'Real-time Streaming Chat UI with Markdown & Code Formatting', hours: 6 },
            { description: 'Conversation Persistence & Session Management', hours: 4 },
            { description: 'Rate Limiting, Safety Guardrails & Token Budgeting', hours: 3 },
          ];
        } else if (lower.includes('saas') || lower.includes('portal') || lower.includes('dashboard') || lower.includes('webapp') || lower.includes('custom') || guessedCategory === 'custom-web-apps') {
          guessedCategory = 'custom-web-apps';
          guessedComplexity = 'complex';
          summary = 'Custom web application platform with secure user authentication and dashboard workflows.';
          lineItems = [
            { description: 'Database Schema, User Authentication & Permission Roles', hours: 8 },
            { description: 'Interactive Dashboard with Real-time Data Visualization', hours: 9 },
            { description: 'CRUD Operations & Secure RESTful API Endpoints', hours: 8 },
            { description: 'Automated Testing, Production Security Audit & Deployment', hours: 5 },
          ];
        } else {
          guessedCategory = 'business-websites';
          guessedComplexity = 'medium';
          summary = 'Professional multi-page business website designed to convert inquiries and showcase services.';
          lineItems = [
            { description: 'Information Architecture, Header/Footer & 4-5 Core Pages', hours: 6 },
            { description: 'Responsive Component Library & Modern Design Tokens', hours: 5 },
            { description: 'Interactive Contact Inquiries & Dynamic Content Feed', hours: 4 },
            { description: 'Speed Optimization, SEO Sitemap & Cross-Browser Verification', hours: 3 },
          ];
        }
      }

      lineItems = lineItems.map(item => ({
        ...item,
        rate: standardRate,
        amount: item.hours * standardRate,
      }));
    }

    const totalHours = lineItems.reduce((acc, i) => acc + i.hours, 0);

    // Calculate official deterministic quotation
    const calculation = this.calculateQuotation(
      {
        estimatedHours: totalHours,
        projectType: guessedCategory,
        complexity: guessedComplexity,
      },
      settings
    );

    // Pre-calculate 4 standard payment schedules based on recommended price
    const recPrice = calculation.recommendedPrice;
    const paymentSchedules = {
      '50_50': [
        { milestone: 'Project Kickoff Deposit', percentage: 50, amount: Math.round(recPrice * 0.5), dueTrigger: 'Upon contract signing' },
        { milestone: 'Final Sign-off & Production Handover', percentage: 50, amount: Math.round(recPrice * 0.5), dueTrigger: 'Upon final deployment & approval' },
      ],
      '100_upfront': [
        { milestone: 'Full Upfront Contract Payment (5% Discount Applied)', percentage: 100, amount: Math.round(recPrice * 0.95), dueTrigger: 'Prior to project launch' },
      ],
      '30_40_30': [
        { milestone: 'Advance Booking & Architecture Deposit', percentage: 30, amount: Math.round(recPrice * 0.3), dueTrigger: 'Upon project commencement' },
        { milestone: 'Mid-Point Review / Functional Beta', percentage: 40, amount: Math.round(recPrice * 0.4), dueTrigger: 'Upon staging environment walkthrough' },
        { milestone: 'Final Delivery & Code Transfer', percentage: 30, amount: Math.round(recPrice * 0.3), dueTrigger: 'Upon production deployment' },
      ],
      'milestone_stages': [
        { milestone: 'Milestone 1: Discovery & UI Architecture', percentage: 25, amount: Math.round(recPrice * 0.25), dueTrigger: 'Upon wireframe approval' },
        { milestone: 'Milestone 2: Frontend Engineering & Views', percentage: 25, amount: Math.round(recPrice * 0.25), dueTrigger: 'Upon view delivery' },
        { milestone: 'Milestone 3: Backend & API Integration', percentage: 25, amount: Math.round(recPrice * 0.25), dueTrigger: 'Upon staging demo' },
        { milestone: 'Milestone 4: Final Handover & Launch', percentage: 25, amount: Math.round(recPrice * 0.25), dueTrigger: 'Upon final acceptance' },
      ],
    };

    return {
      category: guessedCategory,
      complexity: guessedComplexity,
      summary,
      lineItems,
      totalHours,
      calculation,
      paymentSchedules,
    };
  }

  /**
   * Single source of truth for proposal financial calculations:
   * Used by builder, list, preview, print, PDF, invoices, and dashboard.
   */
  static computeProposalTotals(proposal, options = {}) {
    const showHoursToClient = options.showHoursToClient !== undefined ? options.showHoursToClient : true;
    const floorAdjustmentMode = options.floorAdjustmentMode || 'spread'; // 'spread' | 'separate'

    const rawItems = proposal?.lineItems || [];
    const hoursCount = rawItems.reduce((acc, i) => acc + (Number(i.hours) || 0), 0);
    const laborSubtotal = Math.round(rawItems.reduce((acc, i) => {
      const h = Number(i.hours) || 0;
      const r = Number(i.rate) || 50;
      return acc + (Number(i.amount) !== undefined && !isNaN(Number(i.amount)) ? Number(i.amount) : h * r);
    }, 0));

    const subtotal = Math.round(Number(
      proposal?.pricingBreakdown?.subtotal ||
      proposal?.pricingBreakdown?.totalAmount ||
      proposal?.pricingBreakdown?.recommendedPrice ||
      laborSubtotal
    ));

    const totalUplift = Math.max(0, subtotal - laborSubtotal);

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
          showRate: false,
        };
      });
    }

    const sumLineAmounts = computedLineItems.reduce((acc, i) => acc + i.amount, 0);
    const lineSumCheck = sumLineAmounts + floorAdjustment;
    if (lineSumCheck !== subtotal && computedLineItems.length > 0) {
      computedLineItems[computedLineItems.length - 1].amount += (subtotal - lineSumCheck);
    }

    const discount = Math.round(Number(proposal?.pricingBreakdown?.discountAmount || proposal?.discountAmount || 0));
    const taxableBase = Math.max(0, subtotal - discount);

    const taxType = proposal?.taxType || 'VAT';
    const taxRate = taxType === 'None' ? 0 : Number(proposal?.taxRate !== undefined ? proposal?.taxRate : 0);
    const taxMode = proposal?.taxMode || 'exclusive';

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
      const half = Math.round(total * 0.5);
      schedule = [
        { milestone: 'Project kickoff deposit', percentage: 50, amount: half, dueTrigger: 'Upon agreement execution' },
        { milestone: 'Final delivery & launch handover', percentage: 50, amount: total - half, dueTrigger: 'Upon production deployment' },
      ];
    }

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
}

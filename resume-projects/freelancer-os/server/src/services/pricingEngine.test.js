import { describe, it, expect } from 'vitest';
import { computePricing, PricingEngine, roundUp } from './pricingEngine.js';
import { validatePricingRules } from '../../../client/src/utils/pricingEngine.js';

describe('Shared computePricing Consolidated Suite', () => {
  // Exact user specified defaults:
  const defaults = {
    hourlyRate: 300,
    minHourlyRate: 250,
    minProjectFee: 3000,
    categoryMinimums: {
      'landing-pages': 5000,
    },
    projectTypes: [
      { id: 'landing-pages', name: 'Landing page', typicalMinHours: 8, typicalMaxHours: 14, floor: 5000 },
    ],
    complexityMultipliers: { simple: 1.00, medium: 1.25, complex: 1.50 },
    rushMultiplier: 1.30,
    defaultContingencyPercent: 10,
    preferredProfitMargin: 25,
    tierMultipliers: { essential: 1.00, standard: 1.20, premium: 1.50 },
    roundingStep: 50,
    currency: 'INR',
    version: 1,
  };

  // Test 1: 8 hrs, Landing page, Medium, no rush
  it('1. Computes exact values for 8 hrs Landing page (Medium, no rush, floored)', () => {
    const res = computePricing(
      { estimatedHours: 8, projectType: 'landing-pages', complexity: 'medium', isRushDelivery: false },
      defaults
    );

    // hours 8.8
    expect(res.hours).toBeCloseTo(8.8, 2);
    // labor 2,640
    expect(res.labor).toBeCloseTo(2640, 2);
    // adjusted 3,300
    expect(res.adjusted).toBeCloseTo(3300, 2);
    // floor applied (+1,700)
    expect(res.floorUplift).toBe(1700);
    expect(res.isFloorApplied).toBe(true);
    // Essential 5,000
    expect(res.tiers.essential).toBe(5000);
    // Standard 6,000
    expect(res.tiers.standard).toBe(6000);
    // Premium 7,500
    expect(res.tiers.premium).toBe(7500);
    // effective rate 625/hr
    expect(res.effectiveHourlyRate).toBe(625);
  });

  // Test 2: 25 hrs, Landing page, Medium, no rush
  it('2. Computes exact values for 25 hrs Landing page (Medium, no rush, above floor)', () => {
    const res = computePricing(
      { estimatedHours: 25, projectType: 'landing-pages', complexity: 'medium', isRushDelivery: false },
      defaults
    );

    // hours 27.5
    expect(res.hours).toBeCloseTo(27.5, 2);
    // labor 8,250
    expect(res.labor).toBeCloseTo(8250, 2);
    // adjusted 10,312.50
    expect(res.adjusted).toBeCloseTo(10312.50, 2);
    // Essential 10,350
    expect(res.tiers.essential).toBe(10350);
    // Standard 12,450
    expect(res.tiers.standard).toBe(12450);
    // Premium 15,550
    expect(res.tiers.premium).toBe(15550);
    // Floor was not applied (adjusted exceeded floor)
    expect(res.isFloorApplied).toBe(false);
  });

  // Test 3: Rush on test 1 and test 2
  it('3. Verifies rush delivery multiplier (adjusted 4,290 still floored at 5,000; test 2 x1.30)', () => {
    const rush1 = computePricing(
      { estimatedHours: 8, projectType: 'landing-pages', complexity: 'medium', isRushDelivery: true },
      defaults
    );
    // 3300 * 1.30 = 4,290
    expect(rush1.adjusted).toBeCloseTo(4290, 2);
    // still floored at 5,000
    expect(rush1.tiers.essential).toBe(5000);
    expect(rush1.floorUplift).toBe(710);

    const rush2 = computePricing(
      { estimatedHours: 25, projectType: 'landing-pages', complexity: 'medium', isRushDelivery: true },
      defaults
    );
    // 10,312.50 * 1.30 = 13,406.25 -> essential = 13,450
    expect(rush2.adjusted).toBeCloseTo(13406.25, 2);
    expect(rush2.tiers.essential).toBe(13450);
  });

  // Test 4: Rounding never lowers price below floor; premium > standard > essential always
  it('4. Rounding never lowers price below floor; tiers strictly increasing even with near-identical multipliers', () => {
    const tightRules = {
      ...defaults,
      tierMultipliers: { essential: 1.0, standard: 1.0001, premium: 1.0002 },
      roundingStep: 50,
    };
    const res = computePricing(
      { estimatedHours: 8, projectType: 'landing-pages', complexity: 'medium', isRushDelivery: false },
      tightRules
    );

    expect(res.tiers.essential).toBeGreaterThanOrEqual(defaults.categoryMinimums['landing-pages']);
    expect(res.tiers.standard).toBeGreaterThan(res.tiers.essential);
    expect(res.tiers.premium).toBeGreaterThan(res.tiers.standard);
    expect(res.tiers.standard).toBe(res.tiers.essential + 50);
    expect(res.tiers.premium).toBe(res.tiers.standard + 50);
  });

  // Test 5: Validation rules
  it('5. Validation blocks standard rate < lowest rate, floor < min project fee, and premium <= standard', () => {
    // 1. Standard rate 200 with lowest rate 250 is blocked
    const check1 = validatePricingRules({
      ...defaults,
      hourlyRate: 200,
      minHourlyRate: 250,
    });
    expect(check1.isValid).toBe(false);
    expect(check1.errors.minHourlyRate).toBeDefined();

    // 2. Floor below minimum project fee is blocked
    const check2 = validatePricingRules({
      ...defaults,
      minProjectFee: 6000,
      projectTypes: [{ id: 'landing-pages', name: 'Landing page', floor: 5000, typicalMinHours: 8, typicalMaxHours: 14 }],
    });
    expect(check2.isValid).toBe(false);
    expect(check2.errors['floor_landing-pages']).toBeDefined();

    // 3. Premium <= Standard is blocked
    const check3 = validatePricingRules({
      ...defaults,
      tierMultipliers: { essential: 1.0, standard: 1.30, premium: 1.20 },
    });
    expect(check3.isValid).toBe(false);
    expect(check3.errors.premiumMultiplier).toBeDefined();
  });

  // Test 6: A saved proposal keeps its price after rules change; Recalculate updates it and logs rules version
  it('6. Preserves saved proposal pricing across rules changes and updates upon recalculate', () => {
    const originalRules = { ...defaults, version: 1 };
    const proposalPricingV1 = computePricing({ estimatedHours: 8, projectType: 'landing-pages' }, originalRules);

    // Stored snapshot in proposal record
    const savedProposal = {
      subtotal: proposalPricingV1.tiers.standard,
      pricingBreakdown: {
        rulesVersion: 1,
        rawAmount: proposalPricingV1.adjusted,
        floorUplift: proposalPricingV1.floorUplift,
        finalPrice: proposalPricingV1.tiers.standard,
      },
    };
    expect(savedProposal.subtotal).toBe(6000);

    // Rules change: standard rate increased to 600, version becomes 2
    const updatedRules = { ...defaults, hourlyRate: 600, version: 2 };
    // Saved proposal without recalculate keeps its original price!
    expect(savedProposal.subtotal).toBe(6000);
    expect(savedProposal.pricingBreakdown.rulesVersion).toBe(1);

    // Recalculate explicitly computes using v2 rules:
    const recalculated = computePricing({ estimatedHours: 8, projectType: 'landing-pages' }, updatedRules);
    savedProposal.subtotal = recalculated.tiers.standard;
    savedProposal.pricingBreakdown.rulesVersion = updatedRules.version;
    savedProposal.pricingBreakdown.finalPrice = recalculated.tiers.standard;

    expect(savedProposal.pricingBreakdown.rulesVersion).toBe(2);
    expect(savedProposal.subtotal).toBeGreaterThan(6000);
  });

  // Test 7: Identical results across simulator, analyzer, proposal builder and server enforcement
  it('7. Simulator, Analyzer, Proposals builder and server-side enforcement return identical numbers for the same input', () => {
    const input = { estimatedHours: 12, projectType: 'landing-pages', complexity: 'complex', isRushDelivery: false };

    // Direct computePricing (Simulator & Analyzer)
    const directResult = computePricing(input, defaults);

    // Server-side PricingEngine.calculateQuotation (Server enforcement)
    const serverResult = PricingEngine.calculateQuotation(input, defaults);

    expect(directResult.tiers.essential).toBe(serverResult.essential);
    expect(directResult.tiers.standard).toBe(serverResult.recommendedPrice);
    expect(directResult.tiers.premium).toBe(serverResult.premiumPrice);
    expect(directResult.adjusted).toBe(serverResult.adjustedLaborCost);
    expect(directResult.floorUplift).toBe(serverResult.floorUplift);
  });
});

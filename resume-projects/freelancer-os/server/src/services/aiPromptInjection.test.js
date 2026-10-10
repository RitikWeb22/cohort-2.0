import { describe, it, expect } from 'vitest';
import { computePricing } from './pricingEngine.js';
import { AIRequirementAnalyzer } from './aiAnalyzer.js';

describe('AI Prompt Injection & Floor Resilience Safeguards', () => {
  it('cannot bypass configured pricing floor via prompt injection attempting to force $1 quote', () => {
    // Malicious brief input designed to hijack scoping and pricing
    const injectedScoping = {
      projectTitle: 'Injected Test Project',
      projectType: 'landing-pages',
      estimatedHours: 0.001, // Injected near-zero effort
      complexity: 'simple',
      isRushDelivery: false,
    };

    // User's configured safety floor: $500 min project fee
    const userPricingRules = {
      hourlyRate: 75,
      minHourlyRate: 50,
      minProjectFee: 500,
      categoryMinimums: {
        'landing-pages': 500,
      },
      tierMultipliers: { essential: 1.0, standard: 1.25, premium: 1.6 },
      roundingStep: 50,
      currency: 'USD',
    };

    const quote = computePricing(injectedScoping, userPricingRules);

    // Assert that the deterministic engine rejected the $1 override and enforced the floor
    expect(quote.isFloorApplied).toBe(true);
    expect(quote.tiers.essential).toBe(500); // Floor strictly enforced at configured $500
    expect(quote.tiers.standard).toBeGreaterThan(500);
    expect(quote.tiers.premium).toBeGreaterThan(quote.tiers.standard);

    // Absolute immunity: quote is NEVER $1 or anywhere near $1
    expect(quote.tiers.essential).not.toBe(1);
  });

  it('rejects malformed or unvalidated AI JSON output safely via schema validator', () => {
    expect(AIRequirementAnalyzer.validateAnalysisSchema(null)).toBe(false);
    expect(AIRequirementAnalyzer.validateAnalysisSchema({})).toBe(false);
    expect(AIRequirementAnalyzer.validateAnalysisSchema({ projectTitle: '' })).toBe(false);
    expect(AIRequirementAnalyzer.validateAnalysisSchema({
      projectTitle: 'Valid Title',
      pagesAndFeatures: [] // empty tasks rejected
    })).toBe(false);
    expect(AIRequirementAnalyzer.validateAnalysisSchema({
      projectTitle: 'Valid Title',
      pagesAndFeatures: [{ name: 'Task 1', hours: 'not a number' }]
    })).toBe(false);

    // Valid schema passes
    expect(AIRequirementAnalyzer.validateAnalysisSchema({
      projectTitle: 'Valid Title',
      pagesAndFeatures: [{ name: 'Task 1', hours: 4 }]
    })).toBe(true);
  });
});

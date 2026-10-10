import { describe, it, expect } from 'vitest';
import { computePricing, roundUp } from './pricingEngine.js';

describe('Pricing Pipeline & Floor Enforcement Suite', () => {
  const samplePricingRules = {
    hourlyRate: 50,
    minHourlyRate: 40,
    minProjectFee: 1500,
    categoryMinimums: {
      'landing-pages': 1500,
    },
    projectTypes: [
      { id: 'landing-pages', name: 'Landing Page', floor: 1500 },
    ],
    complexityMultipliers: { simple: 1.0, medium: 1.25, complex: 1.5 },
    rushMultiplier: 1.3,
    tierMultipliers: { essential: 1.0, standard: 1.25, premium: 1.6 },
    roundingStep: 50,
    currency: 'USD',
  };

  it('strictly enforces Essential < Standard < Premium when base labor is below the floor', () => {
    // 8 hours @ $50/hr = $400 base labor. Floor is $1,500.
    const result = computePricing(
      {
        estimatedHours: 8,
        complexity: 'simple',
        projectType: 'landing-pages',
        isRushDelivery: false,
      },
      samplePricingRules
    );

    // Floor is applied to Essential tier
    expect(result.isFloorApplied).toBe(true);
    expect(result.tiers.essential).toBe(1500);

    // Standard must be higher than Essential
    expect(result.tiers.standard).toBeGreaterThan(result.tiers.essential);

    // Premium must be higher than Standard
    expect(result.tiers.premium).toBeGreaterThan(result.tiers.standard);

    // Strict monotonic ordering: Essential < Standard < Premium
    expect(result.tiers.essential).toBeLessThan(result.tiers.standard);
    expect(result.tiers.standard).toBeLessThan(result.tiers.premium);
  });

  it('never bypasses floor fee even when low hours, zero rush, or low complexity are passed', () => {
    // 2 hours = $100 labor
    const result = computePricing(
      {
        estimatedHours: 2,
        complexity: 'simple',
        projectType: 'landing-pages',
      },
      samplePricingRules
    );

    expect(result.tiers.essential).toBeGreaterThanOrEqual(1500);
    expect(result.floorUplift).toBeGreaterThan(0);
  });

  it('correctly rounds up to specified rounding steps', () => {
    expect(roundUp(101, 50)).toBe(150);
    expect(roundUp(150, 50)).toBe(150);
    expect(roundUp(151, 50)).toBe(200);
    expect(roundUp(12, 5)).toBe(15);
    expect(roundUp(0, 50)).toBe(0);
  });
});

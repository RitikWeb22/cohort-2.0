import { describe, it, expect } from 'vitest';
import { AIRequirementAnalyzer } from './aiAnalyzer.js';
import { computePricing } from './pricingEngine.js';
import { config } from '../config/env.js';

describe('Group 4: AI Engine Hygiene & Valid Model Cascades Suite', () => {
  describe('AI-01: Fictitious Model Removal', () => {
    it('verifies that no fictitious gemini-3.8-flash is configured anywhere in the model cascade', () => {
      // Config check
      expect(config.aiPrimaryModel).not.toBe('gemini-3.8-flash');
      expect(config.aiFallbackModel).not.toBe('gemini-3.8-flash');
      expect(config.geminiModel).not.toBe('gemini-3.8-flash');
    });

    it('successfully falls back to deterministic analysis pipeline without throwing when Gemini key is missing', async () => {
      const originalKey = config.geminiApiKey;
      config.geminiApiKey = '';

      try {
        const result = await AIRequirementAnalyzer.analyze({
          rawText: 'Build a modern 1-page landing page for my consulting practice with a contact form and pricing table.',
          projectType: 'landing_page',
          field: 'web_developer',
        });

        expect(result).toBeDefined();
        expect(result.projectTitle).toBeDefined();
        expect(result.estimatedHours).toBeGreaterThan(0);
        expect(result.functionalRequirements).toBeInstanceOf(Array);
        expect(result.functionalRequirements.length).toBeGreaterThan(0);
        expect(result.suggestedMilestones).toBeInstanceOf(Array);
        // Landing page shouldn't estimate unrealistic 50+ hours
        expect(result.estimatedHours).toBeLessThanOrEqual(30);
      } finally {
        config.geminiApiKey = originalKey;
      }
    });

    it('computes realistic pricing with deterministic floor enforcement', () => {
      const pricing = computePricing(
        { estimatedHours: 12, complexity: 'medium', projectType: 'landing-pages' },
        { hourlyRate: 60, minHourlyRate: 40, minProjectFee: 300, currency: 'USD' }
      );

      expect(pricing.tiers.standard).toBeGreaterThan(300);
      expect(pricing.tiers.essential).toBeGreaterThanOrEqual(300);
      expect(pricing.tiers.premium).toBeGreaterThan(pricing.tiers.standard);
    });
  });
});

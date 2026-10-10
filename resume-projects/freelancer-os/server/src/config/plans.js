/**
 * Floorly SaaS Subscription Plans Configuration
 * English-first & Global USD Pricing
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Starter',
    tagline: 'Best for getting started',
    monthlyPriceUSD: 0,
    annualMonthlyPriceUSD: 0,
    maxClients: 2,
    features: [
      '2 Active Clients Limit',
      'Standard Requirement Analyzer',
      'Manual Payment Logging',
      'Basic Proposals & Invoicing',
      'Deterministic Pricing Floor',
    ],
  },
  solo: {
    id: 'solo',
    name: 'Solo',
    tagline: 'For independent freelancers',
    monthlyPriceUSD: 9,
    annualMonthlyPriceUSD: 7.50,
    annualBilledUSD: 90,
    maxClients: 10,
    features: [
      'Unlimited Proposals & Quotations',
      'Strict Floor Guard Protection',
      'Invoices & Payment Tracking',
      'PayPal & Bank Wire Instructions',
      'Client-specific AGENTS.md Generator',
      'Print-ready A4 PDF Documents',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For ambitious independent builders',
    monthlyPriceUSD: 19,
    annualMonthlyPriceUSD: 15.80,
    annualBilledUSD: 190,
    maxClients: Infinity,
    features: [
      'Unlimited Clients & Projects',
      'Autonomous AI Scoping & Analyzer',
      'Client-specific AGENTS.md Generator',
      'Stripe & Global Payment Links',
      'Live Profit & Net Margin Analytics',
      'Multi-currency PDF Proposals & SOW',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    tagline: 'For high-volume studios & teams',
    monthlyPriceUSD: 49,
    annualMonthlyPriceUSD: 40.70,
    annualBilledUSD: 488,
    maxClients: Infinity,
    features: [
      'Everything in Pro Plan',
      'Team Members & Multi-seat Access',
      'White-label Proposals (Custom Branding)',
      'Multi-currency International Payments',
      'Custom Margin Rules & Overhead Multipliers',
      'Priority 24/7 AI Processing',
    ],
  },
};

/**
 * Floorly SaaS Subscription Plans Configuration
 * Unified configuration shared across marketing and application workspace.
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Starter',
    tagline: 'Try the workflow on your first clients.',
    monthly: 0,
    annual: 0,
    maxClients: 2,
    features: [
      '2 active clients',
      'Standard requirement analyzer',
      'Manual payment logging',
      'Basic proposals and invoices',
    ],
    cta: 'Start free',
    popular: false,
  },
  solo: {
    id: 'solo',
    name: 'Solo',
    tagline: 'For independents sending proposals every week.',
    monthly: 9,
    annual: 7.5,
    maxClients: 10,
    features: [
      'Unlimited proposals',
      'Price floor protection',
      'Invoices and payment tracking',
      'AGENTS.md generator',
      'Multi-currency and tax',
    ],
    cta: 'Choose Solo',
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For ambitious builders with a full pipeline.',
    monthly: 19,
    annual: 15.8,
    maxClients: Infinity,
    features: [
      'Unlimited clients',
      'Autonomous AI analyzer',
      'PDF proposals and SOW',
      'AGENTS.md generator',
      'Profit analytics',
    ],
    cta: 'Choose Pro',
    popular: true,
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    tagline: 'For studios with a team and brand to protect.',
    monthly: 49,
    annual: 40.7,
    maxClients: Infinity,
    features: [
      'Everything in Pro',
      'Team members',
      'White-label proposals',
      'Custom margin rules',
      'Priority AI processing',
    ],
    cta: 'Choose Agency',
    popular: false,
  },
};

export const PRICING_PLANS = Object.values(PLANS);

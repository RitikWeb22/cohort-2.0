import { Client } from '../models/Client.js';
import { Proposal } from '../models/Proposal.js';
import { Project } from '../models/Project.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { RequirementAnalysis } from '../models/RequirementAnalysis.js';
import { ActivityLog } from '../models/ActivityLog.js';

export async function clearDemoData(userId) {
  await Promise.all([
    Client.deleteMany({ userId, isDemo: true }),
    Proposal.deleteMany({ userId, isDemo: true }),
    Project.deleteMany({ userId, isDemo: true }),
    Invoice.deleteMany({ userId, isDemo: true }),
    Payment.deleteMany({ userId, isDemo: true }),
    Expense.deleteMany({ userId, isDemo: true }),
    RequirementAnalysis.deleteMany({ userId, isDemo: true }),
    ActivityLog.deleteMany({ userId, action: { $in: ['LOAD_DEMO_DATA', 'RECORD_PAYMENT', 'ACCEPT_PROPOSAL'] } }),
  ]);
}

export const clearUserData = clearDemoData;

export async function hasDemoData(userId) {
  const [c, p, i] = await Promise.all([
    Client.exists({ userId, isDemo: true }),
    Proposal.exists({ userId, isDemo: true }),
    Invoice.exists({ userId, isDemo: true }),
  ]);
  return !!(c || p || i);
}

export async function hasRealInvoices(userId) {
  const exists = await Invoice.exists({ userId, isDemo: { $ne: true } });
  return !!exists;
}

export async function loadDemoData(userId, user) {
  // Clear any existing demo data first (never touch real user records)
  await clearDemoData(userId);

  const currency = user.currency || 'USD';

  // 1. Create 5 Realistic International Clients
  const clientsData = [
    {
      userId,
      name: 'Sarah Jenkins',
      company: 'Apex Digital Ltd',
      email: 's.jenkins@apexdigital.co.uk',
      phone: '+44 20 7946 0912',
      country: 'United Kingdom',
      currency: 'GBP',
      status: 'active',
      notes: 'Leading UK retail agency requiring Next.js e-commerce architecture.',
    },
    {
      userId,
      name: 'Marcus Lindqvist',
      company: 'Nordic Horizon AB',
      email: 'marcus@nordichorizon.se',
      phone: '+46 8 123 4567',
      country: 'Sweden',
      currency: 'EUR',
      status: 'active',
      notes: 'Stockholm B2B logistics SaaS platform; long-term engineering contract.',
    },
    {
      userId,
      name: 'Elena Rostova',
      company: 'Vanguard Fintech Inc',
      email: 'elena@vanguardfintech.io',
      phone: '+1 (415) 555-0199',
      country: 'United States',
      currency: 'USD',
      status: 'lead',
      notes: 'San Francisco financial technology startup evaluating AI copilot integration.',
    },
    {
      userId,
      name: 'David Chen',
      company: 'Nexus AI Labs',
      email: 'david@nexuslabs.sg',
      phone: '+65 6789 0123',
      country: 'Singapore',
      currency: 'SGD',
      status: 'completed',
      notes: 'Brand and web application successfully launched. Project wrapped up.',
    },
    {
      userId,
      name: 'Sophia Miller',
      company: 'BrightWave Media',
      email: 'sophia@brightwave.com.au',
      phone: '+61 2 9876 5432',
      country: 'Australia',
      currency: 'AUD',
      status: 'active',
      notes: 'High-growth media publication requiring custom headless CMS storefront.',
    },
  ];

  const clients = await Client.insertMany(clientsData.map((c) => ({ ...c, isDemo: true })));
  const [sarah, marcus, elena, david, sophia] = clients;

  // 2. Create 7 Realistic Proposals with unique sequential IDs
  const proposalsData = [
    {
      userId,
      clientId: sarah._id,
      proposalNumber: 'PROP-2026-001',
      title: 'E-Commerce Re-platforming & Performance Optimization',
      status: 'accepted',
      currency,
      scope: {
        summary: 'Complete migration from legacy WooCommerce to headless Next.js with Stripe Checkout and sub-second load times.',
        deliverables: [
          'Full catalog headless architecture',
          'Automated checkout & webhook processing',
          'Lighthouse score optimization (95+)',
          'Algolia instant search indexing'
        ],
        exclusions: ['Custom 3D model renderings', 'Manual product data re-entry'],
        timeline: '6 weeks',
      },
      pricing: {
        estimatedHours: 64,
        hourlyRate: 50,
        baseLaborCost: 3200,
        adjustedCost: 4000,
        fixedCost: 300,
        subtotal: 4300,
        total: 4800,
        minimumFloor: 3000,
        pricingPackage: 'recommended',
        currency,
        lineItems: [
          { description: 'Headless Next.js Storefront & Component System', estimatedHours: 32, unitRate: 50, total: 1600 },
          { description: 'Stripe Global Checkout & Inventory Sync Webhooks', estimatedHours: 20, unitRate: 50, total: 1000 },
          { description: 'Performance Tuning, SEO Metadata & Core Web Vitals', estimatedHours: 12, unitRate: 50, total: 600 },
        ],
      },
      acceptedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      clientId: marcus._id,
      proposalNumber: 'PROP-2026-002',
      title: 'Next.js SaaS Portal & Role-Based Dashboard',
      status: 'accepted',
      currency,
      scope: {
        summary: 'Multi-tenant enterprise dashboard featuring real-time telemetry, role-based access control, and team management.',
        deliverables: [
          'Tenant organization isolation',
          'Role-based permissions & audit logging',
          'Interactive analytics with Recharts',
          'REST API and webhook integration'
        ],
        exclusions: ['Native mobile app build'],
        timeline: '8 weeks',
      },
      pricing: {
        estimatedHours: 90,
        hourlyRate: 50,
        baseLaborCost: 4500,
        adjustedCost: 5625,
        fixedCost: 400,
        subtotal: 6025,
        total: 6500,
        minimumFloor: 5000,
        pricingPackage: 'recommended',
        currency,
        lineItems: [
          { description: 'Multi-Tenant Authentication & Session Engine', estimatedHours: 28, unitRate: 50, total: 1400 },
          { description: 'Real-time Telemetry & Data Visualizations', estimatedHours: 36, unitRate: 50, total: 1800 },
          { description: 'Tenant Administration & Billing Management', estimatedHours: 26, unitRate: 50, total: 1300 },
        ],
      },
      acceptedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      clientId: elena._id,
      proposalNumber: 'PROP-2026-003',
      title: 'Fintech AI Copilot & Risk Assistant Integration',
      status: 'sent',
      currency,
      scope: {
        summary: 'Intelligent copilot embedded in Vanguard platform to synthesize credit data and highlight fraud flags.',
        deliverables: ['Vector database RAG pipeline', 'Streaming AI response widget', 'Risk alert automation'],
        exclusions: ['Direct automated fund transfers'],
        timeline: '7 weeks',
      },
      pricing: {
        estimatedHours: 110,
        hourlyRate: 50,
        baseLaborCost: 5500,
        adjustedCost: 7150,
        fixedCost: 500,
        subtotal: 7650,
        total: 8200,
        minimumFloor: 5000,
        pricingPackage: 'premium',
        currency,
        lineItems: [
          { description: 'Vector Embeddings & Semantic Search Pipeline', estimatedHours: 45, unitRate: 50, total: 2250 },
          { description: 'Streaming Frontend Copilot Interface', estimatedHours: 35, unitRate: 50, total: 1750 },
          { description: 'Security Hardening, Rate Limiting & Guardrails', estimatedHours: 30, unitRate: 50, total: 1500 },
        ],
      },
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      clientId: david._id,
      proposalNumber: 'PROP-2026-004',
      title: 'High-Conversion Landing Page & Brand System',
      status: 'accepted',
      currency,
      scope: {
        summary: 'Modern marketing site designed to capture developer leads with interactive component demos and rich animations.',
        deliverables: ['Responsive design system', 'Dark mode support', 'Interactive demo sandbox'],
        exclusions: ['Custom blog CMS engine'],
        timeline: '2 weeks',
      },
      pricing: {
        estimatedHours: 25,
        hourlyRate: 50,
        baseLaborCost: 1250,
        adjustedCost: 1500,
        fixedCost: 150,
        subtotal: 1650,
        total: 1800,
        minimumFloor: 1000,
        pricingPackage: 'recommended',
        currency,
        lineItems: [
          { description: 'Design Translation & Tailwind UI Framework', estimatedHours: 15, unitRate: 50, total: 750 },
          { description: 'Interactive Code Playground & Waitlist Capture', estimatedHours: 10, unitRate: 50, total: 500 },
        ],
      },
      acceptedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      clientId: sophia._id,
      proposalNumber: 'PROP-2026-005',
      title: 'Headless Shopify Speed & Checkout Optimization',
      status: 'draft',
      currency,
      scope: {
        summary: 'Mobile-first optimization for Australian retail apparel brand with international currency switching.',
        deliverables: ['Custom cart slideout', 'Multi-currency checkout', 'Instant search modal'],
        exclusions: ['Inventory data migration'],
        timeline: '4 weeks',
      },
      pricing: {
        estimatedHours: 48,
        hourlyRate: 50,
        baseLaborCost: 2400,
        adjustedCost: 3000,
        fixedCost: 200,
        subtotal: 3200,
        total: 3400,
        minimumFloor: 2500,
        pricingPackage: 'recommended',
        currency,
        lineItems: [
          { description: 'Slideout Cart & Bundle Pricing Engine', estimatedHours: 24, unitRate: 50, total: 1200 },
          { description: 'Geo-IP Multi-Currency Selector', estimatedHours: 24, unitRate: 50, total: 1200 },
        ],
      },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      clientId: elena._id,
      proposalNumber: 'PROP-2026-006',
      title: 'Legacy Monolith Refactoring & Security Audit',
      status: 'rejected',
      currency,
      scope: {
        summary: 'Comprehensive audit and code refactor proposal that was declined in favor of the AI Copilot project.',
        deliverables: ['Penetration testing report', 'Modular dependency tree refactor'],
        exclusions: ['Cloud infrastructure migration'],
        timeline: '5 weeks',
      },
      pricing: {
        estimatedHours: 75,
        hourlyRate: 50,
        baseLaborCost: 3750,
        adjustedCost: 5000,
        fixedCost: 300,
        subtotal: 5300,
        total: 5500,
        minimumFloor: 4000,
        pricingPackage: 'starter',
        currency,
        lineItems: [
          { description: 'Comprehensive Static Analysis & Vulnerability Scan', estimatedHours: 35, unitRate: 50, total: 1750 },
          { description: 'Microservice Extraction Roadmap', estimatedHours: 40, unitRate: 50, total: 2000 },
        ],
      },
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      clientId: marcus._id,
      proposalNumber: 'PROP-2026-007',
      title: 'Mobile Web App & Offline Sync Phase 2',
      status: 'sent',
      currency,
      scope: {
        summary: 'Progressive Web App (PWA) extension with background synchronization for field logistics workers.',
        deliverables: ['Offline IndexedDB caching', 'Service worker push notifications', 'QR scanner integration'],
        exclusions: ['App Store and Google Play packaging'],
        timeline: '5 weeks',
      },
      pricing: {
        estimatedHours: 58,
        hourlyRate: 50,
        baseLaborCost: 2900,
        adjustedCost: 3770,
        fixedCost: 250,
        subtotal: 4020,
        total: 4200,
        minimumFloor: 3000,
        pricingPackage: 'recommended',
        currency,
        lineItems: [
          { description: 'Offline Database Sync Engine (IndexedDB)', estimatedHours: 30, unitRate: 50, total: 1500 },
          { description: 'Hardware Camera QR Code Scanning Interface', estimatedHours: 28, unitRate: 50, total: 1400 },
        ],
      },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  const proposals = await Proposal.insertMany(proposalsData.map((p) => ({ ...p, isDemo: true })));
  const [prop1, prop2, prop3, prop4, prop5] = proposals;

  // 3. Create Projects for Accepted Proposals
  const projectsData = [
    {
      userId,
      clientId: sarah._id,
      proposalId: prop1._id,
      title: 'E-Commerce Re-platforming & Performance Optimization',
      status: 'in_progress',
      contractValue: 4800,
      currency,
      startDate: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      milestones: [
        { id: 'm1', title: 'Sprint 1: Storefront Architecture', dueDate: '2026-10-15', status: 'completed', amount: 2400 },
        { id: 'm2', title: 'Sprint 2: Checkout & Production Release', dueDate: '2026-10-30', status: 'in_progress', amount: 2400 },
      ],
      tasks: [
        { id: 't1', title: 'Setup Next.js 14 App Router boilerplate', status: 'done', completed: true, estimatedHours: 12, actualHours: 14 },
        { id: 't2', title: 'Integrate Stripe global payment intents', status: 'done', completed: true, estimatedHours: 16, actualHours: 18 },
        { id: 't3', title: 'Mobile cart slideout & checkout drawer', status: 'in_progress', completed: false, estimatedHours: 14, actualHours: 8 },
        { id: 't4', title: 'Core Web Vitals tuning & CDN edge caching', status: 'todo', completed: false, estimatedHours: 10, actualHours: 0 },
      ],
      notes: 'Weekly standup on Mondays at 10:00 AM BST. Sarah requested demo video of Stripe webhooks.',
    },
    {
      userId,
      clientId: marcus._id,
      proposalId: prop2._id,
      title: 'Next.js SaaS Portal & Role-Based Dashboard',
      status: 'in_progress',
      contractValue: 6500,
      currency,
      startDate: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      milestones: [
        { id: 'm1', title: 'Sprint 1: Auth & Multi-Tenancy', dueDate: '2026-10-10', status: 'completed', amount: 3250 },
        { id: 'm2', title: 'Sprint 2: Analytics & Reporting Suite', dueDate: '2026-11-15', status: 'in_progress', amount: 3250 },
      ],
      tasks: [
        { id: 't1', title: 'Design PostgreSQL schema & migrations', status: 'done', completed: true, estimatedHours: 20, actualHours: 22 },
        { id: 't2', title: 'JWT tenant isolation middleware', status: 'done', completed: true, estimatedHours: 18, actualHours: 20 },
        { id: 't3', title: 'Telemetry charts with Recharts & TanStack Query', status: 'in_progress', completed: false, estimatedHours: 24, actualHours: 12 },
        { id: 't4', title: 'Export PDF & CSV audit logs', status: 'todo', completed: false, estimatedHours: 16, actualHours: 0 },
      ],
      notes: 'Marcus requested ISO 27001 compliant audit logging on all permission modifications.',
    },
    {
      userId,
      clientId: david._id,
      proposalId: prop4._id,
      title: 'High-Conversion Landing Page & Brand System',
      status: 'completed',
      contractValue: 1800,
      currency,
      startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      milestones: [
        { id: 'm1', title: 'Phase 1: Design to Code', dueDate: '2026-09-15', status: 'completed', amount: 900 },
        { id: 'm2', title: 'Phase 2: Final Launch & SEO Audit', dueDate: '2026-09-28', status: 'completed', amount: 900 },
      ],
      tasks: [
        { id: 't1', title: 'Tailwind UI component system setup', status: 'done', completed: true, estimatedHours: 10, actualHours: 10 },
        { id: 't2', title: 'Framer motion interactive animations', status: 'done', completed: true, estimatedHours: 8, actualHours: 8 },
        { id: 't3', title: 'Vercel edge deployment & custom domain DNS', status: 'done', completed: true, estimatedHours: 2, actualHours: 2 },
      ],
      notes: 'Delivered on time with praise from David Chen. Contract marked completed.',
    },
    {
      userId,
      clientId: sophia._id,
      proposalId: null,
      title: 'Mobile Responsive Overhaul & Performance Audit',
      status: 'in_progress',
      contractValue: 3400,
      currency,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      milestones: [
        { id: 'm1', title: 'Initial Responsive Grid Fixes', dueDate: '2026-10-20', status: 'in_progress', amount: 3400 },
      ],
      tasks: [
        { id: 't1', title: 'Mobile viewport testing across iPhone & Android', status: 'done', completed: true, estimatedHours: 10, actualHours: 10 },
        { id: 't2', title: 'CSS refactor for fluid typography', status: 'in_progress', completed: false, estimatedHours: 8, actualHours: 5 },
      ],
      notes: 'Targeting 90+ Mobile Google PageSpeed score.',
    },
  ];

  const projects = await Project.insertMany(projectsData.map((pr) => ({ ...pr, isDemo: true })));
  const [proj1, proj2, proj3] = projects;

  // 4. Create 5 Invoices Across Varied Statuses (Paid, Partial, Sent/Pending, Overdue)
  const invoicesData = [
    {
      userId,
      clientId: sarah._id,
      projectId: proj1._id,
      invoiceNumber: 'INV-2026-001',
      issueDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'paid',
      currency,
      lineItems: [
        { description: 'Deposit: Storefront Architecture & System Design', quantity: 1, unitPrice: 2400, amount: 2400 },
      ],
      subtotal: 2400,
      taxType: user.taxType || 'VAT',
      taxRate: user.taxRate || 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 2400,
      amountPaid: 2400,
      balanceDue: 0,
      paymentGateway: 'stripe',
      paymentTerms: 'Due on Receipt',
      paymentInstructions: 'Stripe Card Payment',
    },
    {
      userId,
      clientId: marcus._id,
      projectId: proj2._id,
      invoiceNumber: 'INV-2026-002',
      issueDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      status: 'partial',
      currency,
      lineItems: [
        { description: 'Milestone 1: Multi-Tenant Architecture & Database Design', quantity: 1, unitPrice: 3250, amount: 3250 },
      ],
      subtotal: 3250,
      taxType: user.taxType || 'VAT',
      taxRate: user.taxRate || 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 3250,
      amountPaid: 1625,
      balanceDue: 1625,
      paymentGateway: 'bank_transfer',
      paymentTerms: 'Net 30 days',
      paymentInstructions: 'Wise / Wire Transfer (IBAN/SWIFT)',
    },
    {
      userId,
      clientId: david._id,
      projectId: proj3._id,
      invoiceNumber: 'INV-2026-003',
      issueDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      status: 'paid',
      currency,
      lineItems: [
        { description: 'Final Payment: Landing Page Design & Launch', quantity: 1, unitPrice: 1800, amount: 1800 },
      ],
      subtotal: 1800,
      taxType: user.taxType || 'VAT',
      taxRate: user.taxRate || 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 1800,
      amountPaid: 1800,
      balanceDue: 0,
      paymentGateway: 'stripe',
      paymentTerms: 'Net 15 days',
      paymentInstructions: 'Stripe Card Payment',
    },
    {
      userId,
      clientId: sarah._id,
      projectId: proj1._id,
      invoiceNumber: 'INV-2026-004',
      issueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
      status: 'sent',
      currency,
      lineItems: [
        { description: 'Milestone 2: Final Checkout & Production Deployment', quantity: 1, unitPrice: 2400, amount: 2400 },
      ],
      subtotal: 2400,
      taxType: user.taxType || 'VAT',
      taxRate: user.taxRate || 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 2400,
      amountPaid: 0,
      balanceDue: 2400,
      paymentGateway: 'stripe',
      paymentTerms: 'Net 15 days',
      paymentInstructions: 'Stripe or Bank Transfer',
    },
    {
      userId,
      clientId: marcus._id,
      projectId: proj2._id,
      invoiceNumber: 'INV-2026-005',
      issueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Past due date => Overdue!
      status: 'sent', // Will show as overdue because dueDate < now and balanceDue > 0
      currency,
      lineItems: [
        { description: 'Sprint 2 Milestone Retainer Fee', quantity: 1, unitPrice: 1625, amount: 1625 },
      ],
      subtotal: 1625,
      taxType: user.taxType || 'VAT',
      taxRate: user.taxRate || 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 1625,
      amountPaid: 0,
      balanceDue: 1625,
      lateFeeTerms: 'Subject to 1.5% late fee per month overdue.',
      paymentGateway: 'bank_transfer',
      paymentTerms: 'Net 15 days',
      paymentInstructions: 'Wire Transfer / Wise',
    },
  ];

  const invoices = await Invoice.insertMany(invoicesData.map((inv) => ({ ...inv, isDemo: true })));
  const [inv1, inv2, inv3] = invoices;

  // 5. Create Payment Transactions
  const paymentsData = [
    {
      userId,
      invoiceId: inv1._id,
      clientId: sarah._id,
      amount: 2400,
      currency,
      paymentDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      paymentMethod: 'stripe',
      transactionReference: 'ch_3N1Demo001Stripe',
      notes: 'Initial 50% deposit received via Stripe Checkout',
    },
    {
      userId,
      invoiceId: inv2._id,
      clientId: marcus._id,
      amount: 1625,
      currency,
      paymentDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      paymentMethod: 'bank_transfer',
      transactionReference: 'WIRE-SEPA-884920',
      notes: 'Partial advance milestone payment transferred via SEPA wire',
    },
    {
      userId,
      invoiceId: inv3._id,
      clientId: david._id,
      amount: 1800,
      currency,
      paymentDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
      paymentMethod: 'stripe',
      transactionReference: 'ch_3N1Demo003Stripe',
      notes: 'Full balance settled upon project launch',
    },
  ];

  await Payment.insertMany(paymentsData.map((pay) => ({ ...pay, isDemo: true })));

  // 6. Create Categorized Direct Business Expenses
  const expensesData = [
    {
      userId,
      projectId: proj1._id,
      category: 'Hosting & Domains',
      amount: 180,
      currency,
      expenseDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      description: 'AWS ECS & Supabase Cloud Infrastructure (Client Staging)',
      vendor: 'Amazon Web Services',
      billable: false,
    },
    {
      userId,
      category: 'API Credits',
      amount: 125,
      currency,
      expenseDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      description: 'OpenAI GPT-4o & Anthropic Claude 3.5 API inference tokens',
      vendor: 'OpenAI / Anthropic',
      billable: false,
    },
    {
      userId,
      category: 'Software & Tools',
      amount: 79,
      currency,
      expenseDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      description: 'Figma Organization annual team seat & commercial font license',
      vendor: 'Figma Inc',
      billable: false,
    },
    {
      userId,
      projectId: proj2._id,
      category: 'Subcontractors',
      amount: 350,
      currency,
      expenseDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      description: 'Senior Security Specialist Architecture Review & Pen-test',
      vendor: 'Independent Auditor',
      billable: false,
    },
    {
      userId,
      category: 'Office & Admin',
      amount: 45,
      currency,
      expenseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      description: 'Banking cross-border wire transfer & currency exchange fee',
      vendor: 'Wise / Stripe',
      billable: false,
    },
  ];

  await Expense.insertMany(expensesData.map((exp) => ({ ...exp, isDemo: true })));

  // 7. Create Activity Logs
  const activityLogsData = [
    {
      userId,
      action: 'LOAD_DEMO_DATA',
      entityType: 'User',
      entityId: userId.toString(),
      details: 'Loaded complete international demo workspace with 5 clients, 7 proposals, and 5 invoices.',
    },
    {
      userId,
      action: 'RECORD_PAYMENT',
      entityType: 'Invoice',
      entityId: inv1._id.toString(),
      details: `Received full payment of ${currency} 2,400 for invoice INV-2026-001.`,
    },
    {
      userId,
      action: 'ACCEPT_PROPOSAL',
      entityType: 'Proposal',
      entityId: prop1._id.toString(),
      details: `Client Sarah Jenkins approved proposal PROP-2026-001 ($4,800).`,
    },
  ];

  await ActivityLog.insertMany(activityLogsData);

  return {
    success: true,
    message: 'International demo data loaded successfully',
    counts: {
      clients: clients.length,
      proposals: proposals.length,
      projects: projects.length,
      invoices: invoices.length,
      expenses: expensesData.length,
    },
  };
}

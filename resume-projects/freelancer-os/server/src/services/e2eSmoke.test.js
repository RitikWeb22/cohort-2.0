import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { AIRequirementAnalyzer } from './aiAnalyzer.js';
import { computePricing } from './pricingEngine.js';
import { hashShareToken } from '../routes/publicDocuments.js';
import { applyPaymentToInvoice } from './invoiceLedgerTransitions.test.js';

describe('Complete End-to-End Business Flow Smoke Test', () => {
  it('executes the full freelance business lifecycle from brief to reconciled ledger', async () => {
    // 1. User Registration & Identity Setup
    const user = {
      _id: 'user_e2e_smoke_001',
      name: 'Elena Rostova',
      businessName: 'Rostova Product Studio',
      email: 'elena@rostovastudio.com',
      currency: 'USD',
      plan: 'pro',
    };

    // 2. Set Floor Pricing Rules
    const pricingRules = {
      hourlyRate: 75,
      minHourlyRate: 50,
      minProjectFee: 1800,
      categoryMinimums: { 'custom-web-apps': 1800 },
      complexityMultipliers: { simple: 1.0, medium: 1.25, complex: 1.5 },
      tierMultipliers: { essential: 1.0, standard: 1.3, premium: 1.7 },
      roundingStep: 50,
      currency: 'USD',
    };

    // 3. Analyze Client Brief (Deterministic AI pipeline)
    const clientBrief = 'Build an authenticated customer portal with dashboard metrics and stripe billing integration.';
    const analysis = await AIRequirementAnalyzer.analyze({
      rawText: clientBrief,
      projectType: 'custom-web-apps',
      field: 'web_developer',
    });

    expect(analysis).toBeDefined();
    expect(analysis.projectTitle).toBeDefined();
    expect(analysis.estimatedHours).toBeGreaterThan(0);

    // 4. Compute Quotation with Smart Floor Enforcement
    const quote = computePricing(
      {
        estimatedHours: analysis.estimatedHours,
        complexity: analysis.complexity || 'medium',
        projectType: 'custom-web-apps',
      },
      pricingRules
    );

    expect(quote.tiers.essential).toBeGreaterThanOrEqual(pricingRules.minProjectFee);
    const selectedContractAmount = quote.tiers.standard;

    // 5. Generate Client Proposal with Milestones
    const proposal = {
      _id: 'prop_e2e_001',
      userId: user._id,
      title: 'Customer Portal & Billing Integration',
      contractAmount: selectedContractAmount,
      status: 'draft',
      paymentSchedule: [
        { milestone: 'Milestone 1: Architectural Design & Auth', amount: Math.round(selectedContractAmount * 0.5), percentage: 50 },
        { milestone: 'Milestone 2: Final Delivery & Billing Live', amount: Math.round(selectedContractAmount * 0.5), percentage: 50 },
      ],
      shareToken: null,
      shareEnabled: false,
    };

    // 6. Generate Public Unguessable Share Token
    const rawShareToken = 'prop_share_token_' + crypto.randomBytes(16).toString('hex');
    proposal.shareToken = hashShareToken(rawShareToken);
    proposal.shareEnabled = true;
    proposal.status = 'sent';

    expect(proposal.shareToken).toHaveLength(64); // SHA-256 hash length

    // 7. External Client Acceptance Simulation
    const clientAcceptancePayload = {
      acceptedBy: 'Sarah Connor (VP Product)',
      acceptedAt: new Date(),
      acceptedIpHash: crypto.createHash('sha256').update('192.168.1.100').digest('hex'),
    };
    proposal.status = 'accepted';
    proposal.acceptedAt = clientAcceptancePayload.acceptedAt;
    proposal.acceptedBy = clientAcceptancePayload.acceptedBy;

    expect(proposal.status).toBe('accepted');

    // 8. Project Created from Accepted Scope
    const project = {
      _id: 'proj_e2e_001',
      userId: user._id,
      proposalId: proposal._id,
      title: proposal.title,
      totalContractValue: proposal.contractAmount,
      status: 'in_progress',
      milestones: [...proposal.paymentSchedule],
    };

    expect(project.totalContractValue).toBe(selectedContractAmount);

    // 9. Invoice Issued for Milestone 1
    const milestone1 = project.milestones[0];
    const invoice1 = {
      _id: 'inv_e2e_001',
      userId: user._id,
      projectId: project._id,
      invoiceNumber: 'INV-2026-001',
      totalAmount: milestone1.amount,
      amountPaid: 0,
      balanceDue: milestone1.amount,
      status: 'sent',
    };

    expect(invoice1.balanceDue).toBe(milestone1.amount);

    // 10. Record Client Remittance Payment in Ledger
    const paidInvoice = applyPaymentToInvoice(invoice1, milestone1.amount);
    const recordedPayment = {
      _id: 'pay_e2e_001',
      invoiceId: invoice1._id,
      amount: milestone1.amount,
      paymentMethod: 'bank_transfer',
      transactionReference: 'WIRE-US-99882211',
      status: 'cleared',
    };

    expect(paidInvoice.status).toBe('paid');
    expect(paidInvoice.amountPaid).toBe(milestone1.amount);
    expect(paidInvoice.balanceDue).toBe(0);

    // 11. Financial Dashboard Reconciliation Audit
    const totalContractedRevenue = project.totalContractValue;
    const totalInvoiced = paidInvoice.totalAmount;
    const cashCollected = recordedPayment.amount;
    const outstandingReceivables = paidInvoice.balanceDue;

    expect(cashCollected).toBe(paidInvoice.amountPaid);
    expect(outstandingReceivables).toBe(0);
    expect(totalContractedRevenue).toBeGreaterThanOrEqual(totalInvoiced);
    expect(cashCollected).toBe(milestone1.amount);
  });
});

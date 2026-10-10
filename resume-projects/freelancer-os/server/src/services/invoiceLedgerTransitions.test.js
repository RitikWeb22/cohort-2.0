import { describe, it, expect } from 'vitest';

export function applyPaymentToInvoice(invoice, paymentAmount) {
  const amt = Number(paymentAmount);
  if (!amt || amt <= 0) {
    throw new Error('Valid positive payment amount is required');
  }

  if (amt > invoice.balanceDue) {
    throw new Error(`Payment amount (${amt}) exceeds remaining balance due (${invoice.balanceDue})`);
  }

  const newAmountPaid = Math.round(((invoice.amountPaid || 0) + amt) * 100) / 100;
  const newBalanceDue = Math.max(0, Math.round((invoice.totalAmount - newAmountPaid) * 100) / 100);
  const newStatus = newBalanceDue === 0 ? 'paid' : 'partial';

  return {
    ...invoice,
    amountPaid: newAmountPaid,
    balanceDue: newBalanceDue,
    status: newStatus,
  };
}

describe('Invoice Payment Ledger Transitions & Overpayment Protection Suite', () => {
  it('correctly transitions status from sent to partial upon partial payment', () => {
    const invoice = {
      totalAmount: 1000,
      amountPaid: 0,
      balanceDue: 1000,
      status: 'sent',
    };

    const updated = applyPaymentToInvoice(invoice, 400);

    expect(updated.amountPaid).toBe(400);
    expect(updated.balanceDue).toBe(600);
    expect(updated.status).toBe('partial');
  });

  it('correctly transitions status from partial to paid upon clearing remaining balance', () => {
    const invoice = {
      totalAmount: 1000,
      amountPaid: 400,
      balanceDue: 600,
      status: 'partial',
    };

    const updated = applyPaymentToInvoice(invoice, 600);

    expect(updated.amountPaid).toBe(1000);
    expect(updated.balanceDue).toBe(0);
    expect(updated.status).toBe('paid');
  });

  it('strictly rejects overpayment exceeding balance due', () => {
    const invoice = {
      totalAmount: 1000,
      amountPaid: 800,
      balanceDue: 200,
      status: 'partial',
    };

    expect(() => applyPaymentToInvoice(invoice, 250)).toThrow(/exceeds remaining balance due/);
  });

  it('strictly rejects non-positive or zero payment amounts', () => {
    const invoice = {
      totalAmount: 500,
      amountPaid: 0,
      balanceDue: 500,
      status: 'sent',
    };

    expect(() => applyPaymentToInvoice(invoice, 0)).toThrow(/positive payment amount is required/);
    expect(() => applyPaymentToInvoice(invoice, -100)).toThrow(/positive payment amount is required/);
  });
});

import { describe, it, expect } from 'vitest';

export function calculateProposalTotals({ lineItems = [], taxRate = 0, schedulePercentages = [50, 50] }) {
  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || (Number(item.hours) * Number(item.rate)) || 0), 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  // Build milestone schedule
  let allocated = 0;
  const schedule = schedulePercentages.map((pct, idx) => {
    let amount;
    if (idx === schedulePercentages.length - 1) {
      amount = Math.round((totalAmount - allocated) * 100) / 100; // eliminate penny drift
    } else {
      amount = Math.round((totalAmount * (pct / 100)) * 100) / 100;
      allocated += amount;
    }
    return {
      milestone: `Milestone ${idx + 1}`,
      percentage: pct,
      amount,
    };
  });

  return { subtotal, taxAmount, totalAmount, schedule };
}

describe('Proposal Totals & Payment Schedule Calculation Suite', () => {
  it('correctly calculates subtotal, tax, and total amount', () => {
    const lineItems = [
      { description: 'Design Architecture', hours: 10, rate: 100, amount: 1000 },
      { description: 'Frontend Implementation', hours: 25, rate: 100, amount: 2500 },
      { description: 'API Integrations', hours: 15, rate: 100, amount: 1500 },
    ];
    const taxRate = 18; // 18% GST / VAT

    const result = calculateProposalTotals({ lineItems, taxRate });

    expect(result.subtotal).toBe(5000);
    expect(result.taxAmount).toBe(900);
    expect(result.totalAmount).toBe(5900);
  });

  it('guarantees payment schedule sum exactly equals totalAmount with zero drift', () => {
    const lineItems = [
      { description: 'Project Scope', amount: 3333.33 },
    ];
    const taxRate = 10;
    // 3 milestones: 40%, 30%, 30%
    const result = calculateProposalTotals({
      lineItems,
      taxRate,
      schedulePercentages: [40, 30, 30],
    });

    const scheduleSum = result.schedule.reduce((acc, m) => acc + m.amount, 0);
    expect(Math.round(scheduleSum * 100) / 100).toBe(result.totalAmount);
    expect(result.schedule[0].percentage).toBe(40);
    expect(result.schedule[1].percentage).toBe(30);
    expect(result.schedule[2].percentage).toBe(30);
  });
});

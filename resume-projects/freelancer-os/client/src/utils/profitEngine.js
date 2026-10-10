/**
 * Floorly Profit & Expenses Single Source of Truth Engine
 * Used consistently across Expenses & Profit, Dashboard, Projects, and Clients pages.
 */

export const EXPENSE_CATEGORIES = [
  'Software and subscriptions',
  'Hosting and infrastructure',
  'Tools and licenses',
  'Stock assets and fonts',
  'Contractors and freelancers',
  'Advertising and marketing',
  'Travel',
  'Equipment',
  'Fees (payment and bank)',
  'Education',
  'Other',
];

export const LEGACY_CATEGORY_MAP = {
  api_credits: 'Hosting and infrastructure',
  'api credits': 'Hosting and infrastructure',
  'API Credits': 'Hosting and infrastructure',
  'API credits': 'Hosting and infrastructure',
  'API Credits (Maps, LLM, Twilio)': 'Hosting and infrastructure',
  'Api Credits': 'Hosting and infrastructure',
  hosting: 'Hosting and infrastructure',
  'Cloud Hosting & Storage': 'Hosting and infrastructure',
  software: 'Software and subscriptions',
  'Software & Subscriptions': 'Software and subscriptions',
  'Software & Licenses': 'Tools and licenses',
  contractor: 'Contractors and freelancers',
  'Contractor & Freelancer': 'Contractors and freelancers',
  'Subcontractor Assistance': 'Contractors and freelancers',
  domain: 'Hosting and infrastructure',
  'Domain & SSL': 'Hosting and infrastructure',
  other: 'Other',
  'Other Direct Expense': 'Other',
  'Other Out-of-pocket': 'Other',
};

export function normalizeCategory(cat) {
  if (!cat) return 'Software and subscriptions';
  if (LEGACY_CATEGORY_MAP[cat]) return LEGACY_CATEGORY_MAP[cat];
  return cat;
}

/**
 * Calculate hours logged on a project from tasks
 */
export function getProjectLoggedHours(project) {
  if (!project) return 0;
  if (typeof project.actualHours === 'number' && project.actualHours > 0) {
    return project.actualHours;
  }
  const tasks = project.tasks || [];
  let sum = 0;
  for (const t of tasks) {
    if (t.timeEntries && Array.isArray(t.timeEntries) && t.timeEntries.length > 0) {
      sum += t.timeEntries.reduce((acc, te) => acc + (Number(te.hours) || 0), 0);
    } else if (typeof t.actualHours === 'number' && t.actualHours > 0) {
      sum += t.actualHours;
    } else if (t.completed || t.status === 'done') {
      sum += Number(t.estimatedHours) || 0;
    }
  }
  return Math.round(sum * 10) / 10;
}

/**
 * Compute revenue received for an invoice excluding tax
 */
export function getInvoiceExTaxReceived(inv) {
  if (!inv) return 0;
  const total = Number(inv.totalAmount) || 0;
  const paid = Number(inv.amountPaid) || 0;
  if (total <= 0 || paid <= 0) return 0;
  const tax = Number(inv.taxAmount) || 0;
  const netTotal = Math.max(0, total - tax);
  const paidRatio = Math.min(1, paid / total);
  return Math.round(netTotal * paidRatio);
}

/**
 * Compute billed revenue for an invoice excluding tax
 */
export function getInvoiceExTaxBilled(inv) {
  if (!inv) return 0;
  const total = Number(inv.totalAmount) || 0;
  const tax = Number(inv.taxAmount) || 0;
  return Math.max(0, total - tax);
}

/**
 * Compute per-project profitability
 */
export function computeProjectProfitability({
  project,
  invoices = [],
  expenses = [],
  standardHourlyRate = 50,
}) {
  const pId = (project._id || project.id || '').toString();

  // Invoices for this project
  const projectInvoices = invoices.filter((i) => {
    const invProjId = (i.projectId?._id || i.projectId || i.project?._id || i.project || '').toString();
    return invProjId === pId;
  });

  // Revenue = payments received excluding tax
  const revenue = projectInvoices.reduce((sum, inv) => sum + getInvoiceExTaxReceived(inv), 0);

  // Billed revenue (issued invoices excluding tax)
  const billedRevenue = projectInvoices.reduce((sum, inv) => sum + getInvoiceExTaxBilled(inv), 0);

  // Direct costs = project expenses (non-billable + billable not yet re-billed)
  const projectExpenses = expenses.filter((e) => {
    const expProjId = (e.projectId?._id || e.projectId || e.project?._id || e.project || '').toString();
    return expProjId === pId;
  });

  const directCosts = projectExpenses.reduce((sum, e) => {
    const isRebilled = Boolean(e.billedOnInvoice);
    const isBillable = Boolean(e.billableToClient);
    // If not billable -> freelancer cost
    // If billable but not re-billed -> freelancer cost until billed
    if (!isBillable || !isRebilled) {
      return sum + (Number(e.amount) || 0);
    }
    return sum;
  }, 0);

  // Time cost = logged hours * standard hourly rate
  const loggedHours = getProjectLoggedHours(project);
  const rate = Number(standardHourlyRate) || 50;
  const timeCost = Math.round(loggedHours * rate);

  // Gross profit = Revenue - Direct costs
  const grossProfit = Math.round(revenue - directCosts);

  // Net profit = Gross profit - Time cost
  const netProfit = Math.round(grossProfit - timeCost);

  // Margin = Net profit / Revenue (null if revenue is 0)
  const marginPercent = revenue > 0 ? Math.round((netProfit / revenue) * 100) : null;
  const grossMarginPercent = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : null;

  // Effective hourly rate = (Revenue - Direct costs) / logged hours
  const effectiveHourlyRate = loggedHours > 0 ? Math.round((revenue - directCosts) / loggedHours) : 0;
  const rateDifference = effectiveHourlyRate - rate;
  const isBelowStandardRate = loggedHours > 0 && effectiveHourlyRate < rate;

  return {
    projectId: pId,
    projectTitle: project.title || 'Untitled Project',
    clientName: project.client?.company || project.client?.name || project.clientId?.company || project.clientId?.name || '—',
    clientId: project.client?._id || project.client?.id || project.clientId?._id || project.clientId,
    status: project.status || 'in_progress',
    revenue,
    billedRevenue,
    directCosts,
    expensesCount: projectExpenses.length,
    loggedHours,
    standardHourlyRate: rate,
    timeCost,
    grossProfit,
    netProfit,
    marginPercent,
    grossMarginPercent,
    effectiveHourlyRate,
    rateDifference,
    isBelowStandardRate,
  };
}

/**
 * Compute overall metrics for a given set of projects, invoices, and expenses
 */
export function computeProfitMetrics({
  projects = [],
  invoices = [],
  expenses = [],
  standardHourlyRate = 50,
  taxRate = 0,
}) {
  const rate = Number(standardHourlyRate) || 50;

  // Total Revenue = all payments received excluding tax
  const totalRevenue = invoices.reduce((sum, inv) => sum + getInvoiceExTaxReceived(inv), 0);
  const totalBilledRevenue = invoices.reduce((sum, inv) => sum + getInvoiceExTaxBilled(inv), 0);

  // Direct project costs vs General overhead
  let directProjectCosts = 0;
  let overheadCosts = 0;
  let totalExpenses = 0;

  for (const e of expenses) {
    const amt = Number(e.amount) || 0;
    totalExpenses += amt;
    const hasProject = Boolean(e.projectId || e.project);
    if (!hasProject) {
      overheadCosts += amt;
    } else {
      const isRebilled = Boolean(e.billedOnInvoice);
      const isBillable = Boolean(e.billableToClient);
      if (!isBillable || !isRebilled) {
        directProjectCosts += amt;
      }
    }
  }

  // Total hours across projects
  let totalHours = 0;
  const projectBreakdown = projects.map((p) => {
    const breakdown = computeProjectProfitability({
      project: p,
      invoices,
      expenses,
      standardHourlyRate: rate,
    });
    totalHours += breakdown.loggedHours;
    return breakdown;
  });

  const totalTimeCost = Math.round(totalHours * rate);
  const totalCosts = directProjectCosts + overheadCosts;

  // Gross profit = Total Revenue - Total Direct Expenses
  const grossProfit = Math.round(totalRevenue - totalCosts);

  // Net profit = Gross profit - Total Time Cost
  const netProfit = Math.round(grossProfit - totalTimeCost);

  // Margin %
  const marginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : null;
  const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : null;

  // Tax set-aside estimate (applied to positive net profit)
  const taxPercent = Number(taxRate) || 0;
  const estimatedTaxSetAside = taxPercent > 0 && netProfit > 0 ? Math.round(netProfit * (taxPercent / 100)) : 0;

  return {
    revenue: totalRevenue,
    billedRevenue: totalBilledRevenue,
    totalExpenses,
    directProjectCosts,
    overheadCosts,
    totalHours: Math.round(totalHours * 10) / 10,
    standardHourlyRate: rate,
    timeCost: totalTimeCost,
    grossProfit,
    netProfit,
    marginPercent,
    grossMarginPercent,
    estimatedTaxSetAside,
    taxRate: taxPercent,
    projectBreakdown,
  };
}

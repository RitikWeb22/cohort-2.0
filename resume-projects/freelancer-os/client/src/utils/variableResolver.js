/**
 * Variable resolver system for Floorly templates, proposals, PDFs, and message templates.
 */

export const KNOWN_VARIABLES = [
  // Proposal & Clause variables
  { key: 'client_name', label: 'Client contact person', category: 'Client' },
  { key: 'client_company', label: 'Client company name', category: 'Client' },
  { key: 'business_name', label: 'Your studio / business name', category: 'Studio' },
  { key: 'sender_name', label: 'Your personal name', category: 'Studio' },
  { key: 'project_title', label: 'Project title', category: 'Project' },
  { key: 'total', label: 'Total contract amount', category: 'Pricing' },
  { key: 'currency', label: 'Currency symbol or code', category: 'Pricing' },
  { key: 'deposit_percent', label: 'Deposit percentage', category: 'Payment' },
  { key: 'payment_schedule', label: 'Payment schedule description', category: 'Payment' },
  { key: 'payment_terms', label: 'Payment terms (e.g. Net 15)', category: 'Payment' },
  { key: 'valid_days', label: 'Proposal validity in days', category: 'Proposal' },
  { key: 'revision_rounds', label: 'Included revision rounds', category: 'Scope' },
  { key: 'support_days', label: 'Included support days', category: 'Scope' },
  { key: 'review_days', label: 'Client review timeline in days', category: 'Scope' },
  { key: 'late_fee', label: 'Late fee / interest policy', category: 'Payment' },
  { key: 'governing_law', label: 'Governing law / jurisdiction', category: 'Legal' },

  // Message & Invoice variables
  { key: 'invoice_number', label: 'Invoice number', category: 'Invoice' },
  { key: 'due_date', label: 'Payment due date', category: 'Invoice' },
  { key: 'balance_due', label: 'Outstanding balance amount', category: 'Invoice' },
  { key: 'days_overdue', label: 'Days past due', category: 'Invoice' },
  { key: 'payment_link', label: 'Online invoice / proposal URL', category: 'Links' },
];

export const SAMPLE_VARIABLE_DATA = {
  client_name: 'Sarah Jenkins',
  client_company: 'Acme Digital Inc.',
  business_name: 'Studio North',
  sender_name: 'Alex Rivera',
  project_title: 'SaaS Platform Redesign & API',
  total: '$8,500',
  currency: 'USD',
  deposit_percent: '50%',
  payment_schedule: '50% kickoff deposit upon contract execution, 50% upon final delivery and acceptance',
  payment_terms: 'Net 15 days',
  valid_days: '14',
  revision_rounds: '3',
  support_days: '30',
  review_days: '5',
  late_fee: '1.5% monthly interest on overdue balance',
  governing_law: 'the laws of Delaware, USA',
  invoice_number: 'INV-2026-042',
  due_date: 'Nov 15, 2026',
  balance_due: '$4,250',
  days_overdue: '7',
  payment_link: 'https://floorly.app/p/demo-proposal-789',
};

/**
 * Format payment schedule type into natural plain English
 */
export function formatPaymentScheduleText(scheduleType, customRows = null) {
  if (Array.isArray(customRows) && customRows.length > 0) {
    return customRows
      .map((r) => `${r.percentage || r.percent || ''}% ${r.milestone || r.label || 'deliverable'}`)
      .join(', ');
  }

  switch (scheduleType) {
    case '50_50':
      return '50% kickoff deposit upon contract execution, 50% upon final delivery and acceptance';
    case '30_40_30':
      return '30% kickoff deposit upon contract execution, 40% upon beta demonstration, 30% upon final delivery and acceptance';
    case '100_upfront':
      return '100% upfront deposit upon contract execution';
    case '4_milestones':
    case 'milestones_4':
      return '25% kickoff deposit, 25% architecture sign-off, 25% beta demonstration, 25% final delivery and acceptance';
    default:
      return '50% kickoff deposit upon contract execution, 50% upon final delivery';
  }
}

/**
 * Format late fee policy from user settings into readable text
 */
export function formatLateFeeText(user) {
  const type = user?.lateFeeType || 'none';
  const val = user?.lateFeeValue;
  if (type === 'percent' && val) {
    return `${val}% monthly interest on overdue balances`;
  }
  if (type === 'fixed' && val) {
    const curr = user?.currency || 'USD';
    return `${curr} ${val} administrative fee for overdue invoices`;
  }
  return 'no additional late penalty (prompt payment appreciated)';
}

/**
 * Build context object for resolving variables from application state
 */
export function buildVariableContext({ proposal, invoice, user, client, pricingSettings } = {}) {
  const curr = proposal?.currency || invoice?.currency || user?.currency || 'USD';

  // Selected package tier support and revisions
  let revisionRounds = '2';
  let supportDays = '14';
  const tierKey = proposal?.selectedTier || 'standard';
  if (pricingSettings?.packageTiers?.[tierKey]) {
    const t = pricingSettings.packageTiers[tierKey];
    if (t.revisions !== undefined) revisionRounds = String(t.revisions);
    if (t.supportDays !== undefined) supportDays = String(t.supportDays);
  } else if (tierKey === 'standard') {
    revisionRounds = '3';
    supportDays = '30';
  } else if (tierKey === 'premium') {
    revisionRounds = '5';
    supportDays = '60';
  }

  // Deposit percent
  let depositPercent = '50%';
  const schedType = proposal?.paymentScheduleType || user?.defaultDepositSchedule || '50_50';
  if (schedType === '100_upfront') depositPercent = '100%';
  else if (schedType === '30_40_30') depositPercent = '30%';
  else if (schedType === '4_milestones' || schedType === 'milestones_4') depositPercent = '25%';

  // Schedule text
  const scheduleText = formatPaymentScheduleText(schedType, proposal?.paymentSchedule);

  // Total amount
  const totalAmount = proposal?.pricingBreakdown?.totalAmount || proposal?.pricingBreakdown?.subtotal || invoice?.totalAmount || 0;
  const formattedTotal = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 0,
  }).format(Number(totalAmount) || 0);

  // Balance due
  const balanceAmount = invoice?.balanceDue !== undefined ? invoice.balanceDue : totalAmount;
  const formattedBalance = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 0,
  }).format(Number(balanceAmount) || 0);

  // Days overdue
  let daysOverdue = '0';
  if (invoice?.dueDate) {
    const diff = Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000);
    if (diff > 0) daysOverdue = String(diff);
  }

  return {
    client_name: (client?.contactPerson || client?.name || '').trim(),
    client_company: (client?.company || client?.name || '').trim(),
    business_name: (user?.businessName || user?.name || '').trim(),
    sender_name: (user?.name || user?.businessName || '').trim(),
    project_title: (proposal?.title || invoice?.projectTitle || '').replace(/^Proposal:\s*/i, '').trim(),
    total: formattedTotal,
    currency: curr,
    deposit_percent: depositPercent,
    payment_schedule: scheduleText,
    payment_terms: proposal?.paymentTerms || user?.defaultPaymentTerms || 'Net 15 days',
    valid_days: String(proposal?.validForDays || user?.defaultProposalValidityDays || 14),
    revision_rounds: revisionRounds,
    support_days: supportDays,
    review_days: String(user?.reviewDays || 5),
    late_fee: formatLateFeeText(user),
    governing_law: (user?.governingLaw || '').trim(),
    invoice_number: invoice?.invoiceNumber || '',
    due_date: invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    balance_due: formattedBalance,
    days_overdue: daysOverdue,
    payment_link: proposal?.id
      ? `${window.location.origin}/proposals/${proposal.id}`
      : invoice?.id
      ? `${window.location.origin}/invoices/${invoice.id}`
      : '',
  };
}

/**
 * Extract all {{variable_name}} tokens from text
 */
export function extractVariables(text) {
  if (!text) return [];
  const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/^\{\{|\}\}$/g, '').trim()))];
}

/**
 * Resolve variables in a text string.
 * If isPreview is true, falls back to SAMPLE_VARIABLE_DATA for empty values.
 */
export function resolveVariables(text, context = {}, isPreview = false) {
  if (!text) return '';
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    const val = context[key];
    if (val !== undefined && val !== null && val !== '') {
      return val;
    }
    if (isPreview && SAMPLE_VARIABLE_DATA[key] !== undefined) {
      return SAMPLE_VARIABLE_DATA[key];
    }
    return match; // Keep unchanged if not resolved
  });
}

/**
 * Validate that all variables in text are resolved.
 * Returns array of error descriptions for any unfulfilled variable.
 */
export function validateUnresolvedVariables(text, context = {}) {
  const vars = extractVariables(text);
  const errors = [];

  for (const v of vars) {
    const val = context[v];
    if (val === undefined || val === null || val === '') {
      switch (v) {
        case 'governing_law':
          errors.push('Governing law / jurisdiction is missing. Please set it in Settings > Documents first.');
          break;
        case 'client_name':
        case 'client_company':
          errors.push(`Client details are incomplete for {{${v}}}. Select a valid client with contact person.`);
          break;
        case 'payment_schedule':
          errors.push('Payment installment schedule is not configured.');
          break;
        case 'business_name':
        case 'sender_name':
          errors.push('Studio / business name is missing in Settings > Account.');
          break;
        default:
          errors.push(`Variable {{${v}}} could not be resolved.`);
          break;
      }
    }
  }

  return errors;
}

import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { PricingEngine } from './pricingEngine.js';

// Detect system Chrome or Edge on Windows/Linux/Mac
function getBrowserExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // Ignore
    }
  }

  throw new Error('No system Chrome or Edge browser found for PDF generation');
}

/**
 * Format currency helper
 */
function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

/**
 * Format date helper
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Escape HTML to prevent injection
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate PDF buffer using Puppeteer
 */
export async function generateProposalPdf(firstArg, clientArg, userArg, optionsArg = {}) {
  let proposal, client, user, options;
  if (firstArg && typeof firstArg === 'object' && ('proposal' in firstArg || (!clientArg && !userArg))) {
    ({ proposal = firstArg.proposal || firstArg, client = firstArg.client, user = firstArg.user, options = firstArg.options || {} } = firstArg);
  } else {
    proposal = firstArg;
    client = clientArg;
    user = userArg;
    options = optionsArg || {};
  }

  const executablePath = getBrowserExecutablePath();

  const showHoursToClient = options.showHoursToClient !== undefined ? options.showHoursToClient : true;
  const floorAdjustmentMode = options.floorAdjustmentMode || 'spread';
  const pageSize = options.pageSize || (user?.country === 'US' || user?.country === 'CA' ? 'Letter' : 'A4');

  // Compute exact totals via single source of truth
  const totals = PricingEngine.computeProposalTotals(proposal, {
    showHoursToClient,
    floorAdjustmentMode,
  });

  const currency = proposal.currency || user?.currency || 'USD';
  const proposalId = proposal.proposalNumber || 'PROP-DRAFT';
  const businessName = user?.businessName || user?.name || 'Studio Labs';
  const businessEmail = user?.businessEmail || user?.email || '';
  const businessPhone = user?.businessPhone || '';
  const businessAddress = user?.businessAddress || '';
  const taxId = user?.taxId || proposal.taxId || '';
  const taxLabel = user?.taxType || proposal.taxType || 'VAT';
  const logoUrl = proposal?.logoUrl || user?.logoUrl || '';
  const signatureUrl = proposal?.signatureUrl || user?.signatureUrl || '';

  const clientCompany = (client?.company || '').trim();
  const contactPerson = (client?.contactPerson || client?.name || '').trim();
  const clientEmail = (client?.email || '').trim();
  const showAttention = clientCompany && contactPerson && clientCompany.toLowerCase() !== contactPerson.toLowerCase();

  const cleanTitle = (proposal.title || 'Project Scope & Proposal').replace(/^Proposal:\s*/i, '');
  const issueDate = formatDate(proposal.createdAt || new Date());
  const validUntilDate = formatDate(proposal.validUntil);

  const paymentMethod = proposal.paymentMethod || 'stripe';
  const paymentDetails = (proposal.paymentDetails || user?.paymentInstructions || '').trim();
  const hasPaymentDetails = Boolean(paymentDetails);

  const isAgencyPlan = (user?.plan || '').toLowerCase() === 'agency';
  const showWatermark = !isAgencyPlan;

  let sectionNum = 0;
  const nextSection = () => {
    sectionNum += 1;
    return `${sectionNum}.`;
  };

  const exclusions = proposal.exclusions || proposal.analysisId?.exclusions || [];

  // Build the complete, semantic HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proposal-${escapeHtml(proposalId)}-${escapeHtml(clientCompany || contactPerson || 'Client')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Arabic:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageSize};
      margin: 18mm 16mm 20mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background: #ffffff !important;
      color: #0E1A2B;
      font-family: 'Instrument Sans', 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans SC', system-ui, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    h1, h2, h3, .heading-font {
      font-family: 'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif;
      color: #0E1A2B;
    }

    .font-tabular {
      font-variant-numeric: tabular-nums;
    }

    .header-border {
      border-bottom: 2pt solid #0047AB;
      padding-bottom: 16pt;
      margin-bottom: 16pt;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .section-border {
      border-bottom: 0.75pt solid #D9D4C7;
      padding-bottom: 14pt;
      margin-bottom: 14pt;
    }

    .section-heading {
      font-size: 13pt;
      font-weight: 700;
      color: #0E1A2B;
      margin-bottom: 8pt;
      page-break-after: avoid;
      break-after: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-top: 6pt;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background-color: #F3F7FD;
      color: #5B6676;
      font-weight: 600;
      text-align: left;
      padding: 6pt 8pt;
      border-bottom: 1pt solid #D9D4C7;
    }

    td {
      padding: 6.5pt 8pt;
      border-bottom: 0.5pt solid #D9D4C7;
      color: #0E1A2B;
    }

    .text-right {
      text-align: right;
    }

    .text-muted {
      color: #5B6676;
    }

    .box-tint {
      background-color: #F3F7FD;
      border: 0.75pt solid #D9D4C7;
      border-radius: 6pt;
      padding: 10pt 12pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .totals-box {
      max-width: 280pt;
      margin-left: auto;
      margin-top: 8pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .total-line {
      border-top: 1.5pt solid #0047AB;
      padding-top: 6pt;
      margin-top: 6pt;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .total-amount {
      font-size: 17pt;
      font-weight: 800;
      color: #0047AB;
      font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    }

    .signature-grid {
      display: flex;
      justify-content: space-between;
      gap: 24pt;
      margin-top: 12pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sig-col {
      flex: 1;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sig-line {
      height: 36pt;
      border-bottom: 1pt solid #0E1A2B;
      margin-bottom: 6pt;
      display: flex;
      align-items: flex-end;
    }

    .sig-line.dashed {
      border-bottom: 1pt dashed #5B6676;
    }

    .warning-box {
      background-color: #FFF4CC;
      border: 1pt solid #FFC72C;
      border-radius: 6pt;
      padding: 8pt 10pt;
      color: #B54708;
      font-weight: 600;
      font-size: 9pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <!-- Letterhead Header -->
  <header class="header-border">
    <div style="max-width: 60%;">
      ${
        logoUrl
          ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" style="max-height: 32pt; margin-bottom: 6pt;">`
          : `<h1 class="heading-font" style="font-size: 18pt; font-weight: 800; margin-bottom: 2pt;">${escapeHtml(businessName)}</h1>`
      }
      ${businessAddress ? `<p class="text-muted" style="font-size: 8.5pt; white-space: pre-line; line-height: 1.3;">${escapeHtml(businessAddress)}</p>` : ''}
      <div class="text-muted" style="font-size: 8.5pt; margin-top: 3pt;">
        ${businessEmail ? `<span>${escapeHtml(businessEmail)}</span> ` : ''}
        ${businessPhone ? `<span>· ${escapeHtml(businessPhone)}</span> ` : ''}
        ${taxId ? `<span>· ${escapeHtml(taxLabel)} ID: ${escapeHtml(taxId)}</span>` : ''}
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 20pt; font-weight: 800; color: #0047AB; font-family: 'Bricolage Grotesque', system-ui, sans-serif;">Proposal</div>
      <div style="font-size: 9.5pt; font-weight: 700; margin-top: 2pt;">${escapeHtml(proposalId)}</div>
      <div class="text-muted" style="font-size: 8.5pt; margin-top: 4pt; line-height: 1.4;">
        <div>Issue date: <strong style="color: #0E1A2B;">${issueDate}</strong></div>
        <div>Valid until: <strong style="color: #0E1A2B;">${validUntilDate}</strong></div>
      </div>
    </div>
  </header>

  <!-- Parties & Project Details -->
  <section class="section-border" style="display: flex; justify-content: space-between; font-size: 9pt;">
    <div style="max-width: 48%;">
      <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2pt;">Prepared for</div>
      <div style="font-size: 11pt; font-weight: 700; color: #0E1A2B;">${escapeHtml(clientCompany || contactPerson || 'Client')}</div>
      ${showAttention ? `<div class="text-muted">Attention: <strong style="color:#0E1A2B;">${escapeHtml(contactPerson)}</strong></div>` : ''}
      ${clientEmail ? `<div class="text-muted">${escapeHtml(clientEmail)}</div>` : ''}
    </div>
    <div style="text-align: right; max-width: 48%;">
      <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2pt;">Project engagement</div>
      <div style="font-size: 11pt; font-weight: 700; color: #0E1A2B; font-family: 'Bricolage Grotesque', system-ui, sans-serif;">${escapeHtml(cleanTitle)}</div>
      <div class="text-muted">Delivery model: <span style="color:#0E1A2B; font-weight: 500;">Fixed scope, paid in milestones</span></div>
      <div class="text-muted">Currency: <span style="color:#0E1A2B; font-weight: 500;">${escapeHtml(currency)}</span></div>
    </div>
  </section>

  <!-- Section 1: Executive Summary -->
  <section class="section-border">
    <h2 class="section-heading">${nextSection()} Executive summary</h2>
    <p style="font-size: 9.5pt; line-height: 1.5; color: #0E1A2B;">
      ${escapeHtml(
        proposal.summary ||
          `This proposal outlines the scoped deliverables, milestones, and investment required to engineer and launch ${cleanTitle}. All functional deliverables have been itemized below to guarantee clear expectations, rigorous execution, and structured milestone sign-offs.`
      )}
    </p>
  </section>

  <!-- Section 2: Scope of Work -->
  <section class="section-border">
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <h2 class="section-heading" style="margin-bottom: 2pt;">${nextSection()} Scope of work</h2>
      ${showHoursToClient ? `<span class="text-muted" style="font-size: 8.5pt; font-weight: 600;">${totals.hoursCount} total hours</span>` : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 25pt;">#</th>
          <th>Deliverable description</th>
          ${showHoursToClient ? '<th class="text-right" style="width: 50pt;">Hours</th>' : ''}
          ${totals.floorAdjustmentMode === 'separate' ? '<th class="text-right" style="width: 60pt;">Rate</th>' : ''}
          <th class="text-right" style="width: 70pt;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${totals.lineItems
          .map(
            (item) => `
          <tr>
            <td class="text-muted">${item.index}</td>
            <td style="font-weight: 500;">${escapeHtml(item.description)}</td>
            ${showHoursToClient ? `<td class="text-right text-muted font-tabular">${item.hours} hrs</td>` : ''}
            ${totals.floorAdjustmentMode === 'separate' ? `<td class="text-right text-muted font-tabular">${formatMoney(item.rate, currency)}/hr</td>` : ''}
            <td class="text-right font-tabular" style="font-weight: 600;">${formatMoney(item.amount, currency)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </section>

  <!-- Section 3: Investment Box -->
  <section class="section-border">
    <h2 class="section-heading">${nextSection()} Investment & financial summary</h2>
    <div class="box-tint totals-box">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4pt;" class="text-muted">
        <span>Deliverables subtotal</span>
        <span style="font-weight: 600; color: #0E1A2B;" class="font-tabular">${formatMoney(totals.laborSubtotal, currency)}</span>
      </div>

      ${
        totals.floorAdjustmentMode === 'separate' && totals.floorAdjustment > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4pt; color: #0047AB;">
          <span>Minimum project fee adjustment</span>
          <span style="font-weight: 600;" class="font-tabular">+${formatMoney(totals.floorAdjustment, currency)}</span>
        </div>
      `
          : ''
      }

      <div style="display: flex; justify-content: space-between; margin-bottom: 4pt; padding-top: 3pt; border-top: 0.5pt solid #D9D4C7;" class="text-muted">
        <span>Agreed package subtotal</span>
        <span style="font-weight: 600; color: #0E1A2B;" class="font-tabular">${formatMoney(totals.subtotal, currency)}</span>
      </div>

      ${
        totals.discount > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4pt; color: #067647;">
          <span>Upfront payment discount</span>
          <span style="font-weight: 600;" class="font-tabular">-${formatMoney(totals.discount, currency)}</span>
        </div>
      `
          : ''
      }

      ${
        totals.taxRate > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4pt;" class="text-muted">
          <span>${escapeHtml(totals.taxType)} (${totals.taxRate}% ${escapeHtml(totals.taxMode)})</span>
          <span style="font-weight: 600; color: #0E1A2B;" class="font-tabular">${formatMoney(totals.tax, currency)}</span>
        </div>
      `
          : ''
      }

      <div class="total-line">
        <span style="font-weight: 700; font-size: 10pt;">Total contract investment</span>
        <span class="total-amount font-tabular">${formatMoney(totals.total, currency)}</span>
      </div>
    </div>
  </section>

  <!-- Section 4: Payment Schedule -->
  <section class="section-border">
    <h2 class="section-heading">${nextSection()} Milestone payment schedule</h2>
    <p class="text-muted" style="font-size: 8.5pt; margin-bottom: 4pt;">
      Installments are invoiced in sequence upon completion of each milestone trigger.
    </p>
    <table>
      <thead>
        <tr>
          <th>Milestone</th>
          <th class="text-right" style="width: 45pt;">Percent</th>
          <th class="text-right" style="width: 75pt;">Amount due</th>
          <th>Trigger / Due condition</th>
        </tr>
      </thead>
      <tbody>
        ${totals.schedule
          .map(
            (inst) => `
          <tr>
            <td style="font-weight: 600;">${escapeHtml(inst.milestone)}</td>
            <td class="text-right text-muted font-tabular">${inst.percentage}%</td>
            <td class="text-right font-tabular" style="font-weight: 700;">${formatMoney(inst.amount, currency)}</td>
            <td class="text-muted">${escapeHtml(inst.dueTrigger)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </section>

  <!-- Section 5: How to Pay -->
  <section class="section-border">
    <h2 class="section-heading">${nextSection()} How to pay</h2>
    ${
      !hasPaymentDetails
        ? `
      <div class="warning-box">
        Add payment details before sending this proposal to the client.
      </div>
    `
        : `
      <div class="box-tint" style="font-size: 9pt;">
        <div style="font-weight: 700; color: #0047AB; margin-bottom: 4pt;">
          Remittance instructions (${escapeHtml(paymentMethod.replace('_', ' '))})
        </div>
        <p style="white-space: pre-line; line-height: 1.4; color: #0E1A2B; font-weight: 500;">
          ${escapeHtml(paymentDetails)}
        </p>
        <p class="text-muted" style="font-size: 8pt; margin-top: 4pt;">
          Please reference <strong>${escapeHtml(proposalId)}</strong> in your payment description for automatic reconciliation.
        </p>
      </div>
    `
    }
  </section>

  <!-- Section 6: Terms & Conditions -->
  ${
    proposal.termsAndConditions
      ? `
    <section class="section-border">
      <h2 class="section-heading">${nextSection()} Terms of agreement</h2>
      <div style="font-size: 8.5pt; line-height: 1.5; color: #0E1A2B; white-space: pre-line;">
        ${escapeHtml(proposal.termsAndConditions)}
      </div>
      ${
        exclusions.length > 0
          ? `
        <div style="margin-top: 8pt;">
          <strong style="font-size: 8.5pt; color: #0E1A2B;">Explicit scope exclusions:</strong>
          <ul style="margin-left: 14pt; margin-top: 2pt; font-size: 8.5pt; color: #5B6676;">
            ${exclusions.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
    </section>
  `
      : ''
  }

  <!-- Section 7: Acceptance & Signatures -->
  <section style="page-break-inside: avoid; break-inside: avoid; padding-top: 8pt;">
    <h2 class="section-heading">${nextSection()} Acceptance and authorization</h2>
    <p class="text-muted" style="font-size: 8.5pt; line-height: 1.4;">
      By signing below or approving this agreement, both parties authorize the scope, investment, and payment schedule set forth in proposal ${escapeHtml(proposalId)}.
    </p>

    <div class="signature-grid">
      <!-- Authorized Provider -->
      <div class="sig-col">
        <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 4pt;">
          Authorized provider
        </div>
        <div class="sig-line" style="min-height: 38pt; border-bottom: 1pt solid #0E1A2B; margin-bottom: 6pt; display: flex; align-items: flex-end;">
          ${
            signatureUrl
              ? `<img src="${signatureUrl}" alt="Signature" style="display: block; max-height: 34pt; max-width: 150pt; object-fit: contain; margin-bottom: 2pt;">`
              : `<span style="font-weight: 600; font-size: 9.5pt;">${escapeHtml(user?.name || businessName)}</span>`
          }
        </div>
        <div class="text-muted" style="font-size: 8.5pt; line-height: 1.3;">
          <div style="font-weight: 600; color: #0E1A2B;">${escapeHtml(user?.name || businessName)}</div>
          <div>${escapeHtml(businessName)}</div>
          <div>Date: ${issueDate}</div>
        </div>
      </div>

      <!-- Client Acceptance -->
      <div class="sig-col">
        <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 4pt;">
          Client acceptance
        </div>
        <div class="sig-line dashed">
          <span class="text-muted" style="font-size: 8pt;">Signature line</span>
        </div>
        <div class="text-muted" style="font-size: 8.5pt; line-height: 1.3;">
          <div style="font-weight: 600; color: #0E1A2B;">${escapeHtml(contactPerson || clientCompany || 'Authorized representative')}</div>
          <div>${escapeHtml(clientCompany || 'Client company')}</div>
          <div>Date: ________________________</div>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`;

  // Launch Puppeteer Core
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    // Generate PDF with exact requirements
    const pdfBuffer = await page.pdf({
      format: pageSize,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-family: 'Instrument Sans', Arial, sans-serif; font-size: 8pt; color: #5B6676; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
          <span>${escapeHtml(proposalId)} · ${escapeHtml(businessName)}${showWatermark ? ' · Created with Floorly' : ''}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '18mm',
        right: '16mm',
        bottom: '20mm',
        left: '16mm',
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Generate Invoice PDF buffer using Puppeteer
 */
export async function generateInvoicePdf(firstArg, clientArg, userArg, optionsArg = {}) {
  let invoice, client, user, options;
  if (firstArg && typeof firstArg === 'object' && ('invoice' in firstArg || (!clientArg && !userArg))) {
    ({ invoice = firstArg.invoice || firstArg, client = firstArg.client, user = firstArg.user, options = firstArg.options || {} } = firstArg);
  } else {
    invoice = firstArg;
    client = clientArg;
    user = userArg;
    options = optionsArg || {};
  }

  if (!invoice) throw new Error('Invoice data is required');

  const executablePath = getBrowserExecutablePath();
  const pageSize = options.pageSize || (user?.country === 'US' || user?.country === 'CA' ? 'Letter' : 'A4');
  const currency = invoice.currency || user?.currency || 'USD';

  // Math invariant checks
  const lineItems = (invoice.lineItems || []).map((item, idx) => {
    const desc = (item.description || 'Professional Services').replace(/^Proposal:\s*/i, '');
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.unitPrice) !== undefined && !isNaN(Number(item.unitPrice))
      ? Number(item.unitPrice)
      : (Number(item.amount) || 0);
    const amount = Number(item.amount) !== undefined && !isNaN(Number(item.amount))
      ? Number(item.amount)
      : qty * rate;
    const isFixedMilestone = qty === 1 && (rate === amount || !item.unitPrice);

    return {
      index: idx + 1,
      description: desc,
      quantity: qty,
      unitPrice: rate,
      amount,
      isFixedMilestone,
    };
  });

  const subtotal = Math.round(Number(invoice.subtotal !== undefined ? invoice.subtotal : lineItems.reduce((acc, i) => acc + i.amount, 0)));
  const discount = Math.round(Number(invoice.discountAmount || 0));
  const taxRate = Number(invoice.taxRate || 0);
  const taxMode = invoice.taxMode || 'exclusive';
  const taxAmount = Math.round(Number(invoice.taxAmount || 0));
  const calculatedTotal = taxMode === 'inclusive' ? subtotal - discount : subtotal - discount + taxAmount;
  const totalAmount = Math.round(Number(invoice.totalAmount !== undefined ? invoice.totalAmount : calculatedTotal));
  const amountPaid = Math.round(Number(invoice.amountPaid || 0));
  const calculatedBalance = Math.max(0, totalAmount - amountPaid);
  const balanceDue = Math.round(Number(invoice.balanceDue !== undefined ? invoice.balanceDue : calculatedBalance));

  // Assert invariants: subtotal - discount + tax = total, total - paid = balance
  const diffTotal = Math.abs(calculatedTotal - totalAmount);
  const diffBalance = Math.abs(calculatedBalance - balanceDue);
  if (diffTotal > 1 || diffBalance > 1) {
    throw new Error(
      `Invoice financial calculations are inconsistent: Expected total ${calculatedTotal} vs ${totalAmount}, expected balance ${calculatedBalance} vs ${balanceDue}. Please recalculate and save.`
    );
  }

  // Payment details verification
  const isINR = currency.toUpperCase() === 'INR';
  const bankAccountName = (user?.bankAccountName || user?.businessName || user?.name || '').trim();
  const iban = (user?.iban || user?.bankAccountNumber || '').trim();
  const swiftBic = (user?.swiftBic || user?.bankRoutingNumber || '').trim();
  const paypalEmail = (user?.paypalEmail || '').trim();
  const stripeLink = (invoice.stripePaymentUrl || user?.stripePaymentLink || '').trim();
  const upiId = (user?.upiId || user?.businessEmail ? `${(user?.businessEmail || '').split('@')[0]}@upi` : '').trim();
  const customInstructions = (invoice.paymentInstructions || user?.paymentInstructions || '').trim();

  const hasBankDetails = Boolean(iban);
  const hasPayPal = Boolean(paypalEmail);
  const hasStripe = Boolean(stripeLink);
  const hasUpi = isINR && Boolean(upiId);
  const hasPaymentDetails = hasBankDetails || hasPayPal || hasStripe || hasUpi || Boolean(customInstructions);

  if (!hasPaymentDetails) {
    throw new Error('Add payment details in Settings first before downloading or sending invoice.');
  }

  // Business & Client details
  const businessName = user?.businessName || user?.name || 'Studio Labs';
  const businessEmail = user?.businessEmail || user?.email || '';
  const businessPhone = user?.businessPhone || '';
  const businessAddress = user?.businessAddress || '';
  const taxId = user?.taxId || invoice.taxId || '';
  const taxLabel = user?.taxType || invoice.taxType || 'VAT';
  const logoUrl = invoice?.logoUrl || user?.logoUrl || '';
  const signatureUrl = invoice?.signatureUrl || user?.signatureUrl || '';

  const effClient = client || invoice.client || invoice.clientId || {};
  const clientCompany = (effClient.company || '').trim();
  const contactPerson = (effClient.contactPerson || effClient.name || '').trim();
  const clientEmail = (effClient.email || '').trim();
  const clientAddress = (effClient.billingAddress || effClient.address || '').trim();
  const clientTaxId = (effClient.taxId || '').trim();
  const showAttention = clientCompany && contactPerson && clientCompany.toLowerCase() !== contactPerson.toLowerCase();

  const invoiceNumber = invoice.invoiceNumber || 'INV-DRAFT';
  const issueDate = formatDate(invoice.issueDate || invoice.createdAt || new Date());
  const dueDate = formatDate(invoice.dueDate || new Date(Date.now() + 15 * 86400000));
  const status = (invoice.status || 'sent').toLowerCase();

  const isAgencyPlan = (user?.plan || '').toLowerCase() === 'agency';
  const showWatermark = !isAgencyPlan;
  const isDraft = status === 'draft';
  const isVoid = status === 'void' || status === 'cancelled';
  const isPaid = status === 'paid' || balanceDue === 0;
  const isPartial = !isPaid && amountPaid > 0;
  const isOverdue = !isPaid && !isDraft && invoice.dueDate && new Date(invoice.dueDate) < new Date();

  const statusLabel = isPaid ? 'Paid in full' : isPartial ? 'Partially paid' : isOverdue ? 'Overdue' : 'Sent';

  // Notes and terms
  const notes = (invoice.notes || user?.defaultInvoiceNotes || 'Thank you for your business. We appreciate working with you.').trim();
  const lateFeeTerms = (user?.lateFeeTerms || 'Invoices not settled within payment terms may be subject to a 1.5% monthly late interest charge.').trim();

  // HTML content
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice-${escapeHtml(invoiceNumber)}-${escapeHtml(clientCompany || contactPerson || 'Client')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Arabic:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageSize};
      margin: 18mm 16mm 20mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background: #ffffff !important;
      color: #0E1A2B;
      font-family: 'Instrument Sans', 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans SC', system-ui, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .heading-font {
      font-family: 'Bricolage Grotesque', system-ui, sans-serif;
      color: #0E1A2B;
    }

    .font-tabular {
      font-variant-numeric: tabular-nums;
    }

    .header-border {
      border-bottom: 2pt solid #0047AB;
      padding-bottom: 16pt;
      margin-bottom: 16pt;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .section-border {
      border-bottom: 0.75pt solid #D9D4C7;
      padding-bottom: 14pt;
      margin-bottom: 14pt;
    }

    .section-heading {
      font-size: 11pt;
      font-weight: 700;
      color: #0E1A2B;
      margin-bottom: 6pt;
      break-after: avoid;
      page-break-after: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-top: 6pt;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th {
      background-color: #F3F7FD;
      color: #5B6676;
      font-weight: 600;
      text-align: left;
      padding: 6pt 8pt;
      border-bottom: 1pt solid #D9D4C7;
    }

    td {
      padding: 6.5pt 8pt;
      border-bottom: 0.5pt solid #D9D4C7;
      color: #0E1A2B;
    }

    .text-right {
      text-align: right;
    }

    .text-muted {
      color: #5B6676;
    }

    .box-tint {
      background-color: #F3F7FD;
      border: 0.75pt solid #D9D4C7;
      border-radius: 6pt;
      padding: 10pt 12pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .totals-box {
      max-width: 280pt;
      margin-left: auto;
      margin-top: 8pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .total-line {
      border-top: 1.5pt solid #0047AB;
      padding-top: 6pt;
      margin-top: 6pt;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .balance-line {
      background-color: #F3F7FD;
      border: 1pt solid #0047AB;
      border-radius: 4pt;
      padding: 6pt 8pt;
      margin-top: 6pt;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .balance-amount {
      font-size: 16pt;
      font-weight: 800;
      color: #0047AB;
      font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    }

    .badge {
      display: inline-block;
      padding: 2pt 6pt;
      border-radius: 9999px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: capitalize;
    }

    .badge-paid {
      background-color: #F3F7FD;
      color: #0047AB;
      border: 1pt solid #0047AB;
    }

    .badge-partial {
      background-color: #FFF4CC;
      color: #B54708;
      border: 1pt solid #FFC72C;
    }

    .badge-overdue {
      background-color: #FEE4E2;
      color: #B42318;
      border: 1pt solid #B42318;
    }

    .badge-sent {
      background-color: #F3F7FD;
      color: #5B6676;
      border: 1pt solid #D9D4C7;
    }

    .watermark-overlay {
      position: absolute;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80pt;
      font-weight: 900;
      color: rgba(14, 26, 43, 0.06);
      text-transform: uppercase;
      letter-spacing: 12pt;
      pointer-events: none;
      z-index: 0;
      font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    }
  </style>
</head>
<body style="position: relative;">
  ${isDraft ? '<div class="watermark-overlay">DRAFT</div>' : ''}
  ${isVoid ? '<div class="watermark-overlay">VOID</div>' : ''}

  <!-- Letterhead Header -->
  <header class="header-border">
    <div style="max-width: 58%;">
      ${
        logoUrl
          ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" style="max-height: 32pt; margin-bottom: 6pt;">`
          : `<h1 class="heading-font" style="font-size: 18pt; font-weight: 800; margin-bottom: 2pt;">${escapeHtml(businessName)}</h1>`
      }
      ${businessAddress ? `<p class="text-muted" style="font-size: 8.5pt; white-space: pre-line; line-height: 1.3;">${escapeHtml(businessAddress)}</p>` : ''}
      <div class="text-muted" style="font-size: 8.5pt; margin-top: 3pt;">
        ${businessEmail ? `<span>${escapeHtml(businessEmail)}</span> ` : ''}
        ${businessPhone ? `<span>· ${escapeHtml(businessPhone)}</span> ` : ''}
        ${taxId ? `<span>· ${escapeHtml(taxLabel)} ID: <strong style="color:#0E1A2B;">${escapeHtml(taxId)}</strong></span>` : ''}
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 22pt; font-weight: 800; color: #0047AB; font-family: 'Bricolage Grotesque', system-ui, sans-serif; line-height: 1;">Invoice</div>
      <div style="font-size: 10pt; font-weight: 700; margin-top: 3pt;" class="font-tabular">${escapeHtml(invoiceNumber)}</div>
      <div style="margin-top: 4pt;">
        <span class="badge ${isPaid ? 'badge-paid' : isPartial ? 'badge-partial' : isOverdue ? 'badge-overdue' : 'badge-sent'}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="text-muted" style="font-size: 8.5pt; margin-top: 4pt; line-height: 1.4;">
        <div>Issue date: <strong style="color: #0E1A2B;">${issueDate}</strong></div>
        <div>Due date: <strong style="color: ${isOverdue ? '#B42318' : '#0E1A2B'};">${dueDate}</strong></div>
      </div>
    </div>
  </header>

  <!-- Parties & Project / PO reference -->
  <section class="section-border" style="display: flex; justify-content: space-between; font-size: 9pt;">
    <div style="max-width: 48%;">
      <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2pt;">Billed to</div>
      <div style="font-size: 11pt; font-weight: 700; color: #0E1A2B;">${escapeHtml(clientCompany || contactPerson || 'Client')}</div>
      ${showAttention ? `<div class="text-muted">Attention: <strong style="color:#0E1A2B;">${escapeHtml(contactPerson)}</strong></div>` : ''}
      ${clientAddress ? `<div class="text-muted" style="white-space: pre-line; line-height: 1.3; margin-top: 2pt;">${escapeHtml(clientAddress)}</div>` : ''}
      ${clientEmail ? `<div class="text-muted">${escapeHtml(clientEmail)}</div>` : ''}
      ${clientTaxId ? `<div class="text-muted" style="margin-top: 2pt;">Tax ID / VAT: <strong style="color:#0E1A2B;">${escapeHtml(clientTaxId)}</strong></div>` : ''}
    </div>
    <div style="text-align: right; max-width: 48%;">
      <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2pt;">Reference details</div>
      <div style="font-size: 10pt; font-weight: 700; color: #0E1A2B; font-family: 'Bricolage Grotesque', system-ui, sans-serif;">
        ${escapeHtml((invoice.projectTitle || invoice.referenceTitle || 'Professional Services').replace(/^Proposal:\s*/i, ''))}
      </div>
      ${invoice.poNumber ? `<div class="text-muted">PO number: <strong style="color:#0E1A2B;">${escapeHtml(invoice.poNumber)}</strong></div>` : ''}
      <div class="text-muted">Currency: <strong style="color:#0E1A2B;">${escapeHtml(currency)}</strong></div>
      <div class="text-muted">Payment terms: <span style="color:#0E1A2B;">${escapeHtml(invoice.paymentTerms || 'Due on receipt')}</span></div>
    </div>
  </section>

  <!-- Line items table -->
  <section class="section-border">
    <table>
      <thead>
        <tr>
          <th style="width: 24pt;">#</th>
          <th>Description</th>
          <th class="text-right" style="width: 55pt;">Qty / Hrs</th>
          <th class="text-right" style="width: 65pt;">Rate</th>
          <th class="text-right" style="width: 75pt;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems
          .map(
            (item) => `
          <tr>
            <td class="text-muted">${item.index}</td>
            <td style="font-weight: 500;">${escapeHtml(item.description)}</td>
            <td class="text-right text-muted font-tabular">${item.isFixedMilestone ? '—' : item.quantity}</td>
            <td class="text-right text-muted font-tabular">${item.isFixedMilestone ? '—' : formatMoney(item.unitPrice, currency)}</td>
            <td class="text-right font-tabular" style="font-weight: 600;">${formatMoney(item.amount, currency)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </section>

  <!-- Totals Box -->
  <section class="section-border">
    <div class="box-tint totals-box">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4pt;" class="text-muted">
        <span>Subtotal</span>
        <span style="font-weight: 600; color: #0E1A2B;" class="font-tabular">${formatMoney(subtotal, currency)}</span>
      </div>

      ${
        discount > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4pt; color: #0047AB;">
          <span>Discount</span>
          <span style="font-weight: 600;" class="font-tabular">-${formatMoney(discount, currency)}</span>
        </div>
      `
          : ''
      }

      ${
        taxAmount > 0 || taxRate > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4pt;" class="text-muted">
          <span>${escapeHtml(invoice.taxType || taxLabel)} (${taxRate}% ${escapeHtml(taxMode)})</span>
          <span style="font-weight: 600; color: #0E1A2B;" class="font-tabular">${formatMoney(taxAmount, currency)}</span>
        </div>
      `
          : ''
      }

      <div class="total-line">
        <span style="font-weight: 700; font-size: 10pt;">Total amount</span>
        <span style="font-size: 13pt; font-weight: 800; color: #0E1A2B;" class="font-tabular">${formatMoney(totalAmount, currency)}</span>
      </div>

      ${
        amountPaid > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-top: 4pt; color: #0047AB;">
          <span>Amount paid</span>
          <span style="font-weight: 600;" class="font-tabular">-${formatMoney(amountPaid, currency)}</span>
        </div>
      `
          : ''
      }

      <div class="balance-line">
        <span style="font-weight: 700; font-size: 9.5pt; color: #0047AB;">Balance due</span>
        <span class="balance-amount font-tabular">${formatMoney(balanceDue, currency)}</span>
      </div>
    </div>
  </section>

  <!-- Payment instructions: ACTUAL saved details -->
  <section class="section-border" style="break-inside: avoid; page-break-inside: avoid;">
    <h2 class="section-heading">How to pay</h2>
    <div class="box-tint" style="font-size: 9pt;">
      <div style="font-weight: 700; color: #0047AB; margin-bottom: 4pt;">
        Payment reference: Use ${escapeHtml(invoiceNumber)} as the remittance description
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; margin-top: 6pt;">
        ${
          hasBankDetails
            ? `
          <div>
            <strong style="color: #0E1A2B; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5pt; display: block; margin-bottom: 2pt;">Direct bank transfer</strong>
            ${bankAccountName ? `<div>Account name: <strong style="color:#0E1A2B;">${escapeHtml(bankAccountName)}</strong></div>` : ''}
            <div>IBAN / Account #: <strong style="color:#0E1A2B;" class="font-tabular">${escapeHtml(iban)}</strong></div>
            ${swiftBic ? `<div>SWIFT / BIC: <strong style="color:#0E1A2B;" class="font-tabular">${escapeHtml(swiftBic)}</strong></div>` : ''}
          </div>
        `
            : ''
        }

        <div>
          ${
            hasPayPal
              ? `
            <div style="margin-bottom: 4pt;">
              <strong style="color: #0E1A2B; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5pt; display: block; margin-bottom: 2pt;">PayPal</strong>
              <a href="https://paypal.me/${encodeURIComponent(paypalEmail.split('@')[0])}" style="color: #0047AB; text-decoration: underline;">https://paypal.me/${escapeHtml(paypalEmail.split('@')[0])}</a>
              <div class="text-muted">or send directly to ${escapeHtml(paypalEmail)}</div>
            </div>
          `
              : ''
          }

          ${
            hasStripe
              ? `
            <div style="margin-bottom: 4pt;">
              <strong style="color: #0E1A2B; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5pt; display: block; margin-bottom: 2pt;">Online card payment</strong>
              <a href="${escapeHtml(stripeLink)}" style="color: #0047AB; text-decoration: underline;">${escapeHtml(stripeLink)}</a>
            </div>
          `
              : ''
          }

          ${
            hasUpi
              ? `
            <div style="margin-bottom: 4pt;">
              <strong style="color: #0E1A2B; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5pt; display: block; margin-bottom: 2pt;">UPI (India)</strong>
              <div>VPA: <strong style="color:#0E1A2B;">${escapeHtml(upiId)}</strong></div>
            </div>
          `
              : ''
          }

          ${
            customInstructions
              ? `
            <div style="margin-top: 4pt;">
              <p style="white-space: pre-line; line-height: 1.3; color: #0E1A2B;">${escapeHtml(customInstructions)}</p>
            </div>
          `
              : ''
          }
        </div>
      </div>
    </div>
  </section>

  <!-- Sign-off & Notes -->
  <section style="break-inside: avoid; page-break-inside: avoid; margin-top: 14pt; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5pt; color: #5B6676; line-height: 1.4;">
    <div style="max-width: 60%;">
      ${notes ? `<p style="color: #0E1A2B; font-weight: 500; margin-bottom: 3pt;">${escapeHtml(notes)}</p>` : ''}
      ${lateFeeTerms ? `<p>${escapeHtml(lateFeeTerms)}</p>` : ''}
      <p style="font-size: 8pt; margin-top: 3pt;">Thank you for your business.</p>
    </div>
    <div style="text-align: right; min-width: 130pt;">
      <div style="min-height: 34pt; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 3pt;">
        ${
          signatureUrl
            ? `<img src="${signatureUrl}" alt="Signature" style="display: block; max-height: 32pt; max-width: 130pt; object-fit: contain;">`
            : `<span style="font-weight: 600; font-size: 9pt; color: #0E1A2B;">${escapeHtml(user?.name || user?.fullName || businessName)}</span>`
        }
      </div>
      <div style="border-top: 0.75pt solid #0E1A2B; padding-top: 3pt; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.5pt; color: #5B6676;">
        Authorized signature
      </div>
      <div style="font-weight: 600; color: #0E1A2B; font-size: 8pt; margin-top: 1pt;">
        ${escapeHtml(businessName)}
      </div>
    </div>
  </section>
</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: pageSize,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-family: 'Instrument Sans', Arial, sans-serif; font-size: 8pt; color: #5B6676; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
          <span>${escapeHtml(invoiceNumber)} · ${escapeHtml(businessName)}${showWatermark ? ' · Created with Floorly' : ''}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '18mm',
        right: '16mm',
        bottom: '20mm',
        left: '16mm',
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Generate Payment Receipt PDF buffer using Puppeteer
 */
export async function generateReceiptPdf(firstArg, invoiceArg, clientArg, userArg, optionsArg = {}) {
  let payment, invoice, client, user, options;
  if (firstArg && typeof firstArg === 'object' && ('payment' in firstArg || (!invoiceArg && !clientArg))) {
    ({ payment = firstArg.payment || firstArg, invoice = firstArg.invoice, client = firstArg.client, user = firstArg.user, options = firstArg.options || {} } = firstArg);
  } else {
    payment = firstArg;
    invoice = invoiceArg;
    client = clientArg;
    user = userArg;
    options = optionsArg || {};
  }

  if (!payment) throw new Error('Payment data is required');

  const executablePath = getBrowserExecutablePath();
  const pageSize = options.pageSize || (user?.country === 'US' || user?.country === 'CA' ? 'Letter' : 'A4');
  const currency = invoice?.currency || payment.currency || user?.currency || 'USD';

  const currentYear = new Date().getFullYear();
  const paymentYear = payment.paymentDate ? new Date(payment.paymentDate).getFullYear() : currentYear;
  const rawId = (payment._id || payment.id || '').toString();
  const rawRef = (payment.transactionReference || '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
  const seqSuffix = rawRef || rawId.slice(-3) || '001';
  const receiptNumber = payment.receiptNumber || `RCT-${paymentYear}-${seqSuffix.toUpperCase()}`;

  const businessName = user?.businessName || user?.name || 'Studio Labs';
  const businessEmail = user?.businessEmail || user?.email || '';
  const businessPhone = user?.businessPhone || '';
  const businessAddress = user?.businessAddress || '';
  const taxId = user?.taxId || '';
  const taxLabel = user?.taxType || 'Tax';
  const logoUrl = payment?.logoUrl || invoice?.logoUrl || user?.logoUrl || '';
  const signatureUrl = payment?.signatureUrl || invoice?.signatureUrl || user?.signatureUrl || '';

  const effClient = client || payment.client || invoice?.client || invoice?.clientId || {};
  const clientCompany = (effClient.company || '').trim();
  const contactPerson = (effClient.contactPerson || effClient.name || '').trim();
  const clientEmail = (effClient.email || '').trim();
  const clientAddress = (effClient.billingAddress || effClient.address || '').trim();
  const clientTaxId = (effClient.taxId || '').trim();
  const showAttention = clientCompany && contactPerson && clientCompany.toLowerCase() !== contactPerson.toLowerCase();

  const paymentDate = formatDate(payment.paymentDate || payment.createdAt || new Date());
  const recordedDate = formatDate(payment.createdAt || payment.paymentDate || new Date());

  const invNumber = invoice?.invoiceNumber || payment.invoice?.invoiceNumber || 'INV-DIRECT';
  const totalBilled = Number(invoice?.totalAmount !== undefined ? invoice.totalAmount : (payment.invoice?.totalAmount || payment.amount || 0));
  const amountPaid = Number(payment.amount || 0);
  const remainingBalance = Number(
    invoice?.balanceDue !== undefined
      ? invoice.balanceDue
      : payment.invoice?.balanceDue !== undefined
      ? payment.invoice.balanceDue
      : 0
  );

  const paymentMethod = (payment.paymentMethod || 'bank_transfer').replace(/_/g, ' ');
  const transactionRef = payment.transactionReference || 'N/A';

  const isAgencyPlan = (user?.plan || '').toLowerCase() === 'agency';
  const showWatermark = !isAgencyPlan;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt-${escapeHtml(receiptNumber)}-${escapeHtml(clientCompany || contactPerson || 'Client')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Arabic:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageSize};
      margin: 18mm 16mm 20mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background: #ffffff !important;
      color: #0E1A2B;
      font-family: 'Instrument Sans', 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Arabic', 'Noto Sans SC', system-ui, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .heading-font {
      font-family: 'Bricolage Grotesque', system-ui, sans-serif;
      color: #0E1A2B;
    }

    .font-tabular {
      font-variant-numeric: tabular-nums;
    }

    .header-border {
      border-bottom: 2pt solid #0047AB;
      padding-bottom: 16pt;
      margin-bottom: 16pt;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .section-border {
      border-bottom: 0.75pt solid #D9D4C7;
      padding-bottom: 14pt;
      margin-bottom: 14pt;
    }

    .box-tint {
      background-color: #F3F7FD;
      border: 0.75pt solid #D9D4C7;
      border-radius: 6pt;
      padding: 12pt 14pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-top: 6pt;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th {
      background-color: #F3F7FD;
      color: #5B6676;
      font-weight: 600;
      text-align: left;
      padding: 6pt 8pt;
      border-bottom: 1pt solid #D9D4C7;
    }

    td {
      padding: 6.5pt 8pt;
      border-bottom: 0.5pt solid #D9D4C7;
      color: #0E1A2B;
    }

    .text-right {
      text-align: right;
    }

    .text-muted {
      color: #5B6676;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header class="header-border">
    <div style="max-width: 58%;">
      ${
        logoUrl
          ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" style="max-height: 32pt; margin-bottom: 6pt;">`
          : `<h1 class="heading-font" style="font-size: 18pt; font-weight: 800; margin-bottom: 2pt;">${escapeHtml(businessName)}</h1>`
      }
      ${businessAddress ? `<p class="text-muted" style="font-size: 8.5pt; white-space: pre-line; line-height: 1.3;">${escapeHtml(businessAddress)}</p>` : ''}
      <div class="text-muted" style="font-size: 8.5pt; margin-top: 3pt;">
        ${businessEmail ? `<span>${escapeHtml(businessEmail)}</span> ` : ''}
        ${businessPhone ? `<span>· ${escapeHtml(businessPhone)}</span> ` : ''}
        ${taxId ? `<span>· ${escapeHtml(taxLabel)} ID: <strong style="color:#0E1A2B;">${escapeHtml(taxId)}</strong></span>` : ''}
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 22pt; font-weight: 800; color: #0047AB; font-family: 'Bricolage Grotesque', system-ui, sans-serif; line-height: 1;">Payment receipt</div>
      <div style="font-size: 10pt; font-weight: 700; margin-top: 3pt;" class="font-tabular">${escapeHtml(receiptNumber)}</div>
      <div class="text-muted" style="font-size: 8.5pt; margin-top: 4pt; line-height: 1.4;">
        <div>Payment date: <strong style="color: #0E1A2B;">${paymentDate}</strong></div>
        <div>Recorded: <span style="color: #0E1A2B;">${recordedDate}</span></div>
      </div>
    </div>
  </header>

  <!-- Amount received box -->
  <section class="box-tint" style="margin-bottom: 14pt; border-left: 3pt solid #0047AB; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <div style="font-size: 8.5pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt;">Amount received</div>
      <div style="font-size: 24pt; font-weight: 800; color: #0047AB; font-family: 'Bricolage Grotesque', system-ui, sans-serif; margin-top: 2pt;" class="font-tabular">
        ${formatMoney(amountPaid, currency)}
      </div>
    </div>
    <div style="text-align: right; font-size: 8.5pt; color: #5B6676;">
      <div style="display: inline-block; background: #ffffff; border: 0.5pt solid #D9D4C7; padding: 3pt 8pt; border-radius: 9999px; font-weight: 600; color: #0047AB; margin-bottom: 2pt;">
        Payment confirmed and reconciled
      </div>
      <div>Applied to invoice ${escapeHtml(invNumber)}</div>
    </div>
  </section>

  <!-- Parties & Transaction Details -->
  <section class="section-border" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16pt; font-size: 9pt;">
    <div>
      <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2pt;">Received from</div>
      <div style="font-size: 11pt; font-weight: 700; color: #0E1A2B;">${escapeHtml(clientCompany || contactPerson || 'Client')}</div>
      ${showAttention ? `<div class="text-muted">Attention: <strong style="color:#0E1A2B;">${escapeHtml(contactPerson)}</strong></div>` : ''}
      ${clientAddress ? `<div class="text-muted" style="white-space: pre-line; line-height: 1.3; margin-top: 2pt;">${escapeHtml(clientAddress)}</div>` : ''}
      ${clientEmail ? `<div class="text-muted">${escapeHtml(clientEmail)}</div>` : ''}
      ${clientTaxId ? `<div class="text-muted" style="margin-top: 2pt;">Tax ID / VAT: <strong style="color:#0E1A2B;">${escapeHtml(clientTaxId)}</strong></div>` : ''}
    </div>
    <div style="text-align: right;">
      <div style="font-size: 8pt; font-weight: 700; color: #5B6676; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2pt;">Transaction details</div>
      <div>Payment method: <strong style="color: #0E1A2B; text-transform: capitalize;">${escapeHtml(paymentMethod)}</strong></div>
      <div>Reference / UTR: <strong style="color: #0E1A2B;" class="font-tabular">${escapeHtml(transactionRef)}</strong></div>
      <div>Applied invoice: <strong style="color: #0047AB;" class="font-tabular">${escapeHtml(invNumber)}</strong></div>
    </div>
  </section>

  <!-- Invoice Remittance Summary Table -->
  <section class="section-border" style="break-inside: avoid; page-break-inside: avoid;">
    <h2 style="font-size: 11pt; font-weight: 700; color: #0E1A2B; margin-bottom: 4pt; font-family: 'Bricolage Grotesque', system-ui, sans-serif;">
      Invoice remittance summary
    </h2>
    <table>
      <thead>
        <tr>
          <th>Invoice reference</th>
          <th class="text-right">Total billed</th>
          <th class="text-right">Remitted this receipt</th>
          <th class="text-right">Remaining balance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 700; color: #0047AB;" class="font-tabular">${escapeHtml(invNumber)}</td>
          <td class="text-right text-muted font-tabular">${formatMoney(totalBilled, currency)}</td>
          <td class="text-right font-tabular" style="font-weight: 700; color: #0047AB;">${formatMoney(amountPaid, currency)}</td>
          <td class="text-right font-tabular" style="font-weight: 700; color: #0E1A2B;">${formatMoney(remainingBalance, currency)}</td>
        </tr>
      </tbody>
    </table>
  </section>

  ${
    payment.notes
      ? `
    <section class="box-tint" style="margin-bottom: 14pt; font-size: 8.5pt;">
      <div style="font-weight: 700; color: #0E1A2B; margin-bottom: 2pt;">Transaction notes</div>
      <p class="text-muted" style="white-space: pre-line;">${escapeHtml(payment.notes)}</p>
    </section>
  `
      : ''
  }

  <!-- Sign-off Footer -->
  <footer style="margin-top: 18pt; padding-top: 10pt; border-top: 0.75pt solid #D9D4C7; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5pt; color: #5B6676; break-inside: avoid; page-break-inside: avoid;">
    <div style="max-width: 60%;">
      <div style="font-weight: 700; color: #0E1A2B; margin-bottom: 2pt;">Digitally authenticated remittance voucher</div>
      <p style="font-size: 8pt; line-height: 1.3;">
        Thank you for your business. This voucher serves as official proof of payment for your corporate accounting and tax reconciliation records.
      </p>
    </div>
    <div style="text-align: right; min-width: 130pt;">
      <div style="min-height: 34pt; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 3pt;">
        ${
          signatureUrl
            ? `<img src="${signatureUrl}" alt="Official signature" style="display: block; max-height: 32pt; max-width: 130pt; object-fit: contain;">`
            : `<span style="font-weight: 600; font-size: 9pt; color: #0E1A2B;">${escapeHtml(user?.name || user?.fullName || businessName)}</span>`
        }
      </div>
      <div style="font-weight: 700; color: #0E1A2B;">${escapeHtml(businessName)}</div>
      <div style="font-size: 8pt;">Authorized accounts department</div>
      <div style="margin-top: 4pt; border-top: 0.75pt solid #D9D4C7; width: 130pt; margin-left: auto; padding-top: 2pt; font-size: 7.5pt;">
        Official signature & stamp
      </div>
    </div>
  </footer>
</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: pageSize,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-family: 'Instrument Sans', Arial, sans-serif; font-size: 8pt; color: #5B6676; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
          <span>${escapeHtml(receiptNumber)} · ${escapeHtml(businessName)}${showWatermark ? ' · Created with Floorly' : ''}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '18mm',
        right: '16mm',
        bottom: '20mm',
        left: '16mm',
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}


import { ShieldCheck, CheckCircle2, Clock, Building, Mail, Phone, ExternalLink, AlertTriangle } from 'lucide-react';
import { computeProposalTotals } from '../../utils/pricingEngine';
import { sanitizeFreeText } from '../../utils/documentSanitizer';
import { resolveVariables, buildVariableContext } from '../../utils/variableResolver';

/**
 * Pure, shared ProposalDocument component
 * Rendered by:
 * 1. In-app preview modal (ProposalDocumentModal)
 * 2. Dedicated print route (/proposals/:id/print)
 * 3. Server-side PDF generation (Puppeteer)
 */
export function ProposalDocument({
  proposal,
  client = null,
  user = null,
  printMode = false,
  showHoursToClient = true,
  floorAdjustmentMode = 'spread', // 'spread' | 'separate'
  pageSize = 'A4', // 'A4' | 'Letter'
}) {
  if (!proposal) return null;

  const currency = proposal.currency || user?.currency || 'USD';
  const formatMoney = (val) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Compute exact totals via single source of truth
  const totals = computeProposalTotals(proposal, {
    showHoursToClient,
    floorAdjustmentMode,
  });

  // Business & Freelancer details
  const businessName = user?.businessName || user?.name || 'Studio Labs';
  const businessEmail = user?.businessEmail || user?.email || '';
  const businessPhone = user?.businessPhone || '';
  const businessAddress = user?.businessAddress || '';
  const taxId = user?.taxId || proposal.taxId || '';
  const taxLabel = user?.taxType || proposal.taxType || 'VAT';
  const logoUrl = proposal?.logoUrl || user?.logoUrl || '';
  const signatureUrl = proposal?.signatureUrl || user?.signatureUrl || '';

  // Client details
  const effectiveClient = client || proposal.client || proposal.clientId || {};
  const clientCompany = (effectiveClient.company || '').trim();
  const contactPerson = (effectiveClient.contactPerson || effectiveClient.name || '').trim();
  const clientEmail = (effectiveClient.email || '').trim();
  const showAttention = clientCompany && contactPerson && clientCompany.toLowerCase() !== contactPerson.toLowerCase();

  // Proposal Meta
  const proposalId = proposal.proposalNumber || 'PROP-DRAFT';
  const issueDate = formatDate(proposal.createdAt || new Date());
  const validUntilDate = formatDate(proposal.validUntil);
  const cleanTitle = (proposal.title || 'Project Scope & Proposal').replace(/^Proposal:\s*/i, '');

  // Payment details
  const paymentMethod = proposal.paymentMethod || 'stripe';
  const paymentDetails = sanitizeFreeText(proposal.paymentDetails || user?.paymentInstructions || '');
  const hasPaymentDetails = Boolean(paymentDetails);

  const reverseChargeEnabled = proposal.reverseChargeNote === true || proposal.reverseChargeNote === 'true' || user?.reverseChargeNote === true;
  const reverseChargeText = sanitizeFreeText(proposal.reverseChargeText || user?.reverseChargeText) || 'VAT reverse charge applies: the customer is liable for VAT.';

  // User Plan (Agency is white-label, no Floorly watermark)
  const isAgencyPlan = (user?.plan || '').toLowerCase() === 'agency';

  // Dynamic Section Numbering
  let sectionCounter = 0;
  const getNextSectionNumber = () => {
    sectionCounter += 1;
    return `${sectionCounter}.`;
  };

  // Exclusions (from Analyzer if attached)
  const notIncludedList = proposal.exclusions || proposal.analysisId?.exclusions || [];

  return (
    <div
      className={`proposal-document-container w-full ${printMode ? 'proposal-print-mode' : ''}`}
      style={{
        backgroundColor: printMode ? '#ffffff' : 'transparent',
      }}
    >
      <article
        className="proposal-document-sheet bg-white text-[#0E1A2B] rounded-2xl border border-[#D9D4C7] p-8 sm:p-12 md:p-14 mx-auto font-sans leading-relaxed transition-all"
        style={{
          maxWidth: '794px', // Standard A4 width in px at 96 DPI
          minHeight: '1123px', // A4 height
          boxShadow: printMode ? 'none' : '0 10px 30px -10px rgba(14, 26, 43, 0.08)',
          borderColor: printMode ? 'transparent' : '#D9D4C7',
          color: '#0E1A2B',
          fontFamily: "'Instrument Sans', system-ui, -apple-system, sans-serif",
          pageBreakInside: 'avoid',
        }}
      >
        {/* =============================================================
           1. DOCUMENT HEADER (Letterhead & Meta)
           ============================================================= */}
        <header className="pb-8 border-b-2 border-[#0047AB] flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          {/* Left: Freelancer Letterhead */}
          <div className="space-y-1.5 max-w-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-10 w-auto object-contain mb-3"
              />
            ) : (
              <h1
                className="text-[24px] font-extrabold text-[#0E1A2B] leading-none mb-1 tracking-tight"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                {businessName}
              </h1>
            )}

            {businessAddress && (
              <p className="text-xs text-[#5B6676] leading-tight whitespace-pre-line">
                {businessAddress}
              </p>
            )}

            <div className="text-xs text-[#5B6676] space-y-0.5 pt-1">
              {businessEmail && <p>{businessEmail}</p>}
              {businessPhone && <p>{businessPhone}</p>}
              {taxId && <p>{taxLabel} ID: {taxId}</p>}
            </div>
          </div>

          {/* Right: Proposal Title & Dates */}
          <div className="sm:text-right space-y-1">
            <span
              className="text-[26px] font-extrabold text-[#0047AB] tracking-tight block leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Proposal
            </span>
            <span className="text-xs font-semibold text-[#0E1A2B] block pt-1">
              {proposalId}
            </span>
            <div className="text-xs text-[#5B6676] space-y-0.5 pt-2">
              <p>Issue date: <span className="font-medium text-[#0E1A2B]">{issueDate}</span></p>
              <p>Valid until: <span className="font-medium text-[#0E1A2B]">{validUntilDate}</span></p>
            </div>
          </div>
        </header>

        {/* =============================================================
           2. PARTIES & PROJECT BLOCK
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          {/* Prepared For */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#5B6676] uppercase tracking-wider block">
              Prepared for
            </span>
            <p className="text-sm font-bold text-[#0E1A2B]">
              {clientCompany || contactPerson || 'Client'}
            </p>
            {showAttention && (
              <p className="text-xs text-[#5B6676]">
                Attention: <span className="text-[#0E1A2B] font-medium">{contactPerson}</span>
              </p>
            )}
            {clientEmail && (
              <p className="text-xs text-[#5B6676]">{clientEmail}</p>
            )}
          </div>

          {/* Project Details */}
          <div className="space-y-1 sm:text-right">
            <span className="text-[11px] font-bold text-[#5B6676] uppercase tracking-wider block">
              Project engagement
            </span>
            <p
              className="text-sm font-bold text-[#0E1A2B]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {cleanTitle}
            </p>
            <p className="text-xs text-[#5B6676]">
              Delivery model: <span className="text-[#0E1A2B] font-medium">Fixed scope, paid in milestones</span>
            </p>
            <p className="text-xs text-[#5B6676]">
              Currency: <span className="text-[#0E1A2B] font-medium">{currency}</span>
            </p>
          </div>
        </section>

        {/* =============================================================
           3. SECTION: EXECUTIVE SUMMARY
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-2">
          <h2
            className="text-base font-bold text-[#0E1A2B] flex items-center gap-1.5"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            <span>{getNextSectionNumber()}</span>
            <span>Executive summary</span>
          </h2>
          <p className="text-xs text-[#0E1A2B] leading-relaxed">
            {proposal.summary ||
              `This proposal outlines the scoped deliverables, milestones, and investment required to engineer and launch ${cleanTitle}. All functional deliverables have been itemized below to guarantee clear expectations, rigorous execution, and structured milestone sign-offs.`}
          </p>
        </section>

        {/* =============================================================
           4. SECTION: SCOPE OF WORK (Deliverables Table)
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-bold text-[#0E1A2B] flex items-center gap-1.5"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              <span>{getNextSectionNumber()}</span>
              <span>Scope of work</span>
            </h2>
            {showHoursToClient && (
              <span className="text-xs font-semibold text-[#5B6676]">
                {totals.hoursCount} total hours
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9D4C7] text-[#5B6676] font-semibold bg-[#F3F7FD]/60">
                  <th scope="col" className="py-2.5 px-3 w-10">#</th>
                  <th scope="col" className="py-2.5 px-3">Deliverable description</th>
                  {showHoursToClient && (
                    <th scope="col" className="py-2.5 px-3 w-20 text-right">Hours</th>
                  )}
                  {totals.floorAdjustmentMode === 'separate' && (
                    <th scope="col" className="py-2.5 px-3 w-24 text-right">Rate</th>
                  )}
                  <th scope="col" className="py-2.5 px-3 w-28 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {totals.lineItems.map((item) => (
                  <tr key={item.index} className="break-inside-avoid">
                    <td className="py-3 px-3 text-[#5B6676] font-medium">{item.index}</td>
                    <td className="py-3 px-3 text-[#0E1A2B] font-medium">{item.description}</td>
                    {showHoursToClient && (
                      <td className="py-3 px-3 text-right text-[#5B6676] font-tabular">
                        {item.hours} hrs
                      </td>
                    )}
                    {totals.floorAdjustmentMode === 'separate' && (
                      <td className="py-3 px-3 text-right text-[#5B6676] font-tabular">
                        {formatMoney(item.rate)}/hr
                      </td>
                    )}
                    <td className="py-3 px-3 text-right font-semibold text-[#0E1A2B] font-tabular">
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* =============================================================
           5. SECTION: INVESTMENT (Totals Box)
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-3 investment-box">
          <h2
            className="text-base font-bold text-[#0E1A2B] flex items-center gap-1.5"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            <span>{getNextSectionNumber()}</span>
            <span>Investment & financial summary</span>
          </h2>

          <div className="bg-[#F3F7FD] rounded-xl border border-[#D9D4C7] p-5 max-w-md ml-auto space-y-2 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-[#5B6676]">
              <span>Deliverables subtotal</span>
              <span className="font-semibold text-[#0E1A2B] font-tabular">
                {formatMoney(totals.laborSubtotal)}
              </span>
            </div>

            {/* Separate Floor Adjustment Line (if in separate mode and uplift > 0) */}
            {totals.floorAdjustmentMode === 'separate' && totals.floorAdjustment > 0 && (
              <div className="flex justify-between items-center text-[#0E1A2B]">
                <span>Minimum project fee adjustment</span>
                <span className="font-semibold text-[#0047AB] font-tabular">
                  +{formatMoney(totals.floorAdjustment)}
                </span>
              </div>
            )}

            {/* Package Subtotal */}
            <div className="flex justify-between items-center text-[#5B6676] pt-1 border-t border-[#D9D4C7]/60">
              <span>Agreed package subtotal</span>
              <span className="font-semibold text-[#0E1A2B] font-tabular">
                {formatMoney(totals.subtotal)}
              </span>
            </div>

            {/* Discount Line */}
            {totals.discount > 0 && (
              <div className="flex justify-between items-center text-[#067647]">
                <span>Upfront payment discount</span>
                <span className="font-semibold font-tabular">
                  -{formatMoney(totals.discount)}
                </span>
              </div>
            )}

            {/* Tax Line */}
            {totals.taxRate > 0 && (
              <div className="flex justify-between items-center text-[#5B6676]">
                <span>
                  {totals.taxType} ({totals.taxRate}% {totals.taxMode})
                </span>
                <span className="font-semibold text-[#0E1A2B] font-tabular">
                  {formatMoney(totals.tax)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t-2 border-[#0047AB] flex justify-between items-baseline">
              <span className="text-sm font-bold text-[#0E1A2B]">Total contract investment</span>
              <span
                className="text-[22px] font-black text-[#0047AB] font-tabular leading-none"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                {formatMoney(totals.total)}
              </span>
            </div>

            {/* Reverse Charge Note */}
            {reverseChargeEnabled && reverseChargeText && (
              <div className="pt-2 text-[11px] text-[#5B6676] font-medium italic border-t border-[#D9D4C7]/60 leading-tight">
                {reverseChargeText}
              </div>
            )}
          </div>
        </section>

        {/* =============================================================
           6. SECTION: PAYMENT SCHEDULE (Milestones)
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-3 payment-schedule-box">
          <h2
            className="text-base font-bold text-[#0E1A2B] flex items-center gap-1.5"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            <span>{getNextSectionNumber()}</span>
            <span>Milestone payment schedule</span>
          </h2>
          <p className="text-xs text-[#5B6676]">
            Installments are invoiced in sequence upon completion of each milestone trigger.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9D4C7] text-[#5B6676] font-semibold bg-[#F3F7FD]/60">
                  <th scope="col" className="py-2.5 px-3">Milestone</th>
                  <th scope="col" className="py-2.5 px-3 w-16 text-right">Percent</th>
                  <th scope="col" className="py-2.5 px-3 w-28 text-right">Amount due</th>
                  <th scope="col" className="py-2.5 px-3">Trigger / Due condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {totals.schedule.map((inst, idx) => (
                  <tr key={idx} className="break-inside-avoid">
                    <td className="py-3 px-3 font-semibold text-[#0E1A2B]">{inst.milestone}</td>
                    <td className="py-3 px-3 text-right text-[#5B6676] font-tabular">{inst.percentage}%</td>
                    <td className="py-3 px-3 text-right font-bold text-[#0E1A2B] font-tabular">
                      {formatMoney(inst.amount)}
                    </td>
                    <td className="py-3 px-3 text-[#5B6676]">{inst.dueTrigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* =============================================================
           7. SECTION: HOW TO PAY (Remittance Details)
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-3 how-to-pay-box">
          <h2
            className="text-base font-bold text-[#0E1A2B] flex items-center gap-1.5"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            <span>{getNextSectionNumber()}</span>
            <span>How to pay</span>
          </h2>

          {!hasPaymentDetails ? (
            <div className="p-4 rounded-xl bg-[#FFF4CC] border border-[#FFC72C] text-xs text-[#B54708] font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Add payment details before sending this proposal to the client.</span>
            </div>
          ) : (
            <div className="bg-[#F3F7FD] rounded-xl border border-[#D9D4C7] p-5 text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#0047AB] font-bold">
                <Building className="w-4 h-4" />
                <span>Remittance instructions ({paymentMethod.replace('_', ' ')})</span>
              </div>
              <p className="text-[#0E1A2B] font-medium whitespace-pre-line leading-relaxed">
                {paymentDetails}
              </p>
              <p className="text-[11px] text-[#5B6676] pt-1">
                Please reference <strong>{proposalId}</strong> in your payment description for automatic reconciliation.
              </p>
            </div>
          )}
        </section>

        {/* =============================================================
           8. SECTION: TERMS & CONDITIONS
           ============================================================= */}
        {proposal.termsAndConditions && (
          <section className="py-6 border-b border-[#D9D4C7] space-y-3">
            <h2
              className="text-base font-bold text-[#0E1A2B] flex items-center gap-1.5"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              <span>{getNextSectionNumber()}</span>
              <span>Terms of agreement</span>
            </h2>
            <div className="text-xs text-[#0E1A2B] space-y-2 whitespace-pre-line leading-relaxed">
              {(() => {
                const varCtx = buildVariableContext({ proposal, user, client: effectiveClient });
                const resolved = resolveVariables(proposal.termsAndConditions, varCtx);
                // Guaranteed: raw {{...}} text must never appear on a document
                const clean = resolved.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '').trim();
                return sanitizeFreeText(clean);
              })()}
            </div>

            {/* Scope Exclusions */}
            {notIncludedList.length > 0 && (
              <div className="pt-3">
                <span className="text-xs font-bold text-[#0E1A2B] block mb-1.5">
                  Explicit scope exclusions
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-[#5B6676]">
                  {notIncludedList.map((exc, i) => (
                    <li key={i}>{exc}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* =============================================================
           9. SECTION: ACCEPTANCE & SIGNATURES
           ============================================================= */}
        <section className="py-8 space-y-6 acceptance-section signature-box">
          <h2
            className="text-base font-bold text-[#0E1A2B] flex items-center gap-1.5"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            <span>{getNextSectionNumber()}</span>
            <span>Acceptance and authorization</span>
          </h2>
          <p className="text-xs text-[#5B6676] leading-relaxed">
            By signing below or approving this agreement, both parties authorize the scope, investment, and payment schedule set forth in proposal {proposalId}.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
            {/* Freelancer Column */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#5B6676] uppercase tracking-wider block">
                Authorized provider
              </span>
              <div className="h-16 flex items-end">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Authorized signature"
                    className="max-h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="w-full border-b border-[#0E1A2B] pb-1 text-xs font-semibold text-[#0E1A2B]">
                    {user?.name || businessName}
                  </div>
                )}
              </div>
              <div className="text-xs text-[#5B6676] space-y-0.5">
                <p className="font-semibold text-[#0E1A2B]">{user?.name || businessName}</p>
                <p>{businessName}</p>
                <p>Date: {issueDate}</p>
              </div>
            </div>

            {/* Client Column */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#5B6676] uppercase tracking-wider block">
                Client acceptance
              </span>
              <div className="h-16 flex items-end">
                <div className="w-full border-b border-dashed border-[#5B6676] pb-1 text-xs text-[#5B6676]">
                  Signature line
                </div>
              </div>
              <div className="text-xs text-[#5B6676] space-y-0.5">
                <p className="font-semibold text-[#0E1A2B]">{contactPerson || clientCompany || 'Authorized representative'}</p>
                <p>{clientCompany || 'Client company'}</p>
                <p>Date: ________________________</p>
              </div>
            </div>
          </div>
        </section>

        {/* =============================================================
           10. DOCUMENT FOOTER (Page number & branding)
           ============================================================= */}
        <footer className="mt-8 pt-4 border-t border-[#D9D4C7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#5B6676]">
          <span>
            {proposalId} · {businessName}
          </span>
          <div className="flex items-center gap-3">
            {!isAgencyPlan && (
              <span>Created with Floorly</span>
            )}
            <span className="font-medium text-[#0E1A2B]">Official proposal</span>
          </div>
        </footer>
      </article>
    </div>
  );
}

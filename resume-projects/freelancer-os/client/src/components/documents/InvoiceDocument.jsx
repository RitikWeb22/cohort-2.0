import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Printer,
  Download,
  X,
  AlertTriangle,
  Building,
  CreditCard,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { sanitizeFreeText } from '../../utils/documentSanitizer';

/**
 * Pure, shared printable invoice document sheet.
 * Rendered by:
 * 1. In-app preview modal (InvoiceDocument)
 * 2. Dedicated print route (/invoices/:id/print)
 * 3. Server-side PDF export (Puppeteer)
 */
export function InvoiceDocumentSheet({
  invoice,
  client = null,
  user = null,
  printMode = false,
  pageSize = 'A4',
}) {
  if (!invoice) return null;

  const currency = invoice.currency || user?.currency || 'USD';
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
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Business & Freelancer details
  const businessName = user?.businessName || user?.name || user?.fullName || 'Studio Labs';
  const businessEmail = user?.businessEmail || user?.email || '';
  const businessPhone = user?.businessPhone || '';
  const businessAddress = user?.businessAddress || '';
  const taxId = user?.taxId || invoice.taxId || '';
  const taxLabel = user?.taxType || invoice.taxType || 'VAT';
  const logoUrl = invoice?.logoUrl || user?.logoUrl || '';
  const signatureUrl = invoice?.signatureUrl || user?.signatureUrl || '';

  // Client details
  const effectiveClient = client || invoice.client || invoice.clientId || {};
  const clientCompany = (effectiveClient.company || '').trim();
  const contactPerson = (effectiveClient.contactPerson || effectiveClient.name || '').trim();
  const clientEmail = (effectiveClient.email || '').trim();
  const clientAddress = (effectiveClient.billingAddress || effectiveClient.address || '').trim();
  const clientTaxId = (effectiveClient.taxId || '').trim();
  const showAttention = clientCompany && contactPerson && clientCompany.toLowerCase() !== contactPerson.toLowerCase();

  // Invoice numbers and dates
  const invoiceNumber = invoice.invoiceNumber || 'INV-DRAFT';
  const issueDate = formatDate(invoice.issueDate || invoice.createdAt || new Date());
  const dueDate = formatDate(invoice.dueDate || new Date(Date.now() + 15 * 86400000));
  const status = (invoice.status || 'sent').toLowerCase();

  // Line items
  const lineItems = (invoice.lineItems || []).map((item, idx) => {
    const desc = (item.description || 'Professional Services').replace(/^Proposal:\s*/i, '');
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.unitPrice) !== undefined && !isNaN(Number(item.unitPrice)) ? Number(item.unitPrice) : (Number(item.amount) || 0);
    const amount = Number(item.amount) !== undefined && !isNaN(Number(item.amount)) ? Number(item.amount) : qty * rate;
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

  // Financial calculations & Invariant checks
  const subtotal = Math.round(Number(invoice.subtotal !== undefined ? invoice.subtotal : lineItems.reduce((acc, i) => acc + i.amount, 0)));
  const discount = Math.round(Number(invoice.discountAmount || 0));
  const taxRate = Number(invoice.taxRate || 0);
  const taxMode = invoice.taxMode || 'exclusive';
  const taxAmount = Math.round(Number(invoice.taxAmount || 0));
  const totalAmount = Math.round(Number(invoice.totalAmount !== undefined ? invoice.totalAmount : (taxMode === 'inclusive' ? subtotal - discount : subtotal - discount + taxAmount)));
  const amountPaid = Math.round(Number(invoice.amountPaid || 0));
  const balanceDue = Math.round(Number(invoice.balanceDue !== undefined ? invoice.balanceDue : Math.max(0, totalAmount - amountPaid)));

  // Assertions
  const expectedTotal = taxMode === 'inclusive' ? Math.max(0, subtotal - discount) : Math.max(0, subtotal - discount + taxAmount);
  const mathValid = (Math.abs(expectedTotal - totalAmount) <= 1) && (Math.abs((totalAmount - amountPaid) - balanceDue) <= 1);

  // Payment Details (support both paymentMethods object and legacy flat attributes)
  const pmBank = user?.paymentMethods?.bankTransfer;
  const pmPaypal = user?.paymentMethods?.paypal;
  const pmOnline = user?.paymentMethods?.onlinePayment;
  const pmUpi = user?.paymentMethods?.upi;
  const pmOther = user?.paymentMethods?.other;

  const bankAccountName = sanitizeFreeText(pmBank?.accountHolder || user?.bankAccountName || user?.accountName || businessName);
  const iban = sanitizeFreeText(pmBank?.iban || pmBank?.accountNumber || user?.iban || user?.accountNumber || '');
  const swiftBic = sanitizeFreeText(pmBank?.swiftBic || user?.swiftBic || user?.routingNumber || '');
  const bankName = sanitizeFreeText(pmBank?.bankName || user?.bankName || '');
  const routingCode = sanitizeFreeText(pmBank?.routingCode || '');
  const routingCodeLabel = sanitizeFreeText(pmBank?.routingCodeLabel || 'Routing code');

  const paypalEmail = sanitizeFreeText(pmPaypal?.email || user?.paypalEmail || '');
  const stripePaymentUrl = sanitizeFreeText(pmOnline?.url || invoice.stripePaymentUrl || user?.stripePaymentUrl || '');
  const upiId = sanitizeFreeText(pmUpi?.upiId || user?.upiId || '');
  const customInstructions = sanitizeFreeText(pmOther?.instructions || invoice.paymentInstructions || user?.paymentInstructions || '');

  const hasBank = Boolean(iban);
  const hasOnlineLink = Boolean(stripePaymentUrl || paypalEmail);
  const hasUpi = currency.toUpperCase() === 'INR' && Boolean(upiId);
  const hasPaymentDetails = hasBank || hasOnlineLink || hasUpi || Boolean(customInstructions);

  const reverseChargeEnabled = invoice.reverseChargeNote === true || invoice.reverseChargeNote === 'true' || user?.reverseChargeNote === true;
  const reverseChargeText = sanitizeFreeText(invoice.reverseChargeText || user?.reverseChargeText) || 'VAT reverse charge applies: the customer is liable for VAT.';

  const isAgencyPlan = (user?.plan || '').toLowerCase() === 'agency';

  // Status Badge Rendering
  const renderStatusBadge = () => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#E7F6EC] text-[#067647] border border-[#067647]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Paid in full</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#FFF4CC] text-[#B54708] border border-[#FFC72C]/40">
            <Clock className="w-3.5 h-3.5" />
            <span>Partially paid</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#FEE4E2] text-[#B42318] border border-[#B42318]/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-white text-[#5B6676] border border-[#D9D4C7]">
            <span>Draft</span>
          </span>
        );
      case 'cancelled':
      case 'void':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#FEE4E2] text-[#B42318] border border-[#B42318]/20">
            <span>Void</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-[#E8F0FB] text-[#0047AB] border border-[#0047AB]/20">
            <span>Payment due</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`invoice-document-container w-full ${printMode ? 'invoice-print-mode' : ''}`}
      style={{ backgroundColor: printMode ? '#ffffff' : 'transparent' }}
    >
      <article
        className="invoice-document-sheet bg-white text-[#0E1A2B] rounded-2xl border border-[#D9D4C7] p-8 sm:p-12 md:p-14 mx-auto font-sans leading-relaxed relative"
        style={{
          maxWidth: '794px', // A4 width at 96 DPI
          minHeight: '1123px', // A4 height
          boxShadow: printMode ? 'none' : '0 10px 30px -10px rgba(14, 26, 43, 0.08)',
          borderColor: printMode ? 'transparent' : '#D9D4C7',
          color: '#0E1A2B',
          fontFamily: "'Instrument Sans', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Draft or Void Watermark Overlay */}
        {(status === 'draft' || status === 'void' || status === 'cancelled') && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          >
            <span
              className="text-[120px] font-black uppercase tracking-widest text-[#0E1A2B]/[0.04] rotate-[-25deg]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {status === 'draft' ? 'Draft' : 'Void'}
            </span>
          </div>
        )}

        {/* =============================================================
           1. INVOICE HEADER (Letterhead & Meta)
           ============================================================= */}
        <header className="pb-8 border-b-2 border-[#0047AB] flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10">
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

          {/* Right: Invoice Title & Meta */}
          <div className="sm:text-right space-y-1">
            <span
              className="text-[28px] font-extrabold text-[#0047AB] tracking-tight block leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Invoice
            </span>
            <span className="text-sm font-bold text-[#0E1A2B] block pt-1 font-tabular">
              {invoiceNumber}
            </span>

            <div className="pt-2">
              {renderStatusBadge()}
            </div>

            <div className="text-xs text-[#5B6676] space-y-0.5 pt-2">
              <p>Issue date: <span className="font-semibold text-[#0E1A2B]">{issueDate}</span></p>
              <p>Payment due: <span className="font-semibold text-[#0E1A2B]">{dueDate}</span></p>
            </div>
          </div>
        </header>

        {/* =============================================================
           2. PARTIES & REFERENCE BLOCK
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs relative z-10">
          {/* Billed To */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#5B6676] uppercase tracking-wider block">
              Billed to
            </span>
            <p className="text-sm font-bold text-[#0E1A2B]">
              {clientCompany || contactPerson || 'Client'}
            </p>
            {showAttention && (
              <p className="text-xs text-[#5B6676]">
                Attention: <span className="text-[#0E1A2B] font-medium">{contactPerson}</span>
              </p>
            )}
            {clientAddress && (
              <p className="text-xs text-[#5B6676] whitespace-pre-line leading-relaxed">
                {clientAddress}
              </p>
            )}
            {clientEmail && (
              <p className="text-xs text-[#5B6676]">{clientEmail}</p>
            )}
            {clientTaxId && (
              <p className="text-xs text-[#5B6676] pt-0.5">VAT / Tax ID: {clientTaxId}</p>
            )}
          </div>

          {/* Reference Line */}
          <div className="space-y-1 sm:text-right">
            <span className="text-[11px] font-bold text-[#5B6676] uppercase tracking-wider block">
              Payment terms & reference
            </span>
            <p className="text-xs text-[#0E1A2B] font-medium">
              Terms: <span className="font-semibold">{invoice.paymentTerms || 'Net 15 days'}</span>
            </p>
            <p className="text-xs text-[#5B6676]">
              Currency: <span className="text-[#0E1A2B] font-semibold">{currency}</span>
            </p>
            {(invoice.projectTitle || invoice.projectId) && (
              <p className="text-xs text-[#5B6676]">
                Project: <span className="text-[#0E1A2B] font-medium">{invoice.projectTitle || 'Client engagement'}</span>
              </p>
            )}
            {taxMode === 'inclusive' && (
              <p className="text-[11px] text-[#5B6676] pt-0.5">
                Tax-inclusive pricing model
              </p>
            )}
          </div>
        </section>

        {/* =============================================================
           3. LINE ITEMS TABLE
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-3 relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9D4C7] text-[#5B6676] font-semibold bg-[#F3F7FD]/70">
                  <th scope="col" className="py-2.5 px-3 w-10">#</th>
                  <th scope="col" className="py-2.5 px-3">Description</th>
                  <th scope="col" className="py-2.5 px-3 w-20 text-right">Qty / Hrs</th>
                  <th scope="col" className="py-2.5 px-3 w-24 text-right">Rate</th>
                  <th scope="col" className="py-2.5 px-3 w-28 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {lineItems.map((item) => (
                  <tr key={item.index} className="break-inside-avoid">
                    <td className="py-3 px-3 text-[#5B6676] font-medium">{item.index}</td>
                    <td className="py-3 px-3 text-[#0E1A2B] font-medium leading-relaxed">
                      {item.description}
                    </td>
                    <td className="py-3 px-3 text-right text-[#5B6676] font-tabular">
                      {item.isFixedMilestone ? '—' : item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right text-[#5B6676] font-tabular">
                      {item.isFixedMilestone ? '—' : formatMoney(item.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#0E1A2B] font-tabular">
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* =============================================================
           4. TOTALS BOX (Subtotal, Discount, Tax, Paid, Balance Due)
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-3 invoice-totals-box relative z-10">
          <div className="bg-[#F3F7FD] rounded-xl border border-[#D9D4C7] p-5 max-w-sm ml-auto space-y-2 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-[#5B6676]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#0E1A2B] font-tabular">
                {formatMoney(subtotal)}
              </span>
            </div>

            {/* Discount */}
            {discount > 0 && (
              <div className="flex justify-between items-center text-[#067647]">
                <span>Discount</span>
                <span className="font-semibold font-tabular">
                  -{formatMoney(discount)}
                </span>
              </div>
            )}

            {/* Tax */}
            {taxRate > 0 && (
              <div className="flex justify-between items-center text-[#5B6676]">
                <span>
                  {taxLabel} ({taxRate}% {taxMode})
                </span>
                <span className="font-semibold text-[#0E1A2B] font-tabular">
                  {formatMoney(taxAmount)}
                </span>
              </div>
            )}

            {/* Invoice Total */}
            <div className="flex justify-between items-center text-[#0E1A2B] pt-2 border-t border-[#D9D4C7]/80">
              <span className="font-bold">Total invoice amount</span>
              <span className="font-bold font-tabular text-sm">
                {formatMoney(totalAmount)}
              </span>
            </div>

            {/* Amount Paid */}
            {amountPaid > 0 && (
              <div className="flex justify-between items-center text-[#067647]">
                <span>Payments received</span>
                <span className="font-semibold font-tabular">
                  -{formatMoney(amountPaid)}
                </span>
              </div>
            )}

            {/* Balance Due (Cobalt & Emphasized) */}
            <div className="pt-3 border-t-2 border-[#0047AB] flex justify-between items-baseline">
              <span className="text-sm font-black text-[#0E1A2B]">Balance due</span>
              <span
                className="text-[22px] font-black text-[#0047AB] font-tabular leading-none"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                {formatMoney(balanceDue)}
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
           5. HOW TO PAY (Remittance Details)
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] space-y-3 invoice-payment-details-box relative z-10">
          <h2
            className="text-sm font-bold text-[#0E1A2B] flex items-center gap-1.5"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            <span>Payment instructions</span>
          </h2>

          {!hasPaymentDetails ? (
            <div className="p-4 rounded-xl bg-[#FFF4CC] border border-[#FFC72C] text-xs text-[#B54708] font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Add payment details in Settings first before sending this invoice.</span>
            </div>
          ) : (
            <div className="bg-[#F3F7FD] rounded-xl border border-[#D9D4C7] p-5 text-xs space-y-2.5">
              {/* Bank Transfer Details */}
              {hasBank && (
                <div className="space-y-1">
                  <span className="font-bold text-[#0047AB] block">
                    Direct bank transfer
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#0E1A2B]">
                    <p>Account name: <strong>{bankAccountName}</strong></p>
                    {bankName && <p>Bank: <strong>{bankName}</strong></p>}
                    <p>IBAN / Account: <strong className="font-tabular">{iban}</strong></p>
                    {swiftBic && <p>SWIFT / BIC: <strong className="font-tabular">{swiftBic}</strong></p>}
                  </div>
                </div>
              )}

              {/* Online Links (Stripe / PayPal) */}
              {hasOnlineLink && (
                <div className="pt-2 border-t border-[#D9D4C7]/60 space-y-1">
                  <span className="font-bold text-[#0047AB] block">
                    Online card / payment link
                  </span>
                  {stripePaymentUrl && (
                    <div className="space-y-0.5">
                      <a
                        href={stripePaymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0047AB] underline font-semibold break-all"
                      >
                        {stripePaymentUrl}
                      </a>
                    </div>
                  )}
                  {paypalEmail && (
                    <p className="text-[#0E1A2B]">
                      PayPal: <strong>{paypalEmail}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* UPI (INR only) */}
              {hasUpi && (
                <div className="pt-2 border-t border-[#D9D4C7]/60">
                  <span className="font-bold text-[#0047AB] block">UPI ID</span>
                  <p className="text-[#0E1A2B]"><strong>{upiId}</strong></p>
                </div>
              )}

              {/* Custom Instructions */}
              {customInstructions && (
                <div className="pt-2 border-t border-[#D9D4C7]/60">
                  <p className="text-[#0E1A2B] whitespace-pre-line leading-relaxed">
                    {customInstructions}
                  </p>
                </div>
              )}

              {/* Reference Instruction */}
              <div className="pt-2 border-t border-[#D9D4C7]/60 text-[11px] text-[#5B6676]">
                Please use <strong className="text-[#0E1A2B] font-semibold">{invoiceNumber}</strong> as the payment reference for immediate reconciliation.
              </div>
            </div>
          )}
        </section>

        {/* =============================================================
           6. NOTES & TERMS
           ============================================================= */}
        {/* =============================================================
           6. NOTES & TERMS / SIGN-OFF
           ============================================================= */}
        <section className="py-6 border-b border-[#D9D4C7] invoice-notes-terms-box relative z-10 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div className="max-w-md space-y-2">
            <h2 className="text-xs font-bold text-[#5B6676] uppercase tracking-wider">
              Notes & terms
            </h2>
            {sanitizeFreeText(invoice.lateFeeTerms) && (
              <p className="text-[#5B6676] leading-relaxed">
                {sanitizeFreeText(invoice.lateFeeTerms)}
              </p>
            )}
            {sanitizeFreeText(invoice.notes) && (
              <p className="text-[#0E1A2B] leading-relaxed whitespace-pre-line pt-1">
                {sanitizeFreeText(invoice.notes)}
              </p>
            )}
            <p className="text-[11px] text-[#5B6676] pt-1">
              Thank you for your business.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0 min-w-[140px] sm:ml-auto">
            <div className="min-h-[38px] flex items-end sm:justify-end mb-1">
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="Authorized signature"
                  className="max-h-11 w-auto object-contain block sm:ml-auto"
                />
              ) : (
                <span className="font-semibold text-xs text-[#0E1A2B]">
                  {user?.name || user?.fullName || businessName}
                </span>
              )}
            </div>
            <div className="border-t border-[#0E1A2B] pt-1 text-[10px] uppercase tracking-wider text-[#5B6676]">
              Authorized signature
            </div>
            <div className="font-semibold text-[#0E1A2B] text-xs mt-0.5">
              {businessName}
            </div>
          </div>
        </section>

        {/* =============================================================
           7. DOCUMENT FOOTER (Page number & branding)
           ============================================================= */}
        <footer className="mt-8 pt-4 border-t border-[#D9D4C7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#5B6676] relative z-10">
          <span>
            {invoiceNumber} · {businessName}
          </span>
          <div className="flex items-center gap-3">
            {!isAgencyPlan && (
              <span>Created with Floorly</span>
            )}
            <span className="font-semibold text-[#0E1A2B]">Official tax invoice</span>
          </div>
        </footer>
      </article>
    </div>
  );
}

/**
 * In-app preview modal component for Invoices.
 * Used by InvoicesPage:
 * <InvoiceDocument invoice={selectedInvoice} client={selectedInvoice.client} user={user} onClose={() => setIsPrintInvoiceOpen(false)} />
 */
export function InvoiceDocument({ invoice, client, user, onClose }) {
  const modalRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const invoiceId = invoice?.id || invoice?._id;
  const invoiceNumber = invoice?.invoiceNumber || 'INV';
  const effectiveClient = client || invoice?.client || invoice?.clientId;
  const clientName = (effectiveClient?.company || effectiveClient?.name || 'Client')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  // Focus trap & Escape key
  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocusedElementRef.current?.focus) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [onClose]);

  // NEVER print inside modal: open dedicated print route
  const handlePrint = useCallback(() => {
    if (!invoiceId) return;
    const printUrl = `/invoices/${invoiceId}/print`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  }, [invoiceId]);

  // Server-side PDF download with fallback
  const handleDownloadPdf = async () => {
    if (!invoiceId) return;
    setIsDownloading(true);
    setDownloadError(null);

    const filename = `Invoice-${invoiceNumber}-${clientName}.pdf`;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('floorly_token');
      const res = await fetch(`/api/v1/invoices/${invoiceId}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Server invoice PDF generation unavailable, falling back to print route:', err);
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
      ref={modalRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* =============================================================
         STICKY MODAL TOOLBAR
         ============================================================= */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#D9D4C7] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2
              id="invoice-modal-title"
              className="text-sm sm:text-base font-bold text-[#0E1A2B] truncate"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Invoice {invoiceNumber}
            </h2>
            <p className="text-xs text-[#5B6676] truncate">
              {clientName.replace(/_/g, ' ')} · Due {new Date(invoice.dueDate || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Print Button (Opens dedicated print route) */}
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print or save invoice as PDF"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D9D4C7] text-xs font-semibold text-[#0E1A2B] hover:bg-[#F3F7FD] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#5B6676]" />
            <span className="hidden sm:inline">Print / Save as PDF</span>
            <span className="sm:hidden">Print</span>
          </button>

          {/* Download PDF Button (Cobalt Primary) */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            aria-label="Download official invoice PDF"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] disabled:opacity-50 cursor-pointer shadow-sm"
            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice preview"
            className="p-1.5 rounded-full text-[#5B6676] hover:text-[#0E1A2B] hover:bg-[#F3F7FD] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Download Error Banner if any */}
      {downloadError && (
        <div className="bg-[#FEE4E2] border-b border-[#B42318]/20 px-6 py-2 text-xs text-[#B42318] font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* =============================================================
         DOCUMENT CANVAS (#EEE9DC)
         ============================================================= */}
      <main
        className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 flex justify-center items-start"
        style={{ backgroundColor: '#EEE9DC' }}
      >
        <div className="w-full max-w-[794px] overflow-hidden sm:overflow-visible flex justify-center">
          <InvoiceDocumentSheet
            invoice={invoice}
            client={client}
            user={user}
            printMode={false}
          />
        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Receipt,
  CreditCard,
  Building,
} from 'lucide-react';

/**
 * Pure, shared printable payment receipt sheet.
 * Rendered by:
 * 1. In-app preview modal (PaymentReceiptDocument)
 * 2. Dedicated print route (/invoices/payments/:paymentId/print)
 * 3. Server-side PDF export (Puppeteer)
 */
export function PaymentReceiptDocumentSheet({
  payment,
  invoice = null,
  client = null,
  user = null,
  printMode = false,
  pageSize = 'A4',
}) {
  if (!payment) return null;

  const currency = invoice?.currency || payment.currency || user?.currency || 'USD';

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
  const taxId = user?.taxId || '';
  const taxLabel = user?.taxType || 'Tax';
  const logoUrl = payment?.logoUrl || invoice?.logoUrl || user?.logoUrl || '';
  const signatureUrl = payment?.signatureUrl || invoice?.signatureUrl || user?.signatureUrl || '';

  // Client details
  const effectiveClient = client || payment.client || invoice?.client || invoice?.clientId || {};
  const clientCompany = (effectiveClient.company || '').trim();
  const contactPerson = (effectiveClient.contactPerson || effectiveClient.name || '').trim();
  const clientEmail = (effectiveClient.email || '').trim();
  const clientAddress = (effectiveClient.billingAddress || effectiveClient.address || '').trim();
  const clientTaxId = (effectiveClient.taxId || '').trim();
  const showAttention = clientCompany && contactPerson && clientCompany.toLowerCase() !== contactPerson.toLowerCase();

  // Receipt formatting
  const currentYear = new Date().getFullYear();
  const paymentYear = payment.paymentDate ? new Date(payment.paymentDate).getFullYear() : currentYear;
  const rawId = (payment._id || payment.id || '').toString();
  const rawRef = (payment.transactionReference || '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
  const seqSuffix = rawRef || rawId.slice(-3) || '001';
  const receiptNumber = payment.receiptNumber || `RCT-${paymentYear}-${seqSuffix.toUpperCase()}`;

  const paymentDate = formatDate(payment.paymentDate || payment.createdAt || new Date());
  const recordedDate = formatDate(payment.createdAt || payment.paymentDate || new Date());

  // Linked invoice details
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

  return (
    <article
      className={`receipt-document-sheet relative w-full bg-white text-[#0E1A2B] ${
        printMode ? 'p-0 shadow-none border-none' : 'p-8 sm:p-12 md:p-14 shadow-lg border border-[#D9D4C7] rounded-xl'
      }`}
      style={{
        boxSizing: 'border-box',
        color: '#0E1A2B',
        fontFamily: "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: '10.5pt',
        lineHeight: 1.5,
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* =============================================================
         HEADER: Logo / Letterhead left, Receipt Meta right
         ============================================================= */}
      <header
        className="receipt-header flex justify-between items-start pb-6 mb-6"
        style={{ borderBottom: '2pt solid var(--cobalt, #0047AB)' }}
      >
        <div className="max-w-[55%]">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={businessName}
              className="max-h-12 w-auto object-contain mb-2.5"
            />
          ) : (
            <h1
              className="text-xl sm:text-2xl font-black text-[#0E1A2B] leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {businessName}
            </h1>
          )}

          {businessAddress && (
            <p className="text-xs text-[#5B6676] whitespace-pre-line leading-relaxed mt-1">
              {businessAddress}
            </p>
          )}

          <div className="text-xs text-[#5B6676] mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
            {businessEmail && <span>{businessEmail}</span>}
            {businessPhone && <span>· {businessPhone}</span>}
            {taxId && (
              <span>
                · {taxLabel} ID: <strong className="text-[#0E1A2B]">{taxId}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="inline-block bg-[#F3F7FD] border border-[#D9D4C7] px-3 py-1 rounded-full text-xs font-semibold text-[#0047AB] mb-2">
            Verified payment receipt
          </div>
          <h2
            className="text-2xl sm:text-3xl font-extrabold text-[#0047AB] tracking-tight leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Payment receipt
          </h2>

          <div
            className="text-sm font-bold text-[#0E1A2B] mt-2"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {receiptNumber}
          </div>

          <div className="text-xs text-[#5B6676] mt-2 space-y-0.5">
            <div>
              Payment date: <strong className="text-[#0E1A2B]">{paymentDate}</strong>
            </div>
            <div>
              Recorded on: <span className="text-[#0E1A2B]">{recordedDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* =============================================================
         PROMINENT AMOUNT RECEIVED BANNER
         ============================================================= */}
      <section
        className="receipt-summary-box mb-6 bg-[#F3F7FD] border border-[#D9D4C7] rounded-xl p-6 relative overflow-hidden"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        <div
          className="absolute top-0 left-0 bottom-0 w-1.5"
          style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-[#5B6676] uppercase tracking-wider block">
              Amount received
            </span>
            <div
              className="text-3xl sm:text-4xl font-extrabold text-[#0047AB] mt-1 tracking-tight"
              style={{
                fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatMoney(amountPaid)}
            </div>
          </div>

          <div className="text-xs text-[#5B6676] sm:text-right space-y-1">
            <div className="inline-flex items-center gap-1.5 font-semibold text-[#0E1A2B] bg-white border border-[#D9D4C7] px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0047AB]" />
              <span>Payment confirmed and reconciled</span>
            </div>
            <div>Applied to invoice {invNumber}</div>
          </div>
        </div>
      </section>

      {/* =============================================================
         METADATA GRID: Received From + Transaction Details
         ============================================================= */}
      <section
        className="receipt-details-box grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 mb-6"
        style={{
          borderBottom: '0.75pt solid #D9D4C7',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        <div>
          <h3 className="text-xs font-bold text-[#5B6676] uppercase tracking-wider mb-2">
            Received from
          </h3>
          <div className="text-sm font-bold text-[#0E1A2B]">
            {clientCompany || contactPerson || 'Valued Client'}
          </div>
          {showAttention && (
            <div className="text-xs text-[#5B6676] mt-0.5">
              Attention: <strong className="text-[#0E1A2B]">{contactPerson}</strong>
            </div>
          )}
          {clientAddress && (
            <p className="text-xs text-[#5B6676] whitespace-pre-line leading-relaxed mt-1">
              {clientAddress}
            </p>
          )}
          {clientEmail && (
            <div className="text-xs text-[#5B6676] mt-1">{clientEmail}</div>
          )}
          {clientTaxId && (
            <div className="text-xs text-[#5B6676] mt-1">
              Tax ID / VAT: <strong className="text-[#0E1A2B]">{clientTaxId}</strong>
            </div>
          )}
        </div>

        <div className="sm:text-right">
          <h3 className="text-xs font-bold text-[#5B6676] uppercase tracking-wider mb-2">
            Transaction details
          </h3>
          <div className="text-xs text-[#5B6676] space-y-1">
            <div>
              Payment method:{' '}
              <strong className="text-[#0E1A2B] capitalize">{paymentMethod}</strong>
            </div>
            <div>
              Payment reference / UTR:{' '}
              <strong
                className="text-[#0E1A2B]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {transactionRef}
              </strong>
            </div>
            <div>
              Applied invoice:{' '}
              <strong
                className="text-[#0047AB]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {invNumber}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* =============================================================
         INVOICE REMITTANCE TABLE
         ============================================================= */}
      <section
        className="receipt-table-section mb-6"
        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
      >
        <h3
          className="text-sm font-bold text-[#0E1A2B] mb-2"
          style={{
            fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
            breakAfter: 'avoid',
            pageBreakAfter: 'avoid',
          }}
        >
          Invoice remittance summary
        </h3>

        <div className="overflow-x-auto border border-[#D9D4C7] rounded-lg">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr style={{ backgroundColor: '#F3F7FD', borderBottom: '1pt solid #D9D4C7' }}>
                <th className="py-2.5 px-3 font-semibold text-[#5B6676]">Invoice reference</th>
                <th className="py-2.5 px-3 text-right font-semibold text-[#5B6676]">Total billed</th>
                <th className="py-2.5 px-3 text-right font-semibold text-[#5B6676]">Remitted this receipt</th>
                <th className="py-2.5 px-3 text-right font-semibold text-[#5B6676]">Remaining balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '0.5pt solid #D9D4C7' }}>
                <td
                  className="py-3 px-3 font-bold text-[#0047AB]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {invNumber}
                </td>
                <td
                  className="py-3 px-3 text-right text-[#0E1A2B] font-medium"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMoney(totalBilled)}
                </td>
                <td
                  className="py-3 px-3 text-right font-bold text-[#0047AB]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMoney(amountPaid)}
                </td>
                <td
                  className="py-3 px-3 text-right font-bold text-[#0E1A2B]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMoney(remainingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* =============================================================
         PAYMENT NOTES (If any)
         ============================================================= */}
      {payment.notes && (
        <section
          className="receipt-notes-box mb-6 bg-[#F3F7FD] border border-[#D9D4C7] rounded-lg p-4 text-xs"
          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
        >
          <div className="font-semibold text-[#0E1A2B] mb-1">Transaction notes</div>
          <p className="text-[#5B6676] leading-relaxed whitespace-pre-line">{payment.notes}</p>
        </section>
      )}

      {/* =============================================================
         AUTHENTICATION & SIGN-OFF FOOTER
         ============================================================= */}
      <footer
        className="receipt-footer pt-6 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-[#5B6676]"
        style={{
          borderTop: '0.75pt solid #D9D4C7',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        <div className="max-w-md space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#0E1A2B]">
            <ShieldCheck className="w-4 h-4 text-[#0047AB]" />
            <span>Digitally authenticated remittance voucher</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#5B6676]">
            Thank you for your business. This voucher serves as official proof of payment for your corporate accounting and tax reconciliation records.
          </p>
          {showWatermark && (
            <p className="text-[10px] text-[#5B6676] pt-1">
              Created with Floorly
            </p>
          )}
        </div>

        <div className="text-left sm:text-right shrink-0 min-w-[140px]">
          <div className="min-h-[36px] flex items-end sm:justify-end mb-1">
            {signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Authorized signature"
                className="max-h-10 w-auto object-contain block sm:ml-auto"
              />
            ) : null}
          </div>
          <div className="font-bold text-[#0E1A2B] text-sm">{businessName}</div>
          <div className="text-[11px] text-[#5B6676]">Authorized accounts department</div>
          <div
            className="mt-2 pt-1 w-44 border-t border-[#D9D4C7] sm:ml-auto text-[10px] text-[#5B6676]"
          >
            Official signature & stamp
          </div>
        </div>
      </footer>
    </article>
  );
}

/**
 * In-app interactive preview modal for payment receipt.
 * Retains exact props: { payment, invoice, client, user, onClose }
 */
export function PaymentReceiptDocument({ payment, invoice, client, user, onClose }) {
  const modalRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const paymentId = payment?.id || payment?._id;
  const currentYear = new Date().getFullYear();
  const paymentYear = payment?.paymentDate ? new Date(payment.paymentDate).getFullYear() : currentYear;
  const rawId = (payment?._id || payment?.id || '').toString();
  const rawRef = (payment?.transactionReference || '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
  const seqSuffix = rawRef || rawId.slice(-3) || '001';
  const receiptNumber = payment?.receiptNumber || `RCT-${paymentYear}-${seqSuffix.toUpperCase()}`;

  const effectiveClient = client || payment?.client || invoice?.client || invoice?.clientId;
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
    if (!paymentId) return;
    const printUrl = `/invoices/payments/${paymentId}/print`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  }, [paymentId]);

  // Server-side PDF download with fallback
  const handleDownloadPdf = async () => {
    if (!paymentId) return;
    setIsDownloading(true);
    setDownloadError(null);

    const filename = `Receipt-${receiptNumber}-${clientName}.pdf`;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('floorly_token');
      const res = await fetch(`/api/v1/invoices/payments/${paymentId}/pdf`, {
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
      console.warn('Server receipt PDF generation unavailable, falling back to print route:', err);
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      ref={modalRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Sticky Modal Toolbar */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#D9D4C7] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2
              id="receipt-modal-title"
              className="text-sm sm:text-base font-bold text-[#0E1A2B] truncate"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Payment receipt {receiptNumber}
            </h2>
            <p className="text-xs text-[#5B6676] truncate">
              {clientName.replace(/_/g, ' ')} · Recorded {new Date(payment.paymentDate || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Print Button (Opens dedicated print route) */}
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print or save payment receipt as PDF"
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
            aria-label="Download official receipt PDF"
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
            aria-label="Close receipt preview"
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

      {/* Document Canvas (#EEE9DC) */}
      <main
        className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 flex justify-center items-start"
        style={{ backgroundColor: '#EEE9DC' }}
      >
        <div className="w-full max-w-[794px] overflow-hidden sm:overflow-visible flex justify-center">
          <PaymentReceiptDocumentSheet
            payment={payment}
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

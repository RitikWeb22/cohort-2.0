import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Check,
  Loader2,
  CheckCircle2,
  Send,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { ProposalDocument } from './ProposalDocument';
import { computeProposalTotals } from '../../utils/pricingEngine';
import { validateUnresolvedVariables, buildVariableContext } from '../../utils/variableResolver';
import { api } from '../../lib/api';

export function ProposalDocumentModal({
  proposal,
  client = null,
  user = null,
  onClose,
  showHoursToClient = true,
  floorAdjustmentMode = 'spread', // 'spread' | 'separate'
}) {
  const modalRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const proposalId = proposal?.id || proposal?._id;
  const proposalNumber = proposal?.proposalNumber || 'PROP-DRAFT';
  const effectiveClient = client || proposal?.client || proposal?.clientId;
  const clientName = (effectiveClient?.company || effectiveClient?.name || 'Client').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  // Verify assertions
  const totals = computeProposalTotals(proposal, {
    showHoursToClient,
    floorAdjustmentMode,
  });

  // Save focus and manage focus trap + Esc key
  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button initially
    const closeBtn = modalRef.current?.querySelector('[data-modal-close]');
    if (closeBtn) {
      closeBtn.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocusedElementRef.current && previouslyFocusedElementRef.current.focus) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [onClose]);

  // Status Pill
  const renderStatusPill = (status) => {
    const s = (status || 'draft').toLowerCase();
    switch (s) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E7F6EC] text-[#067647] border border-[#067647]/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Accepted</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F0FB] text-[#0047AB] border border-[#0047AB]/20">
            <Send className="w-3 h-3" />
            <span>Sent</span>
          </span>
        );
      case 'declined':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FEE4E2] text-[#B42318] border border-[#B42318]/20">
            <span>Declined</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FEF0C7] text-[#B54708] border border-[#B54708]/20">
            <Clock className="w-3 h-3" />
            <span>Expired</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-[#5B6676] border border-[#D9D4C7]">
            <span>Draft</span>
          </span>
        );
    }
  };

  // Open dedicated print route (NEVER print inside modal)
  const handlePrint = useCallback(() => {
    if (!proposalId) return;
    const varContext = buildVariableContext({ proposal, user, client: effectiveClient });
    const unresErrors = validateUnresolvedVariables(proposal?.termsAndConditions || '', varContext);
    if (unresErrors.length > 0) {
      setDownloadError(unresErrors[0]);
      return;
    }
    const printUrl = `/proposals/${proposalId}/print`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  }, [proposalId, proposal, user, effectiveClient]);

  // Primary Server-side PDF Download with Fallback
  const handleDownloadPdf = async () => {
    if (!proposalId) return;

    const varContext = buildVariableContext({ proposal, user, client: effectiveClient });
    const unresErrors = validateUnresolvedVariables(proposal?.termsAndConditions || '', varContext);
    if (unresErrors.length > 0) {
      setDownloadError(unresErrors[0]);
      return;
    }

    if (!totals.assertionsPassed) {
      setDownloadError('Totals mismatch detected: please adjust line items before exporting.');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    const filename = `Proposal-${proposalNumber}-${clientName}.pdf`;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('floorly_token');
      const res = await fetch(`/api/v1/proposals/${proposalId}/pdf`, {
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
      console.warn('Server PDF generation unavailable, falling back to browser print:', err);
      // Fallback: Open dedicated print route where user can Save as PDF
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy share link
  const handleCopyShareLink = async () => {
    if (!proposalId) return;
    try {
      const res = await api.createProposalShareLink(proposalId);
      const shareUrl = res.shareUrl || `${window.location.origin}/p/${res.rawToken}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to create proposal share link', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-modal-title"
      ref={modalRef}
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* =============================================================
         1. STICKY MODAL TOOLBAR
         ============================================================= */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#D9D4C7] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-sm shrink-0">
        {/* Left: Title & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2
              id="proposal-modal-title"
              className="text-sm sm:text-base font-bold text-[#0E1A2B] truncate"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {proposal.title || `Proposal ${proposalNumber}`}
            </h2>
            <div className="flex items-center gap-2 pt-0.5 text-xs text-[#5B6676]">
              <span>{proposalNumber}</span>
              <span>·</span>
              {renderStatusPill(proposal.status)}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Copy Share Link */}
          <button
            type="button"
            onClick={handleCopyShareLink}
            aria-label="Copy share link"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D9D4C7] text-xs font-semibold text-[#0E1A2B] hover:bg-[#F3F7FD] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#067647]" />
                <span className="text-[#067647]">Link copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#5B6676]" />
                <span>Copy share link</span>
              </>
            )}
          </button>

          {/* Print Button (Opens dedicated print route) */}
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print or save proposal as PDF"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#D9D4C7] text-xs font-semibold text-[#0E1A2B] hover:bg-[#F3F7FD] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#5B6676]" />
            <span className="hidden sm:inline">Print / Save as PDF</span>
            <span className="sm:hidden">Print</span>
          </button>

          {/* Download PDF (Primary Cobalt) */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading || !totals.assertionsPassed}
            aria-label="Download official proposal PDF"
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
            data-modal-close
            onClick={onClose}
            aria-label="Close preview"
            className="p-1.5 rounded-full text-[#5B6676] hover:text-[#0E1A2B] hover:bg-[#F3F7FD] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Math Invariant Warning if triggered */}
      {!totals.assertionsPassed && (
        <div className="bg-[#FEE4E2] border-b border-[#B42318]/20 px-6 py-2 flex items-center justify-between text-xs text-[#B42318] font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Mathematical mismatch: Deliverables sum + adjustment must equal total before export.</span>
          </div>
        </div>
      )}

      {/* =============================================================
         2. DOCUMENT CANVAS (#EEE9DC)
         ============================================================= */}
      <main
        className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 flex justify-center items-start"
        style={{ backgroundColor: '#EEE9DC' }}
      >
        <div className="w-full max-w-[794px] overflow-hidden sm:overflow-visible flex justify-center">
          <ProposalDocument
            proposal={proposal}
            client={client}
            user={user}
            printMode={false}
            showHoursToClient={showHoursToClient}
            floorAdjustmentMode={floorAdjustmentMode}
          />
        </div>
      </main>
    </div>
  );
}

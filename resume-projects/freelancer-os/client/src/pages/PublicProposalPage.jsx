import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Building,
  Mail,
  Calendar,
  Lock,
} from 'lucide-react';
import { ProposalDocument } from '../components/documents/ProposalDocument';

export function PublicProposalPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Acceptance modal state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerNotes, setSignerNotes] = useState('');
  const [submittingAccept, setSubmittingAccept] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(null);

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [submittingDecline, setSubmittingDecline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProposal() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/v1/public/proposals/${token}`);
        const json = await res.json();
        if (!isMounted) return;
        if (!res.ok || !json.success) {
          setError(json.error || 'Proposal could not be loaded.');
        } else {
          setData(json);
          if (json.client?.contactPerson) {
            setSignerName(json.client.contactPerson);
          }
          if (json.client?.email) {
            setSignerEmail(json.client.email);
          }
        }
      } catch (err) {
        if (isMounted) setError('Network error loading proposal. Please check your connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (token) {
      fetchProposal();
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!signerName.trim() || !signerEmail.trim()) {
      alert('Please enter your full name and email address.');
      return;
    }

    try {
      setSubmittingAccept(true);
      const res = await fetch(`/api/v1/public/proposals/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: signerName.trim(),
          clientEmail: signerEmail.trim(),
          notes: signerNotes.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Failed to accept proposal.');
      } else {
        setAcceptSuccess(json);
        setShowAcceptModal(false);
        setData((prev) => ({
          ...prev,
          proposal: {
            ...prev.proposal,
            status: 'accepted',
            acceptedAt: json.acceptedAt,
            acceptedBy: json.acceptedBy,
          },
        }));
      }
    } catch (err) {
      alert('Network error while accepting proposal. Please try again.');
    } finally {
      setSubmittingAccept(false);
    }
  };

  const handleDecline = async (e) => {
    e.preventDefault();
    try {
      setSubmittingDecline(true);
      const res = await fetch(`/api/v1/public/proposals/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Failed to decline proposal.');
      } else {
        setShowDeclineModal(false);
        setData((prev) => ({
          ...prev,
          proposal: {
            ...prev.proposal,
            status: 'rejected',
          },
        }));
      }
    } catch (err) {
      alert('Network error while declining proposal.');
    } finally {
      setSubmittingDecline(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF5EA] flex flex-col items-center justify-center p-6 text-[#0E1A2B]">
        <Loader2 className="w-8 h-8 text-[#0047AB] animate-spin mb-4" />
        <h2 className="text-lg font-semibold font-serif">Loading Proposal Document...</h2>
        <p className="text-sm text-[#5B6676] mt-1">Verifying secure document authorization...</p>
      </div>
    );
  }

  if (error || !data?.proposal) {
    return (
      <div className="min-h-screen bg-[#FAF5EA] flex flex-col items-center justify-center p-6 text-[#0E1A2B]">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8E0CF] p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEE4E2] text-[#B42318] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-serif mb-2 text-[#0E1A2B]">Document Unavailable</h2>
          <p className="text-sm text-[#5B6676] mb-6">
            {error || 'This proposal link is invalid, has expired, or was revoked by the sender.'}
          </p>
          <div className="p-4 bg-[#FAF5EA] rounded-xl text-xs text-[#5B6676] text-left border border-[#E8E0CF]">
            <p className="font-semibold text-[#0E1A2B] mb-1">Need access?</p>
            <p>Please reach out directly to the person who shared this proposal with you to request an updated access link.</p>
          </div>
        </div>
      </div>
    );
  }

  const { proposal, client, user } = data;
  const isAccepted = proposal.status === 'accepted';
  const isDeclined = proposal.status === 'rejected';
  const canAct = !isAccepted && !isDeclined;

  return (
    <div className="min-h-screen bg-[#FAF5EA] text-[#0E1A2B] flex flex-col">
      {/* Top action header bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E0CF] px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0047AB] text-white flex items-center justify-center font-bold font-serif shadow-xs">
              {user?.businessName?.[0] || 'F'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#0E1A2B] tracking-tight">
                  {user?.businessName || 'Proposal'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#E8E0CF]/60 text-[#5B6676]">
                  {proposal.proposalNumber}
                </span>
                {isAccepted && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#E7F6EC] text-[#067647] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Accepted
                  </span>
                )}
                {isDeclined && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#FEE4E2] text-[#B42318] flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Declined
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5B6676] truncate max-w-xs sm:max-w-md">
                Prepared for <strong className="text-[#0E1A2B] font-medium">{client?.name || 'Client'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`/api/v1/public/proposals/${token}/pdf`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0E1A2B] bg-white hover:bg-[#FAF5EA] border border-[#E8E0CF] rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#5B6676]" />
              <span>Download PDF</span>
            </a>

            {canAct && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(true)}
                  className="px-3 py-2 text-xs font-medium text-[#5B6676] hover:text-[#B42318] hover:bg-[#FEE4E2]/50 rounded-lg transition-colors"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0047AB] hover:bg-[#003A8C] rounded-lg shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept Proposal</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Acceptance banner notice if already accepted */}
      {isAccepted && (
        <div className="bg-[#E7F6EC] border-b border-[#067647]/20 px-4 py-2.5 text-center text-xs font-medium text-[#067647] flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>
            This proposal was formally accepted on{' '}
            {new Date(proposal.acceptedAt || Date.now()).toLocaleDateString()}{' '}
            {proposal.acceptedBy ? `by ${proposal.acceptedBy}` : ''}.
          </span>
        </div>
      )}

      {/* Main document view wrapper */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8">
        <div className="bg-white rounded-2xl border border-[#E8E0CF] shadow-xs p-6 sm:p-12 overflow-hidden">
          <ProposalDocument
            proposal={proposal}
            client={client}
            user={user}
            printMode={false}
            showHoursToClient={true}
          />
        </div>

        {/* Security & Confidentiality footer */}
        <div className="mt-8 text-center text-xs text-[#5B6676] max-w-lg mx-auto pb-8 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[#5B6676]">
            <Lock className="w-3.5 h-3.5" />
            <span>Private & confidential document delivered via Floorly</span>
          </div>
          <p>© {new Date().getFullYear()} {user?.businessName || 'Floorly'}. All rights reserved.</p>
        </div>
      </main>

      {/* Acceptance Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1A2B]/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold font-serif text-[#0E1A2B] mb-1">Accept Proposal</h3>
            <p className="text-xs text-[#5B6676] mb-4">
              Please enter your details to formally approve proposal <strong>{proposal.proposalNumber}</strong>. An immutable acceptance timestamp will be recorded.
            </p>
            <form onSubmit={handleAccept} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0E1A2B] mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8E0CF] focus:outline-none focus:border-[#0047AB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0E1A2B] mb-1">Your Email Address *</label>
                <input
                  type="email"
                  required
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="e.g. jane@company.com"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8E0CF] focus:outline-none focus:border-[#0047AB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0E1A2B] mb-1">Optional Notes / Purchase Order Reference</label>
                <textarea
                  rows={2}
                  value={signerNotes}
                  onChange={(e) => setSignerNotes(e.target.value)}
                  placeholder="e.g. PO-2026-9901 approved by legal"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8E0CF] focus:outline-none focus:border-[#0047AB]"
                />
              </div>

              <div className="p-3 bg-[#FAF5EA] rounded-lg border border-[#E8E0CF] text-2xs text-[#5B6676]">
                By clicking <strong>Confirm Acceptance</strong>, you agree to the deliverables, milestone schedules, and terms set forth in this proposal.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-[#5B6676] hover:text-[#0E1A2B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAccept}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0047AB] hover:bg-[#003A8C] rounded-lg disabled:opacity-50"
                >
                  {submittingAccept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Acceptance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1A2B]/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold font-serif text-[#0E1A2B] mb-1">Decline Proposal</h3>
            <p className="text-xs text-[#5B6676] mb-4">
              Let the sender know why this proposal is being declined or if revisions are requested.
            </p>
            <form onSubmit={handleDecline} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0E1A2B] mb-1">Feedback / Reason</label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Budget timeline changed, or please adjust milestone 2 scope..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#E8E0CF] focus:outline-none focus:border-[#0047AB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-[#5B6676] hover:text-[#0E1A2B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDecline}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#B42318] hover:bg-[#911d13] rounded-lg disabled:opacity-50"
                >
                  {submittingDecline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Decline Proposal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

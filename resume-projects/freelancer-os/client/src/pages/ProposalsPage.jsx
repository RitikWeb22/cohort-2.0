import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
  Sparkles,
  Trash2,
  AlertTriangle,
  Receipt,
  Search,
  Filter,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Eye,
  X,
  ExternalLink,
  Copy,
  Check,
  Send,
  Plus,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { ProposalDocumentModal } from '../components/documents/ProposalDocumentModal';

export function ProposalsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast, showConfirm } = useNotificationStore();
  const { currency, format } = useCurrencyStore();

  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: 'grid' | 'table' (No "Studio")
  const [viewMode, setViewMode] = useState('grid');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
  const [sortField, setSortField] = useState('date'); // 'date' | 'amount' | 'client' | 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Preview Document Modal State
  const [previewProposal, setPreviewProposal] = useState(null);
  const [copiedProposalId, setCopiedProposalId] = useState(null);

  // Load Data
  const loadProposalsData = async () => {
    try {
      setIsLoading(true);
      const [pRes, cRes, sRes] = await Promise.all([
        api.getProposals(),
        api.getClients(),
        api.getPricingSettings(),
      ]);
      if (pRes?.proposals) setProposals(pRes.proposals);
      if (cRes?.clients) setClients(cRes.clients);
      if (sRes?.settings) setPricingSettings(sRes.settings);
    } catch (err) {
      console.error('Failed to load proposals list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProposalsData();
  }, []);

  // Format Status Pill Helper
  const renderStatusPill = (status) => {
    const s = (status || 'draft').toLowerCase();
    switch (s) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] border border-[var(--success,#067647)]/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Accepted</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] border border-[var(--cobalt,#0047AB)]/20">
            <Send className="w-3 h-3" />
            <span>Sent</span>
          </span>
        );
      case 'declined':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)] border border-[var(--error,#B42318)]/20">
            <span>Declined</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--warning-tint,#FEF0C7)] text-[var(--warning,#B54708)] border border-[var(--warning,#B54708)]/20">
            <Clock className="w-3 h-3" />
            <span>Expired</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] border border-[var(--line,#E8E0CF)]">
            <span>Draft</span>
          </span>
        );
    }
  };

  // KPI Calculations
  const kpiMetrics = useMemo(() => {
    let openPipelineValue = 0;
    let acceptedValue = 0;
    let acceptedCount = 0;
    let sentCount = 0;
    let totalRevenueProtected = 0;

    proposals.forEach(p => {
      const finalQuote = p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || p.pricingBreakdown?.recommendedPrice || 0;
      const raw = p.pricingBreakdown?.rawLabor || p.pricingBreakdown?.baseLaborCost || (
        (p.lineItems || []).reduce((sum, item) => sum + ((Number(item.hours) || 0) * (Number(item.rate) || 50)), 0)
      );

      // Revenue protected = max(0, finalQuote - raw)
      const protectedAmount = Math.max(0, finalQuote - raw);
      totalRevenueProtected += protectedAmount;

      const s = (p.status || 'draft').toLowerCase();
      if (s === 'draft' || s === 'sent') {
        openPipelineValue += finalQuote;
      }
      if (s === 'sent') {
        sentCount += 1;
      }
      if (s === 'accepted') {
        acceptedValue += finalQuote;
        acceptedCount += 1;
      }
    });

    return {
      openPipelineValue,
      acceptedValue,
      acceptedCount,
      sentCount,
      totalRevenueProtected,
    };
  }, [proposals]);

  // Status Counts for Toolbar Tabs
  const statusCounts = useMemo(() => {
    const counts = { all: proposals.length, draft: 0, sent: 0, accepted: 0, declined: 0, expired: 0 };
    proposals.forEach(p => {
      const s = (p.status || 'draft').toLowerCase();
      if (s === 'draft') counts.draft += 1;
      else if (s === 'sent') counts.sent += 1;
      else if (s === 'accepted') counts.accepted += 1;
      else if (s === 'declined' || s === 'rejected') counts.declined += 1;
      else if (s === 'expired') counts.expired += 1;
    });
    return counts;
  }, [proposals]);

  // Filter and Sort Proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const s = (p.status || 'draft').toLowerCase();
      if (statusFilter !== 'all') {
        if (statusFilter === 'declined') {
          if (s !== 'declined' && s !== 'rejected') return false;
        } else if (s !== statusFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const num = (p.proposalNumber || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const clientName = (p.client?.company || p.client?.name || p.clientId?.name || '').toLowerCase();
        return num.includes(query) || title.includes(query) || clientName.includes(query);
      }
      return true;
    }).sort((a, b) => {
      let valA = a.createdAt;
      let valB = b.createdAt;
      if (sortField === 'amount') {
        valA = a.pricingBreakdown?.totalAmount || a.pricingBreakdown?.subtotal || 0;
        valB = b.pricingBreakdown?.totalAmount || b.pricingBreakdown?.subtotal || 0;
      } else if (sortField === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (sortField === 'client') {
        valA = a.client?.company || a.client?.name || '';
        valB = b.client?.company || b.client?.name || '';
      }
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
  }, [proposals, statusFilter, searchQuery, sortField, sortOrder]);

  // Proposal Actions
  const handleCopyLink = async (p) => {
    try {
      const res = await api.createProposalShareLink(p.id || p._id);
      const url = res.shareUrl || `${window.location.origin}/p/${res.rawToken}`;
      await navigator.clipboard.writeText(url);
      setCopiedProposalId(p.id || p._id);
      showToast({
        type: 'success',
        title: 'Share link ready',
        message: 'Public client proposal link copied! Anyone with the link can view and accept without an account.',
      });
      setTimeout(() => setCopiedProposalId(null), 2500);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Share link failed',
        message: err.message || 'Could not generate secure share link.',
      });
    }
  };

  const handleMarkAccepted = async (p) => {
    showConfirm({
      title: 'Mark as accepted?',
      message: `Confirm that ${p.client?.company || p.client?.name || 'the client'} has formally accepted proposal ${p.proposalNumber}? This enables project kickoff.`,
      confirmText: 'Mark accepted',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.updateProposal(p.id || p._id, { status: 'accepted' });
          showToast({
            type: 'success',
            title: 'Proposal accepted',
            message: `Proposal ${p.proposalNumber} is now marked as accepted.`,
          });
          loadProposalsData();
        } catch (err) {
          showToast({ type: 'error', title: 'Update failed', message: err.message || 'Failed to update proposal status' });
        }
      },
    });
  };

  const handleCreateInvoice = async (p) => {
    try {
      const finalAmount = p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || 1000;
      const depositAmount = Math.round(finalAmount * 0.5);

      const res = await api.createInvoice({
        clientId: p.clientId?._id || p.clientId || p.client?._id,
        projectId: p.projectId || null,
        lineItems: [
          {
            description: `Kickoff deposit (50%): ${p.title}`,
            quantity: 1,
            unitPrice: depositAmount,
          },
        ],
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        paymentTerms: 'Due upon contract agreement before engineering kickoff',
        paymentInstructions: p.paymentDetails || 'Bank transfer / Stripe link',
      });

      if (res?.invoice) {
        showToast({
          type: 'success',
          title: 'Invoice created',
          message: `Kickoff invoice ${res.invoice.invoiceNumber} created for ${format(depositAmount)}.`,
        });
        navigate('/invoices');
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to create invoice', message: err.message });
    }
  };

  const handleDelete = (p) => {
    showConfirm({
      title: 'Delete proposal?',
      message: `Permanently delete ${p.proposalNumber}? This action cannot be reversed.`,
      confirmText: 'Delete proposal',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteProposal(p.id || p._id);
          showToast({ type: 'success', title: 'Proposal deleted', message: `${p.proposalNumber} was deleted.` });
          loadProposalsData();
        } catch (err) {
          showToast({ type: 'error', title: 'Delete failed', message: err.message });
        }
      },
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* =============================================================
         1. PAGE HEADER (Sentence case, no "Create Proposal" here)
         ============================================================= */}
      <div className="pb-2 border-b border-[var(--line,#E8E0CF)]">
        <h1
          className="text-[32px] font-extrabold text-[var(--ink,#0E1A2B)] tracking-tight leading-none"
          style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
        >
          Proposals
        </h1>
        <p className="text-[15px] text-[var(--muted,#5B6676)] mt-1.5">
          Create, send and track your quotes.
        </p>
      </div>

      {/* =============================================================
         2. KPI ROW (4 cards, sentence-case, one line each)
         ============================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Open pipeline */}
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-1">
          <span className="text-xs font-semibold text-[var(--muted,#5B6676)] block">
            Open pipeline
          </span>
          <div
            className="text-[26px] font-extrabold text-[var(--ink,#0E1A2B)] font-tabular leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {format(kpiMetrics.openPipelineValue)}
          </div>
          <span className="text-[11px] text-[var(--muted,#5B6676)] block pt-1">
            Draft + active sent quotes
          </span>
        </div>

        {/* KPI 2: Accepted */}
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-1">
          <span className="text-xs font-semibold text-[var(--muted,#5B6676)] block">
            Accepted
          </span>
          <div
            className="text-[26px] font-extrabold text-[var(--success,#067647)] font-tabular leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {format(kpiMetrics.acceptedValue)}
          </div>
          <span className="text-[11px] text-[var(--muted,#5B6676)] block pt-1">
            {kpiMetrics.acceptedCount} contracted {kpiMetrics.acceptedCount === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {/* KPI 3: Awaiting response */}
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-1">
          <span className="text-xs font-semibold text-[var(--muted,#5B6676)] block">
            Awaiting response
          </span>
          <div
            className="text-[26px] font-extrabold text-[var(--ink,#0E1A2B)] font-tabular leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {kpiMetrics.sentCount}
          </div>
          <span className="text-[11px] text-[var(--muted,#5B6676)] block pt-1">
            Sent to clients for approval
          </span>
        </div>

        {/* KPI 4: Revenue protected (amount raised by floor with tooltip) */}
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-1 relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted,#5B6676)]">
              Revenue protected
            </span>
            <div
              className="cursor-pointer text-[var(--muted,#5B6676)] hover:text-[var(--cobalt,#0047AB)]"
              title="Total revenue safeguarded by preventing quotes below your configured floor prices."
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className="text-[26px] font-extrabold text-[var(--cobalt,#0047AB)] font-tabular leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {format(kpiMetrics.totalRevenueProtected)}
          </div>
          <span className="text-[11px] text-[var(--muted,#5B6676)] block pt-1">
            Safeguarded by floor rules
          </span>
        </div>
      </div>

      {/* =============================================================
         3. TOOLBAR: Search, Status Tabs, View Toggle (Grid | Table)
         ============================================================= */}
      <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All', count: statusCounts.all },
            { id: 'draft', label: 'Draft', count: statusCounts.draft },
            { id: 'sent', label: 'Sent', count: statusCounts.sent },
            { id: 'accepted', label: 'Accepted', count: statusCounts.accepted },
            { id: 'declined', label: 'Declined', count: statusCounts.declined },
            { id: 'expired', label: 'Expired', count: statusCounts.expired },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[var(--cobalt,#0047AB)] text-white shadow-xs'
                  : 'bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-white/25 text-white' : 'bg-white text-[var(--muted,#5B6676)]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Search & View Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 text-[var(--muted,#5B6676)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              placeholder="Search quotes or clients..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-full border border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)] text-xs text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[2px] focus-visible:ring-[var(--cobalt,#0047AB)]"
            />
          </div>

          {/* View Toggle: Grid | Table */}
          <div className="flex items-center border border-[var(--line,#E8E0CF)] rounded-full p-0.5 bg-[var(--page,#FAF5EA)]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-[var(--cobalt,#0047AB)]' : 'text-[var(--muted,#5B6676)]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white shadow-xs text-[var(--cobalt,#0047AB)]' : 'text-[var(--muted,#5B6676)]'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =============================================================
         4. PROPOSALS LIST / CARDS / TABLE
         ============================================================= */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--muted,#5B6676)]">Loading proposals...</div>
      ) : filteredProposals.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-12 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] mx-auto flex items-center justify-center text-[var(--cobalt,#0047AB)]">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3
              className="text-[20px] font-bold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              No proposals yet
            </h3>
            <p className="text-xs text-[var(--muted,#5B6676)] mt-1 max-w-sm mx-auto">
              Create your first client proposal or analyze an unstructured brief with Floorly's floor safeguard engine.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/proposals/new"
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer shadow-none"
              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt-dark, #003A8C)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt, #0047AB)'; }}
            >
              <Plus className="w-4 h-4" />
              <span>Create your first proposal</span>
            </Link>
            <Link
              to="/analyzer"
              className="px-5 py-2.5 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-xs font-semibold text-[var(--ink,#0E1A2B)] transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
              <span>Analyze a client brief</span>
            </Link>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProposals.map(p => {
            const finalAmount = p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || p.pricingBreakdown?.recommendedPrice || 0;
            const deliverablesCount = (p.lineItems || []).length;
            const hoursCount = p.pricingBreakdown?.estimatedHours || (p.lineItems || []).reduce((acc, i) => acc + (Number(i.hours) || 0), 0);
            const clientDisplay = p.client?.company || p.client?.name || p.clientId?.name || 'Client';
            const validDate = p.validUntil ? new Date(p.validUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '14 days';
            const isFloorVerified = finalAmount >= (p.pricingBreakdown?.minAcceptablePrice || 0);

            return (
              <div
                key={p.id || p._id}
                className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between hover:shadow-xs transition-shadow space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Row: ID Pill + Status Pill */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] border border-[var(--line,#E8E0CF)]">
                      {p.proposalNumber || 'PROP'}
                    </span>
                    {renderStatusPill(p.status)}
                  </div>

                  {/* Title & Client */}
                  <div>
                    <h3
                      className="text-[16px] font-bold text-[var(--ink,#0E1A2B)] line-clamp-2 leading-snug"
                      title={p.title}
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      {p.title}
                    </h3>
                    <p className="text-xs text-[var(--muted,#5B6676)] mt-1 font-medium">
                      {clientDisplay}
                    </p>
                  </div>

                  {/* Deliverables Meta */}
                  <div className="text-xs text-[var(--muted,#5B6676)] flex items-center gap-1.5">
                    <span>{deliverablesCount} {deliverablesCount === 1 ? 'deliverable' : 'deliverables'}</span>
                    <span>·</span>
                    <span>{hoursCount} hrs</span>
                  </div>

                  {/* Price Row + Floor Verified Chip */}
                  <div className="pt-2 border-t border-[var(--line,#E8E0CF)] flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-[var(--muted,#5B6676)] block font-semibold">Quoted price</span>
                      <span
                        className="text-[26px] font-extrabold text-[var(--ink,#0E1A2B)] font-tabular leading-none"
                        style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                      >
                        {format(finalAmount)}
                      </span>
                    </div>
                    {isFloorVerified && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Floor verified</span>
                      </span>
                    )}
                  </div>

                  {/* Valid Until */}
                  <div className="text-[11px] text-[var(--muted,#5B6676)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Valid until {validDate}</span>
                  </div>
                </div>

                {/* Actions by Status */}
                <div className="pt-3 border-t border-[var(--line,#E8E0CF)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* View / Preview */}
                    <button
                      type="button"
                      aria-label="View proposal preview"
                      title="View proposal preview"
                      onClick={() => setPreviewProposal(p)}
                      className="p-2 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {/* Download / Print PDF */}
                    <button
                      type="button"
                      aria-label="Print / Download PDF"
                      title="Print / Download PDF"
                      onClick={() => setPreviewProposal(p)}
                      className="p-2 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {/* Delete */}
                    <button
                      type="button"
                      aria-label="Delete proposal"
                      title="Delete proposal"
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status-specific Primary Actions */}
                  <div className="flex items-center gap-1.5">
                    {(p.status || 'draft') === 'draft' && (
                      <Link
                        to={`/proposals/${p.id || p._id}/edit`}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer"
                        style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                      >
                        Edit
                      </Link>
                    )}

                    {p.status === 'sent' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(p)}
                          className="px-2.5 py-1.5 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copiedProposalId === (p.id || p._id) ? <Check className="w-3.5 h-3.5 text-[var(--success,#067647)]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAccepted(p)}
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer"
                          style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                        >
                          Mark accepted
                        </button>
                      </>
                    )}

                    {p.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() => handleCreateInvoice(p)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Create invoice</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] font-semibold border-b border-[var(--line,#E8E0CF)]">
                <tr>
                  <th scope="col" className="py-3 px-4 w-28">ID</th>
                  <th scope="col" className="py-3 px-4">Proposal title</th>
                  <th scope="col" className="py-3 px-4">Client</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Amount</th>
                  <th scope="col" className="py-3 px-4">Valid until</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                {filteredProposals.map(p => {
                  const finalAmount = p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || p.pricingBreakdown?.recommendedPrice || 0;
                  const clientDisplay = p.client?.company || p.client?.name || p.clientId?.name || 'Client';
                  const validDate = p.validUntil ? new Date(p.validUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '14 days';

                  return (
                    <tr key={p.id || p._id} className="hover:bg-[var(--page,#FAF5EA)]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--muted,#5B6676)]">
                        {p.proposalNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--ink,#0E1A2B)] max-w-xs truncate" title={p.title}>
                        {p.title}
                      </td>
                      <td className="py-3 px-4 text-[var(--ink,#0E1A2B)]">
                        {clientDisplay}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusPill(p.status)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold font-tabular text-[var(--ink,#0E1A2B)] text-sm">
                        {format(finalAmount)}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted,#5B6676)]">
                        {validDate}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            aria-label="Preview proposal"
                            onClick={() => setPreviewProposal(p)}
                            className="p-1.5 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(p.status || 'draft') === 'draft' && (
                            <Link
                              to={`/proposals/${p.id || p._id}/edit`}
                              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                            >
                              Edit
                            </Link>
                          )}
                          {p.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() => handleCreateInvoice(p)}
                              className="px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
                              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Invoice</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =============================================================
         5. PROPOSAL PREVIEW MODAL
         ============================================================= */}
      {previewProposal && (
        <ProposalDocumentModal
          proposal={previewProposal}
          client={previewProposal.client || previewProposal.clientId}
          user={user}
          onClose={() => setPreviewProposal(null)}
        />
      )}
    </div>
  );
}

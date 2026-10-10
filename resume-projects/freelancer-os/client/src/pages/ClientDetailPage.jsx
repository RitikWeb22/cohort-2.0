import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Plus,
  Receipt,
  FileText,
  FolderGit2,
  Trash2,
  Edit,
  Archive,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Loader2,
  TrendingUp,
  CreditCard,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { ClientModal } from '../components/clients/ClientModal';
import { DeleteClientDialog } from '../components/clients/DeleteClientDialog';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useNotificationStore();

  const [client, setClient] = useState(null);
  const [totals, setTotals] = useState({
    totalBilled: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    overdueCount: 0,
    overdueAmount: 0,
    contracted: 0,
  });
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab: 'overview' | 'proposals' | 'invoices' | 'projects' | 'notes'
  const [activeTab, setActiveTab] = useState('overview');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // New Note State
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Load client detail data
  const loadClientDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getClient(id);
      if (res?.client) {
        setClient(res.client);
        if (res.totals) setTotals(res.totals);
        setProposals(res.proposals || []);
        setInvoices(res.invoices || []);
        setProjects(res.projects || []);
        setAnalyses(res.analyses || []);
        document.title = `Floorly: ${res.client.company || res.client.name || 'Client'}`;
      } else {
        setError('Client not found');
      }
    } catch (err) {
      console.error('Failed to load client:', err);
      setError(err.message || 'Failed to load client');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClientDetails();
  }, [id]);

  const currency = client?.currency || user?.currency || 'USD';
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

  const clientName = client?.company || client?.name || 'Client';
  const contactName = client?.contactPerson || 'Direct contact';
  const initials = (clientName || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  // Status Change Inline
  const handleStatusChange = async (newStatus) => {
    if (!client) return;
    const oldStatus = client.status;
    setClient((prev) => ({ ...prev, status: newStatus }));
    try {
      await api.updateClient(client.id || client._id, { status: newStatus });
      showToast({ type: 'success', title: 'Status updated', message: `Client status changed to ${newStatus}.` });
    } catch (err) {
      setClient((prev) => ({ ...prev, status: oldStatus }));
      showToast({ type: 'error', title: 'Update failed', message: err.message || 'Failed to change status' });
    }
  };

  // Edit Save
  const handleSaveClient = async (updatedData) => {
    const res = await api.updateClient(client.id || client._id, updatedData);
    if (res?.client) {
      setClient((prev) => ({ ...prev, ...res.client }));
      showToast({ type: 'success', title: 'Client updated', message: 'Client details saved successfully.' });
    }
  };

  // Archive Client with 8-second Undo
  const handleArchiveClient = async () => {
    const clientId = client.id || client._id;
    const oldStatus = client.status;
    setClient((prev) => ({ ...prev, status: 'archived' }));
    try {
      await api.updateClient(clientId, { status: 'archived' });
      showToast({
        type: 'success',
        title: `${clientName} archived`,
        message: 'Client moved to archived status.',
        duration: 8000,
        actionLabel: 'Undo',
        onAction: async () => {
          await api.updateClient(clientId, { status: oldStatus });
          setClient((prev) => ({ ...prev, status: oldStatus }));
          showToast({ type: 'info', title: 'Restored', message: 'Client unarchived.' });
        },
      });
    } catch (err) {
      setClient((prev) => ({ ...prev, status: oldStatus }));
      showToast({ type: 'error', title: 'Archive failed', message: err.message });
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    try {
      await api.deleteClient(client.id || client._id);
      showToast({ type: 'success', title: 'Client deleted', message: `${clientName} removed.` });
      navigate('/clients');
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  // Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || isSavingNote) return;
    try {
      setIsSavingNote(true);
      const res = await api.addClientNote(client.id || client._id, newNoteText.trim());
      if (res?.notesList) {
        setClient((prev) => ({ ...prev, notesList: res.notesList }));
      } else if (res?.note) {
        setClient((prev) => ({ ...prev, notesList: [...(prev.notesList || []), res.note] }));
      }
      setNewNoteText('');
      showToast({ type: 'success', title: 'Note added', message: 'Private note saved.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to add note', message: err.message });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId) => {
    try {
      const res = await api.deleteClientNote(client.id || client._id, noteId);
      if (res?.notesList) {
        setClient((prev) => ({ ...prev, notesList: res.notesList }));
      } else {
        setClient((prev) => ({
          ...prev,
          notesList: (prev.notesList || []).filter((n) => n.id !== noteId),
        }));
      }
      showToast({ type: 'success', title: 'Note deleted', message: 'Private note removed.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to delete note', message: err.message });
    }
  };

  // Timeline items compiled from proposals, invoices, and projects
  const activityTimeline = useMemo(() => {
    const events = [];

    (proposals || []).forEach((p) => {
      events.push({
        id: `prop-create-${p.id || p._id}`,
        type: 'proposal',
        title: `Proposal created: "${p.title}"`,
        subtitle: `${p.proposalNumber} · ${formatMoney(p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || 0)}`,
        status: p.status,
        date: new Date(p.createdAt),
        link: `/proposals/${p.id || p._id}`,
      });
      if (p.status === 'accepted' && p.updatedAt) {
        events.push({
          id: `prop-accept-${p.id || p._id}`,
          type: 'proposal_accepted',
          title: `Proposal accepted: "${p.title}"`,
          subtitle: `Contract value: ${formatMoney(p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || 0)}`,
          status: 'accepted',
          date: new Date(p.updatedAt),
          link: `/proposals/${p.id || p._id}`,
        });
      }
    });

    (invoices || []).forEach((inv) => {
      events.push({
        id: `inv-create-${inv.id || inv._id}`,
        type: 'invoice',
        title: `Invoice issued: ${inv.invoiceNumber}`,
        subtitle: `${formatMoney(inv.totalAmount)} · Due ${formatDate(inv.dueDate)}`,
        status: inv.status,
        date: new Date(inv.createdAt),
        link: `/invoices`,
      });
      if (inv.status === 'paid' && inv.updatedAt) {
        events.push({
          id: `inv-paid-${inv.id || inv._id}`,
          type: 'payment',
          title: `Payment received for ${inv.invoiceNumber}`,
          subtitle: `Settled amount: ${formatMoney(inv.amountPaid || inv.totalAmount)}`,
          status: 'paid',
          date: new Date(inv.updatedAt),
          link: `/invoices`,
        });
      }
    });

    (projects || []).forEach((proj) => {
      events.push({
        id: `proj-create-${proj.id || proj._id}`,
        type: 'project',
        title: `Project initiated: "${proj.title}"`,
        subtitle: `Contract: ${formatMoney(proj.contractValue)} · Status: ${proj.status}`,
        status: proj.status,
        date: new Date(proj.createdAt),
        link: `/projects`,
      });
    });

    return events.sort((a, b) => b.date - a.date);
  }, [proposals, invoices, projects]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-[var(--line,#E8E0CF)]/50 rounded animate-pulse" />
        <div className="h-32 bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-[var(--line,#E8E0CF)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-12 text-center space-y-4 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2
          className="text-lg font-bold text-[var(--ink,#0E1A2B)]"
          style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
        >
          {error || 'Client not found'}
        </h2>
        <p className="text-xs text-[var(--muted,#5B6676)]">
          The client record you are looking for does not exist or may have been removed.
        </p>
        <Link
          to="/clients"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white cursor-pointer"
          style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clients</span>
        </Link>
      </div>
    );
  }

  const notesList = client.notesList || [];

  return (
    <div className="space-y-6 select-text">
      {/* Back to Clients Navigation */}
      <div>
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] rounded-md px-1 py-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Clients</span>
        </Link>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-extrabold shrink-0"
            style={{
              backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
              color: 'var(--cobalt, #0047AB)',
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
            }}
          >
            {initials}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1
                className="text-xl sm:text-2xl font-extrabold text-[var(--ink,#0E1A2B)] tracking-tight truncate"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                {clientName}
              </h1>

              {/* Status Select Inline */}
              <select
                value={client.status || 'lead'}
                onChange={(e) => handleStatusChange(e.target.value)}
                aria-label="Client status"
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] ${
                  client.status === 'active'
                    ? 'bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] border-[var(--success,#067647)]/20'
                    : client.status === 'completed'
                    ? 'bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] border-[var(--cobalt,#0047AB)]/20'
                    : client.status === 'archived'
                    ? 'bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] border-[var(--line,#E8E0CF)]'
                    : 'bg-white text-[var(--muted,#5B6676)] border-[var(--line,#E8E0CF)]'
                }`}
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <p className="text-sm text-[var(--muted,#5B6676)] font-medium">
              Contact: <span className="text-[var(--ink,#0E1A2B)] font-semibold">{contactName}</span>
            </p>

            {/* Quick Contact Chips */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[var(--muted,#5B6676)]">
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--cobalt,#0047AB)] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                  <span>{client.email}</span>
                </a>
              )}
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--cobalt,#0047AB)] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                  <span>{client.phone}</span>
                </a>
              )}
              {client.website && (
                <a
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[var(--cobalt,#0047AB)] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                  <span>{client.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to={`/proposals/new?clientId=${client.id || client._id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer shadow-sm"
            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New proposal</span>
          </Link>

          <Link
            to={`/invoices`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
            <span>Create invoice</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
          >
            Edit
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More actions"
              className="p-2 rounded-full border border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-[var(--line,#E8E0CF)] shadow-lg py-1.5 z-40 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleArchiveClient();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[var(--page,#FAF5EA)] flex items-center gap-2 cursor-pointer text-[var(--ink,#0E1A2B)]"
                  >
                    <Archive className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                    <span>Archive client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)] flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete client</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Money Summary Cards: Billed, Paid, Outstanding, Overdue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Billed (incl. tax) */}
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted,#5B6676)] font-medium">
            <span>Billed (incl. tax)</span>
            <Receipt className="w-4 h-4 text-[var(--cobalt,#0047AB)]" />
          </div>
          <div
            className="text-xl sm:text-2xl font-black text-[var(--ink,#0E1A2B)] font-tabular"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {formatMoney(totals.totalBilled)}
          </div>
          <p className="text-[11px] text-[var(--muted,#5B6676)]">
            Total of all issued invoices
          </p>
        </div>

        {/* Paid */}
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted,#5B6676)] font-medium">
            <span>Paid</span>
            <CheckCircle2 className="w-4 h-4 text-[var(--success,#067647)]" />
          </div>
          <div
            className="text-xl sm:text-2xl font-black text-[var(--success,#067647)] font-tabular"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {formatMoney(totals.totalPaid)}
          </div>
          <p className="text-[11px] text-[var(--muted,#5B6676)]">
            Settled client payments
          </p>
        </div>

        {/* Outstanding */}
        <div className={`bg-white rounded-2xl border p-5 space-y-1 shadow-sm ${
          totals.outstandingBalance > 0
            ? 'border-[var(--warning,#B54708)]/30'
            : 'border-[var(--line,#E8E0CF)]'
        }`}>
          <div className="flex items-center justify-between text-xs text-[var(--muted,#5B6676)] font-medium">
            <span>Outstanding</span>
            <TrendingUp className="w-4 h-4 text-[var(--warning,#B54708)]" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-tabular ${
              totals.outstandingBalance > 0 ? 'text-[var(--warning,#B54708)]' : 'text-[var(--ink,#0E1A2B)]'
            }`}
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {formatMoney(totals.outstandingBalance)}
          </div>
          <p className="text-[11px] text-[var(--muted,#5B6676)]">
            Billed amount minus paid
          </p>
        </div>

        {/* Overdue */}
        <div className={`bg-white rounded-2xl border p-5 space-y-1 shadow-sm ${
          totals.overdueCount > 0
            ? 'border-[var(--error,#B42318)]/40 bg-[var(--error-tint,#FEE4E2)]/10'
            : 'border-[var(--line,#E8E0CF)]'
        }`}>
          <div className="flex items-center justify-between text-xs text-[var(--muted,#5B6676)] font-medium">
            <span>Overdue</span>
            <AlertTriangle className={`w-4 h-4 ${totals.overdueCount > 0 ? 'text-[var(--error,#B42318)]' : 'text-[var(--muted,#5B6676)]'}`} />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-tabular ${
              totals.overdueCount > 0 ? 'text-[var(--error,#B42318)]' : 'text-[var(--ink,#0E1A2B)]'
            }`}
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {totals.overdueCount > 0 ? formatMoney(totals.overdueAmount) : formatMoney(0)}
          </div>
          <p className="text-[11px] text-[var(--muted,#5B6676)]">
            {totals.overdueCount > 0 ? `${totals.overdueCount} overdue invoice${totals.overdueCount === 1 ? '' : 's'}` : 'All invoices current'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs: Overview, Proposals, Invoices, Projects, Notes */}
      <div className="border-b border-[var(--line,#E8E0CF)] flex items-center gap-6 text-sm font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-[var(--cobalt,#0047AB)] text-[var(--cobalt,#0047AB)] font-bold'
              : 'border-transparent text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('proposals')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'proposals'
              ? 'border-[var(--cobalt,#0047AB)] text-[var(--cobalt,#0047AB)] font-bold'
              : 'border-transparent text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
          }`}
        >
          <span>Proposals</span>
          <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)]">
            {proposals.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'border-[var(--cobalt,#0047AB)] text-[var(--cobalt,#0047AB)] font-bold'
              : 'border-transparent text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
          }`}
        >
          <span>Invoices</span>
          <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)]">
            {invoices.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'projects'
              ? 'border-[var(--cobalt,#0047AB)] text-[var(--cobalt,#0047AB)] font-bold'
              : 'border-transparent text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
          }`}
        >
          <span>Projects</span>
          <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)]">
            {projects.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'notes'
              ? 'border-[var(--cobalt,#0047AB)] text-[var(--cobalt,#0047AB)] font-bold'
              : 'border-transparent text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
          }`}
        >
          <span>Notes</span>
          <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)]">
            {notesList.length + (client.notes ? 1 : 0)}
          </span>
        </button>
      </div>

      {/* =============================================================
         TAB CONTENT: OVERVIEW
         ============================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Activity Timeline (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-4 shadow-sm">
              <h2
                className="text-base font-bold text-[var(--ink,#0E1A2B)]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Recent activity timeline
              </h2>

              {activityTimeline.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Clock className="w-8 h-8 text-[var(--muted,#5B6676)]/50 mx-auto" />
                  <p className="text-xs text-[var(--muted,#5B6676)]">
                    No activity recorded for this client yet. Create a proposal to kick off engagement.
                  </p>
                  <Link
                    to={`/proposals/new?clientId=${client.id || client._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create first proposal</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--line,#E8E0CF)]">
                  {activityTimeline.map((item) => (
                    <div key={item.id} className="relative flex items-start gap-4 pl-8">
                      <span className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-[var(--cobalt,#0047AB)] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[var(--ink,#0E1A2B)] truncate">
                            {item.title}
                          </p>
                          <span className="text-[11px] text-[var(--muted,#5B6676)] shrink-0">
                            {formatDate(item.date)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted,#5B6676)] pt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Client Details Card (1 col) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-4 shadow-sm text-xs">
              <h2
                className="text-base font-bold text-[var(--ink,#0E1A2B)]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Client details
              </h2>

              <div className="space-y-3 divide-y divide-[var(--line,#E8E0CF)]/60">
                <div className="pt-2 first:pt-0 space-y-1">
                  <span className="text-[11px] text-[var(--muted,#5B6676)] block">Company</span>
                  <p className="font-semibold text-[var(--ink,#0E1A2B)]">{clientName}</p>
                </div>
                <div className="pt-2 space-y-1">
                  <span className="text-[11px] text-[var(--muted,#5B6676)] block">Contact Person</span>
                  <p className="font-semibold text-[var(--ink,#0E1A2B)]">{contactName}</p>
                </div>
                <div className="pt-2 space-y-1">
                  <span className="text-[11px] text-[var(--muted,#5B6676)] block">Currency & Terms</span>
                  <p className="font-semibold text-[var(--ink,#0E1A2B)]">
                    {client.currency || 'USD'} · {client.paymentTerms || 'Due on receipt'}
                  </p>
                </div>
                {client.country && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[11px] text-[var(--muted,#5B6676)] block">Country</span>
                    <p className="font-semibold text-[var(--ink,#0E1A2B)]">{client.country}</p>
                  </div>
                )}
                {client.taxId && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[11px] text-[var(--muted,#5B6676)] block">Tax ID / VAT</span>
                    <p className="font-semibold text-[var(--ink,#0E1A2B)]">{client.taxId}</p>
                  </div>
                )}
                {client.billingAddress && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[11px] text-[var(--muted,#5B6676)] block">Billing Address</span>
                    <p className="text-[var(--ink,#0E1A2B)] whitespace-pre-line leading-relaxed">
                      {client.billingAddress}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="w-full mt-2 py-2 rounded-xl border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer text-center"
              >
                Edit details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
         TAB CONTENT: PROPOSALS
         ============================================================= */}
      {activeTab === 'proposals' && (
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] overflow-hidden shadow-sm">
          {proposals.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-[var(--muted,#5B6676)]/40 mx-auto" />
              <h3 className="text-sm font-bold text-[var(--ink,#0E1A2B)]">
                No proposals yet
              </h3>
              <p className="text-xs text-[var(--muted,#5B6676)] max-w-sm mx-auto">
                Create the first proposal for {clientName} to lock in scope and protect your pricing floor.
              </p>
              <Link
                to={`/proposals/new?clientId=${client.id || client._id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white mt-2"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create first proposal for {clientName}</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] font-semibold border-b border-[var(--line,#E8E0CF)]">
                  <tr>
                    <th scope="col" className="py-3 px-4 w-28">ID</th>
                    <th scope="col" className="py-3 px-4">Title</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Amount</th>
                    <th scope="col" className="py-3 px-4">Valid until</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                  {proposals.map((p) => {
                    const amt = p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || 0;
                    return (
                      <tr key={p.id || p._id} className="hover:bg-[var(--page,#FAF5EA)]/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[var(--muted,#5B6676)]">
                          {p.proposalNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-[var(--ink,#0E1A2B)]">
                          {p.title}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            p.status === 'accepted'
                              ? 'bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)]'
                              : p.status === 'sent'
                              ? 'bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]'
                              : 'bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)]'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--ink,#0E1A2B)] font-tabular">
                          {formatMoney(amt)}
                        </td>
                        <td className="py-3 px-4 text-[var(--muted,#5B6676)]">
                          {formatDate(p.validUntil)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/proposals/${p.id || p._id}/edit`}
                            className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =============================================================
         TAB CONTENT: INVOICES
         ============================================================= */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Receipt className="w-10 h-10 text-[var(--muted,#5B6676)]/40 mx-auto" />
              <h3 className="text-sm font-bold text-[var(--ink,#0E1A2B)]">
                No invoices yet
              </h3>
              <p className="text-xs text-[var(--muted,#5B6676)] max-w-sm mx-auto">
                Issue a milestone deposit or completion invoice for {clientName}.
              </p>
              <Link
                to={`/invoices`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white mt-2"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create invoice</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] font-semibold border-b border-[var(--line,#E8E0CF)]">
                  <tr>
                    <th scope="col" className="py-3 px-4 w-28">Invoice #</th>
                    <th scope="col" className="py-3 px-4">Issue date</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Total</th>
                    <th scope="col" className="py-3 px-4 text-right">Paid</th>
                    <th scope="col" className="py-3 px-4">Due date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                  {invoices.map((inv) => (
                    <tr key={inv.id || inv._id} className="hover:bg-[var(--page,#FAF5EA)]/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[var(--ink,#0E1A2B)]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted,#5B6676)]">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          inv.status === 'paid'
                            ? 'bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)]'
                            : inv.status === 'overdue'
                            ? 'bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)]'
                            : 'bg-[var(--warning-tint,#FEF0C7)] text-[var(--warning,#B54708)]'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--ink,#0E1A2B)] font-tabular">
                        {formatMoney(inv.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[var(--success,#067647)] font-tabular">
                        {formatMoney(inv.amountPaid)}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted,#5B6676)]">
                        {formatDate(inv.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =============================================================
         TAB CONTENT: PROJECTS
         ============================================================= */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] overflow-hidden shadow-sm">
          {projects.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FolderGit2 className="w-10 h-10 text-[var(--muted,#5B6676)]/40 mx-auto" />
              <h3 className="text-sm font-bold text-[var(--ink,#0E1A2B)]">
                No active projects
              </h3>
              <p className="text-xs text-[var(--muted,#5B6676)] max-w-sm mx-auto">
                Projects are automatically initialized when a proposal is accepted by {clientName}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] font-semibold border-b border-[var(--line,#E8E0CF)]">
                  <tr>
                    <th scope="col" className="py-3 px-4">Project title</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Contract value</th>
                    <th scope="col" className="py-3 px-4">Due date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                  {projects.map((proj) => (
                    <tr key={proj.id || proj._id} className="hover:bg-[var(--page,#FAF5EA)]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--ink,#0E1A2B)]">
                        {proj.title}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
                          {proj.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--ink,#0E1A2B)] font-tabular">
                        {formatMoney(proj.contractValue)}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted,#5B6676)]">
                        {formatDate(proj.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =============================================================
         TAB CONTENT: NOTES
         ============================================================= */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Add Note Input Box */}
          <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-3 shadow-sm">
            <h3
              className="text-sm font-bold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Add private note
            </h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Log client call notes, negotiation context, timeline requirements, or personal preferences..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newNoteText.trim() || isSavingNote}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                >
                  {isSavingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save note</span>
                </button>
              </div>
            </form>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {/* Primary Note if configured on client */}
            {client.notes && (
              <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[var(--muted,#5B6676)]">
                  <span className="font-semibold text-[var(--ink,#0E1A2B)]">General Client Context</span>
                  <span>Primary</span>
                </div>
                <p className="text-xs text-[var(--ink,#0E1A2B)] leading-relaxed whitespace-pre-line pt-1">
                  {client.notes}
                </p>
              </div>
            )}

            {notesList.length === 0 && !client.notes ? (
              <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-8 text-center text-xs text-[var(--muted,#5B6676)]">
                No private notes logged for {clientName} yet.
              </div>
            ) : (
              notesList.map((n) => (
                <div
                  key={n.id}
                  className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-2 shadow-sm flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <span className="text-[11px] text-[var(--muted,#5B6676)] block">
                      {formatDate(n.createdAt)}
                    </span>
                    <p className="text-xs text-[var(--ink,#0E1A2B)] leading-relaxed whitespace-pre-line">
                      {n.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(n.id)}
                    aria-label="Delete note"
                    className="p-1 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)] hover:bg-[var(--error-tint,#FEE4E2)] transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <ClientModal
          isOpen={isEditModalOpen}
          client={client}
          userPlan={user?.plan}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveClient}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteModalOpen && (
        <DeleteClientDialog
          isOpen={isDeleteModalOpen}
          client={{
            ...client,
            invoicesCount: invoices.length,
            acceptedProposalsCount: proposals.filter((p) => p.status === 'accepted').length,
            proposalsCount: proposals.length,
            projectsCount: projects.length,
          }}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirmDelete={handleConfirmDelete}
          onConfirmArchive={handleArchiveClient}
        />
      )}
    </div>
  );
}

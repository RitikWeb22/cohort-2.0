import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  Globe,
  Clock,
  Trash2,
  Edit,
  Archive,
  MoreHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Receipt,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import { PLANS } from '../config/plans';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { ClientModal } from '../components/clients/ClientModal';
import { DeleteClientDialog } from '../components/clients/DeleteClientDialog';

export function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useNotificationStore();
  const { currency: globalCurrency, format: globalFormat } = useCurrencyStore();

  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'lead' | 'active' | 'completed' | 'archived'
  const [sortField, setSortField] = useState('activity'); // 'activity' | 'name' | 'outstanding'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modals & Menu State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const userPlan = (user?.plan || 'starter').toLowerCase();
  const isStarter = ['free', 'starter'].includes(userPlan);
  const maxStarterClients = PLANS.free.maxClients;

  // Set document title
  useEffect(() => {
    document.title = 'Floorly: Clients';
  }, []);

  // Load clients data
  const loadClients = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await api.getClients();
      if (res?.clients) {
        setClients(res.clients);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
      setLoadError(err.message || 'We couldn\'t load your clients.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Format money helper
  const formatMoney = (amount, cur = 'USD') => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur || 'USD',
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  // Relative Date Helper
  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays <= 0) {
        if (diffHours <= 1) return 'Just now';
        return `${diffHours}h ago`;
      }
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Active clients count
  const activeClientsCount = useMemo(() => {
    return clients.filter((c) => (c.status || 'lead') === 'active').length;
  }, [clients]);

  // Counts by status for tabs
  const statusCounts = useMemo(() => {
    const counts = { all: clients.length, lead: 0, active: 0, completed: 0, archived: 0 };
    clients.forEach((c) => {
      const st = (c.status || 'lead').toLowerCase();
      if (counts[st] !== undefined) counts[st] += 1;
    });
    return counts;
  }, [clients]);

  // Financial Summary Strip (grouped by client currency)
  const summaryStrip = useMemo(() => {
    const byCurrency = {};
    clients.forEach((c) => {
      const cur = c.currency || globalCurrency || 'USD';
      if (!byCurrency[cur]) {
        byCurrency[cur] = { billed: 0, outstanding: 0 };
      }
      byCurrency[cur].billed += (c.totalBilled || c.totalInvoiced || 0);
      byCurrency[cur].outstanding += (c.outstandingBalance || 0);
    });
    return byCurrency;
  }, [clients, globalCurrency]);

  // Filtered & Sorted Clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Status Filter
    if (statusTab !== 'all') {
      result = result.filter((c) => (c.status || 'lead').toLowerCase() === statusTab);
    }

    // Search Query (name, company, email)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const comp = (c.company || '').toLowerCase();
        const nm = (c.name || '').toLowerCase();
        const em = (c.email || '').toLowerCase();
        const contact = (c.contactPerson || '').toLowerCase();
        return comp.includes(q) || nm.includes(q) || em.includes(q) || contact.includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'name') {
        const nameA = (a.company || a.name || '').toLowerCase();
        const nameB = (b.company || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortField === 'outstanding') {
        const outA = a.outstandingBalance || 0;
        const outB = b.outstandingBalance || 0;
        return outB - outA;
      }
      // 'activity' default: most recent activity
      const dateA = new Date(a.lastActivity || a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.lastActivity || b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }, [clients, statusTab, searchQuery, sortField]);

  // Status pill render
  const renderStatusPill = (status) => {
    const s = (status || 'lead').toLowerCase();
    switch (s) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] border border-[var(--success,#067647)]/20">
            <span>Active</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] border border-[var(--cobalt,#0047AB)]/20">
            <span>Completed</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] border border-[var(--line,#E8E0CF)]">
            <span>Archived</span>
          </span>
        );
      case 'lead':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white text-[var(--muted,#5B6676)] border border-[var(--line,#E8E0CF)]">
            <span>Lead</span>
          </span>
        );
    }
  };

  // Add / Save Client
  const handleSaveClient = async (formData) => {
    try {
      if (editingClient) {
        const res = await api.updateClient(editingClient.id || editingClient._id, formData);
        if (res?.client) {
          setClients((prev) =>
            prev.map((c) => (c.id === editingClient.id || c._id === editingClient._id ? { ...c, ...res.client } : c))
          );
          showToast({ type: 'success', title: 'Client updated', message: 'Client details saved successfully.' });
        }
      } else {
        const res = await api.createClient(formData);
        if (res?.client) {
          setClients((prev) => [res.client, ...prev]);
          showToast({ type: 'success', title: 'Client added', message: `${res.client.company || res.client.name} created.` });
        }
      }
    } catch (err) {
      showToast({
        type: 'warning',
        title: err.code === 'PLAN_LIMIT_REACHED' ? 'Client limit reached' : 'Failed to save client',
        message: err.message || 'Starter plan allows 2 active clients. Upgrade to add more.',
      });
      throw err;
    }
  };

  // Archive Client with 8-second Undo
  const handleArchiveClient = async (targetClient) => {
    const cId = targetClient.id || targetClient._id;
    const oldStatus = targetClient.status;

    // Optimistic Update
    setClients((prev) =>
      prev.map((c) => (c.id === cId || c._id === cId ? { ...c, status: 'archived' } : c))
    );

    try {
      await api.updateClient(cId, { status: 'archived' });
      showToast({
        type: 'success',
        title: `${targetClient.company || targetClient.name} archived`,
        message: 'Client moved to archived status.',
        duration: 8000,
        actionLabel: 'Undo',
        onAction: async () => {
          await api.updateClient(cId, { status: oldStatus });
          setClients((prev) =>
            prev.map((c) => (c.id === cId || c._id === cId ? { ...c, status: oldStatus } : c))
          );
          showToast({ type: 'info', title: 'Restored', message: 'Client unarchived.' });
        },
      });
    } catch (err) {
      // Rollback
      setClients((prev) =>
        prev.map((c) => (c.id === cId || c._id === cId ? { ...c, status: oldStatus } : c))
      );
      showToast({ type: 'error', title: 'Archive failed', message: err.message });
    }
  };

  // Confirm Delete Client
  const handleConfirmDelete = async (targetClient) => {
    const cId = targetClient.id || targetClient._id;
    const backup = [...clients];

    // Optimistic removal
    setClients((prev) => prev.filter((c) => c.id !== cId && c._id !== cId));

    try {
      await api.deleteClient(cId);
      showToast({
        type: 'success',
        title: 'Client deleted',
        message: `${targetClient.company || targetClient.name} removed.`,
      });
    } catch (err) {
      // Rollback
      setClients(backup);
      showToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6 select-text">
      {/* =============================================================
         1. HEADER
         ============================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[var(--ink,#0E1A2B)] tracking-tight leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Clients
          </h1>
          <p className="text-sm text-[var(--muted,#5B6676)] mt-0.5">
            Everyone you work with, and what they owe you.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingClient(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white transition-colors duration-150 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add client</span>
          </button>
        </div>
      </div>

      {/* Plan Usage Bar (Starter plan only) */}
      {isStarter && (
        <div className="p-3.5 rounded-xl bg-white border border-[var(--line,#E8E0CF)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-none">
          <div className="flex items-center gap-2 text-[var(--muted,#5B6676)]">
            <span className="font-semibold text-[var(--ink,#0E1A2B)]">
              {activeClientsCount} of {maxStarterClients} active clients used
            </span>
            <span>·</span>
            <span>Starter plan</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-36 h-1.5 rounded-full bg-[var(--page,#FAF5EA)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (activeClientsCount / maxStarterClients) * 100)}%`,
                  backgroundColor:
                    activeClientsCount >= maxStarterClients
                      ? 'var(--warning, #B54708)'
                      : 'var(--cobalt, #0047AB)',
                }}
              />
            </div>
            <Link
              to="/pricing-rules"
              className="font-bold underline text-[var(--cobalt,#0047AB)] hover:text-[var(--cobalt-dark,#003A8C)] shrink-0"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}

      {/* =============================================================
         2. COMPACT SUMMARY STRIP
         ============================================================= */}
      <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line,#E8E0CF)] shadow-sm">
        {/* Metric 1: Active clients */}
        <div className="py-2 sm:py-0 sm:px-4 first:sm:pl-0 space-y-0.5">
          <span className="text-xs font-semibold text-[var(--muted,#5B6676)] block">
            Active clients
          </span>
          <div
            className="text-xl sm:text-2xl font-black text-[var(--ink,#0E1A2B)] font-tabular leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {activeClientsCount}
          </div>
        </div>

        {/* Metric 2: Total billed */}
        <div className="py-2 sm:py-0 sm:px-4 space-y-0.5">
          <span className="text-xs font-semibold text-[var(--muted,#5B6676)] block">
            Total billed
          </span>
          <div
            className="text-xl sm:text-2xl font-black text-[var(--ink,#0E1A2B)] font-tabular leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {Object.keys(summaryStrip).length === 0
              ? formatMoney(0, globalCurrency)
              : Object.entries(summaryStrip).map(([cur, data]) => formatMoney(data.billed, cur)).join(' · ')}
          </div>
        </div>

        {/* Metric 3: Outstanding */}
        <div className="py-2 sm:py-0 sm:px-4 last:sm:pr-0 space-y-0.5">
          <span className="text-xs font-semibold text-[var(--muted,#5B6676)] block">
            Outstanding
          </span>
          <div
            className="text-xl sm:text-2xl font-black font-tabular leading-tight"
            style={{
              color: 'var(--warning, #B54708)',
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
            }}
          >
            {Object.keys(summaryStrip).length === 0
              ? formatMoney(0, globalCurrency)
              : Object.entries(summaryStrip).map(([cur, data]) => formatMoney(data.outstanding, cur)).join(' · ')}
          </div>
        </div>
      </div>

      {/* =============================================================
         3. TOOLBAR: Search, Status Tabs, Sort, View Toggle
         ============================================================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Status Tabs (Desktop) / Select (Mobile) */}
        <div className="hidden sm:flex items-center gap-1 p-1 bg-white rounded-xl border border-[var(--line,#E8E0CF)]">
          {[
            { id: 'all', label: 'All', count: statusCounts.all },
            { id: 'lead', label: 'Lead', count: statusCounts.lead },
            { id: 'active', label: 'Active', count: statusCounts.active },
            { id: 'completed', label: 'Completed', count: statusCounts.completed },
            { id: 'archived', label: 'Archived', count: statusCounts.archived },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusTab === tab.id
                  ? 'bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] font-bold'
                  : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusTab === tab.id
                    ? 'bg-white text-[var(--cobalt,#0047AB)]'
                    : 'bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile Status Select */}
        <div className="sm:hidden">
          <select
            value={statusTab}
            onChange={(e) => setStatusTab(e.target.value)}
            aria-label="Filter by status"
            className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs font-semibold text-[var(--ink,#0E1A2B)]"
          >
            <option value="all">All statuses ({statusCounts.all})</option>
            <option value="lead">Lead ({statusCounts.lead})</option>
            <option value="active">Active ({statusCounts.active})</option>
            <option value="completed">Completed ({statusCounts.completed})</option>
            <option value="archived">Archived ({statusCounts.archived})</option>
          </select>
        </div>

        {/* Right: Search, Sort, View Toggle */}
        <div className="flex items-center gap-2.5 flex-1 md:flex-initial justify-end">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#5B6676)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, company, email..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] placeholder-[var(--muted,#5B6676)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Select */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            aria-label="Sort clients"
            className="px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs font-semibold text-[var(--ink,#0E1A2B)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)]"
          >
            <option value="activity">Recent activity</option>
            <option value="name">Name</option>
            <option value="outstanding">Outstanding</option>
          </select>

          {/* View Toggle (Cards | Table) */}
          <div className="flex items-center p-1 bg-white rounded-xl border border-[var(--line,#E8E0CF)] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-label="Grid cards view"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]'
                  : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table list view"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]'
                  : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =============================================================
         4. SKELETON / ERROR / EMPTY STATES
         ============================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--line,#E8E0CF)]/60" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-[var(--line,#E8E0CF)]/60 rounded" />
                    <div className="h-3 w-16 bg-[var(--line,#E8E0CF)]/40 rounded" />
                  </div>
                </div>
                <div className="h-5 w-12 bg-[var(--line,#E8E0CF)]/40 rounded-full" />
              </div>
              <div className="h-14 bg-[var(--page,#FAF5EA)]/60 rounded-xl" />
              <div className="h-8 bg-[var(--line,#E8E0CF)]/40 rounded-full" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-12 text-center space-y-3 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3
            className="text-base font-bold text-[var(--ink,#0E1A2B)]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            We couldn't load your clients
          </h3>
          <p className="text-xs text-[var(--muted,#5B6676)]">{loadError}</p>
          <button
            type="button"
            onClick={loadClients}
            className="px-4 py-2 rounded-full text-xs font-semibold text-white mt-2 cursor-pointer"
            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
          >
            Try again
          </button>
        </div>
      ) : clients.length === 0 ? (
        /* Empty State: No clients at all */
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
              color: 'var(--cobalt, #0047AB)',
            }}
          >
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3
              className="text-base sm:text-lg font-bold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Add your first client
            </h3>
            <p className="text-xs text-[var(--muted,#5B6676)] max-w-sm mx-auto">
              Clients keep your proposals, invoices and payments in one place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingClient(null);
                setIsAddModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add client</span>
            </button>
            <Link
              to="/analyzer"
              className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline flex items-center gap-1"
            >
              <span>Or analyze a client brief</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        /* No Search / Filter Results */
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-12 text-center space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-[var(--ink,#0E1A2B)]">
            No clients match your filter
          </p>
          <p className="text-xs text-[var(--muted,#5B6676)]">
            Try adjusting your search query or status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusTab('all');
            }}
            className="px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* =============================================================
           5. CLIENT CARDS GRID (3 cols desktop, 2 tablet, 1 mobile)
           ============================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((c) => {
            const cId = c.id || c._id;
            const compName = (c.company || c.name || 'Client').trim();
            const contact = (c.contactPerson || '').trim();
            const initials = (compName || 'C')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('');

            const cCurrency = c.currency || 'USD';
            const billedAmt = c.totalBilled || c.totalInvoiced || 0;
            const paidAmt = c.totalPaid || c.amountReceived || 0;
            const outstandingAmt = c.outstandingBalance || 0;
            const overdueCount = Number(c.overdueInvoicesCount || 0);

            const isMenuOpen = activeMenuId === cId;

            return (
              <div
                key={cId}
                className="relative bg-white rounded-2xl border border-[var(--line,#E8E0CF)] hover:border-[var(--cobalt,#0047AB)]/40 transition-all shadow-sm flex flex-col justify-between group overflow-hidden"
              >
                {/* Real clickable link covering the card */}
                <Link
                  to={`/clients/${cId}`}
                  className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)]"
                  aria-label={`View details for ${compName}`}
                />

                <div className="p-5 space-y-4 relative z-10 pointer-events-none">
                  {/* Top: Avatar, Name, Status Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
                          color: 'var(--cobalt, #0047AB)',
                          fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h2
                          className="text-base sm:text-[18px] font-bold text-[var(--ink,#0E1A2B)] truncate leading-snug group-hover:text-[var(--cobalt,#0047AB)] transition-colors"
                          style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                        >
                          {compName}
                        </h2>
                        {contact && (
                          <p className="text-xs text-[var(--muted,#5B6676)] truncate">
                            {contact}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {renderStatusPill(c.status)}
                    </div>
                  </div>

                  {/* Contact Line */}
                  <div className="text-xs text-[var(--muted,#5B6676)] flex items-center gap-3 truncate pointer-events-auto">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 hover:text-[var(--cobalt,#0047AB)] truncate"
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    )}
                    {c.phone && (
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{c.phone}</span>
                      </span>
                    )}
                  </div>

                  {/* Three Financial Metrics in a row: Billed, Paid, Outstanding */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[var(--page,#FAF5EA)]/70 border border-[var(--line,#E8E0CF)]/80 text-xs">
                    <div>
                      <span className="text-[10px] font-medium text-[var(--muted,#5B6676)] block">
                        Billed
                      </span>
                      <span className="font-bold text-[var(--ink,#0E1A2B)] font-tabular block truncate">
                        {formatMoney(billedAmt, cCurrency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-medium text-[var(--muted,#5B6676)] block">
                        Paid
                      </span>
                      <span className="font-bold text-[var(--success,#067647)] font-tabular block truncate">
                        {formatMoney(paidAmt, cCurrency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-medium text-[var(--muted,#5B6676)] block">
                        Outstanding
                      </span>
                      <span
                        className={`font-bold font-tabular block truncate ${
                          overdueCount > 0
                            ? 'text-[var(--error,#B42318)]'
                            : outstandingAmt > 0
                            ? 'text-[var(--warning,#B54708)]'
                            : 'text-[var(--ink,#0E1A2B)]'
                        }`}
                      >
                        {formatMoney(outstandingAmt, cCurrency)}
                      </span>
                      {overdueCount > 0 && (
                        <span className="text-[10px] font-semibold text-[var(--error,#B42318)] block">
                          {overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proposals / Invoices & Last Activity */}
                  <div className="flex items-center justify-between text-[11px] text-[var(--muted,#5B6676)] pt-0.5">
                    <span>
                      {c.proposalsCount || 0} proposal{c.proposalsCount === 1 ? '' : 's'} · {c.invoicesCount || 0} invoice{c.invoicesCount === 1 ? '' : 's'}
                    </span>
                    <span>
                      Last activity {formatRelativeDate(c.lastActivity || c.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Footer Actions: New Proposal, View, More Actions Menu */}
                <div className="px-5 py-3 border-t border-[var(--line,#E8E0CF)]/80 bg-white flex items-center justify-between gap-2 relative z-20">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/proposals/new?clientId=${cId}`);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer"
                      style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                    >
                      New proposal
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${cId}`);
                      }}
                      className="px-3 py-1.5 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>

                  {/* "..." Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : cId);
                      }}
                      aria-label="More actions"
                      className="p-1.5 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }}
                        />
                        <div
                          className="absolute right-0 bottom-full mb-1.5 w-40 bg-white rounded-xl border border-[var(--line,#E8E0CF)] shadow-lg py-1.5 z-40 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setEditingClient(c);
                              setIsAddModalOpen(true);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[var(--page,#FAF5EA)] flex items-center gap-2 cursor-pointer text-[var(--ink,#0E1A2B)]"
                          >
                            <Edit className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                            <span>Edit client</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              navigate(`/invoices`);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[var(--page,#FAF5EA)] flex items-center gap-2 cursor-pointer text-[var(--ink,#0E1A2B)]"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                            <span>Create invoice</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleArchiveClient(c);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[var(--page,#FAF5EA)] flex items-center gap-2 cursor-pointer text-[var(--ink,#0E1A2B)]"
                          >
                            <Archive className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                            <span>Archive</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeletingClient(c);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)] flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =============================================================
           6. TABLE VIEW
           ============================================================= */
        <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] font-semibold border-b border-[var(--line,#E8E0CF)]">
                <tr>
                  <th scope="col" className="py-3 px-4">Client</th>
                  <th scope="col" className="py-3 px-4">Contact</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Billed</th>
                  <th scope="col" className="py-3 px-4 text-right">Outstanding</th>
                  <th scope="col" className="py-3 px-4">Last activity</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                {filteredClients.map((c) => {
                  const cId = c.id || c._id;
                  const compName = c.company || c.name || 'Client';
                  const contact = c.contactPerson || '—';
                  const cCurrency = c.currency || 'USD';
                  const billedAmt = c.totalBilled || c.totalInvoiced || 0;
                  const outstandingAmt = c.outstandingBalance || 0;

                  return (
                    <tr
                      key={cId}
                      onClick={() => navigate(`/clients/${cId}`)}
                      className="hover:bg-[var(--page,#FAF5EA)]/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-[var(--ink,#0E1A2B)]">
                        {compName}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted,#5B6676)]">
                        {contact}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusPill(c.status)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--ink,#0E1A2B)] font-tabular">
                        {formatMoney(billedAmt, cCurrency)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold font-tabular ${
                          outstandingAmt > 0 ? 'text-[var(--warning,#B54708)]' : 'text-[var(--ink,#0E1A2B)]'
                        }`}
                      >
                        {formatMoney(outstandingAmt, cCurrency)}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted,#5B6676)]">
                        {formatRelativeDate(c.lastActivity || c.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/proposals/new?clientId=${cId}`}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                          >
                            Proposal
                          </Link>
                          <Link
                            to={`/clients/${cId}`}
                            className="px-2.5 py-1 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)]"
                          >
                            View
                          </Link>
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
         7. ADD / EDIT CLIENT MODAL
         ============================================================= */}
      {isAddModalOpen && (
        <ClientModal
          isOpen={isAddModalOpen}
          client={editingClient}
          existingClients={clients}
          userPlan={userPlan}
          activeClientsCount={activeClientsCount}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingClient(null);
          }}
          onSave={handleSaveClient}
          onOpenExistingClient={(dupClient) => {
            setIsAddModalOpen(false);
            setEditingClient(null);
            navigate(`/clients/${dupClient.id || dupClient._id}`);
          }}
        />
      )}

      {/* =============================================================
         8. DELETE / ARCHIVE CONFIRMATION DIALOG
         ============================================================= */}
      {deletingClient && (
        <DeleteClientDialog
          isOpen={Boolean(deletingClient)}
          client={deletingClient}
          onClose={() => setDeletingClient(null)}
          onConfirmDelete={handleConfirmDelete}
          onConfirmArchive={handleArchiveClient}
        />
      )}
    </div>
  );
}

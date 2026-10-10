import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Layers,
  Search,
  Plus,
  Copy,
  Check,
  Edit2,
  MoreVertical,
  Archive,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  X,
  Mail,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { ClauseEditorDrawer } from '../components/templates/ClauseEditorDrawer';
import { StarterLibraryModal } from '../components/templates/StarterLibraryModal';
import { ClauseMigrationModal, LEGACY_MIGRATION_PAIRS } from '../components/templates/ClauseMigrationModal';
import { MessageEditorDrawer } from '../components/templates/MessageEditorDrawer';
import { resolveVariables, SAMPLE_VARIABLE_DATA } from '../utils/variableResolver';

const CATEGORIES = [
  'All',
  'Payment',
  'Scope and changes',
  'Delivery and reviews',
  'Ownership and IP',
  'Third-party costs',
  'Support and warranty',
  'Legal',
  'Other',
];

export function TemplatesPage() {
  const { user } = useAuthStore();
  const { showToast } = useNotificationStore();

  const [activeTab, setActiveTab] = useState('clauses'); // 'clauses' | 'messages'
  const [clauses, setClauses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [starterLibrary, setStarterLibrary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showArchived, setShowArchived] = useState(false);

  // Banner state
  const legalBannerKey = `floorly_legal_banner_dismissed_${user?._id || user?.id || 'guest'}`;
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return localStorage.getItem(legalBannerKey) === 'true';
  });

  // Migration banner state
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Modals & Drawers
  const [editingClause, setEditingClause] = useState(null);
  const [isClauseDrawerOpen, setIsClauseDrawerOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const [editingMessage, setEditingMessage] = useState(null);
  const [isMessageDrawerOpen, setIsMessageDrawerOpen] = useState(false);

  // Card expanded preview state (for 4-line clamp toggle)
  const [expandedClauseIds, setExpandedClauseIds] = useState(new Set());

  // Active open dropdown menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // Copied confirmation feedback
  const [copiedId, setCopiedId] = useState(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  const h1Ref = useRef(null);

  // Set document title
  useEffect(() => {
    document.title = 'Floorly: Templates';
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, []);

  // Close open dropdown menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.clause-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch all template data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [cRes, mRes, lRes] = await Promise.all([
        api.getClauses(),
        api.getMessageTemplates(),
        api.getStarterLibrary().catch(() => ({ library: [] })),
      ]);

      if (cRes?.clauses) {
        setClauses(cRes.clauses);
        // Check if migration is needed: any clause with old categories or hardcoded 40/35/25
        const needsMigration = cRes.clauses.some((c) => {
          const body = c.body || '';
          return (
            c.category === 'Scope Guard' ||
            c.category === 'Project SLA' ||
            c.category === 'Infrastructure' ||
            body.includes('40%') ||
            body.includes('AWS, Vercel')
          );
        });
        setShowMigrationBanner(needsMigration);
      }

      if (mRes?.messages) {
        setMessages(mRes.messages);
      }

      if (lRes?.library) {
        setStarterLibrary(lRes.library);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tab Keyboard Navigation (Left / Right arrows)
  const handleTabKeyDown = (e, targetTab) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab = activeTab === 'clauses' ? 'messages' : 'clauses';
      setActiveTab(nextTab);
      const tabEl = document.getElementById(`tab-${nextTab}`);
      tabEl?.focus();
    }
  };

  const handleDismissBanner = () => {
    setIsBannerDismissed(true);
    localStorage.setItem(legalBannerKey, 'true');
  };

  // Copy clause text resolved with sample values
  const handleCopyClause = (clause) => {
    const resolved = resolveVariables(clause.body, SAMPLE_VARIABLE_DATA, true);
    navigator.clipboard.writeText(resolved);
    setCopiedId(clause.id);
    setAriaAnnouncement(`Copied "${clause.title}" to clipboard.`);
    setTimeout(() => {
      setCopiedId(null);
      setAriaAnnouncement('');
    }, 2500);
  };

  // Toggle clause expanded preview
  const toggleExpand = (id) => {
    setExpandedClauseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle "Include in new proposals" switch
  const handleToggleDefaultOn = async (clause) => {
    const nextVal = !clause.defaultOn;
    // Optimistic update
    setClauses((prev) => prev.map((c) => (c.id === clause.id ? { ...c, defaultOn: nextVal } : c)));
    try {
      await api.updateClause(clause.id, { defaultOn: nextVal });
      showToast({
        type: 'success',
        title: nextVal ? 'Included in new proposals' : 'Excluded by default',
        message: `"${clause.title}" ${nextVal ? 'will be pre-selected in new proposals.' : 'is no longer pre-selected.'}`,
      });
    } catch (err) {
      // Rollback
      setClauses((prev) => prev.map((c) => (c.id === clause.id ? { ...c, defaultOn: clause.defaultOn } : c)));
      showToast({ type: 'error', title: 'Update failed', message: err.message });
    }
  };

  // Move clause up / down
  const handleMoveClause = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visibleClauses.length) return;

    const newOrderList = [...visibleClauses];
    const temp = newOrderList[index];
    newOrderList[index] = newOrderList[targetIndex];
    newOrderList[targetIndex] = temp;

    const payload = newOrderList.map((item, idx) => ({ id: item.id, order: idx }));

    // Optimistic
    setClauses((prev) => {
      const map = new Map(payload.map((p) => [p.id, p.order]));
      return [...prev].map((c) => (map.has(c.id) ? { ...c, order: map.get(c.id) } : c)).sort((a, b) => a.order - b.order);
    });

    setAriaAnnouncement(`Moved "${temp.title}" ${direction}.`);

    try {
      await api.reorderClauses(payload);
    } catch (err) {
      loadData();
      showToast({ type: 'error', title: 'Reorder failed', message: err.message });
    }
  };

  // Archive / Restore clause
  const handleToggleArchive = async (clause) => {
    setOpenMenuId(null);
    try {
      const res = await api.deleteClause(clause.id);
      showToast({
        type: 'info',
        title: res.archived ? 'Clause archived' : 'Clause restored',
        message: res.message || `"${clause.title}" has been updated.`,
      });
      loadData();
    } catch (err) {
      showToast({ type: 'error', title: 'Action failed', message: err.message });
    }
  };

  // Duplicate clause
  const handleDuplicateClause = async (clause) => {
    setOpenMenuId(null);
    try {
      const res = await api.duplicateClause(clause.id);
      if (res?.clause) {
        showToast({ type: 'success', title: 'Clause duplicated', message: `Created "${res.clause.title}"` });
        loadData();
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Duplication failed', message: err.message });
    }
  };

  // Restore starter version
  const handleRestoreStarter = async (clause) => {
    setOpenMenuId(null);
    if (!window.confirm(`Reset "${clause.title}" to its official starter wording?`)) return;
    try {
      await api.restoreStarterClause(clause.id);
      showToast({ type: 'success', title: 'Restored starter', message: 'Clause has been reset to official starter text.' });
      loadData();
    } catch (err) {
      showToast({ type: 'error', title: 'Restore failed', message: err.message });
    }
  };

  // Save clause from drawer
  const handleSaveClause = async (payload) => {
    if (editingClause) {
      const res = await api.updateClause(editingClause.id, payload);
      showToast({ type: 'success', title: 'Clause saved', message: `"${res.clause.title}" updated successfully.` });
    } else {
      const res = await api.createClause(payload);
      showToast({ type: 'success', title: 'Clause created', message: `"${res.clause.title}" added to your library.` });
    }
    loadData();
  };

  // Save message template from drawer
  const handleSaveMessage = async (key, payload) => {
    const res = await api.updateMessageTemplate(key, payload);
    showToast({ type: 'success', title: 'Message template saved', message: `"${res.message.title}" updated.` });
    loadData();
  };

  // Restore default message template
  const handleRestoreDefaultMessage = async (key) => {
    await api.restoreDefaultMessageTemplate(key);
    showToast({ type: 'info', title: 'Template reset', message: 'Restored standard default wording.' });
    loadData();
  };

  // Send test email
  const handleSendTestMessage = async (key) => {
    try {
      const res = await api.sendTestMessage(key);
      showToast({
        type: 'success',
        title: 'Test email sent',
        message: res.message || 'Dispatched to your registered email.',
      });
    } catch (err) {
      showToast({
        type: 'warning',
        title: 'Email service inactive',
        message: err.message || 'No live email service is configured on this environment.',
      });
    }
  };

  // Add starter clause from library modal
  const handleAddFromLibrary = async (starterKey) => {
    const res = await api.addFromStarterLibrary(starterKey);
    if (res?.clause) {
      showToast({ type: 'success', title: 'Clause added', message: `Added "${res.clause.title}" to your active clauses.` });
      loadData();
    }
  };

  // Accept migration upgrades
  const handleAcceptMigration = async (pairs) => {
    setShowMigrationBanner(false);
    try {
      for (const pair of pairs) {
        const found = clauses.find(
          (c) =>
            c.title.toLowerCase().includes(pair.title.toLowerCase()) ||
            c.category === pair.oldCategory ||
            (c.body && c.body.includes(pair.oldText.substring(0, 30)))
        );
        if (found) {
          await api.updateClause(found.id, {
            category: pair.newCategory,
            body: pair.newText,
          });
        }
      }
      showToast({
        type: 'success',
        title: 'Clauses upgraded',
        message: 'Replaced legacy text with dynamic variable placeholders.',
      });
      loadData();
    } catch (err) {
      showToast({ type: 'error', title: 'Migration failed', message: err.message });
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: 0 };
    CATEGORIES.forEach((c) => {
      if (c !== 'All') counts[c] = 0;
    });

    clauses.forEach((c) => {
      if (!c.archived || showArchived) {
        counts.All++;
        if (counts[c.category] !== undefined) {
          counts[c.category]++;
        } else {
          counts.Other = (counts.Other || 0) + 1;
        }
      }
    });

    return counts;
  }, [clauses, showArchived]);

  // Filtered clauses list
  const visibleClauses = useMemo(() => {
    return clauses.filter((c) => {
      if (c.archived && !showArchived) return false;
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = (c.title || '').toLowerCase().includes(term);
        const matchBody = (c.body || '').toLowerCase().includes(term);
        if (!matchTitle && !matchBody) return false;
      }
      return true;
    });
  }, [clauses, showArchived, selectedCategory, searchTerm]);

  return (
    <div className="max-w-[1200px] mx-auto pb-16 font-['Instrument_Sans',sans-serif] text-[var(--ink,#0E1A2B)]">
      {/* Aria Live Announcement Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[var(--line,#E8E0CF)] mb-6">
        <div>
          <h1
            ref={h1Ref}
            tabIndex="-1"
            className="text-[30px] font-extrabold leading-[1.15] font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] tracking-tight outline-none focus:outline-none"
          >
            Templates
          </h1>
          <p className="text-[15px] leading-[1.5] text-[var(--muted,#5B6676)] mt-1">
            Reusable clauses and messages for your proposals, invoices and emails.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="shrink-0 flex items-center gap-2">
          {activeTab === 'clauses' ? (
            <button
              type="button"
              onClick={() => {
                setEditingClause(null);
                setIsClauseDrawerOpen(true);
              }}
              className="h-10 px-5 rounded-full text-[14px] font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white transition-colors flex items-center gap-2 cursor-pointer shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add clause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (messages.length > 0) {
                  setEditingMessage(messages[0]);
                  setIsMessageDrawerOpen(true);
                }
              }}
              className="h-10 px-5 rounded-full text-[14px] font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white transition-colors flex items-center gap-2 cursor-pointer shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add message</span>
            </button>
          )}
        </div>
      </header>

      {/* TABS (Real role="tablist" with arrow key navigation) */}
      <div className="flex items-center gap-2 border-b border-[var(--line,#E8E0CF)] mb-6" role="tablist" aria-label="Template Types">
        <button
          id="tab-clauses"
          role="tab"
          aria-selected={activeTab === 'clauses'}
          aria-controls="panel-clauses"
          tabIndex={activeTab === 'clauses' ? 0 : -1}
          onClick={() => setActiveTab('clauses')}
          onKeyDown={(e) => handleTabKeyDown(e, 'clauses')}
          className={`h-11 px-4 text-[15px] font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 ${
            activeTab === 'clauses'
              ? 'border-[var(--cobalt,#0047AB)] text-[var(--cobalt,#0047AB)]'
              : 'border-transparent text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Clauses</span>
          <span className="text-[12px] px-2 py-0.5 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] border border-[var(--line,#E8E0CF)] tabular-nums">
            {clauses.filter((c) => !c.archived).length}
          </span>
        </button>

        <button
          id="tab-messages"
          role="tab"
          aria-selected={activeTab === 'messages'}
          aria-controls="panel-messages"
          tabIndex={activeTab === 'messages' ? 0 : -1}
          onClick={() => setActiveTab('messages')}
          onKeyDown={(e) => handleTabKeyDown(e, 'messages')}
          className={`h-11 px-4 text-[15px] font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 ${
            activeTab === 'messages'
              ? 'border-[var(--cobalt,#0047AB)] text-[var(--cobalt,#0047AB)]'
              : 'border-transparent text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Messages</span>
          <span className="text-[12px] px-2 py-0.5 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] border border-[var(--line,#E8E0CF)] tabular-nums">
            {messages.length || 7}
          </span>
        </button>
      </div>

      {/* -------------------------------------------------------------
         TAB 1: CLAUSES
         ------------------------------------------------------------- */}
      {activeTab === 'clauses' && (
        <section id="panel-clauses" role="tabpanel" aria-labelledby="tab-clauses" className="space-y-6">
          {/* Dismissible Legal Banner */}
          {!isBannerDismissed && (
            <div className="p-3.5 rounded-2xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] flex items-center justify-between gap-3 text-[13px] text-[var(--muted,#5B6676)] animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <Info className="w-4 h-4 text-[var(--cobalt,#0047AB)] shrink-0" />
                <span className="truncate sm:whitespace-normal">
                  These are starting points, not legal advice. Have a lawyer review them for your country before you rely on them.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissBanner}
                aria-label="Dismiss legal note"
                className="p-1 hover:bg-white rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Migration Banner (if old clauses detected) */}
          {showMigrationBanner && (
            <div className="p-4 rounded-2xl bg-[var(--cobalt-tint,#E8F0FB)] border border-[var(--cobalt,#0047AB)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--cobalt,#0047AB)] shrink-0" />
                <div>
                  <span className="font-bold text-[var(--ink,#0E1A2B)] block">
                    Upgrade clauses to smart dynamic variables
                  </span>
                  <span className="text-[var(--muted,#5B6676)]">
                    Replace hardcoded 40/35/25 and cloud provider names with dynamic variables like{' '}
                    <code className="text-[var(--cobalt,#0047AB)] font-mono">{'{{payment_schedule}}'}</code>.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMigrationModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--cobalt,#0047AB)] text-white hover:bg-[var(--cobalt-dark,#003A8C)] transition-colors cursor-pointer"
                >
                  Review changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowMigrationBanner(false)}
                  className="p-1 text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TOOLBAR */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[var(--muted,#5B6676)] absolute left-3.5 top-1/2 -translate-y-1/2 select-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clauses by title or text..."
                  className="w-full h-10 pl-9 pr-8 rounded-xl border border-[var(--line,#E8E0CF)] text-[14px] text-[var(--ink,#0E1A2B)] bg-white placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Right toolbar controls */}
              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="rounded border-[var(--line,#E8E0CF)] text-[var(--cobalt,#0047AB)] focus:ring-[var(--cobalt,#0047AB)]"
                  />
                  <span>Show archived</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="h-10 px-4 rounded-xl text-[13px] font-semibold bg-white border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] hover:border-[var(--cobalt,#0047AB)]/50 transition-colors flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
                  <span>Add from library</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 ${
                    selectedCategory === cat
                      ? 'bg-[var(--cobalt,#0047AB)] text-white shadow-xs'
                      : 'bg-white border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)]'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`ml-1.5 text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      selectedCategory === cat
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)]'
                    }`}
                  >
                    {categoryCounts[cat] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* LOADING SKELETON */}
          {isLoading && (
            <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-6 bg-white rounded-2xl border border-[var(--line,#E8E0CF)] space-y-4 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-24 bg-gray-200 rounded-full" />
                    <div className="h-5 w-10 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-6 w-3/4 bg-gray-200 rounded" />
                  <div className="h-16 w-full bg-gray-100 rounded" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* ERROR CARD */}
          {isError && !isLoading && (
            <div className="p-8 text-center bg-white rounded-2xl border border-[var(--error,#B42318)]/30 space-y-3">
              <AlertTriangle className="w-8 h-8 text-[var(--error,#B42318)] mx-auto" />
              <h3 className="text-lg font-bold text-[var(--ink,#0E1A2B)]">We couldn't load your templates</h3>
              <p className="text-sm text-[var(--muted,#5B6676)]">A connection error occurred while loading clauses.</p>
              <button
                type="button"
                onClick={loadData}
                className="px-4 py-2 rounded-full bg-[var(--cobalt,#0047AB)] text-white text-xs font-semibold hover:bg-[var(--cobalt-dark,#003A8C)] cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoading && !isError && clauses.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-[var(--line,#E8E0CF)] space-y-4">
              <Layers className="w-10 h-10 text-[var(--muted,#5B6676)] mx-auto opacity-50" />
              <div>
                <h3 className="text-lg font-bold text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                  No clauses yet
                </h3>
                <p className="text-sm text-[var(--muted,#5B6676)] max-w-md mx-auto mt-1">
                  Clauses are reusable terms you can add to any proposal.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="h-10 px-5 rounded-full text-xs font-semibold bg-[var(--cobalt,#0047AB)] text-white hover:bg-[var(--cobalt-dark,#003A8C)] transition-colors cursor-pointer"
                >
                  Add from library
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingClause(null);
                    setIsClauseDrawerOpen(true);
                  }}
                  className="h-10 px-5 rounded-full text-xs font-semibold bg-white border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer"
                >
                  Write your own
                </button>
              </div>
            </div>
          )}

          {/* NO RESULTS FOR SEARCH / FILTER */}
          {!isLoading && !isError && clauses.length > 0 && visibleClauses.length === 0 && (
            <div className="p-10 text-center bg-white rounded-2xl border border-[var(--line,#E8E0CF)] space-y-3">
              <Search className="w-8 h-8 text-[var(--muted,#5B6676)] mx-auto opacity-40" />
              <h3 className="text-base font-bold text-[var(--ink,#0E1A2B)]">No clauses match your filter</h3>
              <p className="text-xs text-[var(--muted,#5B6676)]">Try adjusting your search terms or category selection.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="text-xs font-bold text-[var(--cobalt,#0047AB)] hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* 2-COLUMN GRID (EQUAL-HEIGHT CARDS) */}
          {!isLoading && !isError && visibleClauses.length > 0 && (
            <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-5 items-stretch">
              {visibleClauses.map((clause, idx) => {
                const isExpanded = expandedClauseIds.has(clause.id);
                const isMenuOpen = openMenuId === clause.id;
                const isCopied = copiedId === clause.id;

                return (
                  <article
                    key={clause.id}
                    className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all relative ${
                      clause.archived
                        ? 'opacity-60 border-dashed border-[var(--line,#E8E0CF)]'
                        : 'border-[var(--line,#E8E0CF)] hover:border-[var(--line,#E8E0CF)]/80'
                    }`}
                  >
                    {/* Card Top Row: Category Pill & DefaultOn Switch */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* Neutral Category Pill (Cobalt Tint) */}
                        <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
                          {clause.category}
                        </span>

                        {/* Inline Switch "Include in new proposals" */}
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`switch-${clause.id}`}
                            className="text-[12px] font-medium text-[var(--muted,#5B6676)] select-none cursor-pointer"
                            title="Pre-selected in newly created proposals"
                          >
                            Include in new proposals
                          </label>
                          <button
                            id={`switch-${clause.id}`}
                            type="button"
                            role="switch"
                            aria-checked={clause.defaultOn}
                            aria-label={`Include ${clause.title} in new proposals by default`}
                            onClick={() => handleToggleDefaultOn(clause)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 ${
                              clause.defaultOn ? 'bg-[var(--cobalt,#0047AB)]' : 'bg-[var(--line,#E8E0CF)]'
                            }`}
                          >
                            <span
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                clause.defaultOn ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Title (Bricolage Grotesque 18px) */}
                      <h2 className="text-[18px] font-bold text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif] leading-tight">
                        {clause.title}
                      </h2>

                      {/* Clause Text (Directly on white card with subtle 3px left border) */}
                      <div className="border-l-3 border-[var(--line,#E8E0CF)] pl-3.5 my-2">
                        <p
                          className={`text-[14px] text-[var(--ink,#0E1A2B)] leading-relaxed font-sans ${
                            isExpanded ? '' : 'line-clamp-4'
                          }`}
                        >
                          {clause.body}
                        </p>
                        {clause.body && clause.body.length > 200 && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(clause.id)}
                            className="text-[12px] font-semibold text-[var(--cobalt,#0047AB)] hover:underline mt-1 cursor-pointer"
                          >
                            {isExpanded ? 'Show less' : 'Show full text'}
                          </button>
                        )}
                      </div>

                      {/* Meta Line: Used count & Relative date & Starter tag */}
                      <div className="flex items-center gap-2 flex-wrap text-[12px] text-[var(--muted,#5B6676)] pt-1">
                        <span>Used in {clause.usedCount || 0} proposals</span>
                        <span>·</span>
                        <span>
                          Edited{' '}
                          {new Date(clause.updatedAt || clause.createdAt || Date.now()).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {clause.isStarter && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--sun-tint,#FFF4CC)] text-[var(--ink,#0E1A2B)]">
                            Starter
                          </span>
                        )}
                        {clause.archived && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--warning-tint,#FEF0C7)] text-[var(--warning,#B54708)]">
                            Archived
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Row */}
                    <div className="pt-4 border-t border-[var(--line,#E8E0CF)] mt-4 flex items-center justify-between">
                      {/* Left: Reorder Controls (Keyboard accessible) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveClause(idx, 'up')}
                          disabled={idx === 0}
                          aria-label={`Move ${clause.title} up`}
                          className="p-1 rounded text-[var(--muted,#5B6676)] hover:text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveClause(idx, 'down')}
                          disabled={idx === visibleClauses.length - 1}
                          aria-label={`Move ${clause.title} down`}
                          className="p-1 rounded text-[var(--muted,#5B6676)] hover:text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right: Copy, Edit, Menu */}
                      <div className="flex items-center gap-2">
                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopyClause(clause)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] flex items-center gap-1.5 transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-[var(--success,#067647)]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>

                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClause(clause);
                            setIsClauseDrawerOpen(true);
                          }}
                          className="h-8 px-3 rounded-lg text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] flex items-center gap-1.5 transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* "..." Dropdown Menu */}
                        <div className="relative clause-menu-container">
                          <button
                            type="button"
                            aria-expanded={isMenuOpen}
                            aria-label={`Actions for ${clause.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : clause.id);
                            }}
                            className="p-1.5 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 bottom-full mb-1 z-30 w-48 bg-white border border-[var(--line,#E8E0CF)] rounded-xl shadow-xl p-1.5 space-y-1 text-xs">
                              <button
                                type="button"
                                onClick={() => handleDuplicateClause(clause)}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] font-medium flex items-center gap-2 cursor-pointer"
                              >
                                <span>Duplicate</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleMoveClause(idx, 'up');
                                }}
                                disabled={idx === 0}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] font-medium disabled:opacity-30 cursor-pointer"
                              >
                                <span>Move up</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleMoveClause(idx, 'down');
                                }}
                                disabled={idx === visibleClauses.length - 1}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] font-medium disabled:opacity-30 cursor-pointer"
                              >
                                <span>Move down</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(clause)}
                                className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] font-medium flex items-center gap-2 cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                                <span>{clause.archived ? 'Unarchive' : 'Archive'}</span>
                              </button>
                              {clause.isStarter && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreStarter(clause)}
                                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[var(--page,#FAF5EA)] text-[var(--cobalt,#0047AB)] font-semibold flex items-center gap-2 border-t border-[var(--line,#E8E0CF)] pt-1.5 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore starter text</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* -------------------------------------------------------------
         TAB 2: MESSAGES
         ------------------------------------------------------------- */}
      {activeTab === 'messages' && (
        <section id="panel-messages" role="tabpanel" aria-labelledby="tab-messages" className="space-y-6">
          <div className="p-4 rounded-2xl bg-white border border-[var(--line,#E8E0CF)] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                Email & Reminder Templates
              </h2>
              <p className="text-[13px] text-[var(--muted,#5B6676)]">
                Short, polite, plain-English message texts used by your Send invoice, Send proposal, and automated reminder dialogs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {messages.map((msg) => (
              <article
                key={msg.key}
                className="bg-white border border-[var(--line,#E8E0CF)] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--line,#E8E0CF)]/80 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[16px] text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                      {msg.title}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
                      Email template
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-[var(--muted,#5B6676)] truncate">
                    Subject: <span className="text-[var(--ink,#0E1A2B)]">{msg.subject}</span>
                  </div>

                  <div className="border-l-3 border-[var(--line,#E8E0CF)] pl-3.5 py-1">
                    <p className="text-xs text-[var(--muted,#5B6676)] line-clamp-4 leading-relaxed font-sans whitespace-pre-line">
                      {msg.body}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--line,#E8E0CF)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--muted,#5B6676)]">
                    v{msg.version || 1} · {msg.history?.length || 0} revisions
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreDefaultMessage(msg.key)}
                      className="text-xs font-semibold text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] px-2 py-1 rounded cursor-pointer"
                    >
                      Restore default
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(msg);
                        setIsMessageDrawerOpen(true);
                      }}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white transition-colors flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit template</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* MODALS & DRAWERS */}
      <ClauseEditorDrawer
        isOpen={isClauseDrawerOpen}
        clause={editingClause}
        onClose={() => {
          setIsClauseDrawerOpen(false);
          setEditingClause(null);
        }}
        onSave={handleSaveClause}
        onRestoreVersion={async (clauseId, version) => {
          await api.restoreClauseVersion(clauseId, version);
          showToast({ type: 'success', title: 'Version restored', message: `Restored to version ${version}.` });
          loadData();
        }}
      />

      <StarterLibraryModal
        isOpen={isLibraryModalOpen}
        library={starterLibrary}
        onClose={() => setIsLibraryModalOpen(false)}
        onAddClause={handleAddFromLibrary}
      />

      <ClauseMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        onAcceptMigration={handleAcceptMigration}
      />

      <MessageEditorDrawer
        isOpen={isMessageDrawerOpen}
        template={editingMessage}
        onClose={() => {
          setIsMessageDrawerOpen(false);
          setEditingMessage(null);
        }}
        onSave={handleSaveMessage}
        onRestoreDefault={handleRestoreDefaultMessage}
        onRestoreVersion={async (key, version) => {
          await api.restoreMessageVersion(key, version);
          showToast({ type: 'success', title: 'Version restored', message: `Restored message to version ${version}.` });
          loadData();
        }}
        onSendTest={handleSendTestMessage}
      />
    </div>
  );
}

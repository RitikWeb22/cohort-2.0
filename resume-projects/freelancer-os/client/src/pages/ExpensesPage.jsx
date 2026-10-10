import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Paperclip,
  Trash2,
  Edit2,
  Copy,
  Pause,
  Play,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Tag,
  Clock,
  Building,
  CheckCircle2,
  ArrowRight,
  Layers,
  RotateCcw,
  Calendar,
  ChevronDown,
  X,
  FileSpreadsheet,
  FolderGit2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { ExpenseDrawer } from '../components/expenses/ExpenseDrawer';
import {
  EXPENSE_CATEGORIES,
  normalizeCategory,
  computeProfitMetrics,
} from '../utils/profitEngine';

export function ExpensesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast, showConfirm } = useNotificationStore();
  const { currency: userCurrency, format } = useCurrencyStore();

  // Document Title
  useEffect(() => {
    document.title = 'Floorly: Expenses & profit';
  }, []);

  // Raw data from server
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Undo Toast state
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);

  // Active Tab: 'profit' | 'expenses' | 'recurring'
  const [activeTab, setActiveTab] = useState('profit');

  // Period Selector: 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom'
  const [period, setPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Expenses Tab Filters & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [billableFilter, setBillableFilter] = useState('all'); // 'all' | 'billable' | 'billed' | 'unbillable'
  const [recurringFilter, setRecurringFilter] = useState('all'); // 'all' | 'recurring' | 'one_time'
  const [receiptFilter, setReceiptFilter] = useState('all'); // 'all' | 'with_receipt' | 'missing'
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

  // Profit Tab Sort
  const [profitSortField, setProfitSortField] = useState('netProfit');
  const [profitSortAsc, setProfitSortAsc] = useState(false);
  const [showChartTableFallback, setShowChartTableFallback] = useState(false);

  // Bulk Selection
  const [selectedExpenseIds, setSelectedExpenseIds] = useState(new Set());

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Action Menu open item
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [eRes, pRes, iRes, prRes] = await Promise.all([
        api.getExpenses(),
        api.getProjects(),
        api.getInvoices(),
        api.getPricingSettings().catch(() => ({ settings: null })),
      ]);

      const loadedExpenses = (eRes?.expenses || []).map((e) => ({
        ...e,
        category: normalizeCategory(e.category),
      }));

      setExpenses(loadedExpenses);
      setProjects(pRes?.projects || []);
      setInvoices(iRes?.invoices || []);
      if (prRes?.settings) {
        setPricingSettings(prRes.settings);
      }
    } catch (err) {
      console.error('Failed to load expenses & profit data:', err);
      setLoadError(err.message || 'We could not load your expenses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close action menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.expense-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Standard hourly rate from Pricing rules or fallback
  const standardHourlyRate = Number(pricingSettings?.hourlyRate) || 50;
  const taxRate = Number(user?.taxRate || pricingSettings?.taxRate) || 0;

  // Period Date Range calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (period === 'this_month') {
      const start = new Date(curYear, curMonth, 1);
      const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
      return { start, end };
    }
    if (period === 'last_month') {
      const start = new Date(curYear, curMonth - 1, 1);
      const end = new Date(curYear, curMonth, 0, 23, 59, 59);
      return { start, end };
    }
    if (period === 'this_quarter') {
      const qMonth = Math.floor(curMonth / 3) * 3;
      const start = new Date(curYear, qMonth, 1);
      const end = new Date(curYear, qMonth + 3, 0, 23, 59, 59);
      return { start, end };
    }
    if (period === 'this_year') {
      const start = new Date(curYear, 0, 1);
      const end = new Date(curYear, 11, 31, 23, 59, 59);
      return { start, end };
    }
    if (period === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59);
      return { start, end };
    }
    return null; // All time
  }, [period, customStartDate, customEndDate]);

  // Filter items by selected Period
  const periodFilteredExpenses = useMemo(() => {
    if (!dateRange) return expenses;
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [expenses, dateRange]);

  const periodFilteredInvoices = useMemo(() => {
    if (!dateRange) return invoices;
    return invoices.filter((i) => {
      const d = new Date(i.issueDate || i.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [invoices, dateRange]);

  // Overall metrics computed via Single Source of Truth Engine
  const profitMetrics = useMemo(() => {
    return computeProfitMetrics({
      projects,
      invoices: periodFilteredInvoices,
      expenses: periodFilteredExpenses,
      standardHourlyRate,
      taxRate,
    });
  }, [projects, periodFilteredInvoices, periodFilteredExpenses, standardHourlyRate, taxRate]);

  // Set default tab on initial load if data exists
  useEffect(() => {
    if (!isLoading) {
      const hasData = expenses.length > 0 || invoices.length > 0;
      if (hasData && activeTab === 'profit') {
        // Keep profit as default
      }
    }
  }, [isLoading, expenses.length, invoices.length, activeTab]);

  // Monthly Chart Data (Last 6 months)
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        revenue: 0,
        expenses: 0,
        profit: 0,
      });
    }

    for (const inv of invoices) {
      const invDate = new Date(inv.issueDate || inv.createdAt);
      const paidAmt = Number(inv.amountPaid) || 0;
      const totalAmt = Number(inv.totalAmount) || 0;
      const taxAmt = Number(inv.taxAmount) || 0;
      const netPaid = totalAmt > 0 ? Math.round((totalAmt - taxAmt) * (paidAmt / totalAmt)) : paidAmt;

      const target = months.find(
        (m) => m.year === invDate.getFullYear() && m.monthNum === invDate.getMonth()
      );
      if (target) {
        target.revenue += netPaid;
      }
    }

    for (const exp of expenses) {
      const expDate = new Date(exp.date);
      const amt = Number(exp.amount) || 0;
      const target = months.find(
        (m) => m.year === expDate.getFullYear() && m.monthNum === expDate.getMonth()
      );
      if (target) {
        target.expenses += amt;
      }
    }

    return months.map((m) => ({
      ...m,
      profit: m.revenue - m.expenses,
    }));
  }, [invoices, expenses]);

  // Sortable Project Profitability list
  const sortedProjects = useMemo(() => {
    const list = [...profitMetrics.projectBreakdown];
    list.sort((a, b) => {
      let valA = a[profitSortField];
      let valB = b[profitSortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;
      if (valA < valB) return profitSortAsc ? -1 : 1;
      if (valA > valB) return profitSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [profitMetrics.projectBreakdown, profitSortField, profitSortAsc]);

  // Filtered Expenses List (for Expenses Tab)
  const filteredExpensesList = useMemo(() => {
    let list = [...periodFilteredExpenses];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          (e.vendor && e.vendor.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.projectTitle && e.projectTitle.toLowerCase().includes(q))
      );
    }

    // Project filter
    if (projectFilter !== 'all') {
      if (projectFilter === 'overhead') {
        list = list.filter((e) => !e.projectId && !e.project);
      } else {
        list = list.filter((e) => {
          const eId = (e.projectId?._id || e.projectId || e.project?._id || e.project || '').toString();
          return eId === projectFilter;
        });
      }
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((e) => normalizeCategory(e.category) === categoryFilter);
    }

    // Billable filter
    if (billableFilter !== 'all') {
      if (billableFilter === 'billable') list = list.filter((e) => e.billableToClient && !e.billedOnInvoice);
      else if (billableFilter === 'billed') list = list.filter((e) => Boolean(e.billedOnInvoice));
      else if (billableFilter === 'unbillable') list = list.filter((e) => !e.billableToClient);
    }

    // Recurring filter
    if (recurringFilter !== 'all') {
      if (recurringFilter === 'recurring') list = list.filter((e) => e.recurring?.interval && e.recurring.interval !== 'none');
      else if (recurringFilter === 'one_time') list = list.filter((e) => !e.recurring?.interval || e.recurring.interval === 'none');
    }

    // Receipt filter
    if (receiptFilter !== 'all') {
      if (receiptFilter === 'with_receipt') list = list.filter((e) => Boolean(e.receiptUrl));
      else if (receiptFilter === 'missing') list = list.filter((e) => !e.receiptUrl);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
      return 0;
    });

    return list;
  }, [
    periodFilteredExpenses,
    searchQuery,
    projectFilter,
    categoryFilter,
    billableFilter,
    recurringFilter,
    receiptFilter,
    sortBy,
  ]);

  // Recurring Expenses List (for Recurring Tab)
  const recurringExpensesList = useMemo(() => {
    return expenses.filter((e) => e.recurring?.interval && e.recurring.interval !== 'none');
  }, [expenses]);

  // CRUD Handlers
  const handleSaveExpense = async (payload, existingId) => {
    if (existingId) {
      // Optimistic Update
      const oldList = [...expenses];
      setExpenses((prev) =>
        prev.map((e) => ((e.id || e._id) === existingId ? { ...e, ...payload, id: existingId } : e))
      );

      try {
        const res = await api.updateExpense(existingId, payload);
        if (res?.expense) {
          setExpenses((prev) =>
            prev.map((e) => ((e.id || e._id) === existingId ? res.expense : e))
          );
          showToast({ type: 'success', title: 'Expense updated', message: 'Changes saved successfully.' });
        }
      } catch (err) {
        setExpenses(oldList);
        throw err;
      }
    } else {
      // Create new
      const res = await api.createExpense(payload);
      if (res?.expense) {
        setExpenses((prev) => [res.expense, ...prev]);
        showToast({ type: 'success', title: 'Expense saved', message: 'New expense logged successfully.' });
      }
    }
  };

  const handleDeleteExpense = (id) => {
    const target = expenses.find((e) => (e.id || e._id) === id);
    if (!target) return;

    showConfirm({
      title: 'Delete expense?',
      message: `Are you sure you want to remove "${target.description}"? You can undo this action immediately.`,
      confirmText: 'Delete expense',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        // Store for undo
        setRecentlyDeleted(target);

        // Optimistic remove
        setExpenses((prev) => prev.filter((e) => (e.id || e._id) !== id));
        setSelectedExpenseIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        try {
          await api.deleteExpense(id);
          showToast({
            type: 'success',
            title: 'Expense removed',
            message: 'Expense record deleted.',
            duration: 5000,
          });
        } catch (err) {
          // Rollback
          setExpenses((prev) => [target, ...prev]);
          showToast({ type: 'error', title: 'Delete failed', message: err.message || 'Unable to delete expense.' });
        }
      },
    });
  };

  // Undo delete
  const handleUndoDelete = async () => {
    if (!recentlyDeleted) return;
    const toRestore = recentlyDeleted;
    setRecentlyDeleted(null);

    try {
      const res = await api.createExpense({
        ...toRestore,
        projectId: toRestore.projectId?._id || toRestore.projectId || null,
      });
      if (res?.expense) {
        setExpenses((prev) => [res.expense, ...prev]);
        showToast({ type: 'success', title: 'Expense restored', message: 'Record restored successfully.' });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Undo failed', message: 'Could not restore expense.' });
    }
  };

  const handleDuplicateExpense = async (id) => {
    try {
      const res = await api.duplicateExpense(id);
      if (res?.expense) {
        setExpenses((prev) => [res.expense, ...prev]);
        showToast({ type: 'success', title: 'Expense duplicated', message: 'Copy created successfully.' });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Duplication failed', message: err.message });
    }
  };

  const handleTogglePause = async (id) => {
    try {
      const res = await api.toggleExpensePause(id);
      if (res?.expense) {
        setExpenses((prev) =>
          prev.map((e) => ((e.id || e._id) === id ? res.expense : e))
        );
        showToast({
          type: 'info',
          title: res.expense.recurring?.isPaused ? 'Recurring subscription paused' : 'Recurring subscription active',
        });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Action failed', message: err.message });
    }
  };

  // Bulk operations
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedExpenseIds(new Set(filteredExpensesList.map((x) => x.id || x._id)));
    } else {
      setSelectedExpenseIds(new Set());
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedExpenseIds);
    if (ids.length === 0) return;

    showConfirm({
      title: `Delete ${ids.length} expenses?`,
      message: 'This will permanently remove the selected expenses.',
      confirmText: 'Delete selected',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.bulkDeleteExpenses(ids);
          setExpenses((prev) => prev.filter((e) => !selectedExpenseIds.has(e.id || e._id)));
          setSelectedExpenseIds(new Set());
          showToast({ type: 'success', title: 'Expenses deleted', message: `${ids.length} records removed.` });
        } catch (err) {
          showToast({ type: 'error', title: 'Bulk delete failed', message: err.message });
        }
      },
    });
  };

  const handleBulkMarkBillable = async (isBillable) => {
    const ids = Array.from(selectedExpenseIds);
    if (ids.length === 0) return;

    try {
      await api.bulkBillableExpenses(ids, isBillable);
      setExpenses((prev) =>
        prev.map((e) =>
          selectedExpenseIds.has(e.id || e._id) ? { ...e, billableToClient: isBillable } : e
        )
      );
      setSelectedExpenseIds(new Set());
      showToast({
        type: 'success',
        title: isBillable ? 'Marked as billable' : 'Marked as non-billable',
        message: `${ids.length} expenses updated.`,
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Bulk update failed', message: err.message });
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const rows = [];
    if (activeTab === 'profit') {
      rows.push([
        'Project',
        'Client',
        'Status',
        'Revenue Received (ex tax)',
        'Direct Expenses',
        'Logged Hours',
        'Standard Rate',
        'Time Cost',
        'Gross Profit',
        'Net Profit',
        'Net Margin %',
        'Effective Rate',
      ]);
      for (const p of sortedProjects) {
        rows.push([
          `"${p.projectTitle.replace(/"/g, '""')}"`,
          `"${p.clientName.replace(/"/g, '""')}"`,
          p.status,
          p.revenue,
          p.directCosts,
          p.loggedHours,
          p.standardHourlyRate,
          p.timeCost,
          p.grossProfit,
          p.netProfit,
          p.marginPercent !== null ? `${p.marginPercent}%` : '—',
          p.effectiveHourlyRate,
        ]);
      }
    } else {
      rows.push([
        'Date',
        'Vendor',
        'Description',
        'Category',
        'Project',
        'Amount',
        'Currency',
        'Billable to Client',
        'Billed On Invoice',
        'Recurring',
        'Tax Deductible',
        'Payment Method',
        'Notes',
      ]);
      for (const e of filteredExpensesList) {
        rows.push([
          new Date(e.date).toISOString().split('T')[0],
          `"${(e.vendor || '').replace(/"/g, '""')}"`,
          `"${(e.description || '').replace(/"/g, '""')}"`,
          `"${(e.category || '').replace(/"/g, '""')}"`,
          `"${(e.projectTitle || 'General overhead').replace(/"/g, '""')}"`,
          e.amount,
          e.currency || userCurrency,
          e.billableToClient ? 'Yes' : 'No',
          e.billedOnInvoice || 'No',
          e.recurring?.interval || 'none',
          e.taxDeductible ? 'Yes' : 'No',
          e.paymentMethod || 'card',
          `"${(e.notes || '').replace(/"/g, '""')}"`,
        ]);
      }
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Floorly-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Drawer in New Mode
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsDrawerOpen(true);
  };

  // Open Drawer in Edit Mode
  const handleOpenEditExpense = (expenseItem) => {
    setEditingExpense(expenseItem);
    setIsDrawerOpen(true);
    setActiveMenuId(null);
  };

  // Format currency helper
  const formatMoney = (val, curr = userCurrency) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr || 'USD',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  // Check if everything is completely empty (no revenue and no expenses)
  const isEverythingEmpty = !isLoading && expenses.length === 0 && invoices.length === 0;

  return (
    <div className="pt-8 pb-16 space-y-6 max-w-7xl mx-auto">
      {/* Undo Toast Banner */}
      {recentlyDeleted && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[var(--ink,#0E1A2B)] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom duration-200"
        >
          <span>Expense deleted</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="text-[var(--sun,#FFC72C)] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setRecentlyDeleted(null)}
            className="text-[var(--muted,#5B6676)] hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* =====================================================================
          1. HEADER & GLOBAL ACTIONS
          ===================================================================== */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--line,#E8E0CF)]">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-[var(--ink,#0E1A2B)] tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Expenses & profit
          </h1>
          <p className="text-sm text-[var(--muted,#5B6676)] mt-0.5">
            See what each project really earns after costs and your time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--line,#E8E0CF)] bg-white text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 cursor-pointer shadow-xs"
            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add expense</span>
          </button>
        </div>
      </header>

      {/* Error Card */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-[var(--error-tint,#FEE4E2)] border border-[var(--error,#B42318)]/20 text-xs text-[var(--error,#B42318)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1 rounded-full bg-white border border-[var(--error,#B42318)]/30 text-[var(--error,#B42318)] font-semibold hover:bg-[var(--error-tint,#FEE4E2)] cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* =====================================================================
          2. PERIOD SELECTOR BAR
          ===================================================================== */}
      <nav aria-label="Period selector" className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="inline-flex items-center p-1 rounded-full bg-white border border-[var(--line,#E8E0CF)] shadow-2xs">
          {[
            { id: 'this_month', label: 'This month' },
            { id: 'last_month', label: 'Last month' },
            { id: 'this_quarter', label: 'This quarter' },
            { id: 'this_year', label: 'This year' },
            { id: 'all', label: 'All time' },
            { id: 'custom', label: 'Custom' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                period === item.id
                  ? 'bg-[var(--cobalt,#0047AB)] text-white font-semibold'
                  : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[var(--line,#E8E0CF)] text-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="outline-none text-[var(--ink,#0E1A2B)]"
            />
            <span className="text-[var(--muted,#5B6676)]">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="outline-none text-[var(--ink,#0E1A2B)]"
            />
          </div>
        )}
      </nav>

      {/* =====================================================================
          3. COMPACT KPI ROW (4 compact cards, sentence-case, no duplicate stats)
          ===================================================================== */}
      <section aria-label="Financial performance metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue (received) */}
        <article className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted,#5B6676)]">
              Revenue (received)
            </span>
            <div
              className="cursor-help text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]"
              title="Payments received excluding tax from payment ledger"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className="text-2xl sm:text-3xl font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {formatMoney(profitMetrics.revenue)}
            </div>
            <p className="text-xs text-[var(--muted,#5B6676)] mt-2 font-medium">
              Payments received excl. tax
            </p>
          </div>
        </article>

        {/* KPI 2: Expenses */}
        <article className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted,#5B6676)]">
              Expenses
            </span>
            <div
              className="cursor-help text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]"
              title="Direct costs = Project expenses (non-billable) + unbilled pass-throughs + overhead"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className="text-2xl sm:text-3xl font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {formatMoney(profitMetrics.totalExpenses)}
            </div>
            <p className="text-xs text-[var(--muted,#5B6676)] mt-2 font-medium">
              {periodFilteredExpenses.length} items logged
            </p>
          </div>
        </article>

        {/* KPI 3: Time cost */}
        <article className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted,#5B6676)]">
              Time cost
            </span>
            <div
              className="cursor-help text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]"
              title="Time cost = Logged hours × standard hourly rate from Pricing rules"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className="text-2xl sm:text-3xl font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {formatMoney(profitMetrics.timeCost)}
            </div>
            <p className="text-xs text-[var(--muted,#5B6676)] mt-2 font-medium">
              {profitMetrics.totalHours} hrs @ {formatMoney(standardHourlyRate)}/hr
            </p>
          </div>
        </article>

        {/* KPI 4: Net profit */}
        <article className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted,#5B6676)]">
              Net profit
            </span>
            <div
              className="cursor-help text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]"
              title="Net profit = Revenue - Direct costs - Time cost"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums leading-none ${
                profitMetrics.netProfit < 0 ? 'text-[var(--error,#B42318)]' : 'text-[var(--ink,#0E1A2B)]'
              }`}
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {formatMoney(profitMetrics.netProfit)}
            </div>
            <p className="text-xs text-[var(--muted,#5B6676)] mt-2 font-medium">
              {profitMetrics.marginPercent !== null ? (
                <span
                  className={
                    profitMetrics.marginPercent >= 20
                      ? 'text-[var(--success,#067647)] font-bold'
                      : profitMetrics.marginPercent >= 0
                      ? 'text-[var(--cobalt,#0047AB)] font-bold'
                      : 'text-[var(--error,#B42318)] font-bold'
                  }
                >
                  {profitMetrics.marginPercent}% margin
                </span>
              ) : (
                <span title="Appears after your first payment">—</span>
              )}
            </p>
          </div>
        </article>
      </section>

      {/* =====================================================================
          4. MAIN VIEW TABS
          ===================================================================== */}
      <div className="border-b border-[var(--line,#E8E0CF)]">
        <div className="flex items-center gap-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profit')}
            className={`pb-3 relative transition-colors cursor-pointer ${
              activeTab === 'profit'
                ? 'text-[var(--cobalt,#0047AB)]'
                : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
            }`}
          >
            <span>Profit</span>
            {activeTab === 'profit' && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'text-[var(--cobalt,#0047AB)]'
                : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
            }`}
          >
            <span>Expenses</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)]">
              {periodFilteredExpenses.length}
            </span>
            {activeTab === 'expenses' && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recurring')}
            className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recurring'
                ? 'text-[var(--cobalt,#0047AB)]'
                : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
            }`}
          >
            <span>Recurring</span>
            {recurringExpensesList.length > 0 && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] font-semibold">
                {recurringExpensesList.length}
              </span>
            )}
            {activeTab === 'recurring' && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          5. TAB 1: PROFIT VIEW
          ===================================================================== */}
      {activeTab === 'profit' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {isEverythingEmpty ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-12 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h2
                className="text-lg font-bold text-[var(--ink,#0E1A2B)] mb-1"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                See your real profit
              </h2>
              <p className="text-xs text-[var(--muted,#5B6676)] max-w-sm mx-auto mb-6">
                Add your costs and log time on projects to see what each project really earns.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenAddExpense}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer shadow-xs"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add expense</span>
                </button>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
                >
                  <FolderGit2 className="w-4 h-4 text-[var(--muted,#5B6676)]" />
                  <span>Open projects</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Profit by Project Table Card */}
              <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--line,#E8E0CF)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3
                      className="text-base font-bold text-[var(--ink,#0E1A2B)]"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      Profit by project
                    </h3>
                    <p className="text-xs text-[var(--muted,#5B6676)]">
                      Comparing cash collected vs direct costs and allocated time
                    </p>
                  </div>
                  <span className="text-xs text-[var(--muted,#5B6676)] font-medium">
                    Standard rate: <strong className="text-[var(--ink,#0E1A2B)]">{formatMoney(standardHourlyRate)}/hr</strong>
                  </span>
                </div>

                {sortedProjects.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--muted,#5B6676)]">
                    No projects found for the selected period.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[var(--page,#FAF5EA)]/60 border-b border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] font-semibold">
                            <th className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setProfitSortField('projectTitle');
                                  setProfitSortAsc(!profitSortAsc);
                                }}
                                className="inline-flex items-center gap-1 hover:text-[var(--ink,#0E1A2B)] cursor-pointer"
                              >
                                <span>Project</span>
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="py-3 px-4">Client</th>
                            <th className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setProfitSortField('revenue');
                                  setProfitSortAsc(!profitSortAsc);
                                }}
                                className="inline-flex items-center gap-1 hover:text-[var(--ink,#0E1A2B)] cursor-pointer ml-auto"
                              >
                                <span>Revenue</span>
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setProfitSortField('directCosts');
                                  setProfitSortAsc(!profitSortAsc);
                                }}
                                className="inline-flex items-center gap-1 hover:text-[var(--ink,#0E1A2B)] cursor-pointer ml-auto"
                              >
                                <span>Expenses</span>
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setProfitSortField('timeCost');
                                  setProfitSortAsc(!profitSortAsc);
                                }}
                                className="inline-flex items-center gap-1 hover:text-[var(--ink,#0E1A2B)] cursor-pointer ml-auto"
                              >
                                <span>Time cost</span>
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setProfitSortField('netProfit');
                                  setProfitSortAsc(!profitSortAsc);
                                }}
                                className="inline-flex items-center gap-1 hover:text-[var(--ink,#0E1A2B)] cursor-pointer ml-auto"
                              >
                                <span>Net profit</span>
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="py-3 px-4 text-right">Margin</th>
                            <th className="py-3 px-4 text-right">Effective rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                          {sortedProjects.map((p) => (
                            <React.Fragment key={p.projectId}>
                              <tr
                                onClick={() => navigate(`/projects/${p.projectId}`)}
                                className="hover:bg-[var(--cobalt-tint,#E8F0FB)]/40 transition-colors cursor-pointer group"
                              >
                                <td className="py-3.5 px-4 font-bold text-[var(--ink,#0E1A2B)] group-hover:text-[var(--cobalt,#0047AB)]">
                                  {p.projectTitle}
                                </td>
                                <td className="py-3.5 px-4 text-[var(--muted,#5B6676)] font-medium">
                                  {p.clientName}
                                </td>
                                <td className="py-3.5 px-4 text-right font-medium text-[var(--ink,#0E1A2B)] tabular-nums">
                                  {formatMoney(p.revenue)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-medium text-[var(--ink,#0E1A2B)] tabular-nums">
                                  {formatMoney(p.directCosts)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-medium text-[var(--muted,#5B6676)] tabular-nums">
                                  {formatMoney(p.timeCost)}
                                  <span className="block text-[10px] text-[var(--muted,#5B6676)]">
                                    {p.loggedHours}h
                                  </span>
                                </td>
                                <td
                                  className={`py-3.5 px-4 text-right font-bold tabular-nums ${
                                    p.netProfit < 0
                                      ? 'text-[var(--error,#B42318)]'
                                      : 'text-[var(--ink,#0E1A2B)]'
                                  }`}
                                >
                                  {formatMoney(p.netProfit)}
                                </td>
                                <td className="py-3.5 px-4 text-right tabular-nums">
                                  {p.marginPercent !== null ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                        p.marginPercent >= 20
                                          ? 'bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)]'
                                          : p.marginPercent >= 0
                                          ? 'bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]'
                                          : 'bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)]'
                                      }`}
                                    >
                                      {p.marginPercent}%
                                    </span>
                                  ) : (
                                    <span className="text-[var(--muted,#5B6676)]" title="Appears after your first payment">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <span
                                      className={`font-bold tabular-nums ${
                                        p.isBelowStandardRate
                                          ? 'text-[var(--warning,#B54708)]'
                                          : 'text-[var(--success,#067647)]'
                                      }`}
                                    >
                                      {p.loggedHours > 0 ? `${formatMoney(p.effectiveHourlyRate)}/hr` : '—'}
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* One-line Insight if Below Standard Rate */}
                              {p.isBelowStandardRate && (
                                <tr className="bg-[var(--warning-tint,#FEF0C7)]/30 border-b border-[var(--line,#E8E0CF)]">
                                  <td colSpan={8} className="py-2 px-4 text-[11px] text-[var(--warning,#B54708)]">
                                    <div className="flex items-center gap-1.5 font-medium">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <span>
                                        You earned {formatMoney(p.effectiveHourlyRate)}/hr here,{' '}
                                        {formatMoney(Math.abs(p.rateDifference))}/hr below your standard rate.
                                        Consider a change order for extra work.
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>

                        {/* Totals Row */}
                        <tfoot>
                          <tr className="bg-[var(--page,#FAF5EA)]/80 font-bold border-t-2 border-[var(--line,#E8E0CF)]">
                            <td className="py-3 px-4 text-[var(--ink,#0E1A2B)]" colSpan={2}>
                              Totals ({sortedProjects.length} projects)
                            </td>
                            <td className="py-3 px-4 text-right text-[var(--ink,#0E1A2B)] tabular-nums">
                              {formatMoney(profitMetrics.revenue)}
                            </td>
                            <td className="py-3 px-4 text-right text-[var(--ink,#0E1A2B)] tabular-nums">
                              {formatMoney(profitMetrics.directProjectCosts)}
                            </td>
                            <td className="py-3 px-4 text-right text-[var(--ink,#0E1A2B)] tabular-nums">
                              {formatMoney(profitMetrics.timeCost)}
                            </td>
                            <td
                              className={`py-3 px-4 text-right tabular-nums ${
                                profitMetrics.netProfit < 0
                                  ? 'text-[var(--error,#B42318)]'
                                  : 'text-[var(--ink,#0E1A2B)]'
                              }`}
                            >
                              {formatMoney(profitMetrics.netProfit)}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {profitMetrics.marginPercent !== null
                                ? `${profitMetrics.marginPercent}%`
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {profitMetrics.totalHours > 0
                                ? `${formatMoney(
                                    Math.round(
                                      (profitMetrics.revenue - profitMetrics.directProjectCosts) /
                                        profitMetrics.totalHours
                                    )
                                  )}/hr`
                                : '—'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile Stacked Cards View */}
                    <div className="md:hidden divide-y divide-[var(--line,#E8E0CF)]">
                      {sortedProjects.map((p) => (
                        <div
                          key={p.projectId}
                          onClick={() => navigate(`/projects/${p.projectId}`)}
                          className="p-4 space-y-2 hover:bg-[var(--cobalt-tint,#E8F0FB)]/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[var(--ink,#0E1A2B)]">{p.projectTitle}</span>
                            <span className="text-xs text-[var(--muted,#5B6676)]">{p.clientName}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <span className="text-[var(--muted,#5B6676)] block">Revenue:</span>
                              <span className="font-semibold text-[var(--ink,#0E1A2B)] tabular-nums">
                                {formatMoney(p.revenue)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--muted,#5B6676)] block">Expenses:</span>
                              <span className="font-semibold text-[var(--ink,#0E1A2B)] tabular-nums">
                                {formatMoney(p.directCosts)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--muted,#5B6676)] block">Net profit:</span>
                              <span
                                className={`font-bold tabular-nums ${
                                  p.netProfit < 0 ? 'text-[var(--error,#B42318)]' : 'text-[var(--ink,#0E1A2B)]'
                                }`}
                              >
                                {formatMoney(p.netProfit)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--muted,#5B6676)] block">Effective rate:</span>
                              <span
                                className={`font-bold tabular-nums ${
                                  p.isBelowStandardRate
                                    ? 'text-[var(--warning,#B54708)]'
                                    : 'text-[var(--success,#067647)]'
                                }`}
                              >
                                {p.loggedHours > 0 ? `${formatMoney(p.effectiveHourlyRate)}/hr` : '—'}
                              </span>
                            </div>
                          </div>

                          {p.isBelowStandardRate && (
                            <div className="p-2 rounded-lg bg-[var(--warning-tint,#FEF0C7)] text-[11px] text-[var(--warning,#B54708)] font-medium flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{formatMoney(p.effectiveHourlyRate)}/hr is below your rate.</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Monthly Chart: Revenue, Expenses and Profit */}
              <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3
                      className="text-base font-bold text-[var(--ink,#0E1A2B)]"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      Revenue, expenses and profit
                    </h3>
                    <p className="text-xs text-[var(--muted,#5B6676)]">
                      Monthly cash trend over the past 6 months
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowChartTableFallback(!showChartTableFallback)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer self-start sm:self-auto"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                    <span>{showChartTableFallback ? 'Show visual chart' : 'View data table'}</span>
                  </button>
                </div>

                {showChartTableFallback ? (
                  /* Data Table Fallback for Chart */
                  <div className="overflow-x-auto border border-[var(--line,#E8E0CF)] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] font-semibold border-b border-[var(--line,#E8E0CF)]">
                        <tr>
                          <th className="py-2.5 px-4">Month</th>
                          <th className="py-2.5 px-4 text-right">Revenue (ex tax)</th>
                          <th className="py-2.5 px-4 text-right">Expenses</th>
                          <th className="py-2.5 px-4 text-right">Net profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                        {chartData.map((m) => (
                          <tr key={m.key}>
                            <td className="py-2.5 px-4 font-semibold text-[var(--ink,#0E1A2B)]">{m.month}</td>
                            <td className="py-2.5 px-4 text-right font-medium text-[var(--ink,#0E1A2B)] tabular-nums">
                              {formatMoney(m.revenue)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium text-[var(--ink,#0E1A2B)] tabular-nums">
                              {formatMoney(m.expenses)}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-bold tabular-nums ${
                                m.profit < 0 ? 'text-[var(--error,#B42318)]' : 'text-[var(--ink,#0E1A2B)]'
                              }`}
                            >
                              {formatMoney(m.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Responsive Recharts Bar Chart */
                  <div className="h-64 sm:h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E0CF" />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={{ stroke: '#E8E0CF' }}
                          tick={{ fontSize: 12, fill: '#5B6676' }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={{ stroke: '#E8E0CF' }}
                          tick={{ fontSize: 11, fill: '#5B6676' }}
                          tickFormatter={(v) => format(v, { maximumFractionDigits: 0 })}
                        />
                        <Tooltip
                          formatter={(val) => [format(val), '']}
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            border: '1px solid #E8E0CF',
                            boxShadow: '0 4px 12px rgba(14,26,43,0.06)',
                            fontSize: '12px',
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill="#0047AB"
                          radius={[4, 4, 0, 0]}
                          barSize={18}
                        />
                        <Bar
                          dataKey="expenses"
                          name="Expenses"
                          fill="#D9D4C7"
                          radius={[4, 4, 0, 0]}
                          barSize={18}
                        />
                        <Bar
                          dataKey="profit"
                          name="Profit"
                          fill="#067647"
                          radius={[4, 4, 0, 0]}
                          barSize={18}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Bottom Cards: General Overhead + Tax Set-Aside Estimate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* General Overhead Card */}
                <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[var(--muted,#5B6676)] uppercase tracking-wider block">
                      General overhead
                    </span>
                    <div
                      className="text-2xl font-bold text-[var(--ink,#0E1A2B)] mt-1 tabular-nums"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      {formatMoney(profitMetrics.overheadCosts)}
                    </div>
                    <p className="text-xs text-[var(--muted,#5B6676)] mt-1">
                      Subscriptions, equipment and general business expenses not assigned to any single project.
                    </p>
                  </div>

                  <div className="pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('expenses');
                        setProjectFilter('overhead');
                      }}
                      className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View overhead expenses</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tax Set-Aside Estimate Card */}
                <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--muted,#5B6676)] uppercase tracking-wider block">
                        Tax set-aside estimate
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--sun-tint,#FFF4CC)] text-[var(--ink,#0E1A2B)]">
                        Estimate
                      </span>
                    </div>

                    <div
                      className="text-2xl font-bold text-[var(--ink,#0E1A2B)] mt-1 tabular-nums"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      {formatMoney(profitMetrics.estimatedTaxSetAside)}
                    </div>
                    <p className="text-xs text-[var(--muted,#5B6676)] mt-1">
                      {profitMetrics.taxRate > 0 ? (
                        <>
                          Estimated reserve based on your {profitMetrics.taxRate}% tax preference applied to positive net profit.
                        </>
                      ) : (
                        <>
                          No tax rate configured in Settings. Set your estimated income tax rate to see automated quarterly set-asides.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="pt-4 mt-2">
                    <Link
                      to="/settings"
                      className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Update tax settings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          6. TAB 2: EXPENSES VIEW
          ===================================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Toolbar & Filters */}
          <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--muted,#5B6676)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendor, description or project..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none focus:border-[var(--cobalt,#0047AB)]"
                />
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
                >
                  <option value="date_desc">Newest date</option>
                  <option value="date_asc">Oldest date</option>
                  <option value="amount_desc">Highest amount</option>
                  <option value="amount_asc">Lowest amount</option>
                </select>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[var(--line,#E8E0CF)] text-xs">
              {/* Project Filter */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none cursor-pointer"
              >
                <option value="all">All projects</option>
                <option value="overhead">General overhead</option>
                {projects.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>
                    {p.title}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none cursor-pointer"
              >
                <option value="all">All categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Billable Filter */}
              <select
                value={billableFilter}
                onChange={(e) => setBillableFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none cursor-pointer"
              >
                <option value="all">All billing</option>
                <option value="billable">Billable</option>
                <option value="billed">Billed on invoice</option>
                <option value="unbillable">Non-billable</option>
              </select>

              {/* Recurring Filter */}
              <select
                value={recurringFilter}
                onChange={(e) => setRecurringFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none cursor-pointer"
              >
                <option value="all">All types</option>
                <option value="recurring">Recurring only</option>
                <option value="one_time">One-time only</option>
              </select>

              {/* Receipt Filter */}
              <select
                value={receiptFilter}
                onChange={(e) => setReceiptFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none cursor-pointer"
              >
                <option value="all">All receipts</option>
                <option value="with_receipt">Has receipt</option>
                <option value="missing">Missing receipt</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Bar if any checked */}
          {selectedExpenseIds.size > 0 && (
            <div className="bg-[var(--cobalt-tint,#E8F0FB)] border border-[var(--cobalt,#0047AB)]/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs animate-in fade-in">
              <span className="font-semibold text-[var(--cobalt,#0047AB)]">
                {selectedExpenseIds.size} expense{selectedExpenseIds.size > 1 ? 's' : ''} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkMarkBillable(true)}
                  className="px-3 py-1 rounded-full bg-white border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)] font-medium hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
                >
                  Mark billable
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkMarkBillable(false)}
                  className="px-3 py-1 rounded-full bg-white border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)] font-medium hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
                >
                  Mark unbillable
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1 rounded-full bg-[var(--error-tint,#FEE4E2)] border border-[var(--error,#B42318)]/20 text-[var(--error,#B42318)] font-semibold hover:bg-[var(--error-tint,#FEE4E2)]/80 cursor-pointer"
                >
                  Delete selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedExpenseIds(new Set())}
                  className="p-1 text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Expenses Table Card */}
          <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] overflow-hidden">
            {expenses.length === 0 ? (
              /* Global Empty State */
              <div className="p-12 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] flex items-center justify-center mx-auto mb-3">
                  <Tag className="w-6 h-6" />
                </div>
                <h3
                  className="text-base font-bold text-[var(--ink,#0E1A2B)] mb-1"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  No expenses yet
                </h3>
                <p className="text-xs text-[var(--muted,#5B6676)] mb-6">
                  Add software subscriptions, tools, contractors, ads or travel so your profit numbers are real.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddExpense}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer shadow-xs"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add your first expense</span>
                </button>
              </div>
            ) : filteredExpensesList.length === 0 ? (
              /* No Results State */
              <div className="p-8 text-center">
                <p className="text-xs font-semibold text-[var(--ink,#0E1A2B)]">
                  No expenses match your filters
                </p>
                <p className="text-xs text-[var(--muted,#5B6676)] mt-1 mb-4">
                  Try clearing or adjusting your search and filter criteria.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setProjectFilter('all');
                    setCategoryFilter('all');
                    setBillableFilter('all');
                    setRecurringFilter('all');
                    setReceiptFilter('all');
                  }}
                  className="px-4 py-1.5 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[var(--page,#FAF5EA)]/60 border-b border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] font-semibold">
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={
                              filteredExpensesList.length > 0 &&
                              selectedExpenseIds.size === filteredExpensesList.length
                            }
                            onChange={handleToggleSelectAll}
                            className="w-3.5 h-3.5 rounded text-[var(--cobalt,#0047AB)] border-[var(--line,#E8E0CF)] cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Vendor & description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Project allocation</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4">Billing status</th>
                        <th className="py-3 px-4 text-center">Receipt</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                      {filteredExpensesList.map((e) => {
                        const eId = e.id || e._id;
                        const isSelected = selectedExpenseIds.has(eId);
                        const isRebilled = Boolean(e.billedOnInvoice);

                        return (
                          <tr
                            key={eId}
                            className={`hover:bg-[var(--cobalt-tint,#E8F0FB)]/30 transition-colors ${
                              isSelected ? 'bg-[var(--cobalt-tint,#E8F0FB)]/40' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(eId)}
                                className="w-3.5 h-3.5 rounded text-[var(--cobalt,#0047AB)] border-[var(--line,#E8E0CF)] cursor-pointer"
                              />
                            </td>

                            <td className="py-3 px-4 text-[var(--muted,#5B6676)] tabular-nums whitespace-nowrap">
                              {new Date(e.date).toLocaleDateString()}
                            </td>

                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-bold text-[var(--ink,#0E1A2B)] truncate">
                                {e.description}
                              </div>
                              {e.vendor && (
                                <div className="text-[11px] text-[var(--muted,#5B6676)] truncate">
                                  {e.vendor}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)] whitespace-nowrap">
                                {e.category}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-[var(--muted,#5B6676)] max-w-xs truncate">
                              {e.projectId ? (
                                <span className="font-medium text-[var(--cobalt,#0047AB)]">
                                  {e.projectTitle}
                                </span>
                              ) : (
                                <span className="text-[var(--muted,#5B6676)] italic">General overhead</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-[var(--ink,#0E1A2B)] tabular-nums whitespace-nowrap">
                              {formatMoney(e.amount, e.currency)}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              {isRebilled ? (
                                <span className="text-[11px] font-semibold text-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)] px-2 py-0.5 rounded-full">
                                  Billed on {e.billedOnInvoice}
                                </span>
                              ) : e.billableToClient ? (
                                <span className="text-[11px] font-semibold text-[var(--warning,#B54708)] bg-[var(--warning-tint,#FEF0C7)] px-2 py-0.5 rounded-full">
                                  Billable
                                </span>
                              ) : (
                                <span className="text-[11px] text-[var(--muted,#5B6676)]">Not billable</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {e.receiptUrl ? (
                                <span
                                  title="Receipt file attached"
                                  aria-label="Receipt attached"
                                  className="inline-flex text-[var(--cobalt,#0047AB)]"
                                >
                                  <Paperclip className="w-4 h-4" />
                                </span>
                              ) : (
                                <span className="text-[var(--muted,#5B6676)]/40">—</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right relative expense-menu-container">
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setActiveMenuId(activeMenuId === eId ? null : eId);
                                }}
                                aria-label="Expense options"
                                className="p-1 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--cobalt-tint,#E8F0FB)] transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuId === eId && (
                                <div className="absolute right-4 top-10 w-36 bg-white border border-[var(--line,#E8E0CF)] rounded-xl shadow-lg py-1 z-30 text-left text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditExpense(e)}
                                    className="w-full px-3 py-1.5 text-left text-[var(--ink,#0E1A2B)] hover:bg-[var(--cobalt-tint,#E8F0FB)] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDuplicateExpense(eId);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-[var(--ink,#0E1A2B)] hover:bg-[var(--cobalt-tint,#E8F0FB)] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-[var(--muted,#5B6676)]" />
                                    <span>Duplicate</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDeleteExpense(eId);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-[var(--error,#B42318)] hover:bg-[var(--error-tint,#FEE4E2)] flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-[var(--error,#B42318)]" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked View */}
                <div className="md:hidden divide-y divide-[var(--line,#E8E0CF)]">
                  {filteredExpensesList.map((e) => {
                    const eId = e.id || e._id;
                    const isRebilled = Boolean(e.billedOnInvoice);
                    return (
                      <div key={eId} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-[var(--ink,#0E1A2B)]">{e.description}</div>
                            {e.vendor && (
                              <div className="text-xs text-[var(--muted,#5B6676)]">{e.vendor}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-sm text-[var(--ink,#0E1A2B)] tabular-nums">
                              {formatMoney(e.amount, e.currency)}
                            </span>
                            <span className="block text-[11px] text-[var(--muted,#5B6676)]">
                              {new Date(e.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)]">
                            {e.category}
                          </span>

                          <div className="flex items-center gap-2">
                            {isRebilled ? (
                              <span className="text-[10px] font-semibold text-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)] px-2 py-0.5 rounded-full">
                                Billed
                              </span>
                            ) : e.billableToClient ? (
                              <span className="text-[10px] font-semibold text-[var(--warning,#B54708)] bg-[var(--warning-tint,#FEF0C7)] px-2 py-0.5 rounded-full">
                                Billable
                              </span>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(e)}
                              className="text-xs text-[var(--cobalt,#0047AB)] font-semibold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(eId)}
                              className="text-xs text-[var(--error,#B42318)] font-semibold hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          7. TAB 3: RECURRING VIEW
          ===================================================================== */}
      {activeTab === 'recurring' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line,#E8E0CF)]">
              <div>
                <h3
                  className="text-base font-bold text-[var(--ink,#0E1A2B)]"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  Recurring subscriptions & licenses
                </h3>
                <p className="text-xs text-[var(--muted,#5B6676)]">
                  Subscriptions logged automatically each month or year
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer shadow-xs self-start sm:self-auto"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              >
                <Plus className="w-4 h-4" />
                <span>Add recurring subscription</span>
              </button>
            </div>

            {recurringExpensesList.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h4
                  className="text-base font-bold text-[var(--ink,#0E1A2B)] mb-1"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  No recurring costs
                </h4>
                <p className="text-xs text-[var(--muted,#5B6676)] mb-6">
                  Add subscriptions like design tools or hosting once and Floorly logs them each month.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddExpense}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer shadow-xs"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add recurring cost</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line,#E8E0CF)] mt-2">
                {recurringExpensesList.map((e) => {
                  const eId = e.id || e._id;
                  const isPaused = Boolean(e.recurring?.isPaused);
                  const nextDate = e.recurring?.nextDate ? new Date(e.recurring.nextDate) : null;
                  const isDue = nextDate && nextDate <= new Date();

                  return (
                    <div
                      key={eId}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--cobalt-tint,#E8F0FB)]/20 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] flex items-center justify-center shrink-0 mt-0.5">
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[var(--ink,#0E1A2B)] flex items-center gap-2">
                            <span>{e.description}</span>
                            {e.vendor && (
                              <span className="text-xs font-medium text-[var(--muted,#5B6676)]">
                                · {e.vendor}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--muted,#5B6676)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="capitalize font-medium text-[var(--ink,#0E1A2B)]">
                              {e.recurring?.interval} cycle
                            </span>
                            <span>·</span>
                            <span>{e.category}</span>
                            <span>·</span>
                            <span>{e.projectTitle || 'General overhead'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-sm text-[var(--ink,#0E1A2B)] tabular-nums">
                            {formatMoney(e.amount, e.currency)}
                          </div>
                          <div className="text-[11px] text-[var(--muted,#5B6676)] mt-0.5">
                            Next: {nextDate ? nextDate.toLocaleDateString() : 'Active'}
                          </div>
                        </div>

                        {/* Status / Action Pill */}
                        <div className="flex items-center gap-1.5">
                          {isDue && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--sun-tint,#FFF4CC)] text-[var(--warning,#B54708)]">
                              Due: add now
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleTogglePause(eId)}
                            className="p-1.5 rounded-lg border border-[var(--line,#E8E0CF)] hover:bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] cursor-pointer"
                            title={isPaused ? 'Resume recurring cost' : 'Pause recurring cost'}
                          >
                            {isPaused ? <Play className="w-3.5 h-3.5 text-[var(--success,#067647)]" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditExpense(e)}
                            className="p-1.5 rounded-lg border border-[var(--line,#E8E0CF)] hover:bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] cursor-pointer"
                            title="Edit subscription"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(eId)}
                            className="p-1.5 rounded-lg border border-[var(--line,#E8E0CF)] hover:bg-[var(--error-tint,#FEE4E2)] text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)] cursor-pointer"
                            title="Delete subscription"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          8. EXPENSE DRAWER COMPONENT
          ===================================================================== */}
      <ExpenseDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        expense={editingExpense}
        projects={projects}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        defaultCurrency={userCurrency}
      />
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderGit2,
  DollarSign,
  Clock,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Receipt,
  FileText,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useQuickModalStore } from '../store/useQuickModalStore';
import { useCurrencyStore } from '../store/useCurrencyStore';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openModal } = useQuickModalStore();
  const { format, currency } = useCurrencyStore();

  const [metrics, setMetrics] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [chartRange, setChartRange] = useState('6m'); // '6m' | '12m'

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      const [metricsRes, pricingRes, proposalsRes, invoicesRes, analysesRes] = await Promise.allSettled([
        api.getDashboardMetrics(),
        api.getPricingSettings(),
        api.getProposals(),
        api.getInvoices(),
        api.getAnalyses(),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.success) {
        setMetrics(metricsRes.value.metrics);
        setMonthlyData(metricsRes.value.monthlyData || []);
      } else {
        throw new Error('Metrics failed');
      }

      if (pricingRes.status === 'fulfilled' && pricingRes.value?.settings) {
        setPricingSettings(pricingRes.value.settings);
      }

      if (proposalsRes.status === 'fulfilled' && proposalsRes.value?.proposals) {
        setProposals(proposalsRes.value.proposals);
      }

      if (invoicesRes.status === 'fulfilled' && invoicesRes.value?.invoices) {
        setInvoices(invoicesRes.value.invoices);
      }

      if (analysesRes.status === 'fulfilled' && analysesRes.value?.analyses) {
        setAnalyses(analysesRes.value.analyses);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Time-based greeting (e.g. "Good morning, Ritik")
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const rawName = user?.name || user?.businessName || '';
    const firstName = rawName.split(' ')[0] || 'there';
    return `${timeOfDay}, ${firstName}`;
  }, [user]);

  // Outstanding context computation based on real due dates
  const outstandingContext = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return { text: 'Nothing overdue', isOverdue: false, isGreen: true };
    }

    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    const unpaidInvoices = invoices.filter((i) => (i.balanceDue || 0) > 0);
    const overdue = unpaidInvoices.filter((i) => i.dueDate && new Date(i.dueDate) < now);

    if (overdue.length > 0) {
      return {
        text: `${overdue.length} ${overdue.length === 1 ? 'invoice' : 'invoices'} overdue`,
        isOverdue: true,
        isGreen: false,
      };
    }

    const dueThisWeek = unpaidInvoices.filter((i) => {
      if (!i.dueDate) return false;
      const d = new Date(i.dueDate);
      return d >= now && d <= oneWeekFromNow;
    });

    if (dueThisWeek.length > 0) {
      return {
        text: `${dueThisWeek.length} ${dueThisWeek.length === 1 ? 'invoice' : 'invoices'} due this week`,
        isOverdue: false,
        isGreen: false,
      };
    }

    return { text: 'Nothing overdue', isOverdue: false, isGreen: true };
  }, [invoices]);

  // Next steps checklist derivation
  const nextSteps = useMemo(() => {
    const steps = [
      {
        id: 1,
        title: 'Add your business details',
        desc: 'Set company name and invoice address',
        completed: Boolean(user?.businessName && (user?.businessAddress || user?.businessEmail)),
        link: '/settings',
        actionLabel: 'Complete settings',
      },
      {
        id: 2,
        title: 'Set your price floor',
        desc: 'Define minimum rates and safeguards',
        completed: Boolean(pricingSettings?.minHourlyRate && pricingSettings?.minProjectFee),
        link: '/pricing-rules',
        actionLabel: 'Set floor rules',
      },
      {
        id: 3,
        title: 'Analyze a client brief',
        desc: 'Extract scope and estimate work',
        completed: Boolean(analyses && analyses.length > 0),
        link: '/analyzer',
        actionLabel: 'Open analyzer',
      },
      {
        id: 4,
        title: 'Send your first proposal',
        desc: 'Generate proposal above your floor',
        completed: Boolean(proposals && proposals.length > 0),
        link: '/proposals',
        actionLabel: 'Create proposal',
      },
      {
        id: 5,
        title: 'Send your first invoice',
        desc: 'Bill milestone and collect payment',
        completed: Boolean(invoices && invoices.length > 0),
        link: '/invoices',
        actionLabel: 'Create invoice',
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const isAllDone = completedCount === steps.length;
    const nextIncompleteIndex = steps.findIndex((s) => !s.completed);

    return { steps, completedCount, isAllDone, nextIncompleteIndex };
  }, [user, pricingSettings, analyses, proposals, invoices]);

  // Recent proposals (last 5)
  const recentProposals = useMemo(() => {
    if (!proposals) return [];
    return [...proposals]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [proposals]);

  // Upcoming payments (unpaid invoices sorted by soonest due date)
  const upcomingInvoices = useMemo(() => {
    if (!invoices) return [];
    return [...invoices]
      .filter((i) => (i.balanceDue || 0) > 0)
      .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
      .slice(0, 5);
  }, [invoices]);

  // Filtered monthly chart data (6m vs 12m)
  const chartData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];
    const count = chartRange === '12m' ? 12 : 6;
    return monthlyData.slice(-count);
  }, [monthlyData, chartRange]);

  const hasChartData = useMemo(() => {
    return chartData.some((d) => (d.invoiced || 0) > 0 || (d.received || 0) > 0);
  }, [chartData]);

  // Revenue protected estimate: sum over proposals of max(0, finalQuote - raw)
  const revenueProtectedAmount = useMemo(() => {
    if (proposals && proposals.length > 0) {
      const sum = proposals.reduce((acc, p) => {
        const finalQuote = p.pricingBreakdown?.totalAmount || p.pricingBreakdown?.subtotal || p.pricingBreakdown?.recommendedPrice || 0;
        const raw = p.pricingBreakdown?.rawLabor || p.pricingBreakdown?.baseLaborCost || (
          (p.lineItems || []).reduce((subAcc, item) => subAcc + ((Number(item.hours) || 0) * (Number(item.rate) || 50)), 0)
        );
        return acc + Math.max(0, finalQuote - raw);
      }, 0);
      if (sum > 0) return sum;
    }
    if (!metrics?.totalContracted) return null;
    return Math.round(metrics.totalContracted * 0.18);
  }, [proposals, metrics]);

  // Format Status Pill
  const formatStatusPill = (status) => {
    const s = (status || 'draft').toLowerCase();
    if (s === 'accepted') {
      return (
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#EDF7EE', color: 'var(--success, #067647)' }}
        >
          Accepted
        </span>
      );
    }
    if (s === 'sent') {
      return (
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--cobalt-tint, #E8F0FB)', color: 'var(--cobalt, #0047AB)' }}
        >
          Sent
        </span>
      );
    }
    if (s === 'rejected' || s === 'declined') {
      return (
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#FEF3F2', color: 'var(--error, #B42318)' }}
        >
          Declined
        </span>
      );
    }
    return (
      <span
        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
        style={{ backgroundColor: '#F2F4F7', color: 'var(--muted, #5B6676)' }}
      >
        Draft
      </span>
    );
  };

  // --------------------------------------------------------------------------
  // SKELETON LOADING STATE (no blank page or spinners)
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center pb-2 border-b border-[var(--line,#E8E0CF)]">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-[var(--line,#E8E0CF)] rounded-lg" />
            <div className="h-4 w-96 bg-[var(--line,#E8E0CF)] rounded-lg" />
          </div>
          <div className="h-10 w-36 bg-[var(--line,#E8E0CF)] rounded-full" />
        </div>

        {/* 4 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 h-36 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-[var(--line,#E8E0CF)] rounded" />
                <div className="w-9 h-9 rounded-xl bg-[var(--line,#E8E0CF)]" />
              </div>
              <div className="h-9 w-32 bg-[var(--line,#E8E0CF)] rounded" />
              <div className="h-3 w-40 bg-[var(--line,#E8E0CF)] rounded" />
            </div>
          ))}
        </div>

        {/* Floor Card Skeleton */}
        <div className="h-36 rounded-2xl bg-[var(--line,#E8E0CF)]/50" />

        {/* Row 4 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-white border border-[var(--line,#E8E0CF)]" />
          <div className="h-80 rounded-2xl bg-white border border-[var(--line,#E8E0CF)]" />
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------------------------------
  if (hasError) {
    return (
      <div
        className="rounded-2xl border p-8 text-center max-w-xl mx-auto my-12"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'var(--line, #E8E0CF)',
        }}
      >
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 bg-rose-50 text-[var(--error,#B42318)]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2
          className="text-xl font-bold text-[var(--ink,#0E1A2B)] mb-2"
          style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
        >
          We couldn't load your dashboard
        </h2>
        <p className="text-sm text-[var(--muted,#5B6676)] mb-6">
          There was an issue fetching your live client metrics and financial records.
        </p>
        <button
          type="button"
          onClick={loadAllData}
          className="px-6 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer"
          style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* =====================================================================
          1. HEADER ROW: Time-based greeting + "Open analyzer" secondary button
          ===================================================================== */}
      <section
        aria-label="Dashboard Greeting"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--line,#E8E0CF)]"
      >
        <div>
          <h1
            className="text-[32px] font-extrabold text-[var(--ink,#0E1A2B)] tracking-tight leading-tight"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {greeting}
          </h1>
          <p className="text-[15px] text-[var(--muted,#5B6676)] mt-1 font-normal">
            Here's what's happening across your clients, proposals and cash.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/analyzer')}
            className="px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-[14px] font-semibold text-[var(--ink,#0E1A2B)] transition-colors flex items-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[var(--cobalt,#0047AB)]" />
            <span>Open analyzer</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          2. FOUR KPI CARDS IN ONE ROW (Equal height, 4 cols)
          ===================================================================== */}
      <section
        aria-label="Financial Performance Indicators"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Contracted */}
        <Link
          to="/projects"
          className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between hover:border-[var(--cobalt,#0047AB)]/50 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[var(--muted,#5B6676)] truncate">
              Contracted
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div
              className="text-[36px] font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {format(metrics?.totalContracted || 0)}
            </div>
            <p className="text-[13px] text-[var(--muted,#5B6676)] mt-2 truncate font-medium">
              {metrics?.activeProjectsCount || 0} active {metrics?.activeProjectsCount === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </Link>

        {/* Card 2: Collected */}
        <Link
          to="/invoices"
          className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between hover:border-[var(--cobalt,#0047AB)]/50 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[var(--muted,#5B6676)] truncate">
              Collected
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div
              className="text-[36px] font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {format(metrics?.totalReceived || 0)}
            </div>
            <p className="text-[13px] text-[var(--muted,#5B6676)] mt-2 truncate font-medium">
              Invoiced {format(metrics?.totalInvoiced || 0)}
            </p>
          </div>
        </Link>

        {/* Card 3: Outstanding */}
        <Link
          to="/invoices"
          className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between hover:border-[var(--cobalt,#0047AB)]/50 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[var(--muted,#5B6676)] truncate">
              Outstanding
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div
              className="text-[36px] font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {format(metrics?.outstandingReceivables || 0)}
            </div>
            <p
              className={`text-[13px] mt-2 truncate font-medium ${
                outstandingContext.isOverdue
                  ? 'text-[var(--error,#B42318)] font-semibold'
                  : outstandingContext.isGreen
                  ? 'text-[var(--success,#067647)] font-semibold'
                  : 'text-[var(--muted,#5B6676)]'
              }`}
            >
              {outstandingContext.text}
            </p>
          </div>
        </Link>

        {/* Card 4: Profit */}
        <Link
          to="/expenses"
          className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 flex flex-col justify-between hover:border-[var(--cobalt,#0047AB)]/50 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[14px] font-medium text-[var(--muted,#5B6676)] truncate">
                Profit
              </span>
              <div
                className="cursor-help text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]"
                title="Profit Formula: Net profit = Cash received - Direct expenses - (Hours worked × Standard rate) - Taxes"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {(metrics?.totalReceived || 0) === 0 ? (
              <>
                <div
                  className="text-[36px] font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums leading-none"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  —
                </div>
                <p className="text-[13px] text-[var(--muted,#5B6676)] mt-2 truncate font-medium">
                  Appears after your first payment
                </p>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[13px] font-medium text-[var(--muted,#5B6676)]">
                    Gross: <span className="font-bold text-[var(--ink,#0E1A2B)]">{metrics?.grossMarginPercent ?? 0}%</span>
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--cobalt,#0047AB)]">
                    Net: <span className="font-bold">{metrics?.netMarginAfterTimePercent ?? 0}%</span>
                  </div>
                </div>
                <p className="text-[13px] text-[var(--muted,#5B6676)] mt-2 truncate font-medium">
                  Net: {format(metrics?.netProfitAfterTime || 0)} ({metrics?.hoursWorked || 0}h worked)
                </p>
              </>
            )}
          </div>
        </Link>
      </section>

      {/* =====================================================================
          3. FLOOR PROTECTION CARD (Signature element, full width)
          ===================================================================== */}
      <section
        aria-label="Price Floor Protection"
        className="rounded-2xl border p-6"
        style={{
          backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
          borderColor: '#BFD5F2',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#BFD5F2]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[var(--cobalt,#0047AB)] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-[20px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Your price floor
              </h2>
              <p className="text-[13px] text-[var(--muted,#5B6676)] font-medium">
                Deterministic safeguards preventing underpricing, scope creep, and low margins.
              </p>
            </div>
          </div>

          <Link
            to="/pricing-rules"
            className="px-4 py-2 rounded-full border border-[#BFD5F2] bg-white hover:bg-[var(--page,#FAF5EA)] text-[13px] font-semibold text-[var(--cobalt,#0047AB)] transition-colors self-start md:self-auto outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]"
          >
            Edit floor rules
          </Link>
        </div>

        {/* Stats Grid inside Floor Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div>
            <span className="text-[12px] font-medium text-[var(--muted,#5B6676)] block">
              Minimum hourly rate
            </span>
            <span
              className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              ${pricingSettings?.minHourlyRate || 35}/hr
            </span>
          </div>

          <div>
            <span className="text-[12px] font-medium text-[var(--muted,#5B6676)] block">
              Minimum project fee
            </span>
            <span
              className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              ${pricingSettings?.minProjectFee || 300}
            </span>
          </div>

          <div>
            <span className="text-[12px] font-medium text-[var(--muted,#5B6676)] block">
              Protected this month
            </span>
            <span
              className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {proposals?.length || 0} proposals
            </span>
          </div>

          <div>
            <span className="text-[12px] font-medium text-[var(--muted,#5B6676)] block">
              Revenue protected
            </span>
            <span
              className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {revenueProtectedAmount ? format(revenueProtectedAmount) : '—'}
            </span>
          </div>
        </div>

        {/* Mini Visual: Horizontal bar with dashed yellow floor line */}
        <div className="mt-4 pt-3 border-t border-[#BFD5F2]/50 flex items-center justify-between text-xs text-[var(--muted,#5B6676)]">
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-[11px] font-semibold text-[var(--ink,#0E1A2B)] shrink-0">Safe floor line:</span>
            <div className="w-full relative flex items-center">
              <div
                className="w-full border-t-2 border-dashed"
                style={{ borderColor: 'var(--sun, #FFC72C)' }}
              />
              <span
                className="ml-2 px-2 py-0.5 text-[10px] font-extrabold rounded-full text-[var(--ink,#0E1A2B)] shrink-0"
                style={{ backgroundColor: 'var(--sun, #FFC72C)' }}
              >
                Hard floor active
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[var(--cobalt,#0047AB)] font-semibold hidden sm:inline">
            100% proposals checked
          </span>
        </div>
      </section>

      {/* =====================================================================
          4. TWO-COLUMN ROW: Chart (2/3) + Next Steps (1/3)
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoiced vs Collected Chart */}
        <section
          aria-label="Invoiced vs Collected Trend"
          className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 lg:col-span-2 flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2
                className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Invoiced vs collected
              </h2>
              <p className="text-[13px] text-[var(--muted,#5B6676)] font-normal">
                Monthly freelance billings compared against cash received
              </p>
            </div>

            {/* Time range selector */}
            <div className="flex items-center border border-[var(--line,#E8E0CF)] rounded-full p-0.5 bg-[var(--page,#FAF5EA)] shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartRange('6m')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  chartRange === '6m'
                    ? 'bg-white text-[var(--cobalt,#0047AB)] shadow-xs'
                    : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
                }`}
              >
                Last 6 months
              </button>
              <button
                type="button"
                onClick={() => setChartRange('12m')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  chartRange === '12m'
                    ? 'bg-white text-[var(--cobalt,#0047AB)] shadow-xs'
                    : 'text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)]'
                }`}
              >
                Last 12 months
              </button>
            </div>
          </div>

          {/* Chart Container (Fixed min height 280px; axes always render) */}
          <div className="h-[280px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  hasChartData
                    ? chartData
                    : [
                        { month: 'May', invoiced: 0, received: 0 },
                        { month: 'Jun', invoiced: 0, received: 0 },
                        { month: 'Jul', invoiced: 0, received: 0 },
                        { month: 'Aug', invoiced: 0, received: 0 },
                        { month: 'Sep', invoiced: 0, received: 0 },
                        { month: 'Oct', invoiced: 0, received: 0 },
                      ]
                }
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
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
                    fontSize: '13px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                <Bar
                  dataKey="invoiced"
                  name="Invoiced"
                  fill="#90B4E2"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="received"
                  name="Collected"
                  fill="#0047AB"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Empty State Overlay when no invoice data exists */}
            {!hasChartData && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs p-6 text-center z-10">
                <div className="w-10 h-10 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] flex items-center justify-center mb-3">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3
                  className="text-[16px] font-bold text-[var(--ink,#0E1A2B)] mb-1"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  No invoices yet
                </h3>
                <p className="text-[13px] text-[var(--muted,#5B6676)] max-w-sm mb-4">
                  Create a proposal and send your first invoice to see cash flow here.
                </p>
                <button
                  type="button"
                  onClick={() => openModal('quick_project')}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                >
                  Create proposal
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right: Next steps checklist (hidden when all 5 done) */}
        {!nextSteps.isAllDone && (
          <section
            aria-label="Onboarding Checklist"
            className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  Next steps
                </h2>
                <span className="text-xs font-bold text-[var(--cobalt,#0047AB)]">
                  {nextSteps.completedCount} of 5 done
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-[var(--page,#FAF5EA)] overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(nextSteps.completedCount / 5) * 100}%`,
                    backgroundColor: 'var(--cobalt, #0047AB)',
                  }}
                />
              </div>

              {/* 5 Checklist Items */}
              <div className="space-y-3">
                {nextSteps.steps.map((step, idx) => {
                  const isNext = idx === nextSteps.nextIncompleteIndex;
                  return (
                    <div
                      key={step.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isNext
                          ? 'border-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)]/40'
                          : step.completed
                          ? 'border-[var(--line,#E8E0CF)] bg-white opacity-80'
                          : 'border-[var(--line,#E8E0CF)] bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {step.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-[var(--success,#067647)]" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-[var(--muted,#5B6676)] flex items-center justify-center text-[10px] font-bold text-[var(--muted,#5B6676)]">
                                {step.id}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`text-[13px] font-semibold leading-snug ${
                                step.completed ? 'line-through text-[var(--muted,#5B6676)]' : 'text-[var(--ink,#0E1A2B)]'
                              }`}
                            >
                              {step.title}
                            </div>
                            <p className="text-[11px] text-[var(--muted,#5B6676)] truncate mt-0.5">
                              {step.desc}
                            </p>
                          </div>
                        </div>

                        {/* Action link/button for next active step */}
                        {isNext && (
                          <Link
                            to={step.link}
                            className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1 transition-colors"
                            style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                          >
                            <span>Go</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--line,#E8E0CF)] text-[11px] text-[var(--muted,#5B6676)] text-center">
              Complete these steps to unlock full automated financial records.
            </div>
          </section>
        )}
      </div>

      {/* =====================================================================
          5. BOTTOM ROW: Recent proposals + Upcoming payments
          ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Proposals */}
        <section
          aria-label="Recent Proposals"
          className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line,#E8E0CF)] mb-4">
              <h2
                className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Recent proposals
              </h2>
              <Link
                to="/proposals"
                className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline"
              >
                View all
              </Link>
            </div>

            {recentProposals.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="w-8 h-8 mx-auto text-[var(--muted,#5B6676)] mb-2 opacity-50" />
                <p className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  No proposals generated yet
                </p>
                <p className="text-xs text-[var(--muted,#5B6676)] mb-4">
                  Turn your client conversations into protected quotations.
                </p>
                <button
                  type="button"
                  onClick={() => openModal('quick_project')}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                >
                  Create a proposal
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line,#E8E0CF)]">
                {recentProposals.map((p) => (
                  <Link
                    key={p.id || p._id}
                    to={`/proposals`}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--page,#FAF5EA)] px-2 rounded-lg transition-colors group"
                  >
                    <div className="min-w-0">
                      <div
                        className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] group-hover:text-[var(--cobalt,#0047AB)] truncate"
                        title={p.title || 'Untitled Proposal'}
                      >
                        {p.title || 'Untitled Proposal'}
                      </div>
                      <div className="text-xs text-[var(--muted,#5B6676)] truncate mt-0.5">
                        {p.clientName || p.client?.name || 'Unassigned client'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className="text-[14px] font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums"
                        style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                      >
                        {format(p.totalAmount || 0)}
                      </div>
                      <div className="mt-1">{formatStatusPill(p.status)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Payments */}
        <section
          aria-label="Upcoming Payments"
          className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line,#E8E0CF)] mb-4">
              <h2
                className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Upcoming payments
              </h2>
              <Link
                to="/invoices"
                className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline"
              >
                View all
              </Link>
            </div>

            {upcomingInvoices.length === 0 ? (
              <div className="py-10 text-center">
                <Receipt className="w-8 h-8 mx-auto text-[var(--muted,#5B6676)] mb-2 opacity-50" />
                <p className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  No pending payments
                </p>
                <p className="text-xs text-[var(--muted,#5B6676)] mb-4">
                  Invoices with balance due will appear here with scheduled deadlines.
                </p>
                <Link
                  to="/invoices"
                  className="inline-block px-4 py-2 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                >
                  Create an invoice
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line,#E8E0CF)]">
                {upcomingInvoices.map((inv) => {
                  const now = new Date();
                  const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
                  const formattedDue = inv.dueDate
                    ? new Date(inv.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'No due date';

                  return (
                    <Link
                      key={inv.id || inv._id}
                      to="/invoices"
                      className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--page,#FAF5EA)] px-2 rounded-lg transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] group-hover:text-[var(--cobalt,#0047AB)] truncate">
                          {inv.invoiceNumber || 'INV-001'}
                        </div>
                        <div className="text-xs text-[var(--muted,#5B6676)] truncate mt-0.5">
                          {inv.clientName || inv.client?.name || 'Client'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-[14px] font-extrabold text-[var(--ink,#0E1A2B)] tabular-nums"
                          style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                        >
                          {format(inv.balanceDue || inv.totalAmount || 0)}
                        </div>
                        <div
                          className={`text-xs mt-1 font-semibold ${
                            isOverdue
                              ? 'text-[var(--error,#B42318)]'
                              : 'text-[var(--muted,#5B6676)]'
                          }`}
                        >
                          {isOverdue ? `Overdue (${formattedDue})` : `Due ${formattedDue}`}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  Printer,
  Copy,
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  Send,
  Eye,
  CreditCard,
  Building,
  RefreshCw,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { useQuickModalStore } from '../store/useQuickModalStore';
import { ProposalDocumentModal } from '../components/documents/ProposalDocumentModal';
import { getProfessionConfig } from '../config/professions';
import { calculatePricing } from '../utils/pricingEngine';
import {
  resolveVariables,
  buildVariableContext,
  validateUnresolvedVariables,
} from '../utils/variableResolver';

export function ProposalBuilderPage() {
  const { id: proposalIdFromParams } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const analysisIdFromQuery = searchParams.get('analysisId') || searchParams.get('createFromAnalysis');
  const isEditMode = Boolean(proposalIdFromParams);

  const { user, setUser } = useAuthStore();
  const { showToast, showConfirm } = useNotificationStore();
  const { format, currency } = useCurrencyStore();
  const { openModal } = useQuickModalStore();

  const profConfig = getProfessionConfig(user?.field);

  // Core Data
  const [clients, setClients] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(null);
  const [existingProposal, setExistingProposal] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState(profConfig.categories[0]?.id || 'custom-web-apps');
  const [detectedCategory, setDetectedCategory] = useState(null);
  const [dismissedMismatch, setDismissedMismatch] = useState(false);
  const [isPrefilledFromAnalyzer, setIsPrefilledFromAnalyzer] = useState(false);
  const [complexity, setComplexity] = useState('medium');
  const [validForDays, setValidForDays] = useState(user?.defaultProposalValidityDays || 14);

  // Deliverables Line Items
  const [deliverables, setDeliverables] = useState([]);

  // Not Included (from Analyzer or custom)
  const [notIncludedItems, setNotIncludedItems] = useState([]);

  // Package Tier & Price
  const [selectedTier, setSelectedTier] = useState('standard'); // 'essential' | 'standard' | 'premium'
  const [customPrice, setCustomPrice] = useState('');

  // Payment Schedule
  const [paymentScheduleType, setPaymentScheduleType] = useState('50_50'); // '50_50' | '100_upfront' | '30_40_30' | 'milestones_4'
  const [discountPercent, setDiscountPercent] = useState(5);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [saveAsDefaultPayment, setSaveAsDefaultPayment] = useState(false);

  // Terms & Conditions (from editable Templates store)
  const [availableClauses, setAvailableClauses] = useState([]);
  const [selectedClauseIds, setSelectedClauseIds] = useState([]);
  const [expandedClauseId, setExpandedClauseId] = useState(null);
  const [taxMode, setTaxMode] = useState(user?.taxMode || 'exclusive'); // 'exclusive' | 'inclusive'
  const [clientNote, setClientNote] = useState('');

  // UI & States
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeSectionNav, setActiveSectionNav] = useState('details');
  const [isDirty, setIsDirty] = useState(false);
  const [lastAutosaveText, setLastAutosaveText] = useState('');
  const [errorSummary, setErrorSummary] = useState([]);

  // Read-only state for sent/accepted proposals
  const isReadOnly = existingProposal && existingProposal.status !== 'draft';

  // Section references for scrollspy
  const detailsRef = useRef(null);
  const scopeRef = useRef(null);
  const packageRef = useRef(null);
  const paymentRef = useRef(null);
  const termsRef = useRef(null);

  // Load Initial Data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const [cRes, pRes, clRes] = await Promise.all([
          api.getClients(),
          api.getPricingSettings(),
          api.getClauses().catch(() => ({ clauses: [] })),
        ]);

        if (isMounted) {
          if (cRes?.clients) setClients(cRes.clients);
          if (pRes?.settings) setPricingSettings(pRes.settings);
          if (clRes?.clauses) setAvailableClauses(clRes.clauses);
        }

        const hourlyRate = pRes?.settings?.hourlyRate || 50;

        // If editing existing proposal
        if (proposalIdFromParams) {
          const propRes = await api.getProposal(proposalIdFromParams);
          if (propRes?.proposal && isMounted) {
            const p = propRes.proposal;
            setExistingProposal(p);
            setClientId(p.clientId?._id || p.clientId || '');
            setTitle(p.title || '');
            setProjectType(p.projectType || 'custom-web-apps');
            setSelectedTier(p.selectedTier || 'standard');
            setPaymentMethod(p.paymentMethod || 'stripe');
            setPaymentDetails(p.paymentDetails || '');
            setPaymentScheduleType(p.paymentScheduleType || '50_50');
            setTaxMode(p.taxMode || user?.taxMode || 'exclusive');

            if (p.lineItems && p.lineItems.length > 0) {
              setDeliverables(p.lineItems.map(i => ({
                description: i.description,
                hours: Number(i.hours) || 0,
                rate: Number(i.rate) || hourlyRate,
                amount: Number(i.amount) || 0,
              })));
            }

            if (p.validUntil) {
              const diffDays = Math.max(1, Math.round((new Date(p.validUntil) - new Date()) / 86400000));
              setValidForDays(diffDays);
            }
          }
        } else if (analysisIdFromQuery) {
          // Pre-populate from Analyzer
          setIsPrefilledFromAnalyzer(true);
          const anRes = await api.getAnalysis(analysisIdFromQuery);
          if (anRes?.analysis && isMounted) {
            const an = anRes.analysis;
            setAnalysisData(an);
            // Default title has NO "Proposal:" prefix
            const cleanTitle = (an.projectTitle || '').replace(/^Proposal:\s*/i, '');
            setTitle(cleanTitle || 'Custom digital product platform');
            if (an.clientId) setClientId(an.clientId);
            if (an.projectType) {
              setProjectType(an.projectType);
              setDetectedCategory(an.projectType);
            }
            if (an.complexity) setComplexity(an.complexity);
            if (an.exclusions) setNotIncludedItems(an.exclusions);

            if (an.pagesAndFeatures && an.pagesAndFeatures.length > 0) {
              setDeliverables(an.pagesAndFeatures.map(item => ({
                description: item.name,
                hours: Number(item.hours) || 4,
                rate: hourlyRate,
                amount: (Number(item.hours) || 4) * hourlyRate,
              })));
            } else {
              setDeliverables([
                { description: 'Core application architecture & database schema', hours: 12, rate: hourlyRate, amount: 12 * hourlyRate },
                { description: 'Frontend UI views & responsive layouts', hours: 20, rate: hourlyRate, amount: 20 * hourlyRate },
                { description: 'API endpoints & business logic integration', hours: 16, rate: hourlyRate, amount: 16 * hourlyRate },
              ]);
            }
          }
        } else {
          // New blank proposal: Pre-check clauses where defaultOn is true
          const initialItems = profConfig.defaultProposalItems?.length > 0
            ? profConfig.defaultProposalItems.map(i => ({
                description: i.description,
                hours: Number(i.hours) || 4,
                rate: hourlyRate,
                amount: (Number(i.hours) || 4) * hourlyRate,
              }))
            : [
                { description: 'Architecture, UX layout and data model setup', hours: 8, rate: hourlyRate, amount: 8 * hourlyRate },
                { description: 'Core functional workflow implementation', hours: 16, rate: hourlyRate, amount: 16 * hourlyRate },
                { description: 'End-to-end testing, QA walkthrough and deployment', hours: 8, rate: hourlyRate, amount: 8 * hourlyRate },
              ];
          setDeliverables(initialItems);

          if (clRes?.clauses) {
            const preChecked = clRes.clauses
              .filter(c => !c.archived && c.defaultOn)
              .map(c => c.id || c._id);
            setSelectedClauseIds(preChecked);
          }
        }
        if (proposalIdFromParams && clRes?.clauses) {
          // In edit mode, check which available clauses are in existing proposal's terms
          const existingTerms = existingProposal?.termsAndConditions || '';
          if (existingTerms) {
            const matchedIds = clRes.clauses
              .filter(c => existingTerms.toLowerCase().includes(c.title.toLowerCase()))
              .map(c => c.id || c._id);
            if (matchedIds.length > 0) setSelectedClauseIds(matchedIds);
          }
        }
      } catch (err) {
        console.error('Failed to load proposal builder data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [proposalIdFromParams, analysisIdFromQuery]);

  // Set default payment method and details based on currency and user profile
  useEffect(() => {
    if (!existingProposal && user) {
      const isINR = (currency || 'USD').toUpperCase() === 'INR';
      if (isINR) {
        setPaymentMethod(user.upiId ? 'upi' : 'bank_transfer');
        setPaymentDetails(user.upiId || user.bankDetails || '');
      } else {
        setPaymentMethod(user.paypalEmail ? 'paypal' : (user.iban ? 'bank_transfer' : 'stripe'));
        setPaymentDetails(user.paypalEmail || (user.iban ? `IBAN: ${user.iban} | BIC: ${user.swiftBic}` : ''));
      }
    }
  }, [currency, user, existingProposal]);

  // Warn on leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isReadOnly) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isReadOnly]);

  // Pricing calculation via shared engine
  const pricingResult = useMemo(() => {
    return calculatePricing({
      items: deliverables,
      projectType,
      complexity,
      pricingSettings,
      selectedTier,
      customPrice: selectedTier === 'custom' ? customPrice : null,
      paymentScheduleType,
      discountPercent,
      taxRate: user?.taxRate || 0,
      taxMode,
    });
  }, [
    deliverables,
    projectType,
    complexity,
    pricingSettings,
    selectedTier,
    customPrice,
    paymentScheduleType,
    discountPercent,
    user?.taxRate,
    taxMode,
  ]);

  // Calculate Expiry Date
  const expiryDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + (Number(validForDays) || 14));
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [validForDays]);

  // Payment Schedule Table Generator
  const paymentScheduleRows = useMemo(() => {
    const total = pricingResult.subtotal;
    if (paymentScheduleType === '100_upfront') {
      return [
        {
          label: `Full upfront balance (${discountPercent}% discount applied)`,
          percent: 100,
          amount: total,
          dueTrigger: 'Upon agreement execution prior to project kickoff',
        },
      ];
    }
    if (paymentScheduleType === '30_40_30') {
      const p1 = Math.round(total * 0.3);
      const p2 = Math.round(total * 0.4);
      const p3 = total - p1 - p2; // handle exact rounding
      return [
        { label: 'Kickoff deposit & architecture', percent: 30, amount: p1, dueTrigger: 'Upon contract signing' },
        { label: 'Midpoint functional milestone', percent: 40, amount: p2, dueTrigger: 'Upon staging walkthrough demo' },
        { label: 'Final delivery & source transfer', percent: 30, amount: p3, dueTrigger: 'Upon production deployment' },
      ];
    }
    if (paymentScheduleType === 'milestones_4') {
      const p1 = Math.round(total * 0.25);
      const p2 = Math.round(total * 0.25);
      const p3 = Math.round(total * 0.25);
      const p4 = total - p1 - p2 - p3;
      return [
        { label: 'Sprint 1: Architecture & UI system', percent: 25, amount: p1, dueTrigger: 'Upon milestone 1 approval' },
        { label: 'Sprint 2: Core functional components', percent: 25, amount: p2, dueTrigger: 'Upon milestone 2 approval' },
        { label: 'Sprint 3: API integration & data flows', percent: 25, amount: p3, dueTrigger: 'Upon staging walkthrough' },
        { label: 'Sprint 4: Final launch & handover', percent: 25, amount: p4, dueTrigger: 'Upon final acceptance' },
      ];
    }
    // Default: 50_50
    const p1 = Math.round(total * 0.5);
    const p2 = total - p1;
    return [
      { label: 'Project kickoff deposit', percent: 50, amount: p1, dueTrigger: 'Upon contract execution' },
      { label: 'Final sign-off & production handover', percent: 50, amount: p2, dueTrigger: 'Upon client acceptance & launch' },
    ];
  }, [paymentScheduleType, pricingResult.subtotal, discountPercent]);

  // Deliverables table handlers
  const handleAddDeliverable = () => {
    if (isReadOnly) return;
    setIsDirty(true);
    const standardRate = pricingSettings?.hourlyRate || 50;
    setDeliverables(prev => [
      ...prev,
      { description: 'New project deliverable', hours: 4, rate: standardRate, amount: 4 * standardRate },
    ]);
  };

  const handleDeliverableChange = (idx, field, value) => {
    if (isReadOnly) return;
    setIsDirty(true);
    setDeliverables(prev => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === 'hours' || field === 'rate') {
        const h = Number(field === 'hours' ? value : item.hours) || 0;
        const r = Number(field === 'rate' ? value : item.rate) || 0;
        item.amount = Math.round(h * r);
      }
      next[idx] = item;
      return next;
    });
  };

  const handleRemoveDeliverable = (idx) => {
    if (isReadOnly) return;
    if (deliverables.length <= 1) {
      showToast({ type: 'warning', title: 'Cannot Remove', message: 'A proposal must include at least one deliverable.' });
      return;
    }
    setIsDirty(true);
    setDeliverables(prev => prev.filter((_, i) => i !== idx));
  };

  // Secondary Button: Suggest Price
  const handleSuggestPrice = async () => {
    if (!title.trim()) {
      showToast({
        type: 'warning',
        title: 'Title required',
        message: 'Please enter a proposal title first so AI can estimate scope and package pricing.',
      });
      return;
    }
    try {
      setIsSuggestingPrice(true);
      const res = await api.aiGuessPricing({
        title,
        category: projectType,
      });
      if (res?.aiGuess) {
        const { category: guessedCat, lineItems, complexity: guessedComp } = res.aiGuess;
        if (guessedCat) setProjectType(guessedCat);
        if (guessedComp) setComplexity(guessedComp);
        if (lineItems && lineItems.length > 0) {
          setDeliverables(lineItems);
        }
        setIsDirty(true);
        showToast({
          type: 'success',
          title: 'Pricing suggested',
          message: `Updated scope & tiers for ${guessedCat || projectType} with floor safeguard verified.`,
        });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Estimation error', message: err.message || 'Failed to suggest price' });
    } finally {
      setIsSuggestingPrice(false);
    }
  };

  // Selected client memoized
  const selectedClient = useMemo(() => {
    return clients.find(c => (c.id || c._id) === clientId) || null;
  }, [clients, clientId]);

  // Dynamic variable context for resolving clauses and templates
  const varContext = useMemo(() => {
    return buildVariableContext({
      proposal: {
        title,
        selectedTier,
        paymentScheduleType,
        validForDays,
        pricingBreakdown: {
          totalAmount: pricingResult?.totalWithTax || 0,
          subtotal: pricingResult?.subtotal || 0,
        },
        paymentSchedule: paymentScheduleRows,
        currency,
      },
      user,
      client: selectedClient,
      pricingSettings,
    });
  }, [title, selectedTier, paymentScheduleType, validForDays, pricingResult, paymentScheduleRows, currency, user, selectedClient, pricingSettings]);

  // Build Payload
  const buildProposalPayload = (status = 'draft') => {
    const minHourly = pricingSettings?.minHourlyRate || 35;
    const errors = [];

    if (!clientId) errors.push('Please select a client for this proposal.');
    if (!title.trim()) errors.push('Please enter a proposal title.');
    if (deliverables.length === 0) errors.push('Please add at least one deliverable.');

    // Check line-item rates
    const lowRateItem = deliverables.find(d => Number(d.rate) < minHourly);
    if (lowRateItem) {
      errors.push(`Deliverable "${lowRateItem.description}" has a rate below your floor minimum of ${format(minHourly)}/hr.`);
    }

    // Payment details required before sending
    if (status === 'sent' && !paymentDetails.trim()) {
      errors.push('Payment details are required before sending a proposal to a client.');
    }

    // Check for unresolved variables when sending
    if (status === 'sent') {
      const selectedClausesList = availableClauses.filter(c => selectedClauseIds.includes(c.id || c._id));
      const textToCheck = selectedClausesList.map(c => c.body).join('\n');
      const unresErrors = validateUnresolvedVariables(textToCheck, varContext);
      if (unresErrors.length > 0) {
        errors.push(unresErrors[0]);
      }
    }

    if (errors.length > 0) {
      setErrorSummary(errors);
      return { valid: false, errors };
    }

    setErrorSummary([]);

    const payload = {
      clientId,
      title: title.trim(),
      projectType,
      status,
      selectedTier,
      paymentMethod,
      paymentDetails: paymentDetails.trim(),
      paymentScheduleType,
      lineItems: deliverables.map(d => ({
        description: d.description,
        hours: Number(d.hours) || 0,
        rate: Number(d.rate) || 0,
        amount: Number(d.amount) || 0,
      })),
      pricingBreakdown: {
        estimatedHours: pricingResult.totalHours,
        baseLaborCost: pricingResult.raw,
        subtotal: pricingResult.subtotal,
        totalAmount: pricingResult.totalWithTax,
        minAcceptablePrice: pricingResult.floor,
        recommendedPrice: pricingResult.tiers.standard,
        premiumPrice: pricingResult.tiers.premium,
        rawLabor: pricingResult.raw,
        revenueProtected: pricingResult.revenueProtected,
      },
      paymentSchedule: paymentScheduleRows.map(row => ({
        milestone: row.label,
        percentage: row.percent,
        amount: row.amount,
        dueTrigger: row.dueTrigger,
      })),
      termsAndConditions: availableClauses
        .filter(c => selectedClauseIds.includes(c.id || c._id))
        .map(c => `${c.title}: ${resolveVariables(c.body, varContext)}`)
        .join('\n\n') + (clientNote ? `\n\nSpecial notes: ${clientNote}` : ''),
      validUntil: new Date(Date.now() + (Number(validForDays) || 14) * 86400000).toISOString(),
      currency,
      taxMode,
      taxRate: user?.taxRate || 0,
    };

    return { valid: true, payload };
  };

  // Save Draft Handler
  const handleSaveDraft = async (silent = false) => {
    if (isReadOnly) return;
    const { valid, payload, errors } = buildProposalPayload('draft');
    if (!valid) {
      if (!silent) {
        showToast({ type: 'warning', title: 'Cannot save proposal', message: errors[0] });
      }
      return;
    }

    try {
      setIsSavingDraft(true);
      if (saveAsDefaultPayment && paymentDetails) {
        api.updateProfile({
          defaultPaymentMethod: paymentMethod,
          paymentInstructions: paymentDetails,
        }).catch(() => {});
      }

      let res;
      if (existingProposal?.id) {
        res = await api.updateProposal(existingProposal.id, payload);
      } else {
        res = await api.createProposal(payload);
      }

      if (res?.proposal) {
        setExistingProposal(res.proposal);
        setIsDirty(false);
        setLastAutosaveText('Saved just now');
        if (!silent) {
          showToast({
            type: 'success',
            title: 'Draft saved',
            message: `Proposal ${res.proposal.proposalNumber || ''} saved successfully.`,
          });
        }
      }
    } catch (err) {
      if (!silent) {
        showToast({ type: 'error', title: 'Save failed', message: err.message || 'Failed to save proposal draft' });
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Autosave every 30s
  useEffect(() => {
    if (isReadOnly || !isDirty) return;
    const interval = setInterval(() => {
      if (clientId && title.trim()) {
        handleSaveDraft(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [clientId, title, isDirty, isReadOnly, deliverables, selectedTier, paymentMethod, paymentDetails]);

  // Send Proposal Handler
  const handleSendProposal = async () => {
    const { valid, payload, errors } = buildProposalPayload('sent');
    if (!valid) {
      showToast({ type: 'warning', title: 'Cannot send proposal', message: errors[0] });
      return;
    }

    try {
      setIsSending(true);
      let targetId = existingProposal?.id;
      if (!targetId) {
        const createRes = await api.createProposal(payload);
        targetId = createRes?.proposal?.id;
      } else {
        await api.updateProposal(targetId, payload);
      }

      setSendDialogOpen(false);
      showToast({
        type: 'success',
        title: 'Proposal sent',
        message: 'Proposal status updated to Sent. The private client link is active.',
      });
      navigate('/proposals');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to send', message: err.message || 'Server rejected proposal' });
    } finally {
      setIsSending(false);
    }
  };

  // Create Revision from read-only proposal
  const handleCreateRevision = () => {
    setExistingProposal(null);
    setIsDirty(true);
    showToast({
      type: 'info',
      title: 'Editing as new draft',
      message: 'You can now update deliverables, pricing, and terms to create a revised proposal.',
    });
  };

  // Scrollspy navigation
  const scrollToSection = (id, ref) => {
    setActiveSectionNav(id);
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Client Select Display Helper
  const formatClientOption = (c) => {
    const comp = (c.company || '').trim();
    const contact = (c.contactPerson || c.name || '').trim();
    if (comp && contact && comp.toLowerCase() !== contact.toLowerCase()) {
      return `${comp} (${contact})`;
    }
    return comp || contact || 'Unnamed Client';
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--cobalt, #0047AB)', borderTopColor: 'transparent' }}
        />
        <span className="text-xs font-semibold text-[var(--muted,#5B6676)]">Loading proposal builder...</span>
      </div>
    );
  }

  const selectedClientObj = clients.find(c => c.id === clientId || c._id === clientId);

  return (
    <div className="space-y-6 pb-24">
      {/* =============================================================
         1. TOP BAR / BREADCRUMB
         ============================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--line,#E8E0CF)]">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--muted,#5B6676)] mb-1">
            <Link to="/proposals" className="hover:text-[var(--ink,#0E1A2B)] transition-colors">
              Proposals
            </Link>
            <span>/</span>
            <span className="text-[var(--ink,#0E1A2B)] font-semibold">
              {isEditMode ? (existingProposal?.proposalNumber || 'Edit proposal') : 'New proposal'}
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <h1
              className="text-[28px] sm:text-[32px] font-extrabold text-[var(--ink,#0E1A2B)] tracking-tight leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {isEditMode ? 'Edit proposal' : 'Create proposal'}
            </h1>
            {existingProposal?.proposalNumber && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] border border-[var(--cobalt,#0047AB)]/20">
                {existingProposal.proposalNumber}
              </span>
            )}
            {isReadOnly && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--sun-tint,#FFF4CC)] text-[var(--warning,#B54708)] border border-[var(--sun,#FFC72C)]/40">
                Read-only ({existingProposal.status})
              </span>
            )}
          </div>
        </div>

        {/* Back Link & Autosave Indicator */}
        <div className="flex items-center gap-3">
          {lastAutosaveText && (
            <span className="text-xs text-[var(--muted,#5B6676)] flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-[var(--success,#067647)]" />
              <span>{lastAutosaveText}</span>
            </span>
          )}
          <Link
            to="/proposals"
            className="px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to proposals</span>
          </Link>
        </div>
      </div>

      {/* Error Summary Banner */}
      {errorSummary.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--error-tint,#FEE4E2)] border border-[var(--error,#B42318)]/30 text-[var(--error,#B42318)] text-xs space-y-1">
          <div className="font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Please resolve the following before proceeding:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-6">
            {errorSummary.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Category Mismatch Notice */}
      {detectedCategory && detectedCategory !== projectType && !dismissedMismatch && (
        <div className="p-4 rounded-2xl bg-[var(--warning-tint,#FEF0C7)] border border-[var(--warning,#B54708)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--ink,#0E1A2B)]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--warning,#B54708)] shrink-0" />
            <span>
              Detected as <strong>{detectedCategory.replace(/-/g, ' ')}</strong>. You selected <strong>{projectType.replace(/-/g, ' ')}</strong>. Use detected category?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setProjectType(detectedCategory);
                setDismissedMismatch(true);
              }}
              className="px-3 py-1.5 rounded-full font-semibold text-white text-xs cursor-pointer"
              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
            >
              Use {detectedCategory.replace(/-/g, ' ')}
            </button>
            <button
              type="button"
              onClick={() => setDismissedMismatch(true)}
              className="px-3 py-1.5 rounded-full font-semibold bg-white border border-[var(--line,#E8E0CF)] text-xs cursor-pointer text-[var(--ink,#0E1A2B)]"
            >
              Keep {projectType.replace(/-/g, ' ')}
            </button>
          </div>
        </div>
      )}

      {/* =============================================================
         2. MAIN TWO-COLUMN LAYOUT (Desktop >=1024px)
         ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Main Form Sections (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Sticky Section Sub-Navigation */}
          <div className="sticky top-20 z-20 bg-[var(--page,#FAF5EA)]/90 backdrop-blur-md py-2 border-b border-[var(--line,#E8E0CF)] flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'details', label: '1. Details', ref: detailsRef },
              { id: 'scope', label: '2. Scope & hours', ref: scopeRef },
              { id: 'package', label: '3. Package', ref: packageRef },
              { id: 'payment', label: '4. Payment', ref: paymentRef },
              { id: 'terms', label: '5. Terms', ref: termsRef },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(tab.id, tab.ref)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  activeSectionNav === tab.id
                    ? 'bg-[var(--cobalt,#0047AB)] text-white shadow-xs'
                    : 'bg-white text-[var(--muted,#5B6676)] border border-[var(--line,#E8E0CF)] hover:text-[var(--ink,#0E1A2B)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* -----------------------------------------------------------
             SECTION 1: DETAILS
             ----------------------------------------------------------- */}
          <section
            ref={detailsRef}
            id="details"
            className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line,#E8E0CF)]">
              <div>
                <h2
                  className="text-[18px] font-bold text-[var(--ink,#0E1A2B)]"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  1. Project details
                </h2>
                <p className="text-xs text-[var(--muted,#5B6676)] mt-0.5">
                  Select your client, project title and service category.
                </p>
              </div>
              {isPrefilledFromAnalyzer && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] border border-[var(--cobalt,#0047AB)]/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>From Analyzer</span>
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Client Select */}
              <div>
                <label htmlFor="client-select" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                  Client <span className="text-[var(--error,#B42318)]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="client-select"
                    value={clientId}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        openModal('new_client');
                      } else {
                        setClientId(e.target.value);
                        setIsDirty(true);
                      }
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/30 transition-all cursor-pointer"
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {formatClientOption(c)}
                      </option>
                    ))}
                    <option value="__NEW__">+ Add new client</option>
                  </select>
                </div>
              </div>

              {/* Title Textarea (Auto-wraps, no mid-word truncation) */}
              <div>
                <label htmlFor="proposal-title" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                  Proposal title <span className="text-[var(--error,#B42318)]">*</span>
                </label>
                <textarea
                  id="proposal-title"
                  rows={2}
                  value={title}
                  disabled={isReadOnly}
                  placeholder="e.g. Custom e-commerce platform with admin dashboard and Stripe billing"
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full p-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/30 resize-y transition-all"
                />
              </div>

              {/* Service Category & Suggest Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="service-cat-select" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                    Service category
                  </label>
                  <select
                    id="service-cat-select"
                    value={projectType}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      setProjectType(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/30 cursor-pointer"
                  >
                    {profConfig.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-[var(--muted,#5B6676)] mt-1 block">
                    Used to enforce the calibrated category floor.
                  </span>
                </div>

                {/* Valid For (Days) */}
                <div>
                  <label htmlFor="validity-input" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                    Valid for (days)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="validity-input"
                      type="number"
                      min={1}
                      max={90}
                      value={validForDays}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        setValidForDays(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-24 h-11 px-3 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] font-semibold text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/30"
                    />
                    <span className="text-xs text-[var(--muted,#5B6676)]">
                      Expires on <strong>{expiryDate}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Action: Suggest Price Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSuggestPrice}
                  disabled={isSuggestingPrice || isReadOnly}
                  className="px-4 py-2.5 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-xs font-semibold text-[var(--ink,#0E1A2B)] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
                  <span>{isSuggestingPrice ? 'Estimating...' : 'Suggest price'}</span>
                </button>
                <span className="text-[11px] text-[var(--muted,#5B6676)]">
                  Estimates appear in the Package section below.
                </span>
              </div>
            </div>
          </section>

          {/* -----------------------------------------------------------
             SECTION 2: SCOPE AND HOURS
             ----------------------------------------------------------- */}
          <section
            ref={scopeRef}
            id="scope"
            className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line,#E8E0CF)]">
              <div>
                <h2
                  className="text-[18px] font-bold text-[var(--ink,#0E1A2B)]"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  2. Scope and hours
                </h2>
                <p className="text-xs text-[var(--muted,#5B6676)] mt-0.5">
                  Itemized project deliverables and estimated engineering hours.
                </p>
              </div>
              <div className="text-right">
                <span
                  className="text-[20px] font-extrabold text-[var(--ink,#0E1A2B)] whitespace-nowrap"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  {pricingResult.totalHours} hrs total
                </span>
              </div>
            </div>

            {/* Deliverables Table (Desktop) / Cards (Mobile) */}
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] font-semibold">
                      <th scope="col" className="py-2.5 px-3">Deliverable</th>
                      <th scope="col" className="py-2.5 px-3 w-24 text-right">Hours</th>
                      <th scope="col" className="py-2.5 px-3 w-32 text-right">Rate</th>
                      <th scope="col" className="py-2.5 px-3 w-28 text-right">Amount</th>
                      <th scope="col" className="py-2.5 px-2 w-10 text-center"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                    {deliverables.map((item, idx) => {
                      const isLowRate = Number(item.rate) < pricingResult.minHourlyRate;
                      return (
                        <tr key={idx} className="group hover:bg-[var(--page,#FAF5EA)]/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.description}
                              disabled={isReadOnly}
                              onChange={(e) => handleDeliverableChange(idx, 'description', e.target.value)}
                              className="w-full p-2 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-[14px] text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[2px] focus-visible:ring-[var(--cobalt,#0047AB)]"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={item.hours}
                              disabled={isReadOnly}
                              onChange={(e) => handleDeliverableChange(idx, 'hours', e.target.value)}
                              className="w-20 p-2 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-[14px] font-semibold text-right outline-none focus-visible:ring-[2px] focus-visible:ring-[var(--cobalt,#0047AB)] font-tabular"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex flex-col items-end">
                              <input
                                type="number"
                                min="0"
                                value={item.rate}
                                disabled={isReadOnly}
                                onChange={(e) => handleDeliverableChange(idx, 'rate', e.target.value)}
                                className={`w-28 p-2 rounded-lg border text-[14px] font-semibold text-right outline-none font-tabular ${
                                  isLowRate
                                    ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)]'
                                    : 'border-[var(--line,#E8E0CF)] bg-white'
                                }`}
                              />
                              {isLowRate && (
                                <span className="text-[10px] text-[var(--error,#B42318)] font-semibold mt-1">
                                  Below min {format(pricingResult.minHourlyRate)}/hr
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[14px] font-tabular text-[var(--ink,#0E1A2B)]">
                            {format(item.amount)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {!isReadOnly && (
                              <button
                                type="button"
                                aria-label="Remove deliverable"
                                onClick={() => handleRemoveDeliverable(idx)}
                                className="p-1.5 rounded-lg text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)] hover:bg-white transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--line,#E8E0CF)] font-bold text-xs">
                      <td className="py-3 px-3 text-[var(--ink,#0E1A2B)]">Scope labor subtotal</td>
                      <td className="py-3 px-3 text-right font-tabular text-[14px]">{pricingResult.totalHours} hrs</td>
                      <td className="py-3 px-3 text-right text-[var(--muted,#5B6676)]">—</td>
                      <td className="py-3 px-3 text-right font-tabular text-[15px] text-[var(--ink,#0E1A2B)]">
                        {format(deliverables.reduce((acc, d) => acc + (d.amount || 0), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Stacked Card View */}
              <div className="sm:hidden space-y-3">
                {deliverables.map((item, idx) => {
                  const isLowRate = Number(item.rate) < pricingResult.minHourlyRate;
                  return (
                    <div key={idx} className="p-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--muted,#5B6676)]">Deliverable #{idx + 1}</span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            aria-label="Remove deliverable"
                            onClick={() => handleRemoveDeliverable(idx)}
                            className="p-1 text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        disabled={isReadOnly}
                        onChange={(e) => handleDeliverableChange(idx, 'description', e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-[14px]"
                      />
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-[var(--muted,#5B6676)] font-semibold block mb-0.5">Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            value={item.hours}
                            disabled={isReadOnly}
                            onChange={(e) => handleDeliverableChange(idx, 'hours', e.target.value)}
                            className="w-full p-2 rounded-lg border border-[var(--line,#E8E0CF)] bg-white font-tabular"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--muted,#5B6676)] font-semibold block mb-0.5">Rate</label>
                          <input
                            type="number"
                            value={item.rate}
                            disabled={isReadOnly}
                            onChange={(e) => handleDeliverableChange(idx, 'rate', e.target.value)}
                            className={`w-full p-2 rounded-lg border font-tabular ${
                              isLowRate ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)]' : 'border-[var(--line,#E8E0CF)] bg-white'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--muted,#5B6676)] font-semibold block mb-0.5">Amount</label>
                          <div className="p-2 rounded-lg bg-white border border-[var(--line,#E8E0CF)] font-semibold font-tabular">
                            {format(item.amount)}
                          </div>
                        </div>
                      </div>
                      {isLowRate && (
                        <span className="text-[10px] text-[var(--error,#B42318)] font-semibold block">
                          Below min rate of {format(pricingResult.minHourlyRate)}/hr
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Deliverable Button Below Table */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddDeliverable}
                  className="px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-xs font-semibold text-[var(--cobalt,#0047AB)] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add deliverable</span>
                </button>
              )}

              {/* Signature Element: Price Breakdown Panel */}
              <div className="mt-4 p-4 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line,#E8E0CF)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--cobalt,#0047AB)]" />
                    <span className="font-bold text-[var(--ink,#0E1A2B)]">Price breakdown & floor check</span>
                  </div>
                  <Link
                    to="/pricing-rules"
                    className="text-[11px] font-semibold text-[var(--cobalt,#0047AB)] hover:underline flex items-center gap-1"
                  >
                    <span>Edit floor rules</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[13px]">
                  <div>
                    <span className="text-[var(--muted,#5B6676)] block text-xs">Labor estimate</span>
                    <span className="font-semibold text-[var(--ink,#0E1A2B)] font-tabular">
                      {pricingResult.totalHours} hrs × {format(pricingResult.standardRate)} = {format(pricingResult.totalHours * pricingResult.standardRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted,#5B6676)] block text-xs">Complexity ({complexity})</span>
                    <span className="font-semibold text-[var(--ink,#0E1A2B)] font-tabular">
                      ×{pricingResult.complexityMultiplier} (raw {format(pricingResult.raw)})
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted,#5B6676)] block text-xs">Your floor for {projectType.replace(/-/g, ' ')}</span>
                    <span className="font-semibold text-[var(--ink,#0E1A2B)] font-tabular">
                      {format(pricingResult.floor)}
                    </span>
                  </div>
                </div>

                {/* Status Line */}
                <div className="pt-2">
                  {pricingResult.isRaisedToFloor ? (
                    <div className="p-2.5 rounded-lg bg-[var(--sun-tint,#FFF4CC)] border border-[var(--sun,#FFC72C)] text-[var(--ink,#0E1A2B)] font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--warning,#B54708)] shrink-0" />
                        <span>Raised to your floor: +{format(pricingResult.floor - pricingResult.raw)}</span>
                      </div>
                      <span className="text-xs text-[var(--warning,#B54708)]">Protected</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-[var(--success-tint,#E7F6EC)] border border-[var(--success,#067647)]/30 text-[var(--success,#067647)] font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Above your floor (Margin healthy: +{format(pricingResult.raw - pricingResult.floor)})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* -----------------------------------------------------------
             SECTION 3: PACKAGE (Essential, Standard, Premium)
             ----------------------------------------------------------- */}
          <section
            ref={packageRef}
            id="package"
            className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line,#E8E0CF)]">
              <div>
                <h2
                  className="text-[18px] font-bold text-[var(--ink,#0E1A2B)]"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  3. Package tier
                </h2>
                <p className="text-xs text-[var(--muted,#5B6676)] mt-0.5">
                  Select the deliverable package to present to the client.
                </p>
              </div>

              {/* Single Floor Verified Chip at Section Header */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] border border-[var(--success,#067647)]/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Floor verified</span>
                </span>
              </div>
            </div>

            {/* Radio-card Pattern */}
            <div
              role="radiogroup"
              aria-label="Package tier options"
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* 1. Essential */}
              <div
                role="radio"
                tabIndex={0}
                aria-checked={selectedTier === 'essential'}
                onClick={() => {
                  if (!isReadOnly) {
                    setSelectedTier('essential');
                    setIsDirty(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    if (!isReadOnly) {
                      setSelectedTier('essential');
                      setIsDirty(true);
                    }
                  }
                }}
                className={`p-5 rounded-2xl transition-all cursor-pointer select-none flex flex-col justify-between ${
                  selectedTier === 'essential'
                    ? 'border-2 border-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)] shadow-xs'
                    : 'border border-[var(--line,#E8E0CF)] bg-white hover:border-[var(--muted,#5B6676)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-[var(--ink,#0E1A2B)]">Essential</span>
                    {selectedTier === 'essential' && (
                      <div className="w-5 h-5 rounded-full bg-[var(--cobalt,#0047AB)] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div
                    className="text-[26px] font-extrabold text-[var(--ink,#0E1A2B)] font-tabular"
                    style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                  >
                    {format(pricingResult.tiers.essential)}
                  </div>
                  <p className="text-xs text-[var(--muted,#5B6676)] mt-1">Core project floor package</p>

                  <ul className="mt-4 space-y-2 text-xs text-[var(--ink,#0E1A2B)] border-t border-[var(--line,#E8E0CF)]/80 pt-3">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>All scoped deliverables</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>1 consolidated revision round</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>Standard deployment handover</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2. Standard (Recommended) */}
              <div
                role="radio"
                tabIndex={0}
                aria-checked={selectedTier === 'standard'}
                onClick={() => {
                  if (!isReadOnly) {
                    setSelectedTier('standard');
                    setIsDirty(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    if (!isReadOnly) {
                      setSelectedTier('standard');
                      setIsDirty(true);
                    }
                  }
                }}
                className={`p-5 rounded-2xl transition-all cursor-pointer select-none flex flex-col justify-between relative ${
                  selectedTier === 'standard'
                    ? 'border-2 border-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)] shadow-xs'
                    : 'border border-[var(--line,#E8E0CF)] bg-white hover:border-[var(--muted,#5B6676)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--ink,#0E1A2B)]">Standard</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--sun-tint,#FFF4CC)] text-[var(--ink,#0E1A2B)]">
                        Recommended
                      </span>
                    </div>
                    {selectedTier === 'standard' && (
                      <div className="w-5 h-5 rounded-full bg-[var(--cobalt,#0047AB)] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div
                    className="text-[26px] font-extrabold text-[var(--ink,#0E1A2B)] font-tabular"
                    style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                  >
                    {format(pricingResult.tiers.standard)}
                  </div>
                  <p className="text-xs text-[var(--muted,#5B6676)] mt-1">Optimal freelance commercial quote</p>

                  <ul className="mt-4 space-y-2 text-xs text-[var(--ink,#0E1A2B)] border-t border-[var(--line,#E8E0CF)]/80 pt-3">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>All scoped deliverables</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>2 consolidated revision rounds</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>30 days post-launch support</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 3. Premium */}
              <div
                role="radio"
                tabIndex={0}
                aria-checked={selectedTier === 'premium'}
                onClick={() => {
                  if (!isReadOnly) {
                    setSelectedTier('premium');
                    setIsDirty(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    if (!isReadOnly) {
                      setSelectedTier('premium');
                      setIsDirty(true);
                    }
                  }
                }}
                className={`p-5 rounded-2xl transition-all cursor-pointer select-none flex flex-col justify-between ${
                  selectedTier === 'premium'
                    ? 'border-2 border-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)] shadow-xs'
                    : 'border border-[var(--line,#E8E0CF)] bg-white hover:border-[var(--muted,#5B6676)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-[var(--ink,#0E1A2B)]">Premium</span>
                    {selectedTier === 'premium' && (
                      <div className="w-5 h-5 rounded-full bg-[var(--cobalt,#0047AB)] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div
                    className="text-[26px] font-extrabold text-[var(--ink,#0E1A2B)] font-tabular"
                    style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                  >
                    {format(pricingResult.tiers.premium)}
                  </div>
                  <p className="text-xs text-[var(--muted,#5B6676)] mt-1">Priority SLA & extended support</p>

                  <ul className="mt-4 space-y-2 text-xs text-[var(--ink,#0E1A2B)] border-t border-[var(--line,#E8E0CF)]/80 pt-3">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>All deliverables + priority delivery</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>3 revision rounds included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)] shrink-0" />
                      <span>60 days support + warranty</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* -----------------------------------------------------------
             SECTION 4: PAYMENT
             ----------------------------------------------------------- */}
          <section
            ref={paymentRef}
            id="payment"
            className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-6"
          >
            <div className="pb-3 border-b border-[var(--line,#E8E0CF)]">
              <h2
                className="text-[18px] font-bold text-[var(--ink,#0E1A2B)]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                4. Payment terms & remittance
              </h2>
              <p className="text-xs text-[var(--muted,#5B6676)] mt-0.5">
                Define the installment milestones, upfront discounts, and remittance details.
              </p>
            </div>

            {/* Schedule Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-2">
                  Payment installment schedule
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: '50_50', label: '50% / 50%' },
                    { id: '100_upfront', label: `100% upfront (${discountPercent}% off)` },
                    { id: '30_40_30', label: '30% / 40% / 30%' },
                    { id: 'milestones_4', label: '4 milestones' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        setPaymentScheduleType(opt.id);
                        setIsDirty(true);
                      }}
                      className={`p-3 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                        paymentScheduleType === opt.id
                          ? 'border-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] font-bold'
                          : 'border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Upfront discount capping notice */}
                {paymentScheduleType === '100_upfront' && pricingResult.isDiscountCapped && (
                  <div className="mt-3 p-3 rounded-xl bg-[var(--warning-tint,#FEF0C7)] border border-[var(--warning,#B54708)]/40 text-xs text-[var(--warning,#B54708)] font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Discount limited to {format(pricingResult.discountCappedAmount)} to keep you above your floor.
                    </span>
                  </div>
                )}
              </div>

              {/* Milestone Schedule Preview Table */}
              <div className="border border-[var(--line,#E8E0CF)] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--page,#FAF5EA)] text-[var(--muted,#5B6676)] font-semibold border-b border-[var(--line,#E8E0CF)]">
                    <tr>
                      <th scope="col" className="p-2.5 px-3">Milestone label</th>
                      <th scope="col" className="p-2.5 px-3 w-20 text-right">Percent</th>
                      <th scope="col" className="p-2.5 px-3 w-28 text-right">Amount</th>
                      <th scope="col" className="p-2.5 px-3">Due trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                    {paymentScheduleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[var(--page,#FAF5EA)]/40">
                        <td className="p-2.5 px-3 font-semibold text-[var(--ink,#0E1A2B)]">{row.label}</td>
                        <td className="p-2.5 px-3 text-right font-tabular text-[var(--muted,#5B6676)]">{row.percent}%</td>
                        <td className="p-2.5 px-3 text-right font-bold font-tabular text-[var(--ink,#0E1A2B)]">
                          {format(row.amount)}
                        </td>
                        <td className="p-2.5 px-3 text-[var(--muted,#5B6676)]">{row.dueTrigger}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Method Selection */}
              <div className="pt-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="payment-method-select" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                      Remittance method
                    </label>
                    <select
                      id="payment-method-select"
                      value={paymentMethod}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/30 cursor-pointer"
                    >
                      <option value="stripe">Stripe payment link</option>
                      <option value="paypal">PayPal</option>
                      <option value="bank_transfer">Bank transfer (IBAN / SWIFT)</option>
                      <option value="other">Other / payment link</option>
                      {/* UPI and Razorpay appear ONLY when currency is INR */}
                      {(currency || '').toUpperCase() === 'INR' && (
                        <>
                          <option value="upi">UPI (Instant VPA)</option>
                          <option value="razorpay">Razorpay link</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Payment Details Adapts to Method */}
                  <div>
                    <label htmlFor="payment-details-input" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                      {paymentMethod === 'stripe' ? 'Stripe payment link or details' :
                       paymentMethod === 'paypal' ? 'PayPal email or me.link' :
                       paymentMethod === 'bank_transfer' ? 'IBAN, SWIFT/BIC & Account name' :
                       paymentMethod === 'upi' ? 'UPI ID (VPA)' :
                       paymentMethod === 'razorpay' ? 'Razorpay payment URL' :
                       'Payment instructions'} <span className="text-[var(--error,#B42318)]">*</span>
                    </label>
                    <input
                      id="payment-details-input"
                      type="text"
                      value={paymentDetails}
                      disabled={isReadOnly}
                      placeholder={
                        paymentMethod === 'stripe' ? 'https://buy.stripe.com/...' :
                        paymentMethod === 'paypal' ? 'payments@yourdomain.com' :
                        paymentMethod === 'bank_transfer' ? 'IBAN: GB29... | BIC: BARCGB22' :
                        paymentMethod === 'upi' ? 'name@bank' :
                        'Payment remittance link or instruction'
                      }
                      onChange={(e) => {
                        setPaymentDetails(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[14px] text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/30"
                    />
                  </div>
                </div>

                {/* Save as default payment method */}
                {!isReadOnly && (
                  <label className="flex items-center gap-2 text-xs text-[var(--ink,#0E1A2B)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveAsDefaultPayment}
                      onChange={(e) => setSaveAsDefaultPayment(e.target.checked)}
                      className="rounded border-[var(--line,#E8E0CF)] text-[var(--cobalt,#0047AB)] focus:ring-[var(--cobalt,#0047AB)]"
                    />
                    <span>Save as default payment details for future proposals</span>
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* -----------------------------------------------------------
             SECTION 5: TERMS AND CONDITIONS
             ----------------------------------------------------------- */}
          <section
            ref={termsRef}
            id="terms"
            className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-6"
          >
            <div className="pb-3 border-b border-[var(--line,#E8E0CF)]">
              <h2
                className="text-[18px] font-bold text-[var(--ink,#0E1A2B)]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                5. Terms, clauses & exclusions
              </h2>
              <p className="text-xs text-[var(--muted,#5B6676)] mt-0.5">
                Standard legal clauses, tax treatment, and explicit scope exclusions.
              </p>
            </div>

            {/* Clauses Checklist */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-[var(--ink,#0E1A2B)] block">
                Standard contract clauses (from Templates library)
              </span>
              <div className="space-y-2">
                {availableClauses.filter(c => !c.archived).map(clause => {
                  const clauseId = clause.id || clause._id;
                  const isChecked = selectedClauseIds.includes(clauseId);
                  const isExpanded = expandedClauseId === clauseId;
                  const resolvedText = resolveVariables(clause.body, varContext);
                  return (
                    <div
                      key={clauseId}
                      className="p-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[var(--ink,#0E1A2B)] select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isReadOnly}
                            onChange={(e) => {
                              setIsDirty(true);
                              setSelectedClauseIds(prev =>
                                e.target.checked ? [...prev, clauseId] : prev.filter(x => x !== clauseId)
                              );
                            }}
                            className="rounded border-[var(--line,#E8E0CF)] text-[var(--cobalt,#0047AB)]"
                          />
                          <span>{clause.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] font-semibold">
                            {clause.category}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setExpandedClauseId(isExpanded ? null : clauseId)}
                          className="text-[11px] font-semibold text-[var(--cobalt,#0047AB)] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide' : 'Read clause'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                      {isExpanded && (
                        <p className="text-xs text-[var(--muted,#5B6676)] p-3 rounded-lg bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] leading-relaxed whitespace-pre-line">
                          {resolvedText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scope Exclusions (Not included list from Analyzer) */}
            {notIncludedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--line,#E8E0CF)]">
                <span className="text-xs font-semibold text-[var(--ink,#0E1A2B)] block">
                  Explicit scope exclusions (Not included)
                </span>
                <p className="text-[11px] text-[var(--muted,#5B6676)]">
                  These boundaries will appear in the proposal so scope creep is easy to handle.
                </p>
                <div className="flex flex-wrap gap-2">
                  {notIncludedItems.map((ex, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)]"
                    >
                      ✕ {ex}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tax Treatment Line */}
            <div className="pt-2 border-t border-[var(--line,#E8E0CF)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[var(--ink,#0E1A2B)] block">
                  Tax setting ({user?.taxType || 'VAT'} {user?.taxRate || 0}%)
                </span>
                <span className="text-[11px] text-[var(--muted,#5B6676)]">
                  Configured from Settings. Choose tax calculation mode.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    setTaxMode('exclusive');
                    setIsDirty(true);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    taxMode === 'exclusive'
                      ? 'bg-[var(--cobalt,#0047AB)] text-white'
                      : 'bg-white border border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)]'
                  }`}
                >
                  Tax exclusive
                </button>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    setTaxMode('inclusive');
                    setIsDirty(true);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    taxMode === 'inclusive'
                      ? 'bg-[var(--cobalt,#0047AB)] text-white'
                      : 'bg-white border border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)]'
                  }`}
                >
                  Tax inclusive
                </button>
              </div>
            </div>

            {/* Optional Note to Client */}
            <div className="pt-2">
              <label htmlFor="client-note" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                Note to client (optional)
              </label>
              <textarea
                id="client-note"
                rows={2}
                value={clientNote}
                disabled={isReadOnly}
                placeholder="Add a personalized greeting, kick-off dates, or special notes..."
                onChange={(e) => {
                  setClientNote(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full p-3 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[14px] text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/30 resize-y"
              />
            </div>
          </section>
        </div>

        {/* RIGHT STICKY SUMMARY COLUMN (340px) */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--muted,#5B6676)]">Proposal summary</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)]">
                  {selectedTier.toUpperCase()}
                </span>
              </div>
              <h3
                className="text-[17px] font-bold text-[var(--ink,#0E1A2B)] line-clamp-2"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                {title || 'Untitled proposal'}
              </h3>
              <p className="text-xs text-[var(--muted,#5B6676)] mt-0.5">
                Client: {selectedClientObj ? formatClientOption(selectedClientObj) : 'No client selected'}
              </p>
            </div>

            {/* Live Financial Breakdown */}
            <div className="space-y-2.5 text-xs border-t border-[var(--line,#E8E0CF)] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted,#5B6676)]">Package subtotal</span>
                <span className="font-semibold text-[var(--ink,#0E1A2B)] font-tabular">
                  {format(pricingResult.activePackagePrice)}
                </span>
              </div>

              {pricingResult.appliedDiscount > 0 && (
                <div className="flex items-center justify-between text-[var(--success,#067647)] font-semibold">
                  <span>Upfront discount ({discountPercent}%)</span>
                  <span className="font-tabular">-{format(pricingResult.appliedDiscount)}</span>
                </div>
              )}

              {pricingResult.taxRate > 0 && (
                <div className="flex items-center justify-between text-[var(--muted,#5B6676)]">
                  <span>
                    {user?.taxType || 'VAT'} ({pricingResult.taxRate}% {taxMode})
                  </span>
                  <span className="font-semibold text-[var(--ink,#0E1A2B)] font-tabular">
                    {format(pricingResult.taxAmount)}
                  </span>
                </div>
              )}

              {/* Total Price */}
              <div className="pt-3 border-t border-[var(--line,#E8E0CF)] flex items-baseline justify-between">
                <span className="text-sm font-bold text-[var(--ink,#0E1A2B)]">Total</span>
                <span
                  className="text-[32px] font-black text-[var(--ink,#0E1A2B)] font-tabular leading-none"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  {format(pricingResult.totalWithTax)}
                </span>
              </div>
            </div>

            {/* Floor Status Chip */}
            <div className="p-3 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted,#5B6676)]">Floor safeguard</span>
                <span className="font-semibold text-[var(--success,#067647)] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Enforced</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--muted,#5B6676)]">Valid until</span>
                <span className="font-semibold text-[var(--ink,#0E1A2B)]">{expiryDate}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {!isReadOnly ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSendDialogOpen(true)}
                    className="w-full h-11 px-4 rounded-full text-[14px] font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40"
                    style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt-dark, #003A8C)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--cobalt, #0047AB)'; }}
                  >
                    <Send className="w-4 h-4" />
                    <span>Send proposal</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSavingDraft}
                      onClick={() => handleSaveDraft(false)}
                      className="w-full py-2.5 px-3 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-xs font-semibold text-[var(--ink,#0E1A2B)] transition-colors cursor-pointer"
                    >
                      {isSavingDraft ? 'Saving...' : 'Save draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="w-full py-2.5 px-3 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-xs font-semibold text-[var(--cobalt,#0047AB)] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[var(--sun-tint,#FFF4CC)] border border-[var(--sun,#FFC72C)]/40 text-xs text-[var(--ink,#0E1A2B)]">
                    This proposal is <strong>{existingProposal.status}</strong> and cannot be edited directly.
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateRevision}
                    className="w-full h-11 px-4 rounded-full text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Create revision</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="w-full py-2.5 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-xs font-semibold text-[var(--ink,#0E1A2B)] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View client proposal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =============================================================
         3. MOBILE FIXED BOTTOM SUMMARY BAR (<1024px)
         ============================================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[var(--line,#E8E0CF)] p-3.5 px-4 z-40 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] text-[var(--muted,#5B6676)] block font-semibold">Total quote</span>
          <span
            className="text-[20px] font-black text-[var(--ink,#0E1A2B)] font-tabular"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {format(pricingResult.totalWithTax)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-3 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)]"
          >
            Review
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setSendDialogOpen(true)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
            >
              Send
            </button>
          )}
        </div>
      </div>

      {/* =============================================================
         4. SEND PROPOSAL CONFIRMATION MODAL
         ============================================================= */}
      {sendDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-[var(--ink,#0E1A2B)]/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-5">
            <div>
              <h3
                className="text-[20px] font-bold text-[var(--ink,#0E1A2B)]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Send proposal to client
              </h3>
              <p className="text-xs text-[var(--muted,#5B6676)] mt-1">
                The proposal will be marked as Sent and locked for client review.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted,#5B6676)]">Client</span>
                <span className="font-semibold text-[var(--ink,#0E1A2B)]">
                  {selectedClientObj ? formatClientOption(selectedClientObj) : 'Client'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted,#5B6676)]">Total amount</span>
                <span className="font-bold text-[var(--ink,#0E1A2B)] font-tabular">{format(pricingResult.totalWithTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted,#5B6676)]">Payment terms</span>
                <span className="font-semibold text-[var(--ink,#0E1A2B)]">{paymentScheduleType.replace('_', ' / ')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSendDialogOpen(false)}
                className="px-4 py-2.5 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleSendProposal}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              >
                {isSending ? 'Sending...' : 'Confirm & send proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
         5. CLIENT-FACING PREVIEW MODAL
         ============================================================= */}
      {previewOpen && (
        <ProposalDocumentModal
          proposal={{
            ...existingProposal,
            title,
            status: existingProposal?.status || 'draft',
            proposalNumber: existingProposal?.proposalNumber || 'PROP-DRAFT',
            currency,
            projectType,
            lineItems: deliverables,
            pricingBreakdown: {
              subtotal: pricingResult.subtotal,
              totalAmount: pricingResult.totalWithTax,
              recommendedPrice: pricingResult.tiers.standard,
              minimumAcceptablePrice: pricingResult.floor,
            },
            paymentSchedule: paymentScheduleRows.map(r => ({
              milestone: r.label,
              percentage: r.percent,
              amount: r.amount,
              dueTrigger: r.dueTrigger,
            })),
            termsAndConditions: DEFAULT_CLAUSES
              .filter(c => selectedClauseIds.includes(c.id))
              .map(c => `${c.title}: ${c.content}`)
              .join('\n\n') + (clientNote ? `\n\n${clientNote}` : ''),
            validUntil: new Date(Date.now() + (Number(validForDays) || 14) * 86400000).toISOString(),
            taxMode,
            taxRate: user?.taxRate || 0,
          }}
          client={selectedClientObj}
          user={user}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

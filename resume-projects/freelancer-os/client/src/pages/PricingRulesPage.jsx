import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Lock,
  ChevronDown,
  ChevronUp,
  Save,
  Info,
  Sliders,
  DollarSign,
  Undo2,
  Layers,
  HelpCircle,
  Eye,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import {
  computePricing,
  validatePricingRules,
  roundUp,
  getDefaultRoundingStep,
} from '../utils/pricingEngine';

// Default profession starter project types
const PROFILE_STARTERS = {
  web_developer: [
    { id: 'landing-pages', name: 'Landing page', typicalMinHours: 8, typicalMaxHours: 14, floor: 5000, archived: false, order: 0 },
    { id: 'business-websites', name: 'Business website', typicalMinHours: 16, typicalMaxHours: 28, floor: 10000, archived: false, order: 1 },
    { id: 'e-commerce', name: 'E-commerce store', typicalMinHours: 24, typicalMaxHours: 45, floor: 25000, archived: false, order: 2 },
    { id: 'custom-web-apps', name: 'Custom web app', typicalMinHours: 35, typicalMaxHours: 65, floor: 40000, archived: false, order: 3 },
    { id: 'saas-platform', name: 'SaaS platform', typicalMinHours: 50, typicalMaxHours: 100, floor: 70000, archived: false, order: 4 },
    { id: 'ai-integrations', name: 'AI integration', typicalMinHours: 20, typicalMaxHours: 40, floor: 30000, archived: false, order: 5 },
  ],
  design: [
    { id: 'brand-identity', name: 'Brand identity system', typicalMinHours: 15, typicalMaxHours: 30, floor: 15000, archived: false, order: 0 },
    { id: 'ui-ux-design', name: 'Web UI/UX design', typicalMinHours: 20, typicalMaxHours: 40, floor: 25000, archived: false, order: 1 },
    { id: 'mobile-app-design', name: 'Mobile app UI/UX', typicalMinHours: 30, typicalMaxHours: 60, floor: 40000, archived: false, order: 2 },
    { id: 'design-system', name: 'Figma design system', typicalMinHours: 25, typicalMaxHours: 50, floor: 35000, archived: false, order: 3 },
  ],
  content: [
    { id: 'seo-articles', name: 'SEO article package', typicalMinHours: 6, typicalMaxHours: 12, floor: 4000, archived: false, order: 0 },
    { id: 'website-copy', name: 'Full website copy', typicalMinHours: 12, typicalMaxHours: 25, floor: 12000, archived: false, order: 1 },
    { id: 'email-funnel', name: 'Email sequence funnel', typicalMinHours: 8, typicalMaxHours: 18, floor: 8000, archived: false, order: 2 },
  ],
  marketing: [
    { id: 'seo-audit', name: 'Technical SEO audit', typicalMinHours: 10, typicalMaxHours: 20, floor: 12000, archived: false, order: 0 },
    { id: 'ad-campaign', name: 'PPC ads management', typicalMinHours: 15, typicalMaxHours: 30, floor: 20000, archived: false, order: 1 },
    { id: 'social-strategy', name: 'Content strategy', typicalMinHours: 12, typicalMaxHours: 24, floor: 15000, archived: false, order: 2 },
  ],
  consulting: [
    { id: 'strategy-roadmap', name: 'Technical architecture roadmap', typicalMinHours: 10, typicalMaxHours: 20, floor: 20000, archived: false, order: 0 },
    { id: 'code-audit', name: 'Security & code audit', typicalMinHours: 15, typicalMaxHours: 30, floor: 35000, archived: false, order: 1 },
  ],
  custom: [
    { id: 'standard-project', name: 'Standard project deliverable', typicalMinHours: 10, typicalMaxHours: 25, floor: 10000, archived: false, order: 0 },
  ],
};

// Preset configurations by currency (INR base vs USD base)
const PRESETS = {
  INR: {
    'Entry level': {
      hourlyRate: 300,
      minHourlyRate: 250,
      minProjectFee: 3000,
      contingencyPercent: 10,
      targetMargin: 20,
      rushMultiplier: 1.25,
      tierMultipliers: { essential: 1.0, standard: 1.20, premium: 1.45 },
      roundingStep: 50,
      landingPageFloor: 5000,
    },
    'Established': {
      hourlyRate: 600,
      minHourlyRate: 500,
      minProjectFee: 8000,
      contingencyPercent: 15,
      targetMargin: 28,
      rushMultiplier: 1.30,
      tierMultipliers: { essential: 1.0, standard: 1.25, premium: 1.55 },
      roundingStep: 50,
      landingPageFloor: 10000,
    },
    'Premium studio': {
      hourlyRate: 1200,
      minHourlyRate: 950,
      minProjectFee: 18000,
      contingencyPercent: 20,
      targetMargin: 35,
      rushMultiplier: 1.40,
      tierMultipliers: { essential: 1.0, standard: 1.30, premium: 1.75 },
      roundingStep: 100,
      landingPageFloor: 22000,
    },
  },
  USD: {
    'Entry level': {
      hourlyRate: 40,
      minHourlyRate: 30,
      minProjectFee: 250,
      contingencyPercent: 10,
      targetMargin: 20,
      rushMultiplier: 1.25,
      tierMultipliers: { essential: 1.0, standard: 1.20, premium: 1.45 },
      roundingStep: 5,
      landingPageFloor: 400,
    },
    'Established': {
      hourlyRate: 75,
      minHourlyRate: 60,
      minProjectFee: 650,
      contingencyPercent: 15,
      targetMargin: 28,
      rushMultiplier: 1.30,
      tierMultipliers: { essential: 1.0, standard: 1.25, premium: 1.55 },
      roundingStep: 10,
      landingPageFloor: 900,
    },
    'Premium studio': {
      hourlyRate: 150,
      minHourlyRate: 110,
      minProjectFee: 1800,
      contingencyPercent: 20,
      targetMargin: 35,
      rushMultiplier: 1.40,
      tierMultipliers: { essential: 1.0, standard: 1.30, premium: 1.75 },
      roundingStep: 25,
      landingPageFloor: 2200,
    },
  },
};

// Suggested field values for quick resets
const SUGGESTED_VALUES = {
  INR: { hourlyRate: 300, minHourlyRate: 250, minProjectFee: 3000 },
  USD: { hourlyRate: 50, minHourlyRate: 35, minProjectFee: 300 },
  EUR: { hourlyRate: 55, minHourlyRate: 40, minProjectFee: 350 },
  GBP: { hourlyRate: 45, minHourlyRate: 35, minProjectFee: 300 },
};

function formatCurrencyAmount(amount, currencyCode = 'USD') {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currencyCode} ${num.toLocaleString()}`;
  }
}

function formatNumber(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US').format(num);
}

export function PricingRulesPage() {
  const { user } = useAuthStore();
  const { showToast } = useNotificationStore();
  const { currency: displayCurrency } = useCurrencyStore();

  // Settings state
  const [initialSettings, setInitialSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Undo Toast state (10s countdown)
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const [undoPresetName, setUndoPresetName] = useState('');
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const undoTimerRef = useRef(null);

  // Modal dialog states
  const [presetConfirmModal, setPresetConfirmModal] = useState({ open: false, presetName: '', diffs: [] });
  const [profileConfirmModal, setProfileConfirmModal] = useState({ open: false, newProfile: '' });
  const [suggestFloorsModal, setSuggestFloorsModal] = useState({ open: false, diffs: [] });
  const [saveSummaryModal, setSaveSummaryModal] = useState({ open: false, diffs: [] });
  const [deleteTypeModal, setDeleteTypeModal] = useState({ open: false, typeId: '', typeName: '' });

  // Add project type inline form
  const [showAddTypeRow, setShowAddTypeRow] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeMinHours, setNewTypeMinHours] = useState('8');
  const [newTypeMaxHours, setNewTypeMaxHours] = useState('16');
  const [newTypeFloor, setNewTypeFloor] = useState('5000');

  // Currency overrides advanced collapsible
  const [showCurrencyOverrides, setShowCurrencyOverrides] = useState(false);

  // Mobile simulator toggle
  const [mobileSimOpen, setMobileSimOpen] = useState(false);
  const simulatorRef = useRef(null);
  const h1Ref = useRef(null);

  // Live Simulator state (reads unsaved form values)
  const [simHours, setSimHours] = useState(8);
  const [simProjectType, setSimProjectType] = useState('landing-pages');
  const [simComplexity, setSimComplexity] = useState('medium');
  const [simRush, setSimRush] = useState(false);

  // Set document title and focus H1
  useEffect(() => {
    document.title = 'Floorly: Pricing rules';
    h1Ref.current?.focus();
  }, []);

  // Fetch pricing settings on load
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.getPricingSettings();
        if (res?.settings) {
          const s = res.settings;
          // Determine rules currency: user base currency
          const rulesCurr = s.currency || user?.currency || 'USD';
          const defaultStarters = PROFILE_STARTERS[s.profile || 'web_developer'] || PROFILE_STARTERS.web_developer;

          // Normalize project types list
          let types = [];
          if (Array.isArray(s.projectTypes) && s.projectTypes.length > 0) {
            types = s.projectTypes.map((pt, idx) => ({
              ...pt,
              order: pt.order !== undefined ? pt.order : idx,
            }));
          } else if (s.categoryMinimums) {
            const catMap = s.categoryMinimums instanceof Map ? Object.fromEntries(s.categoryMinimums) : s.categoryMinimums;
            types = defaultStarters.map((starter, idx) => ({
              ...starter,
              floor: Number(catMap[starter.id]) || starter.floor,
              order: idx,
            }));
          } else {
            types = [...defaultStarters];
          }

          const normalized = {
            hourlyRate: Number(s.hourlyRate) || (rulesCurr === 'INR' ? 300 : 50),
            minHourlyRate: Number(s.minHourlyRate) || (rulesCurr === 'INR' ? 250 : 35),
            minProjectFee: Number(s.minProjectFee) || (rulesCurr === 'INR' ? 3000 : 300),
            complexityMultipliers: {
              simple: Number(s.complexityMultipliers?.simple) || 1.0,
              medium: Number(s.complexityMultipliers?.medium) || 1.25,
              complex: Number(s.complexityMultipliers?.complex) || 1.5,
            },
            rushMultiplier: Number(s.rushMultiplier) || 1.30,
            defaultContingencyPercent: Number(s.defaultContingencyPercent ?? 10),
            preferredProfitMargin: Number(s.preferredProfitMargin ?? 25),
            tierMultipliers: {
              essential: 1.0,
              standard: Number(s.tierMultipliers?.standard) || 1.20,
              premium: Number(s.tierMultipliers?.premium) || 1.50,
            },
            packageTiers: s.packageTiers || {
              essential: { name: 'Essential', multiplier: 1.0, revisions: 1, supportDays: 14, description: 'Baseline deliverables at your floor price.' },
              standard: { name: 'Standard', multiplier: 1.20, revisions: 3, supportDays: 30, description: 'Comprehensive delivery with dedicated revisions.' },
              premium: { name: 'Premium', multiplier: 1.50, revisions: 5, supportDays: 60, description: 'Turnkey priority execution and extended support.' },
            },
            roundingStep: Number(s.roundingStep) || getDefaultRoundingStep(rulesCurr),
            currency: rulesCurr,
            profile: s.profile || 'web_developer',
            projectTypes: types,
            currencyOverrides: s.currencyOverrides || {},
            version: s.version || 1,
            updatedAt: s.updatedAt || new Date().toISOString(),
          };

          setInitialSettings(JSON.parse(JSON.stringify(normalized)));
          setForm(JSON.parse(JSON.stringify(normalized)));
          setLastSavedTime(s.updatedAt ? new Date(s.updatedAt) : new Date());

          if (types.length > 0) {
            setSimProjectType(types[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load pricing settings:', err);
        showToast({ type: 'error', title: 'Load Error', message: 'Could not load pricing rules.' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!initialSettings || !form) return false;
    return JSON.stringify(initialSettings) !== JSON.stringify(form);
  }, [initialSettings, form]);

  // Warn on page unload when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Undo Timer countdown
  useEffect(() => {
    if (undoSecondsLeft > 0) {
      undoTimerRef.current = setTimeout(() => {
        setUndoSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else {
      setUndoSnapshot(null);
    }
    return () => clearTimeout(undoTimerRef.current);
  }, [undoSecondsLeft]);

  // Validation & Sanity Warnings check
  const validation = useMemo(() => {
    if (!form) return { isValid: true, errors: {}, warnings: [] };
    return validatePricingRules(form);
  }, [form]);

  // Execute Live Simulator on the fly using ONE shared computePricing function
  const simResult = useMemo(() => {
    if (!form) return null;
    return computePricing(
      {
        estimatedHours: Number(simHours) || 8,
        projectType: simProjectType,
        complexity: simComplexity,
        isRushDelivery: simRush,
        currency: form.currency,
      },
      form
    );
  }, [form, simHours, simProjectType, simComplexity, simRush]);

  // Current active project type details in simulator
  const activeSimProjectType = useMemo(() => {
    if (!form?.projectTypes) return null;
    return form.projectTypes.find((pt) => pt.id === simProjectType) || form.projectTypes[0];
  }, [form?.projectTypes, simProjectType]);

  // Check if simulated hours are outside typical range
  const isSimHoursOutsideTypical = useMemo(() => {
    if (!activeSimProjectType) return false;
    const h = Number(simHours) || 0;
    return h < activeSimProjectType.typicalMinHours || h > activeSimProjectType.typicalMaxHours;
  }, [activeSimProjectType, simHours]);

  // --- ACTIONS ---

  // Handle Preset Selection
  const handleOpenPresetModal = (presetName) => {
    if (!form) return;
    const baseCurr = form.currency === 'INR' ? 'INR' : 'USD';
    const presetData = PRESETS[baseCurr]?.[presetName] || PRESETS.USD[presetName];
    if (!presetData) return;

    const diffs = [];
    if (form.hourlyRate !== presetData.hourlyRate) {
      diffs.push({ label: 'Standard hourly rate', oldVal: `${formatCurrencyAmount(form.hourlyRate, form.currency)}/hr`, newVal: `${formatCurrencyAmount(presetData.hourlyRate, form.currency)}/hr` });
    }
    if (form.minHourlyRate !== presetData.minHourlyRate) {
      diffs.push({ label: 'Lowest hourly rate', oldVal: `${formatCurrencyAmount(form.minHourlyRate, form.currency)}/hr`, newVal: `${formatCurrencyAmount(presetData.minHourlyRate, form.currency)}/hr` });
    }
    if (form.minProjectFee !== presetData.minProjectFee) {
      diffs.push({ label: 'Minimum project fee', oldVal: formatCurrencyAmount(form.minProjectFee, form.currency), newVal: formatCurrencyAmount(presetData.minProjectFee, form.currency) });
    }
    if (form.defaultContingencyPercent !== presetData.contingencyPercent) {
      diffs.push({ label: 'Contingency buffer', oldVal: `${form.defaultContingencyPercent}%`, newVal: `${presetData.contingencyPercent}%` });
    }
    if (form.preferredProfitMargin !== presetData.targetMargin) {
      diffs.push({ label: 'Target margin', oldVal: `${form.preferredProfitMargin}%`, newVal: `${presetData.targetMargin}%` });
    }
    if (form.rushMultiplier !== presetData.rushMultiplier) {
      diffs.push({ label: 'Rush multiplier', oldVal: `x${form.rushMultiplier}`, newVal: `x${presetData.rushMultiplier}` });
    }

    setPresetConfirmModal({
      open: true,
      presetName,
      presetData,
      diffs,
    });
  };

  const handleApplyPreset = () => {
    const { presetName, presetData } = presetConfirmModal;
    if (!presetData || !form) return;

    // Snapshot current form for 10-second undo
    setUndoSnapshot(JSON.parse(JSON.stringify(form)));
    setUndoPresetName(presetName);
    setUndoSecondsLeft(10);

    setForm((prev) => ({
      ...prev,
      hourlyRate: presetData.hourlyRate,
      minHourlyRate: presetData.minHourlyRate,
      minProjectFee: presetData.minProjectFee,
      defaultContingencyPercent: presetData.contingencyPercent,
      preferredProfitMargin: presetData.targetMargin,
      rushMultiplier: presetData.rushMultiplier,
      roundingStep: presetData.roundingStep || prev.roundingStep,
      tierMultipliers: {
        ...prev.tierMultipliers,
        standard: presetData.tierMultipliers.standard,
        premium: presetData.tierMultipliers.premium,
      },
      packageTiers: {
        ...prev.packageTiers,
        standard: { ...prev.packageTiers.standard, multiplier: presetData.tierMultipliers.standard },
        premium: { ...prev.packageTiers.premium, multiplier: presetData.tierMultipliers.premium },
      },
    }));

    setPresetConfirmModal({ open: false, presetName: '', diffs: [] });
    showToast({ type: 'success', title: 'Preset Applied', message: `Applied "${presetName}" preset. You have 10 seconds to undo.` });
  };

  const handleUndoPreset = () => {
    if (undoSnapshot) {
      setForm(JSON.parse(JSON.stringify(undoSnapshot)));
      setUndoSnapshot(null);
      setUndoSecondsLeft(0);
      showToast({ type: 'info', title: 'Preset Reverted', message: 'Restored previous rules.' });
    }
  };

  // Suggest floors calculation
  const handleOpenSuggestFloorsModal = () => {
    if (!form?.projectTypes) return;
    const stdRate = Number(form.hourlyRate) || 50;
    const mediumComp = Number(form.complexityMultipliers?.medium) || 1.25;
    const stdMult = Number(form.tierMultipliers?.standard) || 1.20;
    const step = Number(form.roundingStep) || 50;

    const diffs = form.projectTypes.map((pt) => {
      const avgHours = ((Number(pt.typicalMinHours) || 8) + (Number(pt.typicalMaxHours) || 14)) / 2;
      const suggested = roundUp(avgHours * stdRate * mediumComp * stdMult, step);
      return {
        id: pt.id,
        name: pt.name,
        currentFloor: pt.floor,
        suggestedFloor: suggested,
      };
    });

    setSuggestFloorsModal({ open: true, diffs });
  };

  const handleApplySuggestedFloors = () => {
    if (!suggestFloorsModal.diffs) return;
    setForm((prev) => ({
      ...prev,
      projectTypes: prev.projectTypes.map((pt) => {
        const found = suggestFloorsModal.diffs.find((d) => d.id === pt.id);
        return found ? { ...pt, floor: found.suggestedFloor } : pt;
      }),
    }));
    setSuggestFloorsModal({ open: false, diffs: [] });
    showToast({ type: 'success', title: 'Floors Updated', message: 'Applied suggested floors based on typical hours.' });
  };

  // Profile Change with Starter List
  const handleProfileChange = (newProfile) => {
    if (!form || newProfile === form.profile) return;
    setProfileConfirmModal({ open: true, newProfile });
  };

  const handleConfirmProfileChange = () => {
    const { newProfile } = profileConfirmModal;
    const starters = PROFILE_STARTERS[newProfile] || PROFILE_STARTERS.web_developer;
    setForm((prev) => ({
      ...prev,
      profile: newProfile,
      projectTypes: starters.map((s, idx) => ({ ...s, order: idx })),
    }));
    setProfileConfirmModal({ open: false, newProfile: '' });
    showToast({ type: 'info', title: 'Profile Updated', message: `Loaded starter project types for ${newProfile.replace('_', ' ')}.` });
  };

  // Move up/down project types
  const handleMoveType = (index, direction) => {
    if (!form?.projectTypes) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= form.projectTypes.length) return;

    const updated = [...form.projectTypes];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // re-index order
    updated.forEach((pt, idx) => { pt.order = idx; });
    setForm((prev) => ({ ...prev, projectTypes: updated }));
  };

  // Add Project Type
  const handleAddProjectType = () => {
    if (!newTypeName.trim()) return;
    const id = newTypeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newPt = {
      id: id || `pt-${Date.now()}`,
      name: newTypeName.trim(),
      typicalMinHours: Number(newTypeMinHours) || 8,
      typicalMaxHours: Number(newTypeMaxHours) || 16,
      floor: roundUp(Number(newTypeFloor) || form.minProjectFee, form.roundingStep),
      archived: false,
      order: form.projectTypes.length,
    };

    setForm((prev) => ({
      ...prev,
      projectTypes: [...prev.projectTypes, newPt],
    }));

    setNewTypeName('');
    setNewTypeMinHours('8');
    setNewTypeMaxHours('16');
    setNewTypeFloor('5000');
    setShowAddTypeRow(false);
    showToast({ type: 'success', title: 'Type Added', message: `Added "${newPt.name}".` });
  };

  // Archive / Delete Project Type
  const handleConfirmDeleteType = (archiveOnly = false) => {
    const { typeId } = deleteTypeModal;
    if (!typeId) return;

    if (archiveOnly) {
      setForm((prev) => ({
        ...prev,
        projectTypes: prev.projectTypes.map((pt) => pt.id === typeId ? { ...pt, archived: true } : pt),
      }));
      showToast({ type: 'info', title: 'Archived', message: `Archived project type.` });
    } else {
      setForm((prev) => ({
        ...prev,
        projectTypes: prev.projectTypes.filter((pt) => pt.id !== typeId),
      }));
      showToast({ type: 'info', title: 'Deleted', message: `Removed project type.` });
    }
    setDeleteTypeModal({ open: false, typeId: '', typeName: '' });
  };

  // Save changes flow
  const handleOpenSaveModal = () => {
    if (!form || !initialSettings) return;
    if (!validation.isValid) {
      showToast({ type: 'error', title: 'Validation Error', message: Object.values(validation.errors)[0] || 'Please fix errors before saving.' });
      return;
    }

    const diffs = [];
    if (form.hourlyRate !== initialSettings.hourlyRate) {
      diffs.push({ label: 'Standard hourly rate', oldVal: `${formatCurrencyAmount(initialSettings.hourlyRate, form.currency)}/hr`, newVal: `${formatCurrencyAmount(form.hourlyRate, form.currency)}/hr` });
    }
    if (form.minHourlyRate !== initialSettings.minHourlyRate) {
      diffs.push({ label: 'Lowest hourly rate', oldVal: `${formatCurrencyAmount(initialSettings.minHourlyRate, form.currency)}/hr`, newVal: `${formatCurrencyAmount(form.minHourlyRate, form.currency)}/hr` });
    }
    if (form.minProjectFee !== initialSettings.minProjectFee) {
      diffs.push({ label: 'Minimum project fee', oldVal: formatCurrencyAmount(initialSettings.minProjectFee, form.currency), newVal: formatCurrencyAmount(form.minProjectFee, form.currency) });
    }
    if (form.defaultContingencyPercent !== initialSettings.defaultContingencyPercent) {
      diffs.push({ label: 'Contingency buffer', oldVal: `${initialSettings.defaultContingencyPercent}%`, newVal: `${form.defaultContingencyPercent}%` });
    }
    if (form.preferredProfitMargin !== initialSettings.preferredProfitMargin) {
      diffs.push({ label: 'Target margin', oldVal: `${initialSettings.preferredProfitMargin}%`, newVal: `${form.preferredProfitMargin}%` });
    }
    if (form.rushMultiplier !== initialSettings.rushMultiplier) {
      diffs.push({ label: 'Rush multiplier', oldVal: `x${initialSettings.rushMultiplier}`, newVal: `x${form.rushMultiplier}` });
    }

    setSaveSummaryModal({ open: true, diffs });
  };

  const handleConfirmSave = async () => {
    if (!form) return;
    setIsSaving(true);
    setSaveSummaryModal({ open: false, diffs: [] });

    try {
      // Map project types back to categoryMinimums for backward compatibility
      const categoryMinimums = {};
      form.projectTypes.forEach((pt) => {
        categoryMinimums[pt.id] = pt.floor;
      });

      const payload = {
        ...form,
        categoryMinimums,
      };

      const res = await api.updatePricingSettings(payload);
      if (res?.settings) {
        const updated = res.settings;
        setInitialSettings(JSON.parse(JSON.stringify(form)));
        setLastSavedTime(new Date());
        showToast({
          type: 'success',
          title: 'Pricing Rules Saved',
          message: `Saved rules version ${updated.version || form.version + 1}. Protection is active.`,
        });
      }
    } catch (err) {
      console.error('Save failed:', err);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Server rejected changes. Check field constraints.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="h-10 w-64 bg-[var(--line,#E8E0CF)]/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="space-y-5">
            <div className="h-48 bg-white border border-[var(--line,#E8E0CF)] rounded-2xl animate-pulse" />
            <div className="h-80 bg-white border border-[var(--line,#E8E0CF)] rounded-2xl animate-pulse" />
          </div>
          <div className="hidden min-[1100px]:block">
            <div className="h-96 bg-white border border-[var(--line,#E8E0CF)] rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const rulesCurrency = form.currency || 'USD';

  const renderSimulatorBody = () => (
    <div className="space-y-4">
      {/* Quick Chips (32px tall in one row) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => {
            setSimHours(8);
            const lp = form.projectTypes.find((pt) => pt.id.includes('landing')) || form.projectTypes[0];
            if (lp) setSimProjectType(lp.id);
            setSimComplexity('medium');
            setSimRush(false);
          }}
          className="h-8 text-xs font-semibold px-3 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] border border-[var(--line,#E8E0CF)] hover:bg-[var(--cobalt-tint,#E8F0FB)] hover:text-[var(--cobalt,#0047AB)] whitespace-nowrap transition-colors cursor-pointer shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
        >
          Example: below your floor
        </button>
        <button
          type="button"
          onClick={() => {
            setSimHours(25);
            const lp = form.projectTypes.find((pt) => pt.id.includes('landing')) || form.projectTypes[0];
            if (lp) setSimProjectType(lp.id);
            setSimComplexity('medium');
            setSimRush(false);
          }}
          className="h-8 text-xs font-semibold px-3 rounded-full bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] border border-[var(--line,#E8E0CF)] hover:bg-[var(--cobalt-tint,#E8F0FB)] hover:text-[var(--cobalt,#0047AB)] whitespace-nowrap transition-colors cursor-pointer shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
        >
          Example: above your floor
        </button>
      </div>

      {/* Simulator Inputs (40px tall fields) */}
      <div className="space-y-3.5">
        {/* Estimated Hours */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="simHours" className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)]">
              Estimated hours
            </label>
            {activeSimProjectType && (
              <span className="text-[11px] text-[var(--muted,#5B6676)]">
                Typical: {activeSimProjectType.typicalMinHours}–{activeSimProjectType.typicalMaxHours} hrs
              </span>
            )}
          </div>
          <input
            id="simHours"
            type="number"
            min="1"
            value={simHours}
            onChange={(e) => setSimHours(Number(e.target.value) || 1)}
            className="w-full h-10 px-3 rounded-xl border border-[var(--line,#E8E0CF)] text-[14px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] bg-white"
          />
          {isSimHoursOutsideTypical && (
            <span className="text-[11px] text-[var(--warning,#B54708)] mt-1 block">
              Note: {simHours} hrs is outside typical range ({activeSimProjectType.typicalMinHours}–{activeSimProjectType.typicalMaxHours} hrs).
            </span>
          )}
        </div>

        {/* Project Type */}
        <div>
          <label htmlFor="simProjectType" className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">
            Project type
          </label>
          <select
            id="simProjectType"
            value={simProjectType}
            onChange={(e) => setSimProjectType(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[var(--line,#E8E0CF)] text-[14px] font-semibold text-[var(--ink,#0E1A2B)] bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)]"
          >
            {form.projectTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name} (Floor: {formatCurrencyAmount(pt.floor, rulesCurrency)})
              </option>
            ))}
          </select>
        </div>

        {/* Complexity + Rush */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label htmlFor="simComplexity" className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">
              Complexity
            </label>
            <select
              id="simComplexity"
              value={simComplexity}
              onChange={(e) => setSimComplexity(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)]"
            >
              <option value="simple">Simple (x{form.complexityMultipliers.simple})</option>
              <option value="medium">Medium (x{form.complexityMultipliers.medium})</option>
              <option value="complex">Complex (x{form.complexityMultipliers.complex})</option>
            </select>
          </div>

          <div className="pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simRush}
                onChange={(e) => setSimRush(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--cobalt,#0047AB)] border-[var(--line,#E8E0CF)] focus:ring-[var(--cobalt,#0047AB)] cursor-pointer"
              />
              <span className="text-xs font-semibold text-[var(--ink,#0E1A2B)]">
                Rush (x{form.rushMultiplier})
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Step-by-Step Breakdown (14px with 6px spacing) */}
      {simResult && (
        <div aria-live="polite" className="pt-3 border-t border-[var(--line,#E8E0CF)] space-y-1.5 text-[14px]">
          <div className="flex justify-between text-[var(--muted,#5B6676)]">
            <span>Estimated hours</span>
            <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">{simResult.estimatedHours} hrs</span>
          </div>

          <div className="flex justify-between text-[var(--muted,#5B6676)]">
            <span>Contingency (+{simResult.contingencyPercent}%)</span>
            <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">
              +{simResult.contingencyHours.toFixed(1)} hrs ({simResult.hours.toFixed(1)} hrs total)
            </span>
          </div>

          <div className="flex justify-between text-[var(--muted,#5B6676)]">
            <span>Labor ({simResult.hours.toFixed(1)} hrs x {formatCurrencyAmount(simResult.standardHourlyRate, rulesCurrency)})</span>
            <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">
              {formatCurrencyAmount(simResult.labor, rulesCurrency)}
            </span>
          </div>

          <div className="flex justify-between text-[var(--muted,#5B6676)]">
            <span>Complexity adjustment</span>
            <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">x{simResult.complexityMultiplier}</span>
          </div>

          {simResult.isRush && (
            <div className="flex justify-between text-[var(--muted,#5B6676)]">
              <span>Rush delivery</span>
              <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">x{simResult.activeRushMultiplier}</span>
            </div>
          )}

          <div className="flex justify-between py-1 border-t border-dashed border-[var(--line,#E8E0CF)] font-semibold text-[var(--ink,#0E1A2B)]">
            <span>Adjusted labor cost</span>
            <span className="tabular-nums">{formatCurrencyAmount(simResult.adjusted, rulesCurrency)}</span>
          </div>

          <div className="flex justify-between text-[var(--muted,#5B6676)]">
            <span>Your floor for {activeSimProjectType?.name || 'Category'}</span>
            <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">
              {formatCurrencyAmount(simResult.categoryFloor, rulesCurrency)}
            </span>
          </div>

          <div className="flex justify-between text-[var(--muted,#5B6676)]">
            <span>Minimum project fee</span>
            <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">
              {formatCurrencyAmount(simResult.minProjectFee, rulesCurrency)}
            </span>
          </div>

          {/* Highlight line: Floor applied or Above floor */}
          <div
            className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between my-2 ${
              simResult.isFloorApplied
                ? 'bg-[var(--sun-tint,#FFF4CC)] text-[var(--ink,#0E1A2B)] border border-[var(--sun,#FFC72C)]'
                : 'bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] border border-[var(--success,#067647)]/30'
            }`}
          >
            <span>
              {simResult.isFloorApplied
                ? `Floor applied: +${formatCurrencyAmount(simResult.floorUplift, rulesCurrency)}`
                : 'Above your floor'}
            </span>
            <span className="text-[11px] font-medium">
              {simResult.isFloorApplied ? 'Enforced by rules' : 'Safe margin'}
            </span>
          </div>

          <div className="flex justify-between text-[var(--muted,#5B6676)]">
            <span>Effective rate ({formatCurrencyAmount(simResult.effectiveHourlyRate, rulesCurrency)}/hr)</span>
            <span className="font-semibold tabular-nums text-[var(--ink,#0E1A2B)]">
              {simResult.effectiveHourlyRate >= simResult.lowestHourlyRate ? (
                <span className="text-[var(--success,#067647)]">Above lowest rate ({simResult.lowestHourlyRate}/hr)</span>
              ) : (
                <span className="text-[var(--warning,#B54708)]">Guarded at lowest rate</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* THREE-COLUMN TIER SUMMARY (Tier prices 22px) */}
      {simResult && (
        <div className="pt-3 border-t border-[var(--line,#E8E0CF)]">
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Essential */}
            <div className="p-2.5 bg-[var(--page,#FAF5EA)] rounded-xl border border-[var(--line,#E8E0CF)]">
              <span className="text-[11px] font-semibold text-[var(--muted,#5B6676)] block">Essential</span>
              <span className="text-[22px] font-extrabold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] block my-0.5 leading-tight">
                {formatCurrencyAmount(simResult.tiers.essential, rulesCurrency)}
              </span>
              <span className="text-[10px] text-[var(--muted,#5B6676)] font-semibold">1.00x floor</span>
            </div>

            {/* Standard */}
            <div className="p-2.5 bg-[var(--cobalt-tint,#E8F0FB)] rounded-xl border-2 border-[var(--cobalt,#0047AB)] relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--cobalt,#0047AB)] text-white">
                Recommended
              </span>
              <span className="text-[11px] font-semibold text-[var(--cobalt,#0047AB)] block">Standard</span>
              <span className="text-[22px] font-extrabold font-['Bricolage_Grotesque',sans-serif] text-[var(--cobalt,#0047AB)] block my-0.5 leading-tight">
                {formatCurrencyAmount(simResult.tiers.standard, rulesCurrency)}
              </span>
              <span className="text-[10px] text-[var(--cobalt,#0047AB)] font-semibold">{form.tierMultipliers.standard}x</span>
            </div>

            {/* Premium */}
            <div className="p-2.5 bg-white rounded-xl border border-[var(--line,#E8E0CF)]">
              <span className="text-[11px] font-semibold text-[var(--muted,#5B6676)] block">Premium</span>
              <span className="text-[22px] font-extrabold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] block my-0.5 leading-tight">
                {formatCurrencyAmount(simResult.tiers.premium, rulesCurrency)}
              </span>
              <span className="text-[10px] text-[var(--muted,#5B6676)] font-semibold">{form.tierMultipliers.premium}x</span>
            </div>
          </div>

          {/* VISUAL HORIZONTAL BAR */}
          <div className="mt-3 pt-3 border-t border-[var(--line,#E8E0CF)] space-y-1">
            <div className="flex justify-between text-[10px] font-semibold text-[var(--muted,#5B6676)]">
              <span>Floor ({formatCurrencyAmount(simResult.floor, rulesCurrency)})</span>
              <span>Premium ({formatCurrencyAmount(simResult.tiers.premium, rulesCurrency)})</span>
            </div>
            <div className="h-2.5 w-full bg-[var(--page,#FAF5EA)] rounded-full overflow-hidden relative border border-[var(--line,#E8E0CF)]">
              <div
                className="absolute top-0 bottom-0 border-r-2 border-dashed border-[var(--sun,#FFC72C)] z-10"
                style={{ left: `${Math.min(95, Math.max(5, (simResult.floor / simResult.tiers.premium) * 100))}%` }}
              />
              <div
                className="h-full bg-[var(--cobalt,#0047AB)] rounded-full"
                style={{ width: `${Math.min(100, Math.max(10, (simResult.tiers.standard / simResult.tiers.premium) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto pb-20 font-['Instrument_Sans',sans-serif] text-[var(--ink,#0E1A2B)]">
      {/* 10-Second Undo Banner */}
      {undoSecondsLeft > 0 && undoSnapshot && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-[var(--ink,#0E1A2B)] text-white px-5 py-3 rounded-xl shadow-xl animate-fade-in text-sm">
          <Info className="w-4 h-4 text-[var(--sun,#FFC72C)] shrink-0" />
          <span>Applied <strong>{undoPresetName}</strong> preset.</span>
          <button
            type="button"
            onClick={handleUndoPreset}
            className="flex items-center gap-1.5 ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo ({undoSecondsLeft}s)
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[var(--line,#E8E0CF)] mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              ref={h1Ref}
              tabIndex="-1"
              className="text-[30px] font-extrabold leading-[1.15] font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] tracking-tight outline-none focus:outline-none"
            >
              Pricing rules
            </h1>
            {/* Status Chip */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] border border-[var(--success,#067647)]/20 cursor-help"
              title="Proposals and invoices are checked on our server after the AI responds, so your floor can't be bypassed."
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Floor protection is on</span>
            </div>
          </div>
          <p className="text-[15px] leading-[1.5] text-[var(--muted,#5B6676)] max-w-[56ch] mt-1">
            Set the lowest price you will accept. Floorly never lets a proposal go below it.
          </p>
        </div>

        {/* PRESETS BUTTON GROUP */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
          <span className="text-[13px] font-medium text-[var(--muted,#5B6676)] whitespace-nowrap">
            Start from a preset:
          </span>
          <div className="inline-flex items-center p-1 bg-white border border-[var(--line,#E8E0CF)] rounded-xl shadow-xs overflow-x-auto max-w-full h-9">
            {['Entry level', 'Established', 'Premium studio'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleOpenPresetModal(preset)}
                className="h-7 px-3 rounded-lg text-[13px] font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] hover:text-[var(--cobalt,#0047AB)] whitespace-nowrap transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN / SINGLE-COLUMN GRID */}
      <div className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* FORM COLUMN: CARDS 1-4 */}
        <div className="min-w-0 space-y-5">
          {/* COLLAPSIBLE SIMULATOR CARD AT THE TOP (< 1100px) */}
          <div className="min-[1100px]:hidden bg-white border border-[var(--line,#E8E0CF)] rounded-2xl shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setMobileSimOpen(!mobileSimOpen)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-[var(--page,#FAF5EA)] text-left transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--cobalt,#0047AB)]" />
                <span className="text-[16px] font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)]">
                  Try your rules
                </span>
                {isDirty && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--sun-tint,#FFF4CC)] text-[var(--warning,#B54708)]">
                    Unsaved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cobalt,#0047AB)]">
                <span>{mobileSimOpen ? 'Hide preview' : 'Preview price'}</span>
                {mobileSimOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {mobileSimOpen && (
              <div className="p-4 sm:p-5 border-t border-[var(--line,#E8E0CF)]">
                {renderSimulatorBody()}
              </div>
            )}
          </div>
          {/* CARD 1: HOURLY RATES & PROJECT MINIMUM */}
          <section className="bg-white border border-[var(--line,#E8E0CF)] rounded-2xl p-4 sm:p-6 shadow-xs">
            <h2 className="text-[18px] font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-1">
              Hourly rates and project minimum
            </h2>
            <p className="text-[14px] text-[var(--muted,#5B6676)] mb-5">
              Set your normal rate and the lowest project you will take.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 1: Standard hourly rate */}
              <div className="flex flex-col">
                <label htmlFor="hourlyRate" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                  Standard hourly rate
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--muted,#5B6676)] select-none">
                    {rulesCurrency === 'INR' ? '₹' : rulesCurrency === 'EUR' ? '€' : rulesCurrency === 'GBP' ? '£' : '$'}
                  </span>
                  <input
                    id="hourlyRate"
                    type="number"
                    inputMode="decimal"
                    value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) || 0 })}
                    aria-describedby="hourlyRate-helper"
                    aria-invalid={!!validation.errors.hourlyRate}
                    className={`w-full h-10 pl-8 pr-12 rounded-xl border text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] bg-white focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] outline-none transition-all ${
                      validation.errors.hourlyRate ? 'border-[var(--error,#B42318)] ring-1 ring-[var(--error,#B42318)]' : 'border-[var(--line,#E8E0CF)]'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">
                    /hr
                  </span>
                </div>
                <div className="min-h-[44px] mt-1.5 flex flex-col justify-start">
                  {validation.errors.hourlyRate ? (
                    <span id="hourlyRate-helper" className="text-[13px] text-[var(--error,#B42318)]">{validation.errors.hourlyRate}</span>
                  ) : (
                    <>
                      <span id="hourlyRate-helper" className="text-[13px] text-[var(--muted,#5B6676)]">Your normal rate</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, hourlyRate: SUGGESTED_VALUES[rulesCurrency]?.hourlyRate || 300 })}
                        className="text-[11px] text-[var(--cobalt,#0047AB)] hover:underline self-start cursor-pointer mt-0.5"
                      >
                        Reset to suggested ({formatCurrencyAmount(SUGGESTED_VALUES[rulesCurrency]?.hourlyRate || 300, rulesCurrency)})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Field 2: Lowest hourly rate */}
              <div className="flex flex-col">
                <label htmlFor="minHourlyRate" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                  Lowest hourly rate
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--muted,#5B6676)] select-none">
                    {rulesCurrency === 'INR' ? '₹' : rulesCurrency === 'EUR' ? '€' : rulesCurrency === 'GBP' ? '£' : '$'}
                  </span>
                  <input
                    id="minHourlyRate"
                    type="number"
                    inputMode="decimal"
                    value={form.minHourlyRate}
                    onChange={(e) => setForm({ ...form, minHourlyRate: Number(e.target.value) || 0 })}
                    aria-describedby="minHourlyRate-helper"
                    aria-invalid={!!validation.errors.minHourlyRate}
                    className={`w-full h-10 pl-8 pr-12 rounded-xl border text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] bg-white focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] outline-none transition-all ${
                      validation.errors.minHourlyRate ? 'border-[var(--error,#B42318)] ring-1 ring-[var(--error,#B42318)]' : 'border-[var(--line,#E8E0CF)]'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">
                    /hr
                  </span>
                </div>
                <div className="min-h-[44px] mt-1.5 flex flex-col justify-start">
                  {validation.errors.minHourlyRate ? (
                    <span id="minHourlyRate-helper" className="text-[13px] text-[var(--error,#B42318)]">{validation.errors.minHourlyRate}</span>
                  ) : (
                    <>
                      <span id="minHourlyRate-helper" className="text-[13px] text-[var(--muted,#5B6676)]">Never quote effectively below this</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, minHourlyRate: SUGGESTED_VALUES[rulesCurrency]?.minHourlyRate || 250 })}
                        className="text-[11px] text-[var(--cobalt,#0047AB)] hover:underline self-start cursor-pointer mt-0.5"
                      >
                        Reset to suggested ({formatCurrencyAmount(SUGGESTED_VALUES[rulesCurrency]?.minHourlyRate || 250, rulesCurrency)})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Field 3: Minimum project fee */}
              <div className="flex flex-col">
                <label htmlFor="minProjectFee" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5">
                  Minimum project fee
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--muted,#5B6676)] select-none">
                    {rulesCurrency === 'INR' ? '₹' : rulesCurrency === 'EUR' ? '€' : rulesCurrency === 'GBP' ? '£' : '$'}
                  </span>
                  <input
                    id="minProjectFee"
                    type="number"
                    inputMode="decimal"
                    value={form.minProjectFee}
                    onChange={(e) => setForm({ ...form, minProjectFee: Number(e.target.value) || 0 })}
                    aria-describedby="minProjectFee-helper"
                    aria-invalid={!!validation.errors.minProjectFee}
                    className={`w-full h-10 pl-8 pr-4 rounded-xl border text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] bg-white focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] outline-none transition-all ${
                      validation.errors.minProjectFee ? 'border-[var(--error,#B42318)] ring-1 ring-[var(--error,#B42318)]' : 'border-[var(--line,#E8E0CF)]'
                    }`}
                  />
                </div>
                <div className="min-h-[44px] mt-1.5 flex flex-col justify-start">
                  {validation.errors.minProjectFee ? (
                    <span id="minProjectFee-helper" className="text-[13px] text-[var(--error,#B42318)]">{validation.errors.minProjectFee}</span>
                  ) : (
                    <>
                      <span id="minProjectFee-helper" className="text-[13px] text-[var(--muted,#5B6676)]">No project goes below this total</span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, minProjectFee: SUGGESTED_VALUES[rulesCurrency]?.minProjectFee || 3000 })}
                        className="text-[11px] text-[var(--cobalt,#0047AB)] hover:underline self-start cursor-pointer mt-0.5"
                      >
                        Reset to suggested ({formatCurrencyAmount(SUGGESTED_VALUES[rulesCurrency]?.minProjectFee || 3000, rulesCurrency)})
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: PROJECT TYPES AND FLOORS */}
          <section className="bg-white border border-[var(--line,#E8E0CF)] rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-[18px] font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-1">
                  Project types and floors
                </h2>
                <p className="text-[14px] text-[var(--muted,#5B6676)]">
                  The minimum price by deliverable. The Analyzer and Proposal Builder use this same single source.
                </p>
              </div>

              {/* Profile Select */}
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--muted,#5B6676)]">Profile:</span>
                <select
                  value={form.profile || 'web_developer'}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  className="h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 cursor-pointer"
                >
                  <option value="web_developer">Web and software</option>
                  <option value="design">Design and branding</option>
                  <option value="content">Writing and content</option>
                  <option value="marketing">Marketing</option>
                  <option value="consulting">Consulting</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Sanity warnings banner (if any) */}
            {validation.warnings.length > 0 && (
              <div className="mb-5 p-3.5 bg-[var(--warning-tint,#FEF0C7)] border border-[var(--warning,#B54708)]/30 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--warning,#B54708)]">
                  <AlertTriangle className="w-4 h-4" />
                  Sanity check notice:
                </div>
                {validation.warnings.map((w, idx) => (
                  <p key={idx} className="text-xs text-[var(--ink,#0E1A2B)] pl-6">
                    {w.message}
                  </p>
                ))}
              </div>
            )}

            {/* PROJECT TYPES TABLE */}
            <div className="overflow-x-auto border border-[var(--line,#E8E0CF)] rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--page,#FAF5EA)] border-b border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--muted,#5B6676)] uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">Project type</th>
                    <th className="py-3 px-4 w-44">Typical hours</th>
                    <th className="py-3 px-4 w-40">Floor ({rulesCurrency})</th>
                    <th className="py-3 px-3 w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line,#E8E0CF)] bg-white">
                  {form.projectTypes.map((pt, idx) => {
                    const impliesMin = pt.typicalMaxHours > 0 ? Math.round(pt.floor / pt.typicalMaxHours) : 0;
                    const impliesMax = pt.typicalMinHours > 0 ? Math.round(pt.floor / pt.typicalMinHours) : 0;
                    const isFloorInvalid = pt.floor < form.minProjectFee;

                    return (
                      <tr key={pt.id} className={`hover:bg-[var(--page,#FAF5EA)]/40 transition-colors ${pt.archived ? 'opacity-50' : ''}`}>
                        {/* Reorder Buttons */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveType(idx, 'up')}
                              disabled={idx === 0}
                              aria-label={`Move ${pt.name} up`}
                              className="p-1 rounded text-[var(--muted,#5B6676)] hover:text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveType(idx, 'down')}
                              disabled={idx === form.projectTypes.length - 1}
                              aria-label={`Move ${pt.name} down`}
                              className="p-1 rounded text-[var(--muted,#5B6676)] hover:text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Project Type Name */}
                        <td className="py-3 px-4 font-semibold text-[var(--ink,#0E1A2B)]">
                          <input
                            type="text"
                            value={pt.name}
                            onChange={(e) => {
                              const updated = [...form.projectTypes];
                              updated[idx].name = e.target.value;
                              setForm({ ...form, projectTypes: updated });
                            }}
                            className="w-full bg-transparent border-b border-transparent hover:border-[var(--line,#E8E0CF)] focus:border-[var(--cobalt,#0047AB)] text-[14px] font-semibold text-[var(--ink,#0E1A2B)] outline-none py-1"
                          />
                          <p className="text-[11px] text-[var(--muted,#5B6676)] font-normal mt-0.5">
                            Implies {impliesMin}–{impliesMax} {rulesCurrency}/hr
                          </p>
                        </td>

                        {/* Typical Hours (min, max inputs) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={pt.typicalMinHours}
                              onChange={(e) => {
                                const updated = [...form.projectTypes];
                                updated[idx].typicalMinHours = Number(e.target.value) || 1;
                                setForm({ ...form, projectTypes: updated });
                              }}
                              className="w-16 h-8 px-2 text-center text-xs font-semibold tabular-nums rounded-lg border border-[var(--line,#E8E0CF)] outline-none focus:border-[var(--cobalt,#0047AB)]"
                            />
                            <span className="text-xs text-[var(--muted,#5B6676)]">to</span>
                            <input
                              type="number"
                              min="1"
                              value={pt.typicalMaxHours}
                              onChange={(e) => {
                                const updated = [...form.projectTypes];
                                updated[idx].typicalMaxHours = Number(e.target.value) || 1;
                                setForm({ ...form, projectTypes: updated });
                              }}
                              className="w-16 h-8 px-2 text-center text-xs font-semibold tabular-nums rounded-lg border border-[var(--line,#E8E0CF)] outline-none focus:border-[var(--cobalt,#0047AB)]"
                            />
                            <span className="text-xs text-[var(--muted,#5B6676)]">hrs</span>
                          </div>
                        </td>

                        {/* Floor Input */}
                        <td className="py-3 px-4">
                          <div className="relative">
                            <input
                              type="number"
                              value={pt.floor}
                              onChange={(e) => {
                                const updated = [...form.projectTypes];
                                updated[idx].floor = Number(e.target.value) || 0;
                                setForm({ ...form, projectTypes: updated });
                              }}
                              className={`w-full h-9 pl-3 pr-2 text-xs font-semibold tabular-nums rounded-lg border outline-none ${
                                isFloorInvalid ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)]/20' : 'border-[var(--line,#E8E0CF)] focus:border-[var(--cobalt,#0047AB)]'
                              }`}
                            />
                          </div>
                          {isFloorInvalid && (
                            <span className="text-[10px] text-[var(--error,#B42318)] block mt-0.5">
                              Below min fee ({form.minProjectFee})
                            </span>
                          )}
                        </td>

                        {/* Delete / Archive */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteTypeModal({ open: true, typeId: pt.id, typeName: pt.name })}
                            aria-label={`Delete or archive ${pt.name}`}
                            className="p-1.5 text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)] rounded-lg hover:bg-[var(--error-tint,#FEE4E2)] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inline Add Type Form */}
            {showAddTypeRow ? (
              <div className="mt-4 p-4 border border-[var(--cobalt,#0047AB)]/30 bg-[var(--cobalt-tint,#E8F0FB)]/40 rounded-xl space-y-3">
                <div className="font-semibold text-xs text-[var(--cobalt,#0047AB)]">Add new project type</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Project type name (e.g. Mobile app)"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="h-9 px-3 text-xs rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)]"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min hrs"
                      value={newTypeMinHours}
                      onChange={(e) => setNewTypeMinHours(e.target.value)}
                      className="w-full h-9 px-2 text-xs rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-center tabular-nums"
                    />
                    <span className="text-xs text-[var(--muted,#5B6676)]">–</span>
                    <input
                      type="number"
                      placeholder="Max hrs"
                      value={newTypeMaxHours}
                      onChange={(e) => setNewTypeMaxHours(e.target.value)}
                      className="w-full h-9 px-2 text-xs rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-center tabular-nums"
                    />
                  </div>
                  <input
                    type="number"
                    placeholder="Floor amount"
                    value={newTypeFloor}
                    onChange={(e) => setNewTypeFloor(e.target.value)}
                    className="h-9 px-3 text-xs rounded-lg border border-[var(--line,#E8E0CF)] bg-white tabular-nums"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddProjectType}
                      className="flex-1 h-9 bg-[var(--cobalt,#0047AB)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--cobalt-dark,#003A8C)] transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTypeRow(false)}
                      className="h-9 px-3 border border-[var(--line,#E8E0CF)] text-xs text-[var(--muted,#5B6676)] rounded-lg hover:bg-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Table Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[var(--line,#E8E0CF)]">
              <button
                type="button"
                onClick={() => setShowAddTypeRow(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add project type
              </button>

              <button
                type="button"
                onClick={handleOpenSuggestFloorsModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--sun-tint,#FFF4CC)] text-[var(--ink,#0E1A2B)] border border-[var(--sun,#FFC72C)]/50 hover:bg-[var(--sun,#FFC72C)]/20 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--warning,#B54708)]" />
                Suggest floors
              </button>
            </div>
          </section>

          {/* CARD 3: COMPLEXITY AND ADJUSTMENTS */}
          <section className="bg-white border border-[var(--line,#E8E0CF)] rounded-2xl p-4 sm:p-6 shadow-xs">
            <h2 className="text-[18px] font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-1">
              Complexity and adjustments
            </h2>
            <p className="text-[14px] text-[var(--muted,#5B6676)] mb-5">
              Configure risk buffers and delivery multipliers. Each adjusts your raw labor estimate along the pricing pipeline.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Simple Multiplier */}
              <div>
                <label className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5 block">
                  Simple complexity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={form.complexityMultipliers.simple}
                    onChange={(e) => setForm({
                      ...form,
                      complexityMultipliers: { ...form.complexityMultipliers, simple: Number(e.target.value) || 1.0 },
                    })}
                    className="w-full h-10 pl-4 pr-8 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">x</span>
                </div>
                <span className="text-[13px] text-[var(--muted,#5B6676)] mt-1 block">Baseline straightforward work</span>
              </div>

              {/* Medium Multiplier */}
              <div>
                <label className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5 block">
                  Medium complexity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={form.complexityMultipliers.medium}
                    onChange={(e) => setForm({
                      ...form,
                      complexityMultipliers: { ...form.complexityMultipliers, medium: Number(e.target.value) || 1.25 },
                    })}
                    className="w-full h-10 pl-4 pr-8 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">x</span>
                </div>
                <span className="text-[13px] text-[var(--muted,#5B6676)] mt-1 block">Standard multifaceted project</span>
              </div>

              {/* Complex Multiplier */}
              <div>
                <label className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5 block">
                  Complex complexity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={form.complexityMultipliers.complex}
                    onChange={(e) => setForm({
                      ...form,
                      complexityMultipliers: { ...form.complexityMultipliers, complex: Number(e.target.value) || 1.5 },
                    })}
                    className="w-full h-10 pl-4 pr-8 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">x</span>
                </div>
                <span className="text-[13px] text-[var(--muted,#5B6676)] mt-1 block">Intricate custom architecture</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--line,#E8E0CF)]">
              {/* Rush Multiplier */}
              <div>
                <label className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5 block">
                  Rush multiplier
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={form.rushMultiplier}
                    onChange={(e) => setForm({ ...form, rushMultiplier: Number(e.target.value) || 1.3 })}
                    className="w-full h-10 pl-4 pr-8 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">x</span>
                </div>
                <span className="text-[13px] text-[var(--muted,#5B6676)] mt-1 block">Applies directly to adjusted labor when rush is checked</span>
              </div>

              {/* Contingency Buffer % */}
              <div>
                <label className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5 block">
                  Contingency buffer %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.defaultContingencyPercent}
                    onChange={(e) => setForm({ ...form, defaultContingencyPercent: Number(e.target.value) || 10 })}
                    className="w-full h-10 pl-4 pr-8 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">%</span>
                </div>
                <span className="text-[13px] text-[var(--muted,#5B6676)] mt-1 block">Extra hours added for surprises before calculating labor</span>
              </div>

              {/* Target Margin % */}
              <div>
                <label className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] mb-1.5 block">
                  Target margin %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.preferredProfitMargin}
                    onChange={(e) => setForm({ ...form, preferredProfitMargin: Number(e.target.value) || 25 })}
                    className="w-full h-10 pl-4 pr-8 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] font-semibold tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted,#5B6676)]">%</span>
                </div>
                <span className="text-[13px] text-[var(--muted,#5B6676)] mt-1 block">Minimum margin over your time cost for the Standard package</span>
              </div>
            </div>
          </section>

          {/* CARD 4: PACKAGES */}
          <section className="bg-white border border-[var(--line,#E8E0CF)] rounded-2xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-[18px] font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-1">
                  Packages
                </h2>
                <p className="text-[14px] text-[var(--muted,#5B6676)]">
                  Three distinct commercial packages offered to clients in proposals.
                </p>
              </div>

              {/* Rounding Step Select */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--muted,#5B6676)]">Round prices up to:</span>
                <select
                  value={form.roundingStep || 50}
                  onChange={(e) => setForm({ ...form, roundingStep: Number(e.target.value) || 50 })}
                  className="h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] outline-none focus:border-[var(--cobalt,#0047AB)]"
                >
                  <option value={5}>Nearest 5 {rulesCurrency}</option>
                  <option value={10}>Nearest 10 {rulesCurrency}</option>
                  <option value={50}>Nearest 50 {rulesCurrency}</option>
                  <option value={100}>Nearest 100 {rulesCurrency}</option>
                </select>
              </div>
            </div>

            {/* THREE PACKAGE ROWS */}
            <div className="space-y-4">
              {/* Row 1: Essential */}
              <div className="p-4 border border-[var(--line,#E8E0CF)] rounded-xl bg-[var(--page,#FAF5EA)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                      {form.packageTiers?.essential?.name || 'Essential'}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted,#5B6676)] px-2 py-0.5 bg-white border border-[var(--line,#E8E0CF)] rounded-md cursor-help"
                      title="Essential is your floor price and cannot be discounted or modified below 1.00x."
                    >
                      <Lock className="w-3 h-3 text-[var(--muted,#5B6676)]" />
                      Floor locked (1.00x)
                    </span>
                  </div>
                  {simResult && (
                    <span className="text-sm font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)]">
                      {formatCurrencyAmount(simResult.tiers.essential, rulesCurrency)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Display name</label>
                    <input
                      type="text"
                      value={form.packageTiers?.essential?.name || 'Essential'}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          essential: { ...form.packageTiers.essential, name: e.target.value },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Revisions included</label>
                    <input
                      type="number"
                      value={form.packageTiers?.essential?.revisions ?? 1}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          essential: { ...form.packageTiers.essential, revisions: Number(e.target.value) || 0 },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Support days</label>
                    <input
                      type="number"
                      value={form.packageTiers?.essential?.supportDays ?? 14}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          essential: { ...form.packageTiers.essential, supportDays: Number(e.target.value) || 0 },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="One-line description for proposal tier card..."
                  value={form.packageTiers?.essential?.description || ''}
                  onChange={(e) => setForm({
                    ...form,
                    packageTiers: {
                      ...form.packageTiers,
                      essential: { ...form.packageTiers.essential, description: e.target.value },
                    },
                  })}
                  className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                />
              </div>

              {/* Row 2: Standard (Recommended) */}
              <div className="p-4 border-2 border-[var(--cobalt,#0047AB)]/30 rounded-xl bg-[var(--cobalt-tint,#E8F0FB)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                      {form.packageTiers?.standard?.name || 'Standard'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--cobalt,#0047AB)] text-white">
                      Recommended
                    </span>
                  </div>
                  {simResult && (
                    <span className="text-sm font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--cobalt,#0047AB)]">
                      {formatCurrencyAmount(simResult.tiers.standard, rulesCurrency)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Display name</label>
                    <input
                      type="text"
                      value={form.packageTiers?.standard?.name || 'Standard'}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          standard: { ...form.packageTiers.standard, name: e.target.value },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Multiplier</label>
                    <input
                      type="number"
                      step="0.05"
                      value={form.tierMultipliers?.standard || 1.20}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 1.20;
                        setForm({
                          ...form,
                          tierMultipliers: { ...form.tierMultipliers, standard: val },
                          packageTiers: { ...form.packageTiers, standard: { ...form.packageTiers.standard, multiplier: val } },
                        });
                      }}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Revisions included</label>
                    <input
                      type="number"
                      value={form.packageTiers?.standard?.revisions ?? 3}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          standard: { ...form.packageTiers.standard, revisions: Number(e.target.value) || 0 },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Support days</label>
                    <input
                      type="number"
                      value={form.packageTiers?.standard?.supportDays ?? 30}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          standard: { ...form.packageTiers.standard, supportDays: Number(e.target.value) || 0 },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="One-line description for proposal tier card..."
                  value={form.packageTiers?.standard?.description || ''}
                  onChange={(e) => setForm({
                    ...form,
                    packageTiers: {
                      ...form.packageTiers,
                      standard: { ...form.packageTiers.standard, description: e.target.value },
                    },
                  })}
                  className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                />
              </div>

              {/* Row 3: Premium */}
              <div className="p-4 border border-[var(--line,#E8E0CF)] rounded-xl bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                      {form.packageTiers?.premium?.name || 'Premium'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--sun-tint,#FFF4CC)] text-[var(--ink,#0E1A2B)]">
                      Tier 3
                    </span>
                  </div>
                  {simResult && (
                    <span className="text-sm font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)]">
                      {formatCurrencyAmount(simResult.tiers.premium, rulesCurrency)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Display name</label>
                    <input
                      type="text"
                      value={form.packageTiers?.premium?.name || 'Premium'}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          premium: { ...form.packageTiers.premium, name: e.target.value },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Multiplier</label>
                    <input
                      type="number"
                      step="0.05"
                      value={form.tierMultipliers?.premium || 1.50}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 1.50;
                        setForm({
                          ...form,
                          tierMultipliers: { ...form.tierMultipliers, premium: val },
                          packageTiers: { ...form.packageTiers, premium: { ...form.packageTiers.premium, multiplier: val } },
                        });
                      }}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Revisions included</label>
                    <input
                      type="number"
                      value={form.packageTiers?.premium?.revisions ?? 5}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          premium: { ...form.packageTiers.premium, revisions: Number(e.target.value) || 0 },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] mb-1 block">Support days</label>
                    <input
                      type="number"
                      value={form.packageTiers?.premium?.supportDays ?? 60}
                      onChange={(e) => setForm({
                        ...form,
                        packageTiers: {
                          ...form.packageTiers,
                          premium: { ...form.packageTiers.premium, supportDays: Number(e.target.value) || 0 },
                        },
                      })}
                      className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="One-line description for proposal tier card..."
                  value={form.packageTiers?.premium?.description || ''}
                  onChange={(e) => setForm({
                    ...form,
                    packageTiers: {
                      ...form.packageTiers,
                      premium: { ...form.packageTiers.premium, description: e.target.value },
                    },
                  })}
                  className="w-full h-10 px-3 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
                />
              </div>
            </div>

            {/* ADVANCED: FLOORS BY CURRENCY OVERRIDE */}
            <div className="mt-6 pt-4 border-t border-[var(--line,#E8E0CF)]">
              <button
                type="button"
                onClick={() => setShowCurrencyOverrides(!showCurrencyOverrides)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] transition-colors cursor-pointer"
              >
                {showCurrencyOverrides ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Floors by currency (advanced overrides)
              </button>

              {showCurrencyOverrides && (
                <div className="mt-3 p-4 bg-[var(--page,#FAF5EA)]/40 border border-[var(--line,#E8E0CF)] rounded-xl text-xs space-y-2">
                  <p className="text-[var(--muted,#5B6676)]">
                    By default, foreign currency proposals automatically convert your {rulesCurrency} floor using an exchange rate snapshot. You can optionally set manual floor overrides per currency below.
                  </p>
                  <div className="text-[11px] text-[var(--muted,#5B6676)] italic">
                    Exchange rate conversion active for USD / EUR / GBP / CAD.
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: STICKY LIVE SIMULATOR (>= 1100px) */}
        <div className="hidden min-[1100px]:block">
          <div
            ref={simulatorRef}
            className="sticky top-4 overflow-y-auto simulator-scrollbar bg-white border border-[var(--line,#E8E0CF)] rounded-2xl p-5 shadow-xs space-y-4"
            style={{
              maxHeight: 'calc(100vh - 64px - 64px - 32px)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line,#E8E0CF)]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--cobalt,#0047AB)]" />
                <h3 className="text-[18px] font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)]">
                  Try your rules
                </h3>
              </div>
              {isDirty && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--sun-tint,#FFF4CC)] text-[var(--warning,#B54708)]">
                  Preview with unsaved changes
                </span>
              )}
            </div>
            {renderSimulatorBody()}
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM SAVE BAR */}
      <aside
        role="region"
        aria-label="Save pricing rules"
        className="fixed bottom-0 left-0 lg:left-[260px] right-0 h-16 bg-white border-t border-[var(--line,#E8E0CF)] z-20 px-4 sm:px-6 lg:px-8 shadow-sm"
      >
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--warning,#B54708)] px-2.5 py-1 rounded-full bg-[var(--warning-tint,#FEF0C7)] shrink-0">
                <span className="w-2 h-2 rounded-full bg-[var(--warning,#B54708)] animate-pulse" />
                Unsaved changes
              </span>
            ) : (
              <span className="text-[13px] font-medium text-[var(--muted,#5B6676)] truncate">
                All changes saved
                {lastSavedTime && (
                  <span> · Last saved {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (initialSettings) setForm(JSON.parse(JSON.stringify(initialSettings)));
              }}
              disabled={!isDirty || isSaving}
              className="text-[13px] sm:text-[14px] font-medium text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 rounded-lg px-2 py-1"
            >
              Reset to last saved
            </button>

            <button
              type="button"
              onClick={() => {
                const starters = PROFILE_STARTERS[form.profile || 'web_developer'] || PROFILE_STARTERS.web_developer;
                const defaultRulesCurr = form.currency || 'USD';
                setForm({
                  ...form,
                  hourlyRate: defaultRulesCurr === 'INR' ? 300 : 50,
                  minHourlyRate: defaultRulesCurr === 'INR' ? 250 : 35,
                  minProjectFee: defaultRulesCurr === 'INR' ? 3000 : 300,
                  defaultContingencyPercent: 10,
                  preferredProfitMargin: 25,
                  rushMultiplier: 1.30,
                  tierMultipliers: { essential: 1.0, standard: 1.20, premium: 1.50 },
                  roundingStep: getDefaultRoundingStep(defaultRulesCurr),
                  projectTypes: starters.map((s, idx) => ({ ...s, order: idx })),
                });
              }}
              disabled={isSaving}
              className="text-[13px] sm:text-[14px] font-medium text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 rounded-lg px-2 py-1"
            >
              Reset to defaults
            </button>

            <button
              type="button"
              onClick={handleOpenSaveModal}
              disabled={!isDirty || isSaving || !validation.isValid}
              className="h-10 px-5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-2 cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 disabled:cursor-not-allowed disabled:bg-[var(--cobalt-tint,#E8F0FB)] disabled:text-[var(--muted,#5B6676)] bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* PRESET CONFIRM DIALOG */}
      {presetConfirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--line,#E8E0CF)] animate-scale-in">
            <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-2">
              Apply preset: {presetConfirmModal.presetName}
            </h3>
            <p className="text-sm text-[var(--muted,#5B6676)] mb-4">
              Review the exact rate adjustments that will be applied to your rules. You will have 10 seconds to undo.
            </p>

            <div className="border border-[var(--line,#E8E0CF)] rounded-xl overflow-hidden mb-6 max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--page,#FAF5EA)] border-b border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Current</th>
                    <th className="py-2.5 px-3">New</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                  {presetConfirmModal.diffs.map((d, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-[var(--ink,#0E1A2B)]">{d.label}</td>
                      <td className="py-2.5 px-3 text-[var(--muted,#5B6676)]">{d.oldVal}</td>
                      <td className="py-2.5 px-3 font-bold text-[var(--cobalt,#0047AB)]">{d.newVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPresetConfirmModal({ open: false, presetName: '', diffs: [] })}
                className="px-4 py-2 text-sm font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPreset}
                className="px-5 py-2 text-sm font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Apply preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUGGEST FLOORS CONFIRM DIALOG */}
      {suggestFloorsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--line,#E8E0CF)] animate-scale-in">
            <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-2">
              Apply suggested category floors
            </h3>
            <p className="text-sm text-[var(--muted,#5B6676)] mb-4">
              Calculates floors from <code>typical hours x standard rate x medium complexity x standard multiplier</code>, rounded up to clean {rulesCurrency}.
            </p>

            <div className="border border-[var(--line,#E8E0CF)] rounded-xl overflow-hidden mb-6 max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--page,#FAF5EA)] border-b border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Project type</th>
                    <th className="py-2.5 px-3">Current floor</th>
                    <th className="py-2.5 px-3">Suggested floor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                  {suggestFloorsModal.diffs.map((d, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-[var(--ink,#0E1A2B)]">{d.name}</td>
                      <td className="py-2.5 px-3 text-[var(--muted,#5B6676)]">{formatCurrencyAmount(d.currentFloor, rulesCurrency)}</td>
                      <td className="py-2.5 px-3 font-bold text-[var(--cobalt,#0047AB)]">{formatCurrencyAmount(d.suggestedFloor, rulesCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSuggestFloorsModal({ open: false, diffs: [] })}
                className="px-4 py-2 text-sm font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplySuggestedFloors}
                className="px-5 py-2 text-sm font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Apply suggested floors
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE SUMMARY CONFIRM DIALOG */}
      {saveSummaryModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--line,#E8E0CF)] animate-scale-in">
            <h3 className="text-xl font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-2">
              Confirm pricing rules update
            </h3>
            <p className="text-sm text-[var(--muted,#5B6676)] mb-3">
              Applies to new proposals only. Sent and accepted proposals keep their original prices.
            </p>

            {saveSummaryModal.diffs.length > 0 ? (
              <div className="border border-[var(--line,#E8E0CF)] rounded-xl overflow-hidden mb-6 max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--page,#FAF5EA)] border-b border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Field</th>
                      <th className="py-2.5 px-3">Previous</th>
                      <th className="py-2.5 px-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                    {saveSummaryModal.diffs.map((d, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-[var(--ink,#0E1A2B)]">{d.label}</td>
                        <td className="py-2.5 px-3 text-[var(--muted,#5B6676)]">{d.oldVal}</td>
                        <td className="py-2.5 px-3 font-bold text-[var(--cobalt,#0047AB)]">{d.newVal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted,#5B6676)] italic mb-6">
                Project types, packages, or multipliers updated.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSaveSummaryModal({ open: false, diffs: [] })}
                className="px-4 py-2 text-sm font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2 text-sm font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Confirm & save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE STARTER CONFIRM DIALOG */}
      {profileConfirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--line,#E8E0CF)] animate-scale-in">
            <h3 className="text-lg font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-2">
              Change profile starter list?
            </h3>
            <p className="text-sm text-[var(--muted,#5B6676)] mb-6">
              Switching to <strong>{profileConfirmModal.newProfile.replace('_', ' ')}</strong> will replace your current project type list with standard deliverables for that field.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProfileConfirmModal({ open: false, newProfile: '' })}
                className="px-4 py-2 text-sm font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmProfileChange}
                className="px-5 py-2 text-sm font-semibold bg-[var(--cobalt,#0047AB)] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Replace with starters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE PROJECT TYPE MODAL */}
      {deleteTypeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--line,#E8E0CF)] animate-scale-in">
            <h3 className="text-lg font-bold font-['Bricolage_Grotesque',sans-serif] text-[var(--ink,#0E1A2B)] mb-2">
              Remove "{deleteTypeModal.typeName}"?
            </h3>
            <p className="text-sm text-[var(--muted,#5B6676)] mb-6">
              If this project type has been used in existing proposals, archiving is recommended to preserve proposal history.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTypeModal({ open: false, typeId: '', typeName: '' })}
                className="px-4 py-2 text-sm font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteType(true)}
                className="px-4 py-2 text-sm font-semibold bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] border border-[var(--line,#E8E0CF)] hover:bg-[var(--line,#E8E0CF)]/50 rounded-xl cursor-pointer"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteType(false)}
                className="px-4 py-2 text-sm font-semibold bg-[var(--error,#B42318)] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

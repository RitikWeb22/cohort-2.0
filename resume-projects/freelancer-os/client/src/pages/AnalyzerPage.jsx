import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  FileText,
  Loader2,
  Plus,
  Edit3,
  X,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Send,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { getProfessionConfig } from '../config/professions';
import { calculatePricing } from '../utils/pricingEngine';

// Category display name formatter (fixes "E Commerce" typo)
function formatCategoryLabel(catId) {
  if (!catId) return 'Web Application';
  const clean = catId.toLowerCase();
  if (clean.includes('commerce') || clean === 'e-commerce') return 'E-commerce';
  if (clean.includes('landing')) return 'Landing page';
  if (clean.includes('business') || clean.includes('corporate')) return 'Business website';
  if (clean.includes('react') || clean.includes('nextjs')) return 'React & Next.js';
  if (clean.includes('custom-web') || clean.includes('custom')) return 'Custom web app';
  if (clean.includes('api') || clean.includes('backend')) return 'Backend & API';
  if (clean.includes('ai') || clean.includes('chatbot')) return 'AI integrations';
  if (clean.includes('saas')) return 'SaaS platform';
  return catId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format Complexity Label (avoids "Complex Complexity" duplication)
function formatComplexity(complexity) {
  const c = (complexity || 'medium').toLowerCase();
  if (c === 'simple') return 'Simple';
  if (c === 'complex') return 'High';
  return 'Medium';
}

const EXAMPLE_BRIEF = `We need a high-converting e-commerce web platform for our custom apparel brand.
Key features required:
- Product catalog with faceted search, category filters and size/color variants
- Shopping cart, guest checkout and Stripe payment gateway integration
- Customer account portal for order history, tracking and saved addresses
- Admin dashboard to manage products, view sales reports and update order fulfillment status
- Mobile responsiveness, SEO optimization and sub-second page load speeds.
Target launch is in 4-6 weeks.`;

export function AnalyzerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const analysisIdFromUrl = searchParams.get('id');
  const { user } = useAuthStore();
  const { showToast } = useNotificationStore();
  const { format } = useCurrencyStore();

  const profConfig = getProfessionConfig(user?.field);

  // Core Data State
  const [analysesList, setAnalysesList] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [clients, setClients] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  // Input Form State
  const [rawText, setRawText] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectType, setProjectType] = useState(profConfig.categories[0]?.id || 'custom-web-apps');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisStep, setAnalysisStep] = useState(0); // 0 to 4 stepper

  // Clarifications State
  const [answeringIdx, setAnsweringIdx] = useState(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false);

  // Scope & Hours Editing State
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [editedFeatures, setEditedFeatures] = useState([]);
  const [isSavingHours, setIsSavingHours] = useState(false);

  // Deliverables & Exclusions Editing State
  const [isEditingDeliverables, setIsEditingDeliverables] = useState(false);
  const [editedDeliverables, setEditedDeliverables] = useState([]);
  const [isEditingExclusions, setIsEditingExclusions] = useState(false);
  const [editedExclusions, setEditedExclusions] = useState([]);

  // Category mismatch notice dismissed state
  const [dismissedMismatch, setDismissedMismatch] = useState(false);

  const textareaRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        setIsLoadingPage(true);
        const [aRes, cRes, pRes] = await Promise.allSettled([
          api.getAnalyses(),
          api.getClients(),
          api.getPricingSettings(),
        ]);

        if (aRes.status === 'fulfilled' && aRes.value?.analyses) {
          setAnalysesList(aRes.value.analyses);
          if (analysisIdFromUrl) {
            const match = aRes.value.analyses.find((a) => a.id === analysisIdFromUrl);
            if (match) {
              setSelectedAnalysis(match);
              setEditedFeatures(match.pagesAndFeatures || []);
              setEditedDeliverables(match.deliverables || []);
              setEditedExclusions(match.exclusions || []);
            }
          } else if (aRes.value.analyses.length > 0) {
            setSelectedAnalysis(aRes.value.analyses[0]);
            setEditedFeatures(aRes.value.analyses[0].pagesAndFeatures || []);
            setEditedDeliverables(aRes.value.analyses[0].deliverables || []);
            setEditedExclusions(aRes.value.analyses[0].exclusions || []);
          }
        }

        if (cRes.status === 'fulfilled' && cRes.value?.clients) {
          setClients(cRes.value.clients);
        }

        if (pRes.status === 'fulfilled' && pRes.value?.settings) {
          setPricingSettings(pRes.value.settings);
        }
      } catch (err) {
        console.error('Error initializing analyzer:', err);
      } finally {
        setIsLoadingPage(false);
      }
    }
    init();
  }, [analysisIdFromUrl]);

  // Sync state when selected analysis changes
  useEffect(() => {
    if (selectedAnalysis) {
      setEditedFeatures(selectedAnalysis.pagesAndFeatures || []);
      setEditedDeliverables(selectedAnalysis.deliverables || []);
      setEditedExclusions(selectedAnalysis.exclusions || []);
      setIsEditingHours(false);
      setIsEditingDeliverables(false);
      setIsEditingExclusions(false);
      setAnsweringIdx(null);
      setDismissedMismatch(false);

      // Auto-collapse questions if all resolved
      const questions = selectedAnalysis.clarificationQuestions || [];
      const allResolved = questions.length > 0 && questions.every((q) => q.resolved);
      setQuestionsCollapsed(allResolved);
    }
  }, [selectedAnalysis?.id]);

  // Dynamic hours sum
  const currentTotalHours = useMemo(() => {
    if (isEditingHours) {
      return editedFeatures.reduce((sum, f) => sum + (Number(f.hours) || 0), 0);
    }
    return selectedAnalysis?.estimatedHours || editedFeatures.reduce((sum, f) => sum + (Number(f.hours) || 0), 0) || 0;
  }, [isEditingHours, editedFeatures, selectedAnalysis]);

  // Pricing Floor Calculation based on real Pricing Settings via shared engine
  const pricingEngineResult = useMemo(() => {
    return calculatePricing({
      hours: currentTotalHours,
      projectType: selectedAnalysis?.projectType || projectType,
      complexity: selectedAnalysis?.complexity || 'medium',
      pricingSettings: pricingSettings || {},
      selectedTier: 'standard',
    });
  }, [currentTotalHours, selectedAnalysis, projectType, pricingSettings]);

  const floorCalculation = useMemo(() => {
    return {
      hourlyRate: pricingEngineResult.standardRate,
      complexityMultiplier: pricingEngineResult.complexityMultiplier,
      rawEstimate: pricingEngineResult.raw,
      categoryFloor: pricingEngineResult.floor,
      recommendedQuote: pricingEngineResult.tiers.standard,
      isRaisedToFloor: pricingEngineResult.isRaisedToFloor,
    };
  }, [pricingEngineResult]);

  // Check if all tasks have identical confidence
  const identicalConfidenceCheck = useMemo(() => {
    const list = selectedAnalysis?.pagesAndFeatures || [];
    if (list.length <= 1) return false;
    const firstVal = (list[0]?.confidence || 'medium').toLowerCase();
    return list.every((item) => (item?.confidence || 'medium').toLowerCase() === firstVal);
  }, [selectedAnalysis]);

  // Check if AI detected a different category than selected
  const categoryMismatch = useMemo(() => {
    if (!selectedAnalysis || dismissedMismatch) return null;
    const detected = selectedAnalysis.projectType;
    if (detected && projectType && detected !== projectType) {
      return {
        detectedId: detected,
        detectedLabel: formatCategoryLabel(detected),
        selectedId: projectType,
        selectedLabel: formatCategoryLabel(projectType),
      };
    }
    return null;
  }, [selectedAnalysis, projectType, dismissedMismatch]);

  // Questions resolved count
  const questionStats = useMemo(() => {
    const qList = selectedAnalysis?.clarificationQuestions || [];
    const resolvedCount = qList.filter((q) => q.resolved).length;
    const totalCount = qList.length;
    const hasUnresolved = qList.some((q) => !q.resolved);
    return { qList, resolvedCount, totalCount, hasUnresolved };
  }, [selectedAnalysis]);

  // Submit new analysis
  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();

    if (rawText.trim().length < 40) {
      setAnalysisError('Please provide at least 40 characters of client requirements');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError('');
      setAnalysisStep(1); // Reading brief

      // Simulate step progression for UX
      const timer1 = setTimeout(() => setAnalysisStep(2), 1200); // Finding gaps
      const timer2 = setTimeout(() => setAnalysisStep(3), 2600); // Estimating hours
      const timer3 = setTimeout(() => setAnalysisStep(4), 4000); // Checking your floor

      const res = await api.createAnalysis({
        rawText: rawText.trim(),
        clientId: clientId || null,
        projectType,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setAnalysisStep(4);

      if (res?.analysis) {
        setSelectedAnalysis(res.analysis);
        setEditedFeatures(res.analysis.pagesAndFeatures || []);
        setEditedDeliverables(res.analysis.deliverables || []);
        setEditedExclusions(res.analysis.exclusions || []);
        setAnalysesList((prev) => [res.analysis, ...prev]);
        setRawText('');
        showToast({
          type: 'success',
          title: 'Analysis Complete',
          message: 'Structured scope and hour estimates generated.',
        });
      }
    } catch (err) {
      setAnalysisError(err.message || 'We could not analyze this brief. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  // Keyboard shortcut Ctrl/Cmd + Enter
  const handleKeyDownTextarea = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (rawText.trim().length >= 40 && !isAnalyzing) {
        handleAnalyze(e);
      }
    }
  };

  // Switch category to detected
  const handleAcceptDetectedCategory = async () => {
    if (!categoryMismatch || !selectedAnalysis) return;
    try {
      setProjectType(categoryMismatch.detectedId);
      const res = await api.updateAnalysis(selectedAnalysis.id, {
        projectType: categoryMismatch.detectedId,
      });
      if (res?.analysis) {
        setSelectedAnalysis(res.analysis);
      }
      setDismissedMismatch(true);
      showToast({
        type: 'success',
        title: 'Category Updated',
        message: `Set to ${categoryMismatch.detectedLabel} with calibrated price floors.`,
      });
    } catch (err) {
      setDismissedMismatch(true);
    }
  };

  // Keep user-selected category
  const handleKeepSelectedCategory = async () => {
    if (!categoryMismatch || !selectedAnalysis) return;
    try {
      const res = await api.updateAnalysis(selectedAnalysis.id, {
        projectType: categoryMismatch.selectedId,
      });
      if (res?.analysis) {
        setSelectedAnalysis(res.analysis);
      }
      setDismissedMismatch(true);
      showToast({
        type: 'info',
        title: 'Category Retained',
        message: `Preserved ${categoryMismatch.selectedLabel}.`,
      });
    } catch (err) {
      setDismissedMismatch(true);
    }
  };

  // Hours editing handlers
  const handleFeatureHourChange = (idx, newHours) => {
    const val = Math.max(0, parseFloat(newHours) || 0);
    setEditedFeatures((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], hours: val };
      return copy;
    });
  };

  const handleAddTask = () => {
    setEditedFeatures((prev) => [
      ...prev,
      {
        name: 'New Custom Task',
        hours: 4,
        complexity: 'medium',
        confidence: 'medium',
      },
    ]);
  };

  const handleDeleteTask = (idx) => {
    setEditedFeatures((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveHours = async () => {
    if (!selectedAnalysis) return;
    try {
      setIsSavingHours(true);
      const newTotal = editedFeatures.reduce((sum, f) => sum + (Number(f.hours) || 0), 0);
      const res = await api.updateAnalysis(selectedAnalysis.id, {
        pagesAndFeatures: editedFeatures,
        estimatedHours: newTotal,
      });
      if (res?.analysis) {
        setSelectedAnalysis(res.analysis);
        setEditedFeatures(res.analysis.pagesAndFeatures || []);
        setIsEditingHours(false);
        showToast({
          type: 'success',
          title: 'Hours Updated',
          message: `Total effort recalculated to ${newTotal} hrs.`,
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save updated hours.',
      });
    } finally {
      setIsSavingHours(false);
    }
  };

  // Clarification answering handler
  const handleSaveAnswer = async (idx, answerText) => {
    if (!selectedAnalysis) return;
    const finalAnswer = (answerText !== undefined ? answerText : answerDraft).trim();
    if (!finalAnswer) return;

    try {
      const res = await api.resolveQuestion(selectedAnalysis.id, {
        questionIndex: idx,
        answer: finalAnswer,
        resolved: true,
      });
      if (res?.analysis) {
        setSelectedAnalysis(res.analysis);
        setAnsweringIdx(null);
        setAnswerDraft('');
        showToast({
          type: 'success',
          title: 'Question Resolved',
          message: 'Client answer confirmed.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message,
      });
    }
  };

  const handleSkipQuestion = async (idx) => {
    await handleSaveAnswer(idx, 'Skipped (marked as client assumption)');
  };

  // Deliverables / Exclusions Save
  const handleSaveDeliverables = async () => {
    if (!selectedAnalysis) return;
    try {
      const res = await api.updateAnalysis(selectedAnalysis.id, {
        deliverables: editedDeliverables,
      });
      if (res?.analysis) {
        setSelectedAnalysis(res.analysis);
        setIsEditingDeliverables(false);
        showToast({ type: 'success', title: 'Deliverables Saved', message: 'Updated deliverables list.' });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    }
  };

  const handleSaveExclusions = async () => {
    if (!selectedAnalysis) return;
    try {
      const res = await api.updateAnalysis(selectedAnalysis.id, {
        exclusions: editedExclusions,
      });
      if (res?.analysis) {
        setSelectedAnalysis(res.analysis);
        setIsEditingExclusions(false);
        showToast({ type: 'success', title: 'Exclusions Saved', message: 'Updated out-of-scope list.' });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    }
  };

  // Copy Scope to Clipboard
  const handleCopyScope = () => {
    if (!selectedAnalysis) return;
    const textToCopy = `# ${selectedAnalysis.projectTitle}
Category: ${formatCategoryLabel(selectedAnalysis.projectType)}
Total Estimated Hours: ${currentTotalHours} hrs
Recommended Quote: ${format(floorCalculation.recommendedQuote)}

## Objectives
${selectedAnalysis.clientObjectives || 'N/A'}

## Features & Effort Breakdown
${(selectedAnalysis.pagesAndFeatures || [])
  .map((f) => `- ${f.name}: ${f.hours} hrs (${f.complexity} complexity)`)
  .join('\n')}

## Deliverables
${(selectedAnalysis.deliverables || []).map((d) => `- ${d}`).join('\n')}

## Not Included (Out of Scope)
${(selectedAnalysis.exclusions || []).map((e) => `- ${e}`).join('\n')}
`;
    navigator.clipboard.writeText(textToCopy);
    showToast({
      type: 'success',
      title: 'Scope Copied',
      message: 'Markdown scope copied to clipboard.',
    });
  };

  // Confidence visual 3-bar indicator
  const renderConfidenceBars = (conf) => {
    const c = (conf || 'medium').toLowerCase();
    const barsCount = c === 'high' ? 3 : c === 'low' ? 1 : 2;
    const tooltipText = `How sure the AI is about this estimate (${c.toUpperCase()})`;

    return (
      <div
        className="inline-flex items-center gap-1 cursor-help"
        title={tooltipText}
        aria-label={tooltipText}
      >
        <span
          className="w-1.5 h-3 rounded-xs transition-colors"
          style={{ backgroundColor: barsCount >= 1 ? 'var(--cobalt, #0047AB)' : 'var(--line, #E8E0CF)' }}
        />
        <span
          className="w-1.5 h-3 rounded-xs transition-colors"
          style={{ backgroundColor: barsCount >= 2 ? 'var(--cobalt, #0047AB)' : 'var(--line, #E8E0CF)' }}
        />
        <span
          className="w-1.5 h-3 rounded-xs transition-colors"
          style={{ backgroundColor: barsCount >= 3 ? 'var(--cobalt, #0047AB)' : 'var(--line, #E8E0CF)' }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* =====================================================================
          PAGE HEADER
          ===================================================================== */}
      <section aria-label="Analyzer Header" className="pb-2 border-b border-[var(--line,#E8E0CF)]">
        <h1
          className="text-[32px] font-extrabold text-[var(--ink,#0E1A2B)] tracking-tight leading-tight"
          style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
        >
          Analyzer
        </h1>
        <p className="text-[15px] text-[var(--muted,#5B6676)] mt-1 font-normal">
          Paste a client message and get a scoped proposal with hour estimates.
        </p>
      </section>

      {/* =====================================================================
          TWO-COLUMN LAYOUT: Left (380px sticky) + Right (Results)
          ===================================================================== */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ===================================================================
            LEFT COLUMN (380px, sticky on desktop): Input Card + History Card
            =================================================================== */}
        <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-[88px] space-y-6">
          {/* Card: Paste a client brief */}
          <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-4">
            <div>
              <h2
                className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Paste a client brief
              </h2>
              <p className="text-[13px] text-[var(--muted,#5B6676)] mt-0.5">
                Email, chat, call notes or a rough idea.
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-3.5">
              {/* Client Selection (Optional) */}
              <div>
                <label htmlFor="brief-client" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Client <span className="font-normal text-[var(--muted,#5B6676)]">(optional)</span>
                </label>
                <select
                  id="brief-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] outline-none focus:border-[#0047AB] focus:ring-2 focus:ring-[#0047AB]/20"
                >
                  <option value="">No client yet</option>
                  {clients.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Category */}
              <div>
                <label htmlFor="brief-category" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Service Category
                </label>
                <select
                  id="brief-category"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3 py-2 text-[14px] rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] font-medium outline-none focus:border-[#0047AB] focus:ring-2 focus:ring-[#0047AB]/20"
                >
                  {profConfig.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[var(--muted,#5B6676)] mt-1">
                  Used to apply the right price floor.
                </p>
              </div>

              {/* Textarea (min 180px, resizable vertically) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="brief-textarea" className="block text-xs font-semibold text-[var(--ink,#0E1A2B)]">
                    Client message
                  </label>
                  {rawText.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRawText('')}
                      className="text-[11px] font-medium text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  id="brief-textarea"
                  ref={textareaRef}
                  rows={7}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  onKeyDown={handleKeyDownTextarea}
                  placeholder="Paste an email, chat or call notes. Example: We need a Next.js dashboard with Stripe billing and a Postgres database, launching in 4 weeks."
                  className="w-full px-3 py-2.5 text-[15px] font-sans leading-relaxed rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[var(--ink,#0E1A2B)] outline-none focus:border-[#0047AB] focus:ring-2 focus:ring-[#0047AB]/20 resize-y min-h-[180px]"
                />
                <div className="flex items-center justify-between text-[11px] text-[var(--muted,#5B6676)] mt-1">
                  <span>
                    {rawText.length} / 40 min characters
                  </span>
                  <span className="hidden sm:inline">Ctrl/Cmd + Enter to run</span>
                </div>
              </div>

              {/* Error display if any */}
              {analysisError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl text-xs border text-[var(--error,#B42318)]"
                  style={{ backgroundColor: 'var(--error-tint, #FEE4E2)', borderColor: '#FECDCA' }}
                >
                  {analysisError}
                </div>
              )}

              {/* Primary "Analyze brief" Button (48px, cobalt) */}
              <button
                type="submit"
                disabled={rawText.trim().length < 40 || isAnalyzing}
                className="w-full h-12 rounded-full text-[15px] font-semibold text-white transition-colors duration-150 flex items-center justify-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-none"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                onMouseEnter={(e) => {
                  if (rawText.trim().length >= 40 && !isAnalyzing) {
                    e.currentTarget.style.backgroundColor = 'var(--cobalt-dark, #003A8C)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cobalt, #0047AB)';
                }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze brief</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card: Past analyses (History) */}
          <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5">
            <h3
              className="text-[16px] font-bold text-[var(--ink,#0E1A2B)] mb-3"
              style={{ fontFamily: "'Bricolage Grotedque', system-ui, sans-serif" }}
            >
              Past analyses
            </h3>

            {analysesList.length === 0 ? (
              <p className="text-[13px] text-[var(--muted,#5B6676)] py-4 text-center">
                No analyses yet. Paste your first brief above.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {analysesList.map((a) => {
                  const isSelected = selectedAnalysis?.id === a.id;
                  const dateStr = a.createdAt
                    ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '';
                  return (
                    <button
                      type="button"
                      key={a.id}
                      onClick={() => {
                        setSelectedAnalysis(a);
                        setSearchParams({ id: a.id });
                      }}
                      className={`w-full relative p-3 rounded-xl text-left transition-colors flex items-center justify-between gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] ${
                        isSelected
                          ? 'font-semibold'
                          : 'hover:bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)]'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
                              color: 'var(--cobalt, #0047AB)',
                            }
                          : {}
                      }
                    >
                      {/* Active Left 3px Indicator */}
                      {isSelected && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                          aria-hidden="true"
                        />
                      )}

                      <div className="min-w-0 pr-2">
                        <div
                          className="text-[13px] font-semibold truncate text-[var(--ink,#0E1A2B)]"
                          title={a.projectTitle}
                        >
                          {a.projectTitle || 'Untitled project'}
                        </div>
                        <div className="text-[11px] text-[var(--muted,#5B6676)] mt-0.5 truncate">
                          {a.estimatedHours} hrs · {formatComplexity(a.complexity)} complexity{dateStr ? ` · ${dateStr}` : ''}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {a.status === 'approved' ? (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--success-tint, #E7F6EC)', color: 'var(--success, #067647)' }}
                          >
                            Approved
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#F2F4F7', color: 'var(--muted, #5B6676)' }}
                          >
                            Draft
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN: RESULTS / WORKBENCH
            =================================================================== */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {/* While Running: 4-Step Progress Stepper */}
          {isAnalyzing && (
            <div
              className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-4 animate-fade-in"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-[var(--cobalt,#0047AB)] animate-spin" />
                <h3
                  className="text-[18px] font-bold text-[var(--ink,#0E1A2B)]"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  Analyzing brief...
                </h3>
              </div>

              {/* 4-Step Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { step: 1, title: 'Reading brief' },
                  { step: 2, title: 'Finding gaps' },
                  { step: 3, title: 'Estimating hours' },
                  { step: 4, title: 'Checking your floor' },
                ].map((s) => {
                  const isDone = analysisStep > s.step;
                  const isCurrent = analysisStep === s.step;
                  return (
                    <div
                      key={s.step}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                        isDone
                          ? 'border-[var(--success,#067647)] bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)]'
                          : isCurrent
                          ? 'border-[var(--cobalt,#0047AB)] bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] font-semibold'
                          : 'border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)]'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                          {s.step}
                        </span>
                      )}
                      <span className="truncate">{s.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Result View */}
          {selectedAnalysis ? (
            <>
              {/* =============================================================
                  1. SUMMARY HEADER CARD
                  ============================================================= */}
              <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-4">
                {/* Pills Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--cobalt-tint, #E8F0FB)', color: 'var(--cobalt, #0047AB)' }}
                  >
                    {formatCategoryLabel(selectedAnalysis.projectType)}
                  </span>

                  {selectedAnalysis.status === 'approved' ? (
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: 'var(--success-tint, #E7F6EC)', color: 'var(--success, #067647)' }}
                    >
                      <Check className="w-3 h-3" />
                      <span>Scope approved</span>
                    </span>
                  ) : (
                    <span
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
                      style={{ backgroundColor: 'var(--warning-tint, #FEF0C7)', color: 'var(--warning, #B54708)' }}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Needs review</span>
                    </span>
                  )}

                  <span className="text-[12px] text-[var(--muted,#5B6676)] ml-auto font-medium">
                    Analysis complete ✓
                  </span>
                </div>

                {/* Category Mismatch Notice (if detected differs from selected) */}
                {categoryMismatch && (
                  <div
                    className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{
                      backgroundColor: 'var(--warning-tint, #FEF0C7)',
                      borderColor: '#FDE28A',
                    }}
                  >
                    <div className="text-xs text-[var(--warning,#B54708)] font-medium">
                      Detected as <strong>{categoryMismatch.detectedLabel}</strong>. You selected <strong>{categoryMismatch.selectedLabel}</strong>. Use detected category?
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleAcceptDetectedCategory}
                        className="px-3 py-1 text-xs font-bold rounded-full bg-[var(--cobalt,#0047AB)] text-white hover:bg-[var(--cobalt-dark,#003A8C)] transition-colors"
                      >
                        Use {categoryMismatch.detectedLabel}
                      </button>
                      <button
                        type="button"
                        onClick={handleKeepSelectedCategory}
                        className="px-3 py-1 text-xs font-semibold rounded-full border border-[var(--warning,#B54708)] text-[var(--warning,#B54708)] hover:bg-white transition-colors"
                      >
                        Keep {categoryMismatch.selectedLabel}
                      </button>
                    </div>
                  </div>
                )}

                {/* Title (Full text, no truncation) */}
                <h2
                  className="text-[28px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight tracking-tight"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  {selectedAnalysis.projectTitle}
                </h2>

                {/* Description / Objectives */}
                {selectedAnalysis.clientObjectives && (
                  <p className="text-[15px] text-[var(--muted,#5B6676)] leading-relaxed font-normal">
                    {selectedAnalysis.clientObjectives}
                  </p>
                )}
              </div>

              {/* =============================================================
                  2. FLOOR CHECK CARD (Signature element)
                  ============================================================= */}
              <div
                className="rounded-2xl border p-5 space-y-4"
                style={{
                  backgroundColor: 'var(--cobalt-tint, #E8F0FB)',
                  borderColor: '#BFD5F2',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white text-[var(--cobalt,#0047AB)] flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3
                        className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                        style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                      >
                        Price floor check
                      </h3>
                      <p className="text-[12px] text-[var(--muted,#5B6676)]">
                        Guaranteed minimum quote protection based on your pricing rules.
                      </p>
                    </div>
                  </div>

                  {/* Status Chip */}
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto flex items-center gap-1.5"
                    style={{
                      backgroundColor: floorCalculation.isRaisedToFloor
                        ? 'var(--sun-tint, #FFF4CC)'
                        : 'var(--success-tint, #E7F6EC)',
                      color: floorCalculation.isRaisedToFloor
                        ? 'var(--ink, #0E1A2B)'
                        : 'var(--success, #067647)',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: floorCalculation.isRaisedToFloor
                          ? 'var(--sun, #FFC72C)'
                          : 'var(--success, #067647)',
                      }}
                    />
                    {floorCalculation.isRaisedToFloor ? 'Raised to your floor' : 'Above your floor'}
                  </span>
                </div>

                {/* Calculation Breakdown Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/80 border border-[#BFD5F2]/50">
                    <span className="text-[11px] text-[var(--muted,#5B6676)] block font-medium">Estimated effort</span>
                    <span className="text-[16px] font-extrabold text-[var(--ink,#0E1A2B)] block mt-0.5">
                      {currentTotalHours} hrs
                    </span>
                    <span className="text-[10px] text-[var(--muted,#5B6676)]">
                      @ {format(floorCalculation.hourlyRate)}/hr × {floorCalculation.complexityMultiplier}x
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 border border-[#BFD5F2]/50">
                    <span className="text-[11px] text-[var(--muted,#5B6676)] block font-medium">Raw estimate</span>
                    <span className="text-[16px] font-extrabold text-[var(--ink,#0E1A2B)] block mt-0.5">
                      {format(floorCalculation.rawEstimate)}
                    </span>
                    <span className="text-[10px] text-[var(--muted,#5B6676)]">
                      Labor + complexity
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 border border-[#BFD5F2]/50">
                    <span className="text-[11px] text-[var(--muted,#5B6676)] block font-medium">
                      Your floor ({formatCategoryLabel(selectedAnalysis.projectType)})
                    </span>
                    <span className="text-[16px] font-extrabold text-[var(--ink,#0E1A2B)] block mt-0.5">
                      {format(floorCalculation.categoryFloor)}
                    </span>
                    <span className="text-[10px] text-[var(--muted,#5B6676)]">
                      Minimum permitted quote
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[var(--cobalt,#0047AB)] shadow-xs">
                    <span className="text-[11px] text-[var(--cobalt,#0047AB)] block font-bold">Recommended quote</span>
                    <span
                      className="text-[18px] font-extrabold text-[var(--cobalt,#0047AB)] block mt-0.5"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      {format(floorCalculation.recommendedQuote)}
                    </span>
                    <span className="text-[10px] text-[var(--muted,#5B6676)]">
                      max(raw estimate, floor)
                    </span>
                  </div>
                </div>

                {/* Mini Visual: Horizontal bar with yellow dashed floor line */}
                <div className="pt-2 flex items-center justify-between text-xs text-[var(--muted,#5B6676)]">
                  <div className="flex items-center gap-2 w-full max-w-md">
                    <span className="text-[11px] font-semibold text-[var(--ink,#0E1A2B)] shrink-0">Safe floor:</span>
                    <div className="w-full relative flex items-center">
                      <div className="w-full border-t-2 border-dashed" style={{ borderColor: 'var(--sun, #FFC72C)' }} />
                      <span
                        className="ml-2 px-2 py-0.5 text-[10px] font-extrabold rounded-full text-[var(--ink,#0E1A2B)] shrink-0"
                        style={{ backgroundColor: 'var(--sun, #FFC72C)' }}
                      >
                        Protected
                      </span>
                    </div>
                  </div>
                  <Link
                    to="/pricing-rules"
                    className="text-[12px] font-semibold text-[var(--cobalt,#0047AB)] hover:underline shrink-0"
                  >
                    Edit floor rules →
                  </Link>
                </div>
              </div>

              {/* =============================================================
                  3. CLARIFICATION QUESTIONS CARD
                  ============================================================= */}
              <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3
                      className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      Questions to confirm with your client
                    </h3>
                    <p className="text-[13px] text-[var(--muted,#5B6676)]">
                      Gaps in the brief. Resolve them before you send a proposal.
                    </p>
                  </div>

                  {questionStats.totalCount > 0 && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-[var(--cobalt,#0047AB)]">
                        {questionStats.resolvedCount} of {questionStats.totalCount} resolved
                      </span>
                      {questionStats.resolvedCount === questionStats.totalCount && (
                        <button
                          type="button"
                          onClick={() => setQuestionsCollapsed(!questionsCollapsed)}
                          className="text-xs font-medium text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] flex items-center gap-1 cursor-pointer"
                        >
                          <span>{questionsCollapsed ? 'Show' : 'Hide'}</span>
                          {questionsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {questionStats.totalCount > 0 && (
                  <div className="w-full h-1.5 rounded-full bg-[var(--page,#FAF5EA)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(questionStats.resolvedCount / questionStats.totalCount) * 100}%`,
                        backgroundColor:
                          questionStats.resolvedCount === questionStats.totalCount
                            ? 'var(--success, #067647)'
                            : 'var(--cobalt, #0047AB)',
                      }}
                    />
                  </div>
                )}

                {/* Questions List */}
                {!questionsCollapsed && (
                  <div className="space-y-3 pt-1">
                    {questionStats.qList.length === 0 ? (
                      <p className="text-xs text-[var(--muted,#5B6676)] italic">
                        No ambiguities detected. Scope is fully defined.
                      </p>
                    ) : (
                      questionStats.qList.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border transition-colors space-y-2.5"
                          style={{
                            borderColor: q.resolved ? '#CDE9D5' : 'var(--line, #E8E0CF)',
                            backgroundColor: q.resolved ? 'var(--success-tint, #E7F6EC)' : '#FFFFFF',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="text-xs font-bold text-[var(--muted,#5B6676)] shrink-0 mt-0.5">
                                {idx + 1}.
                              </span>
                              <p className="text-[15px] font-semibold text-[var(--ink,#0E1A2B)] leading-snug">
                                {q.question}
                              </p>
                            </div>

                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: q.resolved
                                  ? '#D1F0DA'
                                  : 'var(--warning-tint, #FEF0C7)',
                                color: q.resolved
                                  ? 'var(--success, #067647)'
                                  : 'var(--warning, #B54708)',
                              }}
                            >
                              {q.resolved ? 'Resolved' : 'Open'}
                            </span>
                          </div>

                          {/* Answer Area */}
                          {q.resolved ? (
                            <div className="pl-6 flex items-center justify-between text-xs text-[var(--success,#067647)]">
                              <span className="font-medium">
                                Confirmed: {q.answer}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnsweringIdx(idx);
                                  setAnswerDraft(q.answer);
                                }}
                                className="text-xs font-semibold underline text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          ) : answeringIdx === idx ? (
                            <div className="pl-6 space-y-2 pt-1">
                              <input
                                type="text"
                                value={answerDraft}
                                onChange={(e) => setAnswerDraft(e.target.value)}
                                placeholder="Type confirmed answer..."
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--cobalt,#0047AB)] outline-none"
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveAnswer(idx)}
                                  className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)]"
                                >
                                  Save answer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAnsweringIdx(null)}
                                  className="px-3 py-1 rounded-full text-xs font-medium text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="pl-6 flex flex-wrap items-center gap-2 pt-1">
                              {/* Quick Select Chips */}
                              <button
                                type="button"
                                onClick={() => handleSaveAnswer(idx, 'Yes, confirmed')}
                                className="px-2.5 py-1 text-xs rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--cobalt-tint,#E8F0FB)] hover:border-[var(--cobalt,#0047AB)] transition-colors text-[var(--ink,#0E1A2B)]"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveAnswer(idx, 'No, not required')}
                                className="px-2.5 py-1 text-xs rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--cobalt-tint,#E8F0FB)] hover:border-[var(--cobalt,#0047AB)] transition-colors text-[var(--ink,#0E1A2B)]"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnsweringIdx(idx);
                                  setAnswerDraft('');
                                }}
                                className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] hover:bg-[#D8E6F8] transition-colors"
                              >
                                Type answer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSkipQuestion(idx)}
                                className="text-xs text-[var(--muted,#5B6676)] hover:underline ml-2"
                              >
                                Skip (mark as assumption)
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* =============================================================
                  4. SCOPE AND HOURS CARD "Features and effort"
                  ============================================================= */}
              <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3
                      className="text-[18px] font-extrabold text-[var(--ink,#0E1A2B)] leading-tight"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      Features and effort
                    </h3>
                    <p className="text-[13px] text-[var(--muted,#5B6676)]">
                      Edit hours before you generate the proposal.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-[24px] font-extrabold text-[var(--ink,#0E1A2B)] whitespace-nowrap tabular-nums"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      {currentTotalHours} hrs total
                    </span>

                    {!isEditingHours ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingHours(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[var(--line,#E8E0CF)] hover:bg-[var(--page,#FAF5EA)] text-[var(--ink,#0E1A2B)] whitespace-nowrap cursor-pointer"
                      >
                        Edit hours
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveHours}
                          disabled={isSavingHours}
                          className="px-3 py-1.5 text-xs font-bold rounded-full bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white whitespace-nowrap cursor-pointer"
                        >
                          {isSavingHours ? 'Saving...' : 'Save hours'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditedFeatures(selectedAnalysis.pagesAndFeatures || []);
                            setIsEditingHours(false);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] whitespace-nowrap cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Identical confidence note if applicable */}
                {identicalConfidenceCheck && (
                  <p className="text-[12px] text-[var(--muted,#5B6676)] bg-[var(--page,#FAF5EA)] p-2.5 rounded-xl border border-[var(--line,#E8E0CF)]">
                    Confidence is the same across all tasks. Add more detail to the brief for better estimates.
                  </p>
                )}

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--line,#E8E0CF)] text-[var(--muted,#5B6676)] font-semibold text-[11px] uppercase tracking-wider">
                        <th scope="col" className="py-2.5 pr-4 font-semibold">Task</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-center w-28">Complexity</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-center w-24">Confidence</th>
                        <th scope="col" className="py-2.5 pl-3 font-semibold text-right w-24">Hours</th>
                        {isEditingHours && <th scope="col" className="w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line,#E8E0CF)]">
                      {editedFeatures.map((feat, idx) => {
                        const comp = (feat.complexity || 'medium').toLowerCase();
                        const isSimple = comp === 'simple';
                        const isComplex = comp === 'complex';

                        return (
                          <tr key={idx} className="hover:bg-[var(--page,#FAF5EA)]/40 transition-colors">
                            {/* Task Column (full width, wraps to 2 lines without truncation) */}
                            <td className="py-3 pr-4 font-medium text-[var(--ink,#0E1A2B)] leading-relaxed">
                              {isEditingHours ? (
                                <input
                                  type="text"
                                  value={feat.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditedFeatures((prev) => {
                                      const copy = [...prev];
                                      copy[idx] = { ...copy[idx], name: val };
                                      return copy;
                                    });
                                  }}
                                  className="w-full px-2 py-1 text-xs rounded border border-[var(--line,#E8E0CF)] font-medium"
                                />
                              ) : (
                                <span>{feat.name}</span>
                              )}
                            </td>

                            {/* Complexity Pill */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                                style={{
                                  backgroundColor: isSimple
                                    ? 'var(--success-tint, #E7F6EC)'
                                    : isComplex
                                    ? 'var(--error-tint, #FEE4E2)'
                                    : 'var(--warning-tint, #FEF0C7)',
                                  color: isSimple
                                    ? 'var(--success, #067647)'
                                    : isComplex
                                    ? 'var(--error, #B42318)'
                                    : 'var(--warning, #B54708)',
                                }}
                              >
                                {formatComplexity(feat.complexity)}
                              </span>
                            </td>

                            {/* Confidence 3-Bar Indicator */}
                            <td className="py-3 px-3 text-center">
                              {renderConfidenceBars(feat.confidence)}
                            </td>

                            {/* Hours (Tabular figures, right-aligned) */}
                            <td className="py-3 pl-3 text-right tabular-nums font-semibold text-[var(--ink,#0E1A2B)]">
                              {isEditingHours ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={feat.hours}
                                    onChange={(e) => handleFeatureHourChange(idx, e.target.value)}
                                    className="w-16 px-1.5 py-1 text-right text-xs font-bold border border-[var(--cobalt,#0047AB)] rounded"
                                  />
                                  <span className="text-[10px] text-[var(--muted,#5B6676)]">h</span>
                                </div>
                              ) : (
                                <span>{feat.hours} hrs</span>
                              )}
                            </td>

                            {/* Delete row button in edit mode */}
                            {isEditingHours && (
                              <td className="py-3 pl-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(idx)}
                                  aria-label={`Delete task ${feat.name}`}
                                  className="p-1 text-[var(--muted,#5B6676)] hover:text-[var(--error,#B42318)]"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add task button in edit mode */}
                {isEditingHours && (
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="w-full py-2 border border-dashed border-[var(--line,#E8E0CF)] rounded-xl text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add task</span>
                  </button>
                )}
              </div>

              {/* =============================================================
                  5. DELIVERABLES AND EXCLUSIONS (Two columns)
                  ============================================================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Included deliverables */}
                <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--line,#E8E0CF)]">
                    <h4
                      className="text-[16px] font-bold text-[var(--ink,#0E1A2B)]"
                      style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                    >
                      Included deliverables
                    </h4>
                    {!isEditingDeliverables ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingDeliverables(true)}
                        className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveDeliverables}
                          className="text-xs font-bold text-[var(--cobalt,#0047AB)] hover:underline"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditedDeliverables(selectedAnalysis.deliverables || []);
                            setIsEditingDeliverables(false);
                          }}
                          className="text-xs text-[var(--muted,#5B6676)] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <ul className="text-xs space-y-2 text-[var(--ink,#0E1A2B)]">
                    {editedDeliverables.map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--success,#067647)] shrink-0 mt-0.5" />
                        {isEditingDeliverables ? (
                          <input
                            type="text"
                            value={d}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedDeliverables((prev) => {
                                const copy = [...prev];
                                copy[i] = val;
                                return copy;
                              });
                            }}
                            className="w-full px-2 py-0.5 border border-[var(--line,#E8E0CF)] rounded text-xs"
                          />
                        ) : (
                          <span className="leading-relaxed">{d}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Not included (Out of scope) */}
                <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--line,#E8E0CF)]">
                    <div>
                      <h4
                        className="text-[16px] font-bold text-[var(--ink,#0E1A2B)]"
                        style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                      >
                        Not included
                      </h4>
                      <p className="text-[11px] text-[var(--muted,#5B6676)] mt-0.5">
                        These will appear in the proposal so scope creep is easy to handle.
                      </p>
                    </div>

                    {!isEditingExclusions ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingExclusions(true)}
                        className="text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:underline shrink-0"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleSaveExclusions}
                          className="text-xs font-bold text-[var(--cobalt,#0047AB)] hover:underline"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditedExclusions(selectedAnalysis.exclusions || []);
                            setIsEditingExclusions(false);
                          }}
                          className="text-xs text-[var(--muted,#5B6676)] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <ul className="text-xs space-y-2 text-[var(--ink,#0E1A2B)]">
                    {editedExclusions.map((e, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <X className="w-4 h-4 text-[var(--muted,#5B6676)] shrink-0 mt-0.5" />
                        {isEditingExclusions ? (
                          <input
                            type="text"
                            value={e}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedExclusions((prev) => {
                                const copy = [...prev];
                                copy[i] = val;
                                return copy;
                              });
                            }}
                            className="w-full px-2 py-0.5 border border-[var(--line,#E8E0CF)] rounded text-xs"
                          />
                        ) : (
                          <span className="leading-relaxed">{e}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* =============================================================
                  6. STICKY ACTION BAR (sticks to bottom of viewport)
                  ============================================================= */}
              <div className="sticky bottom-4 z-20 bg-white border border-[var(--line,#E8E0CF)] rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-[var(--ink,#0E1A2B)]">
                  <span className="font-extrabold" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
                    {currentTotalHours} hrs
                  </span>
                  <span>·</span>
                  <span className="text-[var(--muted,#5B6676)]">Recommended quote</span>
                  <span
                    className="text-[17px] font-extrabold text-[var(--cobalt,#0047AB)]"
                    style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                  >
                    {format(floorCalculation.recommendedQuote)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedAnalysis.rawText) {
                        setRawText(selectedAnalysis.rawText);
                        if (textareaRef.current) textareaRef.current.focus();
                      }
                    }}
                    className="px-3 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors"
                  >
                    Re-analyze
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyScope}
                    className="px-3 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy scope</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/proposals/new?analysisId=${selectedAnalysis.id}`)}
                    disabled={questionStats.hasUnresolved}
                    title={questionStats.hasUnresolved ? 'Resolve or skip remaining questions first' : 'Generate proposal'}
                    className="h-11 px-5 rounded-full text-[14px] font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
                    onMouseEnter={(e) => {
                      if (!questionStats.hasUnresolved) e.currentTarget.style.backgroundColor = 'var(--cobalt-dark, #003A8C)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cobalt, #0047AB)';
                    }}
                  >
                    <span>Generate proposal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* =============================================================
               EMPTY STATE: No analysis selected
               ============================================================= */
            <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] p-10 sm:p-14 text-center space-y-6">
              {/* Floor Line Graphic */}
              <div className="w-20 h-10 mx-auto relative flex items-center justify-center" aria-hidden="true">
                <div className="w-full border-t-2 border-dashed border-[var(--sun,#FFC72C)]" />
                <div className="absolute w-8 h-8 rounded-lg bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] flex items-center justify-center font-bold text-xs">
                  FL
                </div>
              </div>

              <div>
                <h3
                  className="text-[22px] font-extrabold text-[var(--ink,#0E1A2B)]"
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  Turn a client message into a scoped proposal
                </h3>
                <p className="text-[14px] text-[var(--muted,#5B6676)] mt-1.5 max-w-md mx-auto">
                  Extract actionable tasks, resolve client ambiguities, and enforce your floor price safeguards.
                </p>
              </div>

              {/* 3 Bullet Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs">
                <div className="p-3.5 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)]">
                  <span className="font-bold text-[var(--cobalt,#0047AB)] block mb-1">1. Paste text</span>
                  <span className="text-[var(--muted,#5B6676)]">Email thread, WhatsApp message or rough notes.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)]">
                  <span className="font-bold text-[var(--cobalt,#0047AB)] block mb-1">2. Extract scope</span>
                  <span className="text-[var(--muted,#5B6676)]">Tasks, deliverables, exclusions and gaps.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)]">
                  <span className="font-bold text-[var(--cobalt,#0047AB)] block mb-1">3. Floor check</span>
                  <span className="text-[var(--muted,#5B6676)]">Automatic price calibration against your floor.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRawText(EXAMPLE_BRIEF);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="px-5 py-2.5 rounded-full border border-[var(--line,#E8E0CF)] bg-white hover:bg-[var(--page,#FAF5EA)] text-[13px] font-semibold text-[var(--cobalt,#0047AB)] transition-colors cursor-pointer"
              >
                Use an example brief
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

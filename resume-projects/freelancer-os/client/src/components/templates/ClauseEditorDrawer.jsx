import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Plus,
  Check,
  History,
  AlertTriangle,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  KNOWN_VARIABLES,
  SAMPLE_VARIABLE_DATA,
  extractVariables,
  resolveVariables,
} from '../../utils/variableResolver';

const CATEGORIES = [
  'Payment',
  'Scope and changes',
  'Delivery and reviews',
  'Ownership and IP',
  'Third-party costs',
  'Support and warranty',
  'Legal',
  'Other',
];

export function ClauseEditorDrawer({
  isOpen,
  clause,
  onClose,
  onSave,
  onRestoreVersion,
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Payment');
  const [body, setBody] = useState('');
  const [defaultOn, setDefaultOn] = useState(true);
  const [appliesTo, setAppliesTo] = useState(['proposals']);
  const [previewMode, setPreviewMode] = useState('sample'); // 'sample' | 'highlight'
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState(null);

  const textareaRef = useRef(null);
  const drawerRef = useRef(null);
  const initialSnapshotRef = useRef(null);

  // Initialize form when clause changes
  useEffect(() => {
    if (isOpen) {
      const initial = {
        title: clause?.title || '',
        category: clause?.category || 'Payment',
        body: clause?.body || '',
        defaultOn: clause?.defaultOn ?? true,
        appliesTo: clause?.appliesTo || ['proposals'],
      };
      setTitle(initial.title);
      setCategory(initial.category);
      setBody(initial.body);
      setDefaultOn(initial.defaultOn);
      setAppliesTo(initial.appliesTo);
      initialSnapshotRef.current = JSON.stringify(initial);
      setSelectedHistoryVersion(null);
      setShowHistory(false);

      // Focus first input
      setTimeout(() => {
        const input = drawerRef.current?.querySelector('input[type="text"]');
        input?.focus();
      }, 50);
    }
  }, [isOpen, clause]);

  // Check dirty state
  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    const current = JSON.stringify({ title, category, body, defaultOn, appliesTo });
    return current !== initialSnapshotRef.current;
  }, [title, category, body, defaultOn, appliesTo]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  const handleAttemptClose = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmDiscard) return;
    }
    onClose();
  };

  // Insert variable at cursor
  const handleInsertVariable = (varKey) => {
    const token = `{{${varKey}}}`;
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => `${prev} ${token}`);
      setShowVariableMenu(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = body.substring(0, start);
    const after = body.substring(end);
    const newText = `${before}${token}${after}`;
    setBody(newText);
    setShowVariableMenu(false);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + token.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  // Extract variables & validate unknown variables
  const usedVars = useMemo(() => extractVariables(body), [body]);
  const unknownVars = useMemo(() => {
    const validKeys = new Set(KNOWN_VARIABLES.map((v) => v.key));
    return usedVars.filter((v) => !validKeys.has(v));
  }, [usedVars]);

  // Live preview text
  const resolvedPreviewText = useMemo(() => {
    return resolveVariables(body, SAMPLE_VARIABLE_DATA, true);
  }, [body]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a title for the clause');
      return;
    }
    if (!body.trim()) {
      alert('Please enter clause text');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        category,
        body: body.trim(),
        defaultOn,
        appliesTo,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save clause');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clause-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0E1A2B]/40 backdrop-blur-xs transition-opacity"
        onClick={handleAttemptClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col z-10 border-l border-[var(--line,#E8E0CF)] animate-slide-in font-['Instrument_Sans',sans-serif]"
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-[var(--line,#E8E0CF)] flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2
              id="clause-drawer-title"
              className="text-[18px] font-bold text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]"
            >
              {clause ? 'Edit clause' : 'Add new clause'}
            </h2>
            <p className="text-[13px] text-[var(--muted,#5B6676)]">
              Configure contract text and live dynamic variables.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            aria-label="Close drawer"
            className="p-2 text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] rounded-xl transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Title Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="clause-title" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)]">
                Title <span className="text-[var(--error,#B42318)]">*</span>
              </label>
              <span className="text-[12px] text-[var(--muted,#5B6676)] tabular-nums">{title.length}/100</span>
            </div>
            <input
              id="clause-title"
              type="text"
              maxLength={100}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deposit and milestone schedule"
              className="w-full h-10 px-3.5 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] text-[var(--ink,#0E1A2B)] bg-white placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] transition-all"
            />
          </div>

          {/* Category Select */}
          <div>
            <label htmlFor="clause-category" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] block mb-1.5">
              Category
            </label>
            <select
              id="clause-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-[var(--line,#E8E0CF)] text-[14px] font-medium text-[var(--ink,#0E1A2B)] bg-white outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Clause Text with Variable Inserter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="clause-body" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)]">
                Clause text <span className="text-[var(--error,#B42318)]">*</span>
              </label>
              <span className="text-[12px] text-[var(--muted,#5B6676)] tabular-nums">{body.length}/2,000</span>
            </div>

            {/* Variable Inserter Toolbar */}
            <div className="mb-2 relative">
              <button
                type="button"
                onClick={() => setShowVariableMenu(!showVariableMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt,#0047AB)] hover:text-white transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insert variable</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {/* Variable Quick Dropdown */}
              {showVariableMenu && (
                <div className="absolute top-9 left-0 z-30 w-72 max-h-64 overflow-y-auto bg-white border border-[var(--line,#E8E0CF)] rounded-xl shadow-xl p-2 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#5B6676)] px-2 py-1">
                    Available tokens
                  </div>
                  {KNOWN_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-[var(--cobalt-tint,#E8F0FB)] flex items-center justify-between group cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-[var(--cobalt,#0047AB)] font-semibold">{`{{${v.key}}}`}</span>
                      <span className="text-[11px] text-[var(--muted,#5B6676)] group-hover:text-[var(--ink,#0E1A2B)]">
                        {v.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              id="clause-body"
              ref={textareaRef}
              rows={6}
              maxLength={2000}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter standard terms. Insert dynamic variables like {{payment_schedule}} or {{review_days}}..."
              className="w-full p-3.5 rounded-xl border border-[var(--line,#E8E0CF)] text-[14px] leading-relaxed text-[var(--ink,#0E1A2B)] bg-white placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] transition-all font-sans"
            />

            {/* Unknown Variable Warning */}
            {unknownVars.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-[var(--warning-tint,#FEF0C7)] border border-[var(--warning,#B54708)]/30 text-xs text-[var(--warning,#B54708)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Unrecognized variable token(s):{' '}
                  <strong>{unknownVars.map((u) => `{{${u}}}`).join(', ')}</strong>. Please select from supported
                  variables.
                </span>
              </div>
            )}
          </div>

          {/* Include in new proposals switch */}
          <div className="p-3.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)]/40 flex items-center justify-between gap-4">
            <div>
              <label htmlFor="clause-default-switch" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)] block cursor-pointer">
                Include in new proposals
              </label>
              <p className="text-[12px] text-[var(--muted,#5B6676)]">
                Pre-selects this clause in the Proposal Builder's Terms section by default.
              </p>
            </div>
            <button
              id="clause-default-switch"
              type="button"
              role="switch"
              aria-checked={defaultOn}
              onClick={() => setDefaultOn(!defaultOn)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 shrink-0 ${
                defaultOn ? 'bg-[var(--cobalt,#0047AB)]' : 'bg-[var(--line,#E8E0CF)]'
              }`}
            >
              <span
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  defaultOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Applies To Checkboxes */}
          <div>
            <span className="text-[13px] font-semibold text-[var(--ink,#0E1A2B)] block mb-2">Applies to:</span>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-[var(--ink,#0E1A2B)]">
              {[
                { id: 'proposals', label: 'Proposals' },
                { id: 'invoices', label: 'Invoices' },
                { id: 'change_orders', label: 'Change orders' },
              ].map((item) => {
                const checked = appliesTo.includes(item.id);
                return (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAppliesTo([...appliesTo, item.id]);
                        } else {
                          setAppliesTo(appliesTo.filter((x) => x !== item.id));
                        }
                      }}
                      className="rounded border-[var(--line,#E8E0CF)] text-[var(--cobalt,#0047AB)] focus:ring-[var(--cobalt,#0047AB)]"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Live Preview with Sample Data */}
          <div className="pt-2 border-t border-[var(--line,#E8E0CF)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-[var(--ink,#0E1A2B)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
                Live preview with sample data
              </span>
              <span className="text-[11px] text-[var(--muted,#5B6676)]">Variables resolve dynamically</span>
            </div>
            <div className="p-3.5 rounded-xl border-l-3 border-[var(--cobalt,#0047AB)] bg-[var(--page,#FAF5EA)]/40 border border-[var(--line,#E8E0CF)] text-xs text-[var(--ink,#0E1A2B)] leading-relaxed whitespace-pre-line">
              {resolvedPreviewText || <span className="text-[var(--muted,#5B6676)] italic">Clause text will appear here...</span>}
            </div>
          </div>

          {/* Version History (Last 5 Versions) */}
          {clause?.history && clause.history.length > 0 && (
            <div className="pt-2 border-t border-[var(--line,#E8E0CF)]">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] transition-colors cursor-pointer py-1"
              >
                <div className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
                  <span>Version history ({clause.history.length} saved)</span>
                </div>
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHistory && (
                <div className="mt-2 space-y-2">
                  {clause.history.map((hist, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--ink,#0E1A2B)]">
                          v{hist.version} · {hist.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--muted,#5B6676)]">
                            {new Date(hist.savedAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Restore clause to v${hist.version}?`)) {
                                onRestoreVersion(clause.id, hist.version);
                                onClose();
                              }
                            }}
                            className="text-[11px] font-semibold text-[var(--cobalt,#0047AB)] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--muted,#5B6676)] line-clamp-2">{hist.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-[var(--line,#E8E0CF)] bg-white space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 text-[14px] font-medium text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !body.trim()}
              className="h-10 px-5 rounded-full text-[14px] font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white disabled:bg-[var(--cobalt-tint,#E8F0FB)] disabled:text-[var(--muted,#5B6676)] disabled:cursor-not-allowed transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save clause'}
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted,#5B6676)] text-center pt-1 border-t border-[var(--line,#E8E0CF)]/60">
            These are starting points, not legal advice. Have a lawyer review them for your country before you rely on them.
          </p>
        </footer>
      </div>
    </div>
  );
}

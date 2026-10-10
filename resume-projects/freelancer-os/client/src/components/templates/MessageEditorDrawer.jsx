import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Plus,
  Send,
  History,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  KNOWN_VARIABLES,
  SAMPLE_VARIABLE_DATA,
  extractVariables,
  resolveVariables,
} from '../../utils/variableResolver';

export function MessageEditorDrawer({
  isOpen,
  template,
  onClose,
  onSave,
  onRestoreDefault,
  onRestoreVersion,
  onSendTest,
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const textareaRef = useRef(null);
  const drawerRef = useRef(null);
  const initialSnapshotRef = useRef(null);

  useEffect(() => {
    if (isOpen && template) {
      const initial = {
        subject: template.subject || '',
        body: template.body || '',
      };
      setSubject(initial.subject);
      setBody(initial.body);
      initialSnapshotRef.current = JSON.stringify(initial);
      setShowHistory(false);

      setTimeout(() => {
        const input = drawerRef.current?.querySelector('input[type="text"]');
        input?.focus();
      }, 50);
    }
  }, [isOpen, template]);

  const isDirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return JSON.stringify({ subject, body }) !== initialSnapshotRef.current;
  }, [subject, body]);

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

  const usedVars = useMemo(() => extractVariables(`${subject} ${body}`), [subject, body]);
  const unknownVars = useMemo(() => {
    const validKeys = new Set(KNOWN_VARIABLES.map((v) => v.key));
    return usedVars.filter((v) => !validKeys.has(v));
  }, [usedVars]);

  const resolvedPreviewSubject = useMemo(() => {
    return resolveVariables(subject, SAMPLE_VARIABLE_DATA, true);
  }, [subject]);

  const resolvedPreviewBody = useMemo(() => {
    return resolveVariables(body, SAMPLE_VARIABLE_DATA, true);
  }, [body]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Please enter an email subject line');
      return;
    }
    if (!body.trim()) {
      alert('Please enter an email body message');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(template.key, {
        subject: subject.trim(),
        body: body.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save message template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestClick = async () => {
    setIsSendingTest(true);
    try {
      await onSendTest(template.key);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen || !template) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-drawer-title"
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
              id="message-drawer-title"
              className="text-[18px] font-bold text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]"
            >
              Edit message: {template.title}
            </h2>
            <p className="text-[13px] text-[var(--muted,#5B6676)]">
              Default wording used for outgoing client emails and notifications.
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
          {/* Subject Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="message-subject" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)]">
                Subject line <span className="text-[var(--error,#B42318)]">*</span>
              </label>
              <span className="text-[12px] text-[var(--muted,#5B6676)] tabular-nums">{subject.length}/200</span>
            </div>
            <input
              id="message-subject"
              type="text"
              maxLength={200}
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Proposal: {{project_title}} from {{business_name}}"
              className="w-full h-10 px-3.5 rounded-xl border border-[var(--line,#E8E0CF)] text-[15px] text-[var(--ink,#0E1A2B)] bg-white placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] transition-all"
            />
          </div>

          {/* Body with Variable Inserter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="message-body" className="text-[14px] font-semibold text-[var(--ink,#0E1A2B)]">
                Email body <span className="text-[var(--error,#B42318)]">*</span>
              </label>
              <span className="text-[12px] text-[var(--muted,#5B6676)] tabular-nums">{body.length}/4,000</span>
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
              id="message-body"
              ref={textareaRef}
              rows={9}
              maxLength={4000}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{client_name}},&#10;&#10;Here are the project milestones..."
              className="w-full p-3.5 rounded-xl border border-[var(--line,#E8E0CF)] text-[14px] leading-relaxed text-[var(--ink,#0E1A2B)] bg-white placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 focus-visible:border-[var(--cobalt,#0047AB)] transition-all font-sans"
            />

            {unknownVars.length > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-[var(--warning-tint,#FEF0C7)] border border-[var(--warning,#B54708)]/30 text-xs text-[var(--warning,#B54708)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Unrecognized variable token(s):{' '}
                  <strong>{unknownVars.map((u) => `{{${u}}}`).join(', ')}</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="pt-2 border-t border-[var(--line,#E8E0CF)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[var(--ink,#0E1A2B)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
                Preview with sample data
              </span>
              <button
                type="button"
                onClick={handleSendTestClick}
                disabled={isSendingTest}
                className="text-[11px] font-semibold text-[var(--cobalt,#0047AB)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{isSendingTest ? 'Sending...' : 'Send test to me'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)]/40 text-xs space-y-2">
              <div className="border-b border-[var(--line,#E8E0CF)] pb-2 font-semibold text-[var(--ink,#0E1A2B)]">
                Subject: {resolvedPreviewSubject}
              </div>
              <p className="text-[var(--ink,#0E1A2B)] leading-relaxed whitespace-pre-line font-medium">
                {resolvedPreviewBody}
              </p>
            </div>
          </div>

          {/* Version History */}
          {template.history && template.history.length > 0 && (
            <div className="pt-2 border-t border-[var(--line,#E8E0CF)]">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] transition-colors cursor-pointer py-1"
              >
                <div className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
                  <span>Version history ({template.history.length} saved)</span>
                </div>
                {showHistory ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showHistory && (
                <div className="mt-2 space-y-2">
                  {template.history.map((hist, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--ink,#0E1A2B)]">
                          v{hist.version} · {hist.subject}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--muted,#5B6676)]">
                            {new Date(hist.savedAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Restore template to v${hist.version}?`)) {
                                onRestoreVersion(template.key, hist.version);
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
        <footer className="px-6 py-4 border-t border-[var(--line,#E8E0CF)] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset this message to Floorly standard defaults?')) {
                  onRestoreDefault(template.key);
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] rounded-lg transition-colors cursor-pointer"
            >
              Restore default
            </button>
          </div>

          <div className="flex items-center gap-3">
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
              disabled={isSubmitting || !subject.trim() || !body.trim()}
              className="h-10 px-5 rounded-full text-[14px] font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white disabled:bg-[var(--cobalt-tint,#E8F0FB)] disabled:text-[var(--muted,#5B6676)] disabled:cursor-not-allowed transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save message'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

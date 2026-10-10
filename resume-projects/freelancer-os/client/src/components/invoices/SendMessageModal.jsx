import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Copy,
  Check,
  Send,
  Sparkles,
  AlertCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';
import { resolveVariables, buildVariableContext } from '../../utils/variableResolver';

export function SendMessageModal({
  isOpen,
  onClose,
  invoice,
  client,
  user,
  initialTemplateKey = 'send_invoice', // 'send_invoice' | 'payment_reminder_friendly' | 'payment_reminder_firm' | 'payment_received'
  onSuccess,
}) {
  const modalRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const [templateKey, setTemplateKey] = useState(initialTemplateKey);
  const [templates, setTemplates] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    setTemplateKey(initialTemplateKey);
  }, [initialTemplateKey]);

  // Load message templates
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function load() {
      try {
        const res = await api.getMessageTemplates();
        if (isMounted && res?.templates) {
          setTemplates(res.templates);
        }
      } catch (err) {
        console.error('Failed to load message templates:', err);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [isOpen]);

  // When templateKey or templates or invoice changes, compute resolved text
  useEffect(() => {
    if (!isOpen) return;

    const effectiveClient = client || invoice?.client || invoice?.clientId || {};
    const context = buildVariableContext({ invoice, user, client: effectiveClient });

    setRecipient(effectiveClient.email || '');

    const currentTpl = templates.find((t) => t.key === templateKey);
    if (currentTpl) {
      setSubject(resolveVariables(currentTpl.subject, context));
      setBody(resolveVariables(currentTpl.body, context));
    } else {
      // Fallback defaults if templates not loaded yet
      if (templateKey === 'send_invoice') {
        setSubject(`Invoice ${invoice?.invoiceNumber || ''} from ${user?.businessName || user?.name || 'Studio Labs'}`);
        setBody(`Hi ${effectiveClient.contactPerson || effectiveClient.name || 'there'},\n\nPlease find invoice ${invoice?.invoiceNumber || ''} attached for your records. The balance of ${context.balance_due || '$0'} is due by ${context.due_date || 'the due date'}.\n\nThank you,\n${user?.name || user?.businessName || ''}`);
      } else if (templateKey === 'payment_reminder_friendly') {
        setSubject(`Friendly reminder: Invoice ${invoice?.invoiceNumber || ''} is due`);
        setBody(`Hi ${effectiveClient.contactPerson || effectiveClient.name || 'there'},\n\nJust a quick, polite note that invoice ${invoice?.invoiceNumber || ''} for ${context.balance_due || '$0'} is due on ${context.due_date || 'soon'}.\n\nThank you,\n${user?.name || user?.businessName || ''}`);
      } else if (templateKey === 'payment_reminder_firm') {
        setSubject(`Urgent: Invoice ${invoice?.invoiceNumber || ''} is overdue`);
        setBody(`Hi ${effectiveClient.contactPerson || effectiveClient.name || 'there'},\n\nInvoice ${invoice?.invoiceNumber || ''} is now ${context.days_overdue || 'several'} days overdue. Please settle the outstanding balance of ${context.balance_due || '$0'} immediately.\n\nThank you,\n${user?.name || user?.businessName || ''}`);
      } else if (templateKey === 'payment_received') {
        setSubject(`Payment received for invoice ${invoice?.invoiceNumber || ''}`);
        setBody(`Hi ${effectiveClient.contactPerson || effectiveClient.name || 'there'},\n\nThank you! We have received your payment for invoice ${invoice?.invoiceNumber || ''}.\n\nBest regards,\n${user?.name || user?.businessName || ''}`);
      }
    }
  }, [isOpen, templateKey, templates, invoice, client, user]);

  // Focus trap & Escape listener
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
      if (previouslyFocusedRef.current?.focus) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      const fullText = `To: ${recipient}\nSubject: ${subject}\n\n${body}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setStatusMsg({ type: 'success', text: 'Message copied to clipboard' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to copy to clipboard' });
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setStatusMsg(null);
    try {
      // Check if backend email delivery is configured
      // Or construct mailto fallback
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
      setStatusMsg({ type: 'success', text: 'Email client opened with pre-filled message.' });
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to dispatch email' });
    } finally {
      setIsSending(false);
    }
  };

  const isReminderType = initialTemplateKey.includes('reminder');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-dialog-title"
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-[#E8E0CF] shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E8E0CF] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#E8F0FB] text-[#0047AB] flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </span>
              <h2
                id="message-dialog-title"
                className="text-lg font-bold text-[#0E1A2B]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                {isReminderType ? 'Send payment reminder' : 'Send invoice to client'}
              </h2>
            </div>
            <p className="text-xs text-[#5B6676] mt-1">
              Formatted using your message templates from{' '}
              <a href="/templates?tab=messages" className="text-[#0047AB] font-semibold underline underline-offset-2">
                Templates &gt; Messages
              </a>
              . Variables are automatically resolved.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5B6676] hover:bg-[#FAF5EA] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Tabs if reminder */}
        {isReminderType && (
          <div className="px-6 pt-3 pb-0 flex items-center gap-2 border-b border-[#E8E0CF] bg-[#FAF5EA]/50">
            <span className="text-xs font-semibold text-[#5B6676] mr-2">Tone:</span>
            <button
              onClick={() => setTemplateKey('payment_reminder_friendly')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                templateKey === 'payment_reminder_friendly'
                  ? 'border-[#0047AB] text-[#0047AB]'
                  : 'border-transparent text-[#5B6676] hover:text-[#0E1A2B]'
              }`}
            >
              Friendly reminder
            </button>
            <button
              onClick={() => setTemplateKey('payment_reminder_firm')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                templateKey === 'payment_reminder_firm'
                  ? 'border-[#0047AB] text-[#0047AB]'
                  : 'border-transparent text-[#5B6676] hover:text-[#0E1A2B]'
              }`}
            >
              Firm reminder
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-[#E7F6EC] text-[#067647] border border-[#067647]/20'
                  : 'bg-[#FEE4E2] text-[#B42318] border border-[#B42318]/20'
              }`}
            >
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0E1A2B] mb-1">
              Recipient email
            </label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="client@company.com"
              className="w-full h-10 px-3.5 rounded-xl border border-[#E8E0CF] bg-white text-sm text-[#0E1A2B] focus:outline-none focus:ring-2 focus:ring-[#0047AB] transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0E1A2B] mb-1">
              Subject line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-[#E8E0CF] bg-white text-sm text-[#0E1A2B] focus:outline-none focus:ring-2 focus:ring-[#0047AB] transition-shadow"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#0E1A2B]">
                Message body
              </label>
              <span className="text-[11px] text-[#5B6676]">Plain text with resolved tokens</span>
            </div>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#E8E0CF] bg-white text-sm text-[#0E1A2B] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0047AB] transition-shadow resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[#E8E0CF] bg-[#FAF5EA]/50 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="h-10 px-4 rounded-xl border border-[#E8E0CF] bg-white hover:bg-[#FAF5EA] text-xs font-semibold text-[#0E1A2B] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#067647]" /> : <Copy className="w-3.5 h-3.5 text-[#5B6676]" />}
            <span>{copied ? 'Copied' : 'Copy message'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-[#E8E0CF] bg-white hover:bg-[#FAF5EA] text-xs font-semibold text-[#5B6676] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !recipient}
              className="h-10 px-5 rounded-xl bg-[#0047AB] hover:bg-[#003A8C] disabled:bg-[#0047AB]/40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Open email app</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

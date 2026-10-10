import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Paperclip,
  Trash2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Loader2,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../../utils/profitEngine';

export function ExpenseDrawer({
  isOpen,
  onClose,
  expense = null,
  projects = [],
  onSave,
  onDelete = null,
  defaultCurrency = 'USD',
}) {
  const drawerRef = useRef(null);
  const firstInputRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  const isEditing = Boolean(expense?.id || expense?._id);

  // Form State
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [billableToClient, setBillableToClient] = useState(false);
  const [markupPercent, setMarkupPercent] = useState('0');
  const [billedOnInvoice, setBilledOnInvoice] = useState('');
  const [recurringInterval, setRecurringInterval] = useState('none');
  const [recurringNextDate, setRecurringNextDate] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');

  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing or resetting
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setAmount(String(expense.amount || ''));
        setCurrency(expense.currency || defaultCurrency);
        setDate(expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setCategory(expense.category || EXPENSE_CATEGORIES[0]);
        setVendor(expense.vendor || '');
        setDescription(expense.description || '');
        setProjectId(expense.projectId?._id || expense.projectId || expense.project?._id || expense.project || '');
        setBillableToClient(Boolean(expense.billableToClient));
        setMarkupPercent(String(expense.markupPercent ?? 0));
        setBilledOnInvoice(expense.billedOnInvoice || '');
        setRecurringInterval(expense.recurring?.interval || 'none');
        setRecurringNextDate(
          expense.recurring?.nextDate
            ? new Date(expense.recurring.nextDate).toISOString().split('T')[0]
            : ''
        );
        setTaxDeductible(expense.taxDeductible !== undefined ? Boolean(expense.taxDeductible) : true);
        setPaymentMethod(expense.paymentMethod || 'card');
        setNotes(expense.notes || '');
        setReceiptPreview(expense.receiptUrl || '');
        setReceiptFile(null);
      } else {
        // Reset form for fresh expense
        setAmount('');
        setCurrency(defaultCurrency);
        setDate(new Date().toISOString().split('T')[0]);
        setCategory(EXPENSE_CATEGORIES[0]);
        setVendor('');
        setDescription('');
        setProjectId('');
        setBillableToClient(false);
        setMarkupPercent('0');
        setBilledOnInvoice('');
        setRecurringInterval('none');
        setRecurringNextDate('');
        setTaxDeductible(true);
        setPaymentMethod('card');
        setNotes('');
        setReceiptPreview('');
        setReceiptFile(null);
      }
      setErrors({});
    }
  }, [isOpen, expense, defaultCurrency]);

  // Focus trap and accessibility
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement;
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        if (e.key === 'Tab' && drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
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
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        if (previouslyFocusedElementRef.current?.focus) {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: 'Receipt file must be under 10 MB' }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.receipt;
      return next;
    });

    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    } else {
      setReceiptPreview(file.name);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview('');
  };

  const validate = () => {
    const nextErrors = {};
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      nextErrors.amount = 'Please enter a valid amount greater than 0';
    }
    if (!description.trim()) {
      nextErrors.description = 'Description is required';
    }
    if (!date) {
      nextErrors.date = 'Date is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        currency,
        date: new Date(date).toISOString(),
        category,
        vendor: vendor.trim(),
        description: description.trim(),
        projectId: projectId || null,
        billableToClient: Boolean(billableToClient),
        markupPercent: billableToClient ? parseFloat(markupPercent) || 0 : 0,
        billedOnInvoice: billedOnInvoice.trim(),
        recurring: {
          interval: recurringInterval,
          nextDate:
            recurringInterval !== 'none' && recurringNextDate
              ? new Date(recurringNextDate).toISOString()
              : null,
          isPaused: expense?.recurring?.isPaused || false,
        },
        taxDeductible: Boolean(taxDeductible),
        paymentMethod,
        notes: notes.trim(),
        receiptUrl: receiptPreview && typeof receiptPreview === 'string' && receiptPreview.startsWith('http')
          ? receiptPreview
          : '',
      };

      await onSave(payload, isEditing ? (expense.id || expense._id) : null);

      if (addAnother) {
        setAmount('');
        setDescription('');
        setVendor('');
        setNotes('');
        setReceiptFile(null);
        setReceiptPreview('');
        firstInputRef.current?.focus();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save expense:', err);
      setErrors((prev) => ({ ...prev, form: err.message || 'Failed to save expense' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div
        ref={drawerRef}
        className="w-full sm:max-w-xl md:max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[var(--line,#E8E0CF)]"
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-[var(--line,#E8E0CF)] flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2
              id="expense-drawer-title"
              className="text-lg font-bold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {isEditing ? 'Edit expense' : 'Add expense'}
            </h2>
            <p className="text-xs text-[var(--muted,#5B6676)] mt-0.5">
              {isEditing
                ? 'Update expense details and client billing status'
                : 'Log a cost or subscription to calculate true project profit'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close expense drawer"
            className="p-1.5 rounded-full text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--cobalt-tint,#E8F0FB)] transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Form Body */}
        <form
          id="expense-form"
          onSubmit={(e) => handleSubmit(e, false)}
          className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5"
        >
          {errors.form && (
            <div className="p-3 bg-[var(--error-tint,#FEE4E2)] border border-[var(--error,#B42318)]/20 rounded-xl text-xs text-[var(--error,#B42318)] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Amount + Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="expense-amount"
                className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
              >
                Amount *
              </label>
              <div className="relative">
                <input
                  id="expense-amount"
                  ref={firstInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold text-[var(--ink,#0E1A2B)] tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 ${
                    errors.amount
                      ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)]/20'
                      : 'border-[var(--line,#E8E0CF)] bg-white focus:border-[var(--cobalt,#0047AB)]'
                  }`}
                  required
                />
              </div>
              {errors.amount && (
                <p className="text-[11px] text-[var(--error,#B42318)] mt-1 font-medium">{errors.amount}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="expense-currency"
                className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
              >
                Currency
              </label>
              <select
                id="expense-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm font-semibold text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>

          {/* Description & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expense-vendor"
                className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
              >
                Vendor / Merchant
              </label>
              <input
                id="expense-vendor"
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Figma, Vercel, Adobe, AWS"
                className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)]"
              />
            </div>

            <div>
              <label
                htmlFor="expense-date"
                className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
              >
                Date *
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm text-[var(--ink,#0E1A2B)] tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
                required
              />
              {errors.date && (
                <p className="text-[11px] text-[var(--error,#B42318)] mt-1 font-medium">{errors.date}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="expense-description"
              className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
            >
              Description *
            </label>
            <input
              id="expense-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Annual typography license or database hosting"
              className={`w-full px-3 py-2 rounded-xl border text-sm text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 ${
                errors.description
                  ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)]/20'
                  : 'border-[var(--line,#E8E0CF)] bg-white focus:border-[var(--cobalt,#0047AB)]'
              }`}
              required
            />
            {errors.description && (
              <p className="text-[11px] text-[var(--error,#B42318)] mt-1 font-medium">{errors.description}</p>
            )}
          </div>

          {/* Category & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expense-category"
                className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
              >
                Category
              </label>
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="expense-project"
                className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
              >
                Project allocation
              </label>
              <select
                id="expense-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
              >
                <option value="">General overhead (no project)</option>
                {projects.map((p) => {
                  const pId = p.id || p._id;
                  const cName = p.client?.company || p.client?.name || p.clientId?.company || p.clientId?.name;
                  return (
                    <option key={pId} value={pId}>
                      {p.title} {cName ? `(${cName})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Billable Section (Only when Project is selected or optional) */}
          <div className="rounded-xl border border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)]/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--ink,#0E1A2B)] block">
                  Billable to client
                </span>
                <span className="text-[11px] text-[var(--muted,#5B6676)]">
                  Pass this cost through to your client on their project invoice
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={billableToClient}
                  onChange={(e) => setBillableToClient(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--cobalt,#0047AB)]" />
              </label>
            </div>

            {billableToClient && (
              <div className="pt-2 border-t border-[var(--line,#E8E0CF)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                <div>
                  <label
                    htmlFor="expense-markup"
                    className="block font-semibold text-[var(--ink,#0E1A2B)] mb-1"
                  >
                    Markup percentage (%)
                  </label>
                  <input
                    id="expense-markup"
                    type="number"
                    min="0"
                    step="1"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-xs tabular-nums text-[var(--ink,#0E1A2B)] outline-none focus:border-[var(--cobalt,#0047AB)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="expense-billed-inv"
                    className="block font-semibold text-[var(--ink,#0E1A2B)] mb-1"
                  >
                    Billed status / Invoice #
                  </label>
                  <input
                    id="expense-billed-inv"
                    type="text"
                    value={billedOnInvoice}
                    onChange={(e) => setBilledOnInvoice(e.target.value)}
                    placeholder="e.g. INV-2026-001 (or blank for next invoice)"
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] outline-none focus:border-[var(--cobalt,#0047AB)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recurring & Tax deductible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expense-recurring"
                className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
              >
                Recurring subscription
              </label>
              <select
                id="expense-recurring"
                value={recurringInterval}
                onChange={(e) => {
                  const val = e.target.value;
                  setRecurringInterval(val);
                  if (val !== 'none' && !recurringNextDate) {
                    const next = new Date(date || Date.now());
                    if (val === 'monthly') next.setMonth(next.getMonth() + 1);
                    if (val === 'yearly') next.setFullYear(next.getFullYear() + 1);
                    setRecurringNextDate(next.toISOString().split('T')[0]);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
              >
                <option value="none">One-time expense</option>
                <option value="monthly">Monthly recurring</option>
                <option value="yearly">Yearly recurring</option>
              </select>
            </div>

            {recurringInterval !== 'none' ? (
              <div>
                <label
                  htmlFor="expense-next-date"
                  className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
                >
                  Next renewal date
                </label>
                <input
                  id="expense-next-date"
                  type="date"
                  value={recurringNextDate}
                  onChange={(e) => setRecurringNextDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm text-[var(--ink,#0E1A2B)] tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="expense-payment-method"
                  className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
                >
                  Payment method
                </label>
                <select
                  id="expense-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-sm text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)] cursor-pointer"
                >
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank_transfer">Bank transfer / Wire</option>
                  <option value="paypal">PayPal</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* Tax Deductible Checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="expense-tax-deductible"
              type="checkbox"
              checked={taxDeductible}
              onChange={(e) => setTaxDeductible(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--cobalt,#0047AB)] border-[var(--line,#E8E0CF)] focus:ring-[var(--cobalt,#0047AB)] cursor-pointer"
            />
            <label
              htmlFor="expense-tax-deductible"
              className="text-xs text-[var(--ink,#0E1A2B)] font-medium cursor-pointer"
            >
              Tax-deductible business expense
            </label>
          </div>

          {/* Receipt Attachment */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
              Receipt attachment (PDF, JPG, PNG up to 10 MB)
            </label>
            {receiptPreview ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)]/40 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-4 h-4 text-[var(--cobalt,#0047AB)] shrink-0" />
                  <span className="font-semibold text-[var(--ink,#0E1A2B)] truncate">
                    {receiptFile ? receiptFile.name : 'Attached receipt voucher'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="text-xs text-[var(--error,#B42318)] hover:underline font-semibold ml-2 shrink-0 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-[var(--line,#E8E0CF)] hover:border-[var(--cobalt,#0047AB)] rounded-xl p-4 text-center transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleReceiptChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-5 h-5 mx-auto text-[var(--muted,#5B6676)] mb-1" />
                <p className="text-xs text-[var(--ink,#0E1A2B)] font-medium">
                  Click or drag to attach receipt file
                </p>
                <p className="text-[10px] text-[var(--muted,#5B6676)] mt-0.5">
                  PDF, JPG or PNG (max 10 MB)
                </p>
              </div>
            )}
            <p className="text-[10px] text-[var(--muted,#5B6676)] mt-1">
              Note: Local receipt attachment preview active. Configure S3 bucket in server/.env for cloud archive.
            </p>
            {errors.receipt && (
              <p className="text-[11px] text-[var(--error,#B42318)] mt-1 font-medium">{errors.receipt}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="expense-notes"
              className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1"
            >
              Notes
            </label>
            <textarea
              id="expense-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal bookkeeping notes, transaction ref, or justification"
              className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs text-[var(--ink,#0E1A2B)] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 focus:border-[var(--cobalt,#0047AB)]"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <footer className="px-6 py-4 border-t border-[var(--line,#E8E0CF)] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(expense.id || expense._id)}
                className="text-xs font-semibold text-[var(--error,#B42318)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete expense</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 cursor-pointer"
            >
              Cancel
            </button>

            {!isEditing && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-full border border-[var(--cobalt,#0047AB)] text-xs font-semibold text-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-tint,#E8F0FB)] transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 cursor-pointer"
              >
                Save and add another
              </button>
            )}

            <button
              type="submit"
              form="expense-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold text-white transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--cobalt,#0047AB)]/40 disabled:opacity-50 cursor-pointer shadow-xs"
              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save expense</span>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

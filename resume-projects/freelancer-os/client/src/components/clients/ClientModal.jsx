import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Lock,
  ArrowRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const COUNTRIES = [
  { code: 'US', name: 'United States', taxLabel: 'Tax ID / EIN', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', taxLabel: 'VAT number', currency: 'GBP' },
  { code: 'IN', name: 'India', taxLabel: 'GSTIN / Tax ID', currency: 'INR' },
  { code: 'CA', name: 'Canada', taxLabel: 'BN / GST number', currency: 'CAD' },
  { code: 'AU', name: 'Australia', taxLabel: 'ABN / Tax ID', currency: 'AUD' },
  { code: 'DE', name: 'Germany', taxLabel: 'USt-IdNr / VAT', currency: 'EUR' },
  { code: 'FR', name: 'France', taxLabel: 'TVA / VAT number', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', taxLabel: 'BTW / VAT number', currency: 'EUR' },
  { code: 'SG', name: 'Singapore', taxLabel: 'UEN / GST ID', currency: 'SGD' },
  { code: 'AE', name: 'United Arab Emirates', taxLabel: 'TRN / VAT ID', currency: 'AED' },
  { code: 'OTHER', name: 'Other International', taxLabel: 'Tax ID / VAT number', currency: 'USD' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'AED', 'JPY', 'CHF'];

const PAYMENT_TERMS = [
  { value: 'Due on receipt', label: 'Due on receipt' },
  { value: 'Net 7', label: 'Net 7 days' },
  { value: 'Net 15', label: 'Net 15 days' },
  { value: 'Net 30', label: 'Net 30 days' },
];

export function ClientModal({
  isOpen,
  onClose,
  client = null, // null for Add, client object for Edit
  existingClients = [],
  userPlan = 'starter',
  activeClientsCount = 0,
  onSave,
  onOpenExistingClient,
}) {
  const modalRef = useRef(null);
  const isEdit = Boolean(client?.id || client?._id);

  const isStarter = ['free', 'starter'].includes((userPlan || '').toLowerCase());
  const maxStarterClients = 2;
  const isLimitReached = !isEdit && isStarter && activeClientsCount >= maxStarterClients;

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    country: 'US',
    billingAddress: '',
    taxId: '',
    currency: 'USD',
    paymentTerms: 'Due on receipt',
    status: 'lead',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || client.company || '',
        company: client.company || client.name || '',
        contactPerson: client.contactPerson || '',
        email: client.email || '',
        phone: client.phone || '',
        website: client.website || '',
        country: client.country || 'US',
        billingAddress: client.billingAddress || '',
        taxId: client.taxId || '',
        currency: client.currency || 'USD',
        paymentTerms: client.paymentTerms || 'Due on receipt',
        status: client.status || 'lead',
        notes: client.notes || '',
      });
    } else {
      setFormData({
        name: '',
        company: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        country: 'US',
        billingAddress: '',
        taxId: '',
        currency: 'USD',
        paymentTerms: 'Due on receipt',
        status: 'lead',
        notes: '',
      });
    }
    setErrors({});
    setDuplicateMatch(null);
  }, [client, isOpen]);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Selected country config
  const selectedCountryConfig = COUNTRIES.find((c) => c.code === formData.country) || COUNTRIES[0];
  const taxLabel = selectedCountryConfig.taxLabel;

  // Handle email change and duplicate warning
  const handleEmailChange = (val) => {
    setFormData((prev) => ({ ...prev, email: val }));
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: null }));
    }

    const trimmed = val.trim().toLowerCase();
    if (trimmed) {
      const match = existingClients.find(
        (c) =>
          c.email?.toLowerCase() === trimmed &&
          (!client || (c.id !== client.id && c._id !== client._id))
      );
      setDuplicateMatch(match || null);
    } else {
      setDuplicateMatch(null);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.company.trim() && !formData.name.trim()) {
      errs.company = 'Company or client name is required';
    }
    if (!formData.contactPerson.trim()) {
      errs.contactPerson = 'Contact person name is required';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        name: formData.company.trim() || formData.name.trim(),
        company: formData.company.trim() || formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim(),
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message || 'Failed to save client' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-modal-title"
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:rounded-2xl border-0 sm:border border-[var(--line,#E8E0CF)] shadow-2xl flex flex-col overflow-hidden"
        style={{ color: 'var(--ink, #0E1A2B)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--line,#E8E0CF)] flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2
              id="client-modal-title"
              className="text-lg font-bold text-[var(--ink,#0E1A2B)]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {isEdit ? 'Edit client' : 'Add client'}
            </h2>
            <p className="text-xs text-[var(--muted,#5B6676)]">
              {isEdit ? 'Update details, billing terms and notes.' : 'Add a new client to start sending proposals and tracking payments.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Limit Reached Warning for Starter Plan */}
        {isLimitReached ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-12 h-12 rounded-full bg-[var(--sun-tint,#FFF4CC)] text-[var(--warning,#B54708)] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3
                className="text-base font-bold text-[var(--ink,#0E1A2B)]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Starter plan limit reached
              </h3>
              <p className="text-xs text-[var(--muted,#5B6676)] max-w-md mx-auto">
                You have reached your limit of {maxStarterClients} active clients on the Starter plan. Upgrade to Solo or Pro for unlimited clients, custom branding, and automated invoices.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
              >
                Cancel
              </button>
              <Link
                to="/pricing-rules"
                onClick={onClose}
                className="px-5 py-2 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              >
                Upgrade plan
              </Link>
            </div>
          </div>
        ) : (
          /* Main Form Body */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {errors.submit && (
              <div className="p-3 rounded-xl bg-[var(--error-tint,#FEE4E2)] border border-[var(--error,#B42318)]/20 text-xs font-semibold text-[var(--error,#B42318)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Duplicate email alert */}
            {duplicateMatch && (
              <div className="p-3.5 rounded-xl bg-[var(--sun-tint,#FFF4CC)] border border-[var(--sun,#FFC72C)] text-xs text-[var(--warning,#B54708)] flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">A client with this email already exists: </span>
                    <span className="font-bold">{duplicateMatch.company || duplicateMatch.name}</span>
                  </div>
                </div>
                {onOpenExistingClient && (
                  <button
                    type="button"
                    onClick={() => onOpenExistingClient(duplicateMatch)}
                    className="underline font-bold text-[var(--ink,#0E1A2B)] hover:text-[var(--cobalt,#0047AB)] whitespace-nowrap cursor-pointer"
                  >
                    Open instead
                  </button>
                )}
              </div>
            )}

            {/* Row 1: Company Name & Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Company or client name <span className="text-[var(--error,#B42318)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, company: e.target.value, name: e.target.value }));
                    if (errors.company) setErrors((prev) => ({ ...prev, company: null }));
                  }}
                  placeholder="Acme Studio, Inc."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] ${
                    errors.company
                      ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)]/20'
                      : 'border-[var(--line,#E8E0CF)] bg-white'
                  }`}
                />
                {errors.company && (
                  <p className="text-[11px] text-[var(--error,#B42318)] font-medium mt-1">
                    {errors.company}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Contact person <span className="text-[var(--error,#B42318)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, contactPerson: e.target.value }));
                    if (errors.contactPerson) setErrors((prev) => ({ ...prev, contactPerson: null }));
                  }}
                  placeholder="Sarah Jenkins"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] ${
                    errors.contactPerson
                      ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)]/20'
                      : 'border-[var(--line,#E8E0CF)] bg-white'
                  }`}
                />
                {errors.contactPerson && (
                  <p className="text-[11px] text-[var(--error,#B42318)] font-medium mt-1">
                    {errors.contactPerson}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Email address <span className="text-[var(--error,#B42318)]">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="sarah@acme.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] ${
                    errors.email
                      ? 'border-[var(--error,#B42318)] bg-[var(--error-tint,#FEE4E2)]/20'
                      : 'border-[var(--line,#E8E0CF)] bg-white'
                  }`}
                />
                {errors.email && (
                  <p className="text-[11px] text-[var(--error,#B42318)] font-medium mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Phone (optional)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 234-5678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)]"
                />
              </div>
            </div>

            {/* Row 3: Country & Tax ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => {
                    const cCode = e.target.value;
                    const cObj = COUNTRIES.find((c) => c.code === cCode);
                    setFormData((prev) => ({
                      ...prev,
                      country: cCode,
                      currency: cObj?.currency || prev.currency,
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  {taxLabel} (optional)
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, taxId: e.target.value }))}
                  placeholder="e.g. 12-3456789 or GB123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)]"
                />
              </div>
            </div>

            {/* Row 4: Billing Address */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                Billing address (optional)
              </label>
              <textarea
                rows={2}
                value={formData.billingAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress: e.target.value }))}
                placeholder="100 Market Street, Suite 400, San Francisco, CA 94105"
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] resize-none"
              />
            </div>

            {/* Row 5: Currency, Payment Terms & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Payment terms
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
                >
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term.value} value={term.value}>
                      {term.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Row 6: Private Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink,#0E1A2B)] mb-1">
                Private notes (only visible to you)
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Client preferences, budget discussion, decision maker notes..."
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[var(--line,#E8E0CF)] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt,#0047AB)] disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEdit ? 'Save changes' : 'Save client'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { api } from '../lib/api';
import { SettingsNav } from '../components/settings/SettingsNav';
import { LivePreviewCard } from '../components/settings/LivePreviewCard';
import { CountryChangeDialog } from '../components/settings/CountryChangeDialog';
import { BusinessSection } from '../components/settings/sections/BusinessSection';
import { TaxesSection } from '../components/settings/sections/TaxesSection';
import { PaymentsSection } from '../components/settings/sections/PaymentsSection';
import { DocumentsSection } from '../components/settings/sections/DocumentsSection';
import { NotificationsSection } from '../components/settings/sections/NotificationsSection';
import { RegionalSection } from '../components/settings/sections/RegionalSection';
import { PlanBillingSection } from '../components/settings/sections/PlanBillingSection';
import { DataPrivacySection } from '../components/settings/sections/DataPrivacySection';
import { AccountSection } from '../components/settings/sections/AccountSection';
import {
  COUNTRY_OPTIONS,
  validateIBAN,
  validateSWIFT,
  validateUPI,
  validateGSTIN,
  validatePhone,
  validateUrl,
} from '../components/settings/settingsConstants';

export function SettingsPage() {
  const { section = 'business' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, setUser, logout } = useAuthStore();
  const { showToast } = useNotificationStore();

  // Document Title
  useEffect(() => {
    document.title = 'Floorly: Settings';
  }, []);

  // Fetch Highest Invoice Number in Account
  const { data: highestInvData } = useQuery({
    queryKey: ['highest-invoice-number'],
    queryFn: () => api.getHighestInvoiceNumber(),
  });
  const highestInvoiceNumber = highestInvData?.highestNumber || 0;

  // Initial State Builder
  const buildInitialForm = useCallback((userData) => {
    const u = userData || {};

    // DATA MIGRATION: normalize reverseChargeNote (boolean vs string)
    let revCharge = false;
    if (u.reverseChargeNote === true || u.reverseChargeNote === 'true' || u.reverseChargeNote === 1) {
      revCharge = true;
    }

    // Default note text
    let revText = u.reverseChargeText;
    if (!revText || revText === 'true' || revText === 'false') {
      revText = 'VAT reverse charge applies: the customer is liable for VAT.';
    }

    // Payment methods normalization
    const pm = u.paymentMethods || {};
    const bank = pm.bankTransfer || {};
    const paypal = pm.paypal || {};
    const online = pm.onlinePayment || {};
    const upi = pm.upi || {};
    const other = pm.other || {};

    return {
      // Business
      name: u.name || '',
      businessName: u.businessName || '',
      businessEmail: u.businessEmail || u.email || '',
      businessPhone: u.businessPhone || '',
      website: u.website || '',
      logoUrl: u.logoUrl || '',
      signatureUrl: u.signatureUrl || '',
      country: u.country || 'US',
      addressLine1: u.addressLine1 || '',
      addressLine2: u.addressLine2 || '',
      city: u.city || '',
      state: u.state || '',
      postalCode: u.postalCode || '',

      // Taxes
      taxEnabled: u.taxEnabled ?? true,
      taxType: u.taxType || (u.country === 'IN' ? 'GST' : u.country === 'US' ? 'Sales tax' : 'VAT'),
      taxRate: u.taxRate !== undefined ? u.taxRate : (u.country === 'IN' ? 18 : u.country === 'US' ? 0 : 20),
      taxId: u.taxId || '',
      taxIdLabel: u.taxIdLabel || (u.country === 'IN' ? 'GSTIN' : u.country === 'US' ? 'EIN' : 'VAT number'),
      taxMode: u.taxMode || 'exclusive',
      stateOfSupply: u.stateOfSupply || '',
      defaultHsnSac: u.defaultHsnSac || '998314',
      reverseChargeNote: revCharge,
      reverseChargeText: revText,

      // Payments
      paymentMethods: {
        bankTransfer: {
          enabled: Boolean(bank.enabled || u.iban || u.bankDetails),
          accountHolder: bank.accountHolder || u.name || '',
          bankName: bank.bankName || u.bankDetails || '',
          accountNumber: bank.accountNumber || u.iban || '',
          iban: bank.iban || u.iban || '',
          swiftBic: bank.swiftBic || u.swiftBic || '',
          routingCode: bank.routingCode || '',
          routingCodeLabel: bank.routingCodeLabel || (u.country === 'IN' ? 'IFSC code' : u.country === 'GB' ? 'Sort code' : 'Routing number'),
          currency: bank.currency || u.defaultCurrency || u.currency || 'USD',
        },
        paypal: {
          enabled: Boolean(paypal.enabled || u.paypalEmail),
          email: paypal.email || u.paypalEmail || '',
        },
        onlinePayment: {
          enabled: Boolean(online.enabled),
          url: online.url || '',
          label: online.label || 'Pay by Credit / Debit Card',
        },
        upi: {
          enabled: Boolean(upi.enabled || u.upiId),
          upiId: upi.upiId || u.upiId || '',
        },
        other: {
          enabled: Boolean(other.enabled || u.paymentInstructions),
          instructions: other.instructions || u.paymentInstructions || '',
        },
        defaultMethod: pm.defaultMethod || (u.iban ? 'bankTransfer' : u.paypalEmail ? 'paypal' : u.upiId ? 'upi' : 'bankTransfer'),
      },

      // Documents
      proposalPrefix: u.proposalPrefix || 'PROP-',
      invoicePrefix: u.invoicePrefix || 'INV-',
      receiptPrefix: u.receiptPrefix || 'RCT-',
      yearSequenceEnabled: u.yearSequenceEnabled ?? true,
      nextInvoiceNumber: u.nextInvoiceNumber || (highestInvoiceNumber ? highestInvoiceNumber + 1 : 1),
      defaultPaymentTerms: u.defaultPaymentTerms || 'Net 15',
      defaultDepositSchedule: u.defaultDepositSchedule || '50_50',
      defaultProposalValidityDays: u.defaultProposalValidityDays || 14,
      lateFeeType: u.lateFeeType || 'none',
      lateFeeValue: u.lateFeeValue || 0,
      defaultInvoiceNote: u.defaultInvoiceNote || 'Thank you for your business.',
      defaultProposalNote: u.defaultProposalNote || '',
      showHoursToClient: u.showHoursToClient ?? true,
      floorAdjustmentMode: u.floorAdjustmentMode || 'spread',
      paperSize: u.paperSize || (u.country === 'US' || u.country === 'CA' ? 'Letter' : 'A4'),
      dateFormat: u.dateFormat || 'auto',
      whiteLabel: u.whiteLabel ?? false,
      reviewDays: u.reviewDays ?? 5,
      governingLaw: u.governingLaw || '',

      // Notifications
      notifications: {
        emailProposalViewed: u.notifications?.emailProposalViewed ?? true,
        emailProposalAccepted: u.notifications?.emailProposalAccepted ?? true,
        emailInvoiceViewed: u.notifications?.emailInvoiceViewed ?? true,
        emailPaymentRecorded: u.notifications?.emailPaymentRecorded ?? true,
        emailInvoiceOverdue: u.notifications?.emailInvoiceOverdue ?? true,
        emailWeeklySummary: u.notifications?.emailWeeklySummary ?? false,
        remindersEnabled: u.notifications?.remindersEnabled ?? false,
        reminderDaysBefore: u.notifications?.reminderDaysBefore ?? 3,
        reminderOnDueDate: u.notifications?.reminderOnDueDate ?? true,
        reminderDaysAfter: u.notifications?.reminderDaysAfter ?? 7,
      },

      // Regional
      timezone: u.timezone || 'UTC',
      numberFormat: u.numberFormat || 'auto',
      weekStartsOn: u.weekStartsOn || 'monday',
      defaultCurrency: u.defaultCurrency || u.currency || 'USD',
      currency: u.defaultCurrency || u.currency || 'USD',
      locale: u.locale || 'en-US',
    };
  }, [highestInvoiceNumber]);

  const [savedData, setSavedData] = useState(() => buildInitialForm(user));
  const [formData, setFormData] = useState(() => buildInitialForm(user));
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const initializedUserIdRef = useRef(null);

  // Synchronize when user first loads or user account changes
  useEffect(() => {
    if (user && initializedUserIdRef.current !== user._id) {
      initializedUserIdRef.current = user._id;
      const fresh = buildInitialForm(user);
      setSavedData(fresh);
      setFormData(fresh);
    }
  }, [user, buildInitialForm]);

  // Dirty detection: Compare serialized forms
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(savedData);
  }, [formData, savedData]);

  // Warn before leaving with unsaved changes
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

  // Field change handler
  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    // Clear field-level error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Validation Engine
  const validateField = (key, value) => {
    let err = null;
    let warn = null;

    if (key === 'name') {
      if (!value || !value.trim()) err = 'Your name is required';
    } else if (key === 'businessName') {
      if (!value || !value.trim()) err = 'Business or studio name is required';
    } else if (key === 'businessEmail') {
      if (!value || !value.trim()) err = 'Billing email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) err = 'Please enter a valid email address';
    } else if (key === 'businessPhone') {
      if (value && value.trim()) {
        const check = validatePhone(value);
        if (!check.valid) err = check.error;
      }
    } else if (key === 'website') {
      if (value && value.trim()) {
        const check = validateUrl(value);
        if (!check.valid) err = check.error;
      }
    } else if (key === 'taxRate') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) err = 'Tax rate must be between 0 and 100%';
    } else if (key === 'taxId') {
      if (formData.country === 'IN' && value && value.trim()) {
        const check = validateGSTIN(value);
        if (check.warning) warn = check.warning;
      }
    } else if (key === 'bankTransfer.accountHolder') {
      if (formData.paymentMethods?.bankTransfer?.enabled && (!value || !value.trim())) {
        err = 'Account holder name is required';
      }
    } else if (key === 'bankTransfer.bankName') {
      if (formData.paymentMethods?.bankTransfer?.enabled && (!value || !value.trim())) {
        err = 'Bank name is required';
      }
    } else if (key === 'bankTransfer.accountNumber') {
      if (formData.paymentMethods?.bankTransfer?.enabled) {
        if (!value || !value.trim()) err = 'Account number or IBAN is required';
        else if (value.trim().length > 4 && /^[A-Z]{2}/i.test(value.trim())) {
          const check = validateIBAN(value);
          if (!check.valid) err = check.error;
        }
      }
    } else if (key === 'bankTransfer.swiftBic') {
      if (formData.paymentMethods?.bankTransfer?.enabled && value && value.trim()) {
        const check = validateSWIFT(value);
        if (!check.valid) err = check.error;
      }
    } else if (key === 'paypal.email') {
      if (formData.paymentMethods?.paypal?.enabled && (!value || !value.trim())) {
        err = 'PayPal email or link is required';
      }
    } else if (key === 'onlinePayment.url') {
      if (formData.paymentMethods?.onlinePayment?.enabled) {
        if (!value || !value.trim()) err = 'Payment link URL is required';
        else {
          const check = validateUrl(value);
          if (!check.valid) err = check.error;
        }
      }
    } else if (key === 'upi.upiId') {
      if (formData.paymentMethods?.upi?.enabled) {
        const check = validateUPI(value);
        if (!check.valid) err = check.error;
      }
    } else if (key === 'nextInvoiceNumber') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= highestInvoiceNumber) {
        err = `Next invoice number cannot be lower than #${highestInvoiceNumber + 1}`;
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });

    setWarnings((prev) => {
      const next = { ...prev };
      if (warn) next[key] = warn;
      else delete next[key];
      return next;
    });

    return !err;
  };

  const handleBlur = (fieldKey) => {
    // Extract nested or flat value
    let val = formData[fieldKey];
    if (fieldKey.includes('.')) {
      const [p, k] = fieldKey.split('.');
      val = formData.paymentMethods?.[p]?.[k];
    }
    validateField(fieldKey, val);
  };

  // Full validation before saving
  const validateAll = () => {
    const newErrors = {};
    const newWarnings = {};

    // 1. Required identity
    if (!formData.name?.trim()) newErrors.name = 'Your full name is required';
    if (!formData.businessName?.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.businessEmail?.trim()) {
      newErrors.businessEmail = 'Billing email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail.trim())) {
      newErrors.businessEmail = 'Please enter a valid billing email address';
    }

    if (formData.businessPhone?.trim()) {
      const phoneCheck = validatePhone(formData.businessPhone);
      if (!phoneCheck.valid) newErrors.businessPhone = phoneCheck.error;
    }

    if (formData.website?.trim()) {
      const urlCheck = validateUrl(formData.website);
      if (!urlCheck.valid) newErrors.website = urlCheck.error;
    }

    // 2. Tax validations
    if (formData.taxEnabled) {
      const rateNum = Number(formData.taxRate);
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
        newErrors.taxRate = 'Tax rate must be between 0 and 100%';
      }
      if (formData.country === 'IN' && formData.taxId?.trim()) {
        const gstCheck = validateGSTIN(formData.taxId);
        if (gstCheck.warning) newWarnings.taxId = gstCheck.warning;
      }
    }

    // 3. Payment methods validations
    const pm = formData.paymentMethods || {};
    if (pm.bankTransfer?.enabled) {
      if (!pm.bankTransfer.accountHolder?.trim()) {
        newErrors['bankTransfer.accountHolder'] = 'Account holder name is required';
      }
      if (!pm.bankTransfer.bankName?.trim()) {
        newErrors['bankTransfer.bankName'] = 'Bank name is required';
      }
      if (!pm.bankTransfer.accountNumber?.trim() && !pm.bankTransfer.iban?.trim()) {
        newErrors['bankTransfer.accountNumber'] = 'Account number or IBAN is required';
      } else {
        const acc = (pm.bankTransfer.accountNumber || pm.bankTransfer.iban).trim();
        if (acc.length > 4 && /^[A-Z]{2}/i.test(acc)) {
          const ibanCheck = validateIBAN(acc);
          if (!ibanCheck.valid) newErrors['bankTransfer.accountNumber'] = ibanCheck.error;
        }
      }
      if (pm.bankTransfer.swiftBic?.trim()) {
        const swiftCheck = validateSWIFT(pm.bankTransfer.swiftBic);
        if (!swiftCheck.valid) newErrors['bankTransfer.swiftBic'] = swiftCheck.error;
      }
    }

    if (pm.paypal?.enabled && !pm.paypal.email?.trim()) {
      newErrors['paypal.email'] = 'PayPal email or link is required';
    }

    if (pm.onlinePayment?.enabled) {
      if (!pm.onlinePayment.url?.trim()) {
        newErrors['onlinePayment.url'] = 'Payment link URL is required';
      } else {
        const check = validateUrl(pm.onlinePayment.url);
        if (!check.valid) newErrors['onlinePayment.url'] = check.error;
      }
    }

    if (pm.upi?.enabled) {
      const upiCheck = validateUPI(pm.upi.upiId);
      if (!upiCheck.valid) newErrors['upi.upiId'] = upiCheck.error;
    }

    // 4. Next invoice sequence
    const nextNum = parseInt(formData.nextInvoiceNumber, 10);
    if (!isNaN(nextNum) && nextNum <= highestInvoiceNumber) {
      newErrors.nextInvoiceNumber = `Next invoice number cannot be lower than #${highestInvoiceNumber + 1}`;
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
      warnings: newWarnings,
    };
  };

  // Scroll to and focus the first error element
  const scrollToFirstError = (errObj) => {
    const errorKeys = Object.keys(errObj || {});
    if (errorKeys.length === 0) return;

    const firstKey = errorKeys[0];
    const elementId = firstKey.includes('.') ? firstKey.split('.')[1] : firstKey;

    // Check if error belongs to a different section and navigate if needed
    if (['bankTransfer', 'paypal', 'onlinePayment', 'upi', 'other'].some((k) => firstKey.startsWith(k))) {
      if (section !== 'payments') navigate('/settings/payments');
    } else if (['taxRate', 'taxId', 'taxType'].includes(firstKey)) {
      if (section !== 'taxes') navigate('/settings/taxes');
    } else if (['name', 'businessName', 'businessEmail', 'businessPhone', 'website', 'addressLine1'].includes(firstKey)) {
      if (section !== 'business') navigate('/settings/business');
    }

    setTimeout(() => {
      const el = document.getElementById(elementId) || document.getElementById(firstKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 100);
  };

  // Save changes handler
  const handleSaveChanges = async () => {
    const { isValid, errors: validationErrors } = validateAll();
    if (!isValid) {
      scrollToFirstError(validationErrors);
      showToast({
        title: 'Validation required',
        message: 'Please review and complete the highlighted required fields before saving.',
        type: 'error',
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await api.updateProfile(formData);
      if (res?.user) {
        setUser(res.user);
        const updated = buildInitialForm(res.user);
        setSavedData(updated);
        setFormData(updated);
        queryClient.invalidateQueries();
        showToast({
          title: 'Settings saved',
          message: 'Your studio identity, tax configuration, and payment details have been saved.',
          type: 'success',
        });
      }
    } catch (err) {
      showToast({
        title: 'Save failed',
        message: err.message || 'Failed to save settings. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    setFormData(savedData);
    setErrors({});
    setWarnings({});
  };

  // Country Change Dialog state
  const [targetCountryObj, setTargetCountryObj] = useState(null);
  const [showCountryDialog, setShowCountryDialog] = useState(false);

  const handleRequestCountryChange = (targetCountry) => {
    setTargetCountryObj(targetCountry);
    setShowCountryDialog(true);
  };

  const handleApplyCountryDefaults = () => {
    if (!targetCountryObj) return;

    setFormData((prev) => ({
      ...prev,
      country: targetCountryObj.code,
      taxType: targetCountryObj.taxLabel,
      taxIdLabel: targetCountryObj.taxIdLabel,
      taxRate: targetCountryObj.defaultRate,
      paperSize: targetCountryObj.paperSize,
      defaultCurrency: targetCountryObj.currency,
      currency: targetCountryObj.currency,
      paymentMethods: {
        ...prev.paymentMethods,
        bankTransfer: {
          ...prev.paymentMethods?.bankTransfer,
          routingCodeLabel: targetCountryObj.routingLabel,
          currency: targetCountryObj.currency,
        },
        upi: {
          ...prev.paymentMethods?.upi,
          enabled: targetCountryObj.code === 'IN',
        },
      },
    }));

    setShowCountryDialog(false);
  };

  const handleKeepCurrentCountry = () => {
    if (targetCountryObj) {
      setFormData((prev) => ({
        ...prev,
        country: targetCountryObj.code,
      }));
    }
    setShowCountryDialog(false);
  };

  // Render active section
  const renderSectionContent = () => {
    switch (section) {
      case 'business':
        return (
          <BusinessSection
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
            onBlur={handleBlur}
            onRequestCountryChange={handleRequestCountryChange}
            onNavigateSection={(secId, fieldId) => {
              navigate(`/settings/${secId}`);
              setTimeout(() => {
                const el = document.getElementById(fieldId);
                el?.focus();
              }, 100);
            }}
          />
        );
      case 'taxes':
        return (
          <TaxesSection
            formData={formData}
            errors={errors}
            warnings={warnings}
            onChange={handleFieldChange}
            onBlur={handleBlur}
          />
        );
      case 'payments':
        return (
          <PaymentsSection
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
            onBlur={handleBlur}
          />
        );
      case 'documents':
        return (
          <DocumentsSection
            formData={formData}
            errors={errors}
            highestInvoiceNumber={highestInvoiceNumber}
            userPlan={user?.plan}
            onChange={handleFieldChange}
            onBlur={handleBlur}
          />
        );
      case 'notifications':
        return (
          <NotificationsSection
            formData={formData}
            onChange={handleFieldChange}
          />
        );
      case 'regional':
        return (
          <RegionalSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleBlur}
          />
        );
      case 'plan-and-billing':
        return <PlanBillingSection user={user} />;
      case 'data-and-privacy':
        return (
          <DataPrivacySection
            user={user}
            onLogout={logout}
          />
        );
      case 'account':
        return (
          <AccountSection
            user={user}
            onUpdateUser={setUser}
            onLogout={logout}
          />
        );
      default:
        return (
          <BusinessSection
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
            onBlur={handleBlur}
            onRequestCountryChange={handleRequestCountryChange}
            onNavigateSection={(secId, fieldId) => {
              navigate(`/settings/${secId}`);
              setTimeout(() => {
                const el = document.getElementById(fieldId);
                el?.focus();
              }, 100);
            }}
          />
        );
    }
  };

  const showLivePreview = ['business', 'taxes', 'payments'].includes(section);

  return (
    <div
      className="settings-page-wrapper min-h-screen text-[#0E1A2B] pb-24"
      style={{
        backgroundColor: 'var(--page, #FAF5EA)',
        fontFamily: "'Instrument Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Page Header */}
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold text-[#0E1A2B] tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Settings
          </h1>
          <p className="text-sm sm:text-[15px] text-[#5B6676] mt-1.5 max-w-2xl leading-relaxed">
            Your business details, taxes, payments and defaults. They appear on every proposal and invoice.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleDiscardChanges}
              className="inline-flex items-center gap-1.5 px-3.5 h-[42px] rounded-xl border border-[#E8E0CF] bg-white text-xs font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors focus-visible:ring-2 focus-visible:ring-[#0047AB]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#5B6676]" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || !isDirty}
            onClick={handleSaveChanges}
            className={`inline-flex items-center gap-2 px-5 h-[42px] rounded-xl text-xs font-bold transition-all shadow-xs ${
              isDirty
                ? 'bg-[#0047AB] text-white hover:bg-[#003A8C] focus-visible:ring-2 focus-visible:ring-[#0047AB]'
                : 'bg-white border border-[#E8E0CF] text-[#5B6676] opacity-80 cursor-default'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <Save className="w-4 h-4" />
                <span>Save changes</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#067647]" />
                <span className="text-[#0E1A2B]">Saved</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main 3-Column Desktop Grid / Fluid Mobile Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
        {/* Left Nav (240px) */}
        <SettingsNav
          activeSection={section}
          onSelectSection={(secId) => navigate(`/settings/${secId}`)}
        />

        {/* Center Content Column (Max 760px) */}
        <div className="flex-1 w-full min-w-0 max-w-[760px]">
          {renderSectionContent()}
        </div>

        {/* Right Sticky Live Preview Card (320px) on Business, Taxes, Payments */}
        {showLivePreview && (
          <LivePreviewCard formData={formData} />
        )}
      </div>

      {/* Sticky Save Bar (Appears ONLY when the form is dirty) */}
      {isDirty && (
        <div
          role="region"
          aria-label="Unsaved settings save bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-white border border-[#E8E0CF] rounded-2xl shadow-xl px-5 py-3.5 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0E1A2B]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B54708] animate-pulse" />
            <span>Unsaved changes</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleDiscardChanges}
              className="inline-flex items-center gap-1.5 px-3.5 h-[40px] rounded-xl border border-[#E8E0CF] bg-white text-xs font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors focus-visible:ring-2 focus-visible:ring-[#0047AB]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#5B6676]" />
              <span>Discard</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveChanges}
              className="inline-flex items-center gap-2 px-5 h-[40px] rounded-xl bg-[#0047AB] text-white text-xs font-bold hover:bg-[#003A8C] transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:ring-offset-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Country Change Confirmation Dialog */}
      <CountryChangeDialog
        isOpen={showCountryDialog}
        targetCountry={targetCountryObj}
        onApply={handleApplyCountryDefaults}
        onKeepCurrent={handleKeepCurrentCountry}
        onClose={() => setShowCountryDialog(false)}
      />
    </div>
  );
}

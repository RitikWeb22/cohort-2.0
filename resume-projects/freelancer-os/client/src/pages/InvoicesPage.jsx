import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Plus,
  DollarSign,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Building,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Trash2,
  FileCheck,
  Search,
  Filter,
  Check,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Lock,
  ExternalLink,
  Copy,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useQuickModalStore } from '../store/useQuickModalStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { InvoiceDocument } from '../components/documents/InvoiceDocument';
import { PaymentReceiptDocument } from '../components/documents/PaymentReceiptDocument';
import { SendMessageModal } from '../components/invoices/SendMessageModal';

export function InvoicesPage() {
  const { user } = useAuthStore();
  const { openModal } = useQuickModalStore();
  const { showToast, showConfirm } = useNotificationStore();
  const { format, currency: globalCurrency } = useCurrencyStore();

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments'
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pricingSettings, setPricingSettings] = useState(null);
  const [allPayments, setAllPayments] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isPrintInvoiceOpen, setIsPrintInvoiceOpen] = useState(false);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayResult, setGatewayResult] = useState(null);
  const [receiptDocPayment, setReceiptDocPayment] = useState(null);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [messageTemplateKey, setMessageTemplateKey] = useState('send_invoice');

  // Search & Filter state
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unpaid' | 'partial' | 'paid'
  const [searchTerm, setSearchTerm] = useState('');

  // Record payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Gateway loading state
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [stripeSuccessMsg, setStripeSuccessMsg] = useState('');
  const [copiedInvoiceId, setCopiedInvoiceId] = useState(null);
  const [shareLinkLoading, setShareLinkLoading] = useState(false);

  // Create invoice form state
  const [newClientId, setNewClientId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newLineItems, setNewLineItems] = useState([
    { description: 'Milestone 1: Project Kickoff & Architecture', quantity: 1, unitPrice: 1500 }
  ]);
  const [newTaxRate, setNewTaxRate] = useState(user?.taxRate || 0);
  const [newDiscount, setNewDiscount] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');
  const [newPaymentTerms, setNewPaymentTerms] = useState(user?.defaultPaymentTerms || 'Net 15 days');
  const [newPaymentInstructions, setNewPaymentInstructions] = useState('Stripe, PayPal, or Wire / Bank Transfer (Wise)');
  const [createInvoiceError, setCreateInvoiceError] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Requirement 10: Missing business details check
  const missingBusinessDetails = !user?.businessPhone || !user?.businessAddress;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [iRes, cRes, pRes, payRes, prcRes] = await Promise.all([
        api.getInvoices(),
        api.getClients(),
        api.getProjects(),
        api.getAllPayments(),
        api.getPricingSettings().catch(() => null),
      ]);

      if (iRes?.invoices) {
        setInvoices(iRes.invoices);
        if (iRes.invoices.length > 0) {
          setSelectedInvoice((prev) => {
            const found = iRes.invoices.find((i) => i.id === prev?.id);
            return found || iRes.invoices[0];
          });
        }
      }
      if (cRes?.clients) setClients(cRes.clients);
      if (pRes?.projects) setProjects(pRes.projects);
      if (payRes?.payments) setAllPayments(payRes.payments);
      if (prcRes?.settings) setPricingSettings(prcRes.settings);
    } catch (err) {
      console.error('Failed to load invoice & payment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check for Stripe Checkout return notice
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_paid') === 'true') {
      loadData();
      setStripeSuccessMsg('Returned from payment processor checkout.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Payment Gateway Selector Action
  const handleSelectGateway = async (gateway) => {
    if (!selectedInvoice) return;
    try {
      setGatewayLoading(true);
      const res = await api.selectPaymentGateway(selectedInvoice.id, { gateway });
      setGatewayResult(res);
      if (res?.paymentUrl && (gateway === 'stripe' || gateway === 'paypal')) {
        window.open(res.paymentUrl, '_blank');
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gateway Unavailable',
        message: err.message || 'Payment gateway is disabled or not configured.',
      });
    } finally {
      setGatewayLoading(false);
    }
  };

  // Generate & Copy Public Share Link for Client
  const handleCopyShareLink = async (inv) => {
    if (!inv) return;
    try {
      setShareLinkLoading(true);
      const res = await api.createInvoiceShareLink(inv.id);
      const url = res.shareUrl || `${window.location.origin}/i/${res.rawToken}`;
      await navigator.clipboard.writeText(url);
      setCopiedInvoiceId(inv.id);
      showToast({
        type: 'success',
        title: 'Share Link Ready',
        message: 'Public client invoice link copied! Anyone with the link can view and download without logging in.',
      });
      setTimeout(() => setCopiedInvoiceId(null), 2500);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Share Link Failed',
        message: err.message || 'Could not generate share link.',
      });
    } finally {
      setShareLinkLoading(false);
    }
  };

  // Record Partial / Advance Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Enter a valid positive payment amount');
      return;
    }

    if (amt > selectedInvoice.balanceDue) {
      setPaymentError(
        `Amount cannot exceed remaining balance of ${format(selectedInvoice.balanceDue)}`
      );
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');

    try {
      const res = await api.recordPayment(selectedInvoice.id, {
        amount: amt,
        paymentMethod,
        transactionReference: paymentRef || `TXN-${Date.now()}`,
        notes: paymentNotes,
      });

      if (res?.invoice) {
        await loadData();
        setIsRecordPaymentOpen(false);
        setPaymentAmount('');
        setPaymentRef('');
        setPaymentNotes('');
        showToast({
          type: 'success',
          title: 'Payment Recorded',
          message: `Payment of ${format(amt)} recorded successfully!`,
        });
      }
    } catch (err) {
      setPaymentError(err.message || 'Payment recording failed');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Delete / Reverse Payment
  const handleDeletePayment = (paymentId, amount, invNumber) => {
    showConfirm({
      title: 'Reverse Payment?',
      message: `Are you sure you want to reverse this payment transaction of ${format(amount)} on ${invNumber}? This will restore the balance due on the invoice.`,
      confirmText: 'Reverse Payment',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deletePayment(paymentId);
          await loadData();
          showToast({
            type: 'success',
            title: 'Payment Reversed',
            message: 'Payment reversed and invoice balance updated.',
          });
        } catch (err) {
          showToast({ type: 'error', title: 'Reversal Failed', message: err.message || 'Failed to reverse payment' });
        }
      },
    });
  };

  // Create New Invoice
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (missingBusinessDetails) {
      setCreateInvoiceError('Please configure your Business Phone and Business Address in Settings before issuing your first invoice.');
      return;
    }

    if (!newClientId) {
      setCreateInvoiceError('Please select a client');
      return;
    }

    if (!newLineItems.length || !newLineItems[0].description) {
      setCreateInvoiceError('Please add at least one line item');
      return;
    }

    setIsSubmittingInvoice(true);
    setCreateInvoiceError('');

    try {
      const res = await api.createInvoice({
        clientId: newClientId,
        projectId: newProjectId || null,
        lineItems: newLineItems,
        taxType: user?.taxType || 'VAT',
        taxRate: Number(newTaxRate) || 0,
        taxId: user?.taxId || '',
        taxMode: user?.taxMode || 'exclusive',
        reverseChargeNote: user?.reverseChargeNote || '',
        discountAmount: Number(newDiscount) || 0,
        currency: globalCurrency,
        dueDate: newDueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        paymentTerms: newPaymentTerms,
        paymentInstructions: newPaymentInstructions,
      });

      if (res?.invoice) {
        await loadData();
        setSelectedInvoice(res.invoice);
        setIsCreateInvoiceOpen(false);
        showToast({
          type: 'success',
          title: 'Invoice Created',
          message: `Invoice ${res.invoice.invoiceNumber} created successfully!`,
        });
      }
    } catch (err) {
      setCreateInvoiceError(err.message || 'Failed to create invoice');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Calculated Stats
  const totalBilled = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const totalReceived = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);
  const totalTransactionsCount = allPayments.length;

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'paid'
        ? inv.status === 'paid'
        : statusFilter === 'partial'
        ? inv.status === 'partial'
        : inv.status !== 'paid';

    const matchesSearch =
      !searchTerm ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.client?.company || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const isSelectedINR = (selectedInvoice?.currency || globalCurrency).toUpperCase() === 'INR';

  return (
    <div className="space-y-8">
      {/* Top Warning Banner if Phone or Business Address are missing */}
      {missingBusinessDetails && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Action Required: Business Contact Information Missing
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Your Phone Number and Business Address are currently blank. They are required before generating official client invoices.
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
          >
            Update in Settings
          </Link>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-charcoal-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
            Invoices & Payments Management
          </h1>
          <p className="text-sm text-charcoal-500">
            End-to-end receivables: issue invoices, accept advance deposits, record payments, and issue printable receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="Refresh Ledger"
            className="p-2 border border-charcoal-200 rounded-lg hover:bg-charcoal-50 text-charcoal-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (clients.length > 0 && !newClientId) setNewClientId(clients[0].id || clients[0]._id);
              setIsCreateInvoiceOpen(true);
            }}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-4">
          <div className="flex items-center justify-between text-xs text-charcoal-500">
            <span>Total Invoiced</span>
            <Receipt className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl font-bold text-charcoal-900 mt-1">
            {format(totalBilled)}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-0.5">
            Across {invoices.length} issued invoices
          </div>
        </div>

        <div className="card-premium p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-charcoal-500">
            <span>Cash Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {format(totalReceived)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {totalTransactionsCount} verified payment transactions
          </div>
        </div>

        <div className="card-premium p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-charcoal-500">
            <span>Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {format(totalOutstanding)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            Pending collection from clients
          </div>
        </div>

        {/* Floor Guard Floor Rate from PricingStore */}
        <div className="card-premium p-4">
          <div className="flex items-center justify-between text-xs text-charcoal-500">
            <span>Floor Guard Floor Rate</span>
            <ShieldCheck className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl font-bold text-charcoal-900 mt-1">
            {format(pricingSettings?.minHourlyRate || pricingSettings?.hourlyRate || 35)}/hr
          </div>
          <div className="text-[11px] text-charcoal-500 mt-0.5">
            Minimum project floor: {format(pricingSettings?.minProjectFee || 300)}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-charcoal-200 flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Invoices & Billing ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments Ledger & Receipts ({allPayments.length})</span>
        </button>
      </div>

      {/* TAB 1: INVOICES & BILLING */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                placeholder="Search invoice # or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-charcoal-100/70 p-1 rounded-lg text-xs">
              {['all', 'unpaid', 'partial', 'paid'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-md font-semibold capitalize transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-charcoal-900 shadow-xs'
                      : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  {st === 'unpaid' ? 'Pending Due' : st === 'partial' ? 'Partially Paid' : st === 'paid' ? 'Paid in Full' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid: Invoices List vs Invoice Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Invoice Cards List */}
            <div className="lg:col-span-5 space-y-3">
              {filteredInvoices.length === 0 ? (
                <div className="card-premium p-10 text-center text-charcoal-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No invoices match your filter.</p>
                  <button
                    onClick={() => setIsCreateInvoiceOpen(true)}
                    className="btn-primary text-xs mt-3 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Invoice</span>
                  </button>
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`card-premium p-5 cursor-pointer text-left transition-all ${
                      selectedInvoice?.id === inv.id
                        ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20 shadow-xs'
                        : 'hover:border-charcoal-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-charcoal-900">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-brand-100 text-brand-800'
                        }`}
                      >
                        {inv.status === 'paid' ? 'Paid in Full' : inv.status === 'partial' ? 'Partially Paid' : 'Pending Payment'}
                      </span>
                    </div>

                    <div className="text-xs text-charcoal-700 mt-2 font-semibold flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                      <span className="truncate">{inv.client?.company || inv.client?.name || 'Client'}</span>
                    </div>

                    <div className="text-[11px] text-charcoal-500 mt-1">
                      Project: {inv.projectTitle || 'General Retainer'}
                    </div>

                    <div className="mt-4 pt-3 border-t border-charcoal-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-charcoal-400">Total Billed:</span>
                        <div className="font-bold text-charcoal-900">
                          {format(inv.totalAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-charcoal-400">Balance Due:</span>
                        <div
                          className={`font-bold ${
                            inv.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {format(inv.balanceDue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right: Invoice Preview & Payment Management */}
            <div className="lg:col-span-7">
              {selectedInvoice ? (
                <div className="card-premium p-6 space-y-6">
                  {/* Top Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded">
                          {selectedInvoice.invoiceNumber}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded uppercase ${
                            selectedInvoice.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedInvoice.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-brand-100 text-brand-800'
                          }`}
                        >
                          {selectedInvoice.status === 'paid' ? 'Paid in Full' : selectedInvoice.status === 'partial' ? 'Partially Paid' : 'Pending Payment'}
                        </span>
                      </div>
                      <div className="text-xs text-charcoal-500 mt-1">
                        Billed to:{' '}
                        <strong className="text-charcoal-800">
                          {selectedInvoice.client?.company || selectedInvoice.client?.name}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedInvoice.balanceDue > 0 && (
                        <>
                          <button
                            onClick={() => {
                              setPaymentAmount(selectedInvoice.balanceDue.toString());
                              setIsRecordPaymentOpen(true);
                            }}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setMessageTemplateKey('send_invoice');
                          setIsSendMessageOpen(true);
                        }}
                        title="Prepare email with Send Invoice message template"
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#0047AB]" />
                        <span>Send Invoice</span>
                      </button>

                      {selectedInvoice.balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setMessageTemplateKey('payment_reminder_friendly');
                            setIsSendMessageOpen(true);
                          }}
                          title="Prepare payment reminder using message templates"
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-[#B54708] border-[#B54708]/30 hover:bg-[#FEF0C7]/40"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#B54708]" />
                          <span>Send Reminder</span>
                        </button>
                      )}

                      <button
                        onClick={() => setIsPrintInvoiceOpen(true)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Invoice</span>
                      </button>

                      <button
                        onClick={() => handleCopyShareLink(selectedInvoice)}
                        disabled={shareLinkLoading}
                        title="Copy secure public share link for client"
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedInvoiceId === selectedInvoice.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#0047AB]" />
                        )}
                        <span>Share Link</span>
                      </button>
                    </div>
                  </div>

                  {stripeSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{stripeSuccessMsg}</span>
                      </div>
                      <button onClick={() => setStripeSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 text-xs cursor-pointer">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Outstanding Balance Banner */}
                  <div className="p-4 bg-charcoal-50 rounded-xl grid grid-cols-3 gap-3 text-center border border-charcoal-100">
                    <div>
                      <span className="text-[11px] text-charcoal-500 font-medium">Invoice Total</span>
                      <div className="text-base font-bold text-charcoal-900 mt-0.5">
                        {format(selectedInvoice.totalAmount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-charcoal-500 font-medium">Recorded Paid</span>
                      <div className="text-base font-bold text-emerald-700 mt-0.5">
                        {format(selectedInvoice.amountPaid)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-charcoal-500 font-medium">Balance Due</span>
                      <div className="text-base font-bold text-rose-700 mt-0.5">
                        {format(selectedInvoice.balanceDue)}
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-2">
                      Invoice Line Items
                    </h3>
                    <div className="border border-charcoal-200 rounded-xl overflow-hidden divide-y divide-charcoal-100 text-xs">
                      <div className="bg-charcoal-50 px-4 py-2 font-bold text-charcoal-600 grid grid-cols-12 gap-2">
                        <span className="col-span-8">Description</span>
                        <span className="col-span-4 text-right">Amount</span>
                      </div>
                      {(selectedInvoice.lineItems || []).map((item, idx) => (
                        <div key={idx} className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center">
                          <span className="col-span-8 font-medium text-charcoal-800">
                            {item.description}
                          </span>
                          <span className="col-span-4 text-right font-bold text-charcoal-900">
                            {format(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 p-3 bg-charcoal-50/50 rounded-lg text-xs space-y-1 max-w-xs ml-auto text-charcoal-700 border border-charcoal-100">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-semibold">{format(selectedInvoice.subtotal)}</span>
                      </div>
                      {selectedInvoice.taxRate > 0 && (
                        <div className="flex justify-between">
                          <span>{selectedInvoice.taxType || 'Tax'} ({selectedInvoice.taxRate}%):</span>
                          <span>{format(selectedInvoice.taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-charcoal-900 border-t pt-1">
                        <span>Grand Total:</span>
                        <span>{format(selectedInvoice.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Transactions Receipts for this Invoice */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                        Recorded Payment Receipts ({selectedInvoice.payments?.length || 0})
                      </h3>
                      <span className="text-[11px] text-charcoal-500">
                        Official remittance records
                      </span>
                    </div>

                    <div className="space-y-2">
                      {!selectedInvoice.payments || selectedInvoice.payments.length === 0 ? (
                        <div className="text-[11px] text-charcoal-400 p-4 bg-charcoal-50 rounded-xl text-center border border-charcoal-100">
                          No payments recorded yet. Click <strong>Record Payment</strong> above to accept advance or milestone payments.
                        </div>
                      ) : (
                        selectedInvoice.payments.map((p, idx) => (
                          <div
                            key={p._id || idx}
                            className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs transition-all hover:bg-emerald-50"
                          >
                            <div>
                              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Received {format(p.amount)}</span>
                              </div>
                              <div className="text-[11px] text-charcoal-600 mt-0.5">
                                Ref: <span className="font-mono font-medium">{p.transactionReference || 'N/A'}</span> • Mode: <span className="capitalize">{(p.paymentMethod || 'bank_transfer').replace(/_/g, ' ')}</span>
                              </div>
                              <div className="text-[10px] text-charcoal-400 mt-0.5">
                                Date: {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setReceiptDocPayment({ ...p, invoice: selectedInvoice, client: selectedInvoice.client })}
                                className="px-2.5 py-1 bg-white border border-emerald-300 hover:border-emerald-500 text-emerald-800 rounded-md text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>View Receipt</span>
                              </button>
                              <button
                                onClick={() => handleDeletePayment(p._id || p.id, p.amount, selectedInvoice.invoiceNumber)}
                                title="Reverse / Delete Payment"
                                className="p-1 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card-premium p-16 text-center text-charcoal-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Select an invoice to review balances, record incoming payments, and print receipts.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS LEDGER & ALL RECEIPTS */}
      {activeTab === 'payments' && (
        <div className="card-premium p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-charcoal-100">
            <div>
              <h2 className="text-base font-bold text-charcoal-900">
                Payment Transactions Ledger
              </h2>
              <p className="text-xs text-charcoal-500">
                Complete chronological audit log of all remittances, advance deposits, and settlement vouchers.
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              Total Inflow: {format(totalReceived)}
            </div>
          </div>

          {allPayments.length === 0 ? (
            <div className="py-12 text-center text-charcoal-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No payment transactions recorded yet.</p>
              <p className="text-xs text-charcoal-400 mt-1">
                Select an invoice in the Invoices tab and click "Record Payment" to log an incoming remittance.
              </p>
            </div>
          ) : (
            <div className="border border-charcoal-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-charcoal-50 border-b border-charcoal-200 text-charcoal-600 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Bank Ref / UTR</th>
                    <th className="py-3 px-4 text-right">Amount Received</th>
                    <th className="py-3 px-4 text-center">Receipt & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-100">
                  {allPayments.map((pay) => (
                    <tr key={pay.id || pay._id} className="hover:bg-charcoal-50/60 transition-colors">
                      <td className="py-3 px-4 text-charcoal-600 whitespace-nowrap">
                        {new Date(pay.paymentDate || pay.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-charcoal-900">
                        {pay.client?.company || pay.client?.name || 'Client'}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-brand-700">
                        {pay.invoice?.invoiceNumber || 'INV-DIRECT'}
                      </td>
                      <td className="py-3 px-4 text-charcoal-700 capitalize">
                        {(pay.paymentMethod || 'bank_transfer').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-charcoal-600">
                        {pay.transactionReference || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                        {format(pay.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setReceiptDocPayment(pay)}
                            className="px-2.5 py-1 bg-white border border-charcoal-200 hover:border-brand-500 hover:text-brand-700 text-charcoal-700 rounded-md font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Print Receipt</span>
                          </button>
                          <button
                            onClick={() =>
                              handleDeletePayment(
                                pay.id || pay._id,
                                pay.amount,
                                pay.invoice?.invoiceNumber || ''
                              )
                            }
                            title="Reverse Payment"
                            className="p-1 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}



      {/* CREATE NEW INVOICE MODAL */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-modal my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Create New Client Invoice
                </h3>
                <p className="text-xs text-charcoal-500">
                  Issue kickoff deposit or milestone billing with automatic floor guard checks.
                </p>
              </div>
              <button
                onClick={() => setIsCreateInvoiceOpen(false)}
                className="text-xs font-bold text-charcoal-400 hover:text-charcoal-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {missingBusinessDetails && (
              <div className="p-3 text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-lg flex items-center justify-between">
                <span>⚠️ Please add your Phone and Business Address in Settings before issuing invoices.</span>
                <Link to="/settings" className="font-bold underline text-amber-950">Settings</Link>
              </div>
            )}

            {createInvoiceError && (
              <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {createInvoiceError}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Select Client *
                  </label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="input-field text-xs"
                    required
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Linked Project (Optional)
                  </label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="">-- Standalone / General Retainer --</option>
                    {projects.map((p) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-charcoal-700">
                    Line Items *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewLineItems((prev) => [
                        ...prev,
                        { description: 'Additional Milestone', quantity: 1, unitPrice: 1000 }
                      ])
                    }
                    className="text-xs text-brand-600 font-semibold hover:underline cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {newLineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, description: val } : it))
                          );
                        }}
                        className="input-field text-xs flex-1"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, unitPrice: val } : it))
                          );
                        }}
                        className="input-field text-xs w-28"
                        required
                      />
                      {newLineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewLineItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-charcoal-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Tax Rate (%) ({user?.taxType || 'VAT'})
                  </label>
                  <input
                    type="number"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={newPaymentTerms}
                    onChange={(e) => setNewPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 15 days"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Payment Instructions (Stripe, PayPal, Wire, Wise)
                </label>
                <textarea
                  value={newPaymentInstructions}
                  onChange={(e) => setNewPaymentInstructions(e.target.value)}
                  rows={2}
                  className="input-field text-xs"
                  placeholder="e.g. Stripe checkout, PayPal to email, or IBAN wire"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="btn-secondary text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvoice}
                  className="btn-primary text-xs cursor-pointer"
                >
                  {isSubmittingInvoice ? 'Generating Invoice...' : 'Generate & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isRecordPaymentOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-modal">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Accept & Record Payment
                </h3>
                <p className="text-xs text-charcoal-500">
                  Record advance deposit, milestone payment, or settlement for {selectedInvoice.invoiceNumber}.
                </p>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="text-xs font-bold text-charcoal-400 hover:text-charcoal-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-charcoal-700">
                    Amount Received ({selectedInvoice.currency || globalCurrency}) *
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.round(selectedInvoice.balanceDue / 2).toString())}
                      className="text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer"
                    >
                      50% Split
                    </button>
                    <span className="text-charcoal-300">•</span>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedInvoice.balanceDue.toString())}
                      className="text-[11px] text-brand-600 font-semibold hover:underline cursor-pointer"
                    >
                      Full Balance
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Max: ${selectedInvoice.balanceDue}`}
                  className="input-field text-xs font-semibold"
                  required
                />
                <span className="text-[11px] text-charcoal-500 mt-1 block">
                  Remaining balance due: <strong>{format(selectedInvoice.balanceDue)}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="bank_transfer">Wire / Bank Transfer (Wise / IBAN)</option>
                  <option value="upi">UPI / Direct QR Payment</option>
                  <option value="direct_settlement">Direct Client Settlement</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash Remittance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Bank Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. WIRE-889922 or UPI-998822"
                  className="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Transaction Notes (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. 50% advance deposit for milestone kickoff"
                  className="input-field text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="btn-secondary text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="btn-primary text-xs cursor-pointer"
                >
                  {isSubmittingPayment ? 'Recording...' : 'Confirm & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT TAX INVOICE MODAL */}
      {isPrintInvoiceOpen && selectedInvoice && (
        <InvoiceDocument
          invoice={selectedInvoice}
          client={selectedInvoice.client}
          user={user}
          onClose={() => setIsPrintInvoiceOpen(false)}
        />
      )}

      {/* PRINT PAYMENT RECEIPT MODAL */}
      {receiptDocPayment && (
        <PaymentReceiptDocument
          payment={receiptDocPayment}
          invoice={receiptDocPayment.invoice || selectedInvoice}
          client={receiptDocPayment.client || selectedInvoice?.client}
          user={user}
          onClose={() => setReceiptDocPayment(null)}
        />
      )}

      {/* SEND MESSAGE MODAL (uses message templates) */}
      {isSendMessageOpen && selectedInvoice && (
        <SendMessageModal
          isOpen={isSendMessageOpen}
          onClose={() => setIsSendMessageOpen(false)}
          invoice={selectedInvoice}
          client={selectedInvoice.client}
          user={user}
          initialTemplateKey={messageTemplateKey}
          onSuccess={() => {
            showToast({
              type: 'success',
              title: 'Message prepared',
              message: 'Email client was opened with the resolved template.',
            });
          }}
        />
      )}
    </div>
  );
}

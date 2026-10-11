import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CreditCard,
  Building,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { InvoiceDocumentSheet } from '../components/documents/InvoiceDocument';

export function PublicInvoicePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isPayingRazorpay, setIsPayingRazorpay] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [payErrorMsg, setPayErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function fetchInvoice() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/v1/public/invoices/${token}`);
        const json = await res.json();
        if (!isMounted) return;
        if (!res.ok || !json.success) {
          setError(json.error || 'Invoice could not be loaded.');
        } else {
          setData(json);
        }
      } catch (err) {
        if (isMounted) setError('Network error loading invoice. Please check your connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (token) {
      fetchInvoice();
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRazorpayPayment = async () => {
    try {
      setIsPayingRazorpay(true);
      setPayErrorMsg('');

      const res = await fetch(`/api/v1/public/invoices/${token}/razorpay/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const orderInfo = await res.json();
      if (!res.ok || !orderInfo.success) {
        throw new Error(orderInfo.error || 'Failed to initialize Razorpay checkout');
      }

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderInfo.keyId,
        amount: orderInfo.amount,
        currency: orderInfo.currency || 'INR',
        name: data?.user?.businessName || data?.user?.name || 'Floorly Invoice',
        description: `Payment for Invoice #${data?.invoice?.invoiceNumber}`,
        order_id: orderInfo.orderId,
        prefill: {
          name: data?.client?.name || '',
          email: data?.client?.email || '',
        },
        theme: {
          color: '#0047AB',
        },
        handler: async function (response) {
          try {
            const verifyRes = await fetch(`/api/v1/public/invoices/${token}/razorpay/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setPaySuccessMsg(`Payment of ₹${(orderInfo.amount / 100).toLocaleString('en-IN')} verified and settled!`);
              setData((prev) => ({
                ...prev,
                invoice: {
                  ...prev.invoice,
                  status: 'paid',
                  balanceDue: 0,
                  amountPaid: prev.invoice.totalAmount,
                },
              }));
            } else {
              setPayErrorMsg(verifyData.error || 'Payment verification failed');
            }
          } catch (e) {
            setPayErrorMsg(e.message || 'Payment verification encountered an error');
          } finally {
            setIsPayingRazorpay(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsPayingRazorpay(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setPayErrorMsg(err.message || 'Could not initiate Razorpay checkout');
      setIsPayingRazorpay(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF5EA] flex flex-col items-center justify-center p-6 text-[#0E1A2B]">
        <Loader2 className="w-8 h-8 text-[#0047AB] animate-spin mb-4" />
        <h2 className="text-lg font-semibold font-serif">Loading Invoice Document...</h2>
        <p className="text-sm text-[#5B6676] mt-1">Verifying secure document authorization...</p>
      </div>
    );
  }

  if (error || !data?.invoice) {
    return (
      <div className="min-h-screen bg-[#FAF5EA] flex flex-col items-center justify-center p-6 text-[#0E1A2B]">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8E0CF] p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEE4E2] text-[#B42318] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-serif mb-2 text-[#0E1A2B]">Document Unavailable</h2>
          <p className="text-sm text-[#5B6676] mb-6">
            {error || 'This invoice link is invalid, has expired, or was revoked by the sender.'}
          </p>
          <div className="p-4 bg-[#FAF5EA] rounded-xl text-xs text-[#5B6676] text-left border border-[#E8E0CF]">
            <p className="font-semibold text-[#0E1A2B] mb-1">Need assistance?</p>
            <p>Please reach out directly to the issuer to request an updated document link or statement of account.</p>
          </div>
        </div>
      </div>
    );
  }

  const { invoice, client, user, paymentMethods } = data;
  const isPaid = invoice.status === 'paid' || invoice.balanceDue <= 0;
  const currency = invoice.currency || 'USD';

  const formatMoney = (val) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(val) || 0);
  };

  return (
    <div className="min-h-screen bg-[#FAF5EA] text-[#0E1A2B] flex flex-col">
      {/* Top action header bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E0CF] px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0047AB] text-white flex items-center justify-center font-bold font-serif shadow-xs">
              {user?.businessName?.[0] || 'I'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#0E1A2B] tracking-tight">
                  {user?.businessName || 'Invoice'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#E8E0CF]/60 text-[#5B6676]">
                  {invoice.invoiceNumber}
                </span>
                {isPaid ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#E7F6EC] text-[#067647] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Paid in Full
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#FFF4CC] text-[#B54708]">
                    Balance Due: {formatMoney(invoice.balanceDue)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5B6676] truncate max-w-xs sm:max-w-md">
                Billed to <strong className="text-[#0E1A2B] font-medium">{client?.name || client?.company || 'Client'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`/api/v1/public/invoices/${token}/pdf`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0E1A2B] bg-white hover:bg-[#FAF5EA] border border-[#E8E0CF] rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#5B6676]" />
              <span>Download PDF</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main content view */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {paySuccessMsg && (
          <div className="p-4 bg-[#ECFDF3] border border-[#A6F4C5] rounded-xl flex items-center gap-3 text-sm text-[#067647] font-semibold">
            <CheckCircle2 className="w-5 h-5 text-[#067647] shrink-0" />
            <span>{paySuccessMsg}</span>
          </div>
        )}

        {/* Payment instructions callout if balance remains */}
        {!isPaid && paymentMethods && (
          <div className="bg-white rounded-2xl border border-[#E8E0CF] p-5 sm:p-6 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E8F0FB] text-[#0047AB] flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#0E1A2B] mb-1">Payment Instructions</h3>
                <p className="text-xs text-[#5B6676] mb-3">
                  {paymentMethods.instructions || 'Please remit payment via direct wire transfer or bank transfer.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {paymentMethods.bankDetails && (
                    <div className="p-3 bg-[#FAF5EA] rounded-xl border border-[#E8E0CF] flex items-start justify-between">
                      <div>
                        <span className="text-2xs font-semibold uppercase tracking-wider text-[#5B6676] block mb-1">
                          Bank Details / Transfer
                        </span>
                        <span className="font-medium text-[#0E1A2B] whitespace-pre-line">
                          {paymentMethods.bankDetails}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentMethods.bankDetails, 'bank')}
                        className="p-1.5 text-[#5B6676] hover:text-[#0047AB] rounded-md transition-colors"
                        title="Copy details"
                      >
                        {copiedKey === 'bank' ? <Check className="w-3.5 h-3.5 text-[#067647]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {paymentMethods.upiId && (
                    <div className="p-3 bg-[#FAF5EA] rounded-xl border border-[#E8E0CF] flex items-start justify-between">
                      <div>
                        <span className="text-2xs font-semibold uppercase tracking-wider text-[#5B6676] block mb-1">
                          UPI ID
                        </span>
                        <span className="font-medium text-[#0E1A2B] font-mono">{paymentMethods.upiId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentMethods.upiId, 'upi')}
                        className="p-1.5 text-[#5B6676] hover:text-[#0047AB] rounded-md transition-colors"
                        title="Copy UPI ID"
                      >
                        {copiedKey === 'upi' ? <Check className="w-3.5 h-3.5 text-[#067647]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {paymentMethods.paypalEmail && (
                    <div className="p-3 bg-[#FAF5EA] rounded-xl border border-[#E8E0CF] flex items-start justify-between">
                      <div>
                        <span className="text-2xs font-semibold uppercase tracking-wider text-[#5B6676] block mb-1">
                          PayPal
                        </span>
                        <span className="font-medium text-[#0E1A2B] font-mono">{paymentMethods.paypalEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentMethods.paypalEmail, 'paypal')}
                        className="p-1.5 text-[#5B6676] hover:text-[#0047AB] rounded-md transition-colors"
                        title="Copy PayPal Email"
                      >
                        {copiedKey === 'paypal' ? <Check className="w-3.5 h-3.5 text-[#067647]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Razorpay Checkout Option for INR */}
                {currency === 'INR' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleRazorpayPayment}
                      disabled={isPayingRazorpay}
                      className="w-full py-3 px-5 rounded-xl font-bold text-white bg-[#0047AB] hover:bg-[#003A8C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB] disabled:opacity-60"
                    >
                      {isPayingRazorpay ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Opening Razorpay Secure Checkout...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Pay ₹{Number(invoice.balanceDue).toLocaleString('en-IN')} with Razorpay (UPI / Cards / NetBanking)</span>
                        </>
                      )}
                    </button>
                    {payErrorMsg && (
                      <p className="mt-2 text-xs text-[#B42318] bg-[#FEE4E2] p-2 rounded-lg text-center font-medium">
                        {payErrorMsg}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoice Printable View */}
        <div className="bg-white rounded-2xl border border-[#E8E0CF] shadow-xs p-6 sm:p-12 overflow-hidden">
          <InvoiceDocumentSheet
            invoice={invoice}
            client={client}
            user={user}
            printMode={false}
          />
        </div>

        {/* Security & Confidentiality footer */}
        <div className="mt-8 text-center text-xs text-[#5B6676] max-w-lg mx-auto pb-8 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[#5B6676]">
            <Lock className="w-3.5 h-3.5" />
            <span>Private & confidential invoice delivered via Floorly</span>
          </div>
          <p>© {new Date().getFullYear()} {user?.businessName || 'Floorly'}. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}

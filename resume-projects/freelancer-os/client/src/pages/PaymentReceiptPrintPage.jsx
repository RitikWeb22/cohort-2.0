import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Printer, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { PaymentReceiptDocumentSheet } from '../components/documents/PaymentReceiptDocument';

export function PaymentReceiptPrintPage() {
  const { paymentId } = useParams();
  const { user: authUser } = useAuthStore();

  const [payment, setPayment] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const printTriggeredRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        const res = await api.getPaymentReceipt(paymentId);
        if (!isMounted) return;

        if (res?.payment) {
          setPayment(res.payment);
          setInvoice(res.invoice);
          setClient(res.client);
          setUserData(res.user || authUser);

          // Receipt number and client for document.title
          const currentYear = new Date().getFullYear();
          const paymentYear = res.payment.paymentDate ? new Date(res.payment.paymentDate).getFullYear() : currentYear;
          const rawId = (res.payment._id || res.payment.id || '').toString();
          const rawRef = (res.payment.transactionReference || '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
          const seqSuffix = rawRef || rawId.slice(-3) || '001';
          const rctNum = res.payment.receiptNumber || `RCT-${paymentYear}-${seqSuffix.toUpperCase()}`;

          const effClient = res.client || res.payment.client || res.invoice?.client;
          const clientName = (effClient?.company || effClient?.name || 'Client')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_');

          document.title = `Receipt-${rctNum}-${clientName}.pdf`;
        } else {
          setError('Payment record not found');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load receipt for print:', err);
          setError(err.message || 'Failed to load receipt');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [paymentId, authUser]);

  // Wait for fonts and images to load, then trigger window.print()
  useEffect(() => {
    if (isLoading || !payment || printTriggeredRef.current) return;

    let timerId = null;

    const executePrint = async () => {
      printTriggeredRef.current = true;
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        const images = Array.from(document.images);
        if (images.length > 0) {
          await Promise.all(
            images.map(
              (img) =>
                new Promise((resolve) => {
                  if (img.complete) {
                    resolve();
                  } else {
                    img.onload = resolve;
                    img.onerror = resolve;
                  }
                })
            )
          );
        }
      } catch (err) {
        console.warn('Error waiting for fonts/images before receipt print:', err);
      }

      timerId = setTimeout(() => {
        window.print();
      }, 350);
    };

    executePrint();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isLoading, payment]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 p-8 font-sans">
        <Loader2 className="w-8 h-8 text-[#0047AB] animate-spin" />
        <p className="text-xs font-semibold text-[#5B6676]">Preparing print-ready receipt...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-8 text-center font-sans">
        <p className="text-sm font-semibold text-[#B42318]">{error || 'Unable to load payment receipt.'}</p>
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 py-2 rounded-full border border-[#D9D4C7] text-xs font-semibold text-[#0E1A2B] hover:bg-[#F3F7FD] cursor-pointer"
        >
          Close window
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen text-[#0E1A2B] m-0 p-0">
      {/* Floating non-printable helper bar */}
      <aside className="no-print fixed top-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-[#D9D4C7] rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-xs">
        <span className="font-medium text-[#5B6676] hidden sm:inline">Print preview</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print again</span>
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="p-1 rounded-full text-[#5B6676] hover:text-[#0E1A2B] hover:bg-[#F3F7FD] cursor-pointer"
          title="Close window"
        >
          <X className="w-4 h-4" />
        </button>
      </aside>

      {/* Pure Receipt Document Sheet: NO shell, NO top bar, NO sidebar, NO overlays */}
      <PaymentReceiptDocumentSheet
        payment={payment}
        invoice={invoice}
        client={client}
        user={userData}
        printMode={true}
      />
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Printer, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { InvoiceDocumentSheet } from '../components/documents/InvoiceDocument';

export function InvoicePrintPage() {
  const { id } = useParams();
  const { user: authUser } = useAuthStore();

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
        const res = await api.getInvoice(id);
        if (!isMounted) return;

        if (res?.invoice) {
          setInvoice(res.invoice);
          setClient(res.client);
          setUserData(res.user || authUser);

          // Set document.title to "Invoice-{number}-{Client}.pdf"
          const invNum = res.invoice.invoiceNumber || 'INV';
          const effClient = res.client || res.invoice.client || res.invoice.clientId;
          const clientName = (effClient?.company || effClient?.name || 'Client')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_');
          document.title = `Invoice-${invNum}-${clientName}.pdf`;
        } else {
          setError('Invoice not found');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load invoice for print:', err);
          setError(err.message || 'Failed to load invoice');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, authUser]);

  // Wait for fonts and images to load, then trigger window.print()
  useEffect(() => {
    if (isLoading || !invoice || printTriggeredRef.current) return;

    let timerId = null;

    const executePrint = async () => {
      printTriggeredRef.current = true;
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        // Wait for all images in the document to complete loading
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
        console.warn('Error waiting for fonts/images before print:', err);
      }

      // Small tick to ensure browser layout has settled
      timerId = setTimeout(() => {
        window.print();
      }, 350);
    };

    executePrint();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isLoading, invoice]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 p-8 font-sans">
        <Loader2 className="w-8 h-8 text-[#0047AB] animate-spin" />
        <p className="text-xs font-semibold text-[#5B6676]">Preparing print-ready invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-8 text-center font-sans">
        <p className="text-sm font-semibold text-[#B42318]">{error || 'Unable to load invoice document.'}</p>
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
      {/* Floating non-printable helper bar (visible on screen only if print dialog was dismissed) */}
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

      {/* Pure Invoice Document Sheet: NO shell, NO top bar, NO sidebar, NO overlays */}
      <InvoiceDocumentSheet
        invoice={invoice}
        client={client}
        user={userData}
        printMode={true}
      />
    </div>
  );
}

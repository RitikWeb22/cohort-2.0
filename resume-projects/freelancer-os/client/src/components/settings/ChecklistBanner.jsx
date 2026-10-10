import React from 'react';
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export function ChecklistBanner({ formData, onNavigateSection }) {
  // Check conditions
  const hasAddress = Boolean(formData.addressLine1 && formData.city && formData.country);
  const hasPhone = Boolean(formData.businessPhone && formData.businessPhone.trim().length >= 7);

  const pm = formData.paymentMethods || {};
  const hasPaymentDetails = Boolean(
    (pm.bankTransfer?.enabled && (pm.bankTransfer.accountNumber || pm.bankTransfer.iban)) ||
    (pm.paypal?.enabled && pm.paypal.email) ||
    (pm.onlinePayment?.enabled && pm.onlinePayment.url) ||
    (pm.upi?.enabled && pm.upi.upiId) ||
    (pm.other?.enabled && pm.other.instructions)
  );

  const needsTaxId = Boolean(formData.taxEnabled);
  const hasTaxId = !needsTaxId || Boolean(formData.taxId && formData.taxId.trim().length > 0);

  const missingItems = [];
  if (!hasAddress) {
    missingItems.push({
      id: 'address',
      label: 'Business address',
      section: 'business',
      fieldId: 'addressLine1',
    });
  }
  if (!hasPhone) {
    missingItems.push({
      id: 'phone',
      label: 'Phone number',
      section: 'business',
      fieldId: 'businessPhone',
    });
  }
  if (!hasPaymentDetails) {
    missingItems.push({
      id: 'payment',
      label: 'Payment details',
      section: 'payments',
      fieldId: 'paymentMethods',
    });
  }
  if (needsTaxId && !hasTaxId) {
    missingItems.push({
      id: 'taxId',
      label: 'Tax ID',
      section: 'taxes',
      fieldId: 'taxId',
    });
  }

  // Hidden when complete
  if (missingItems.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Invoice readiness checklist"
      className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#FFF4CC] border border-[#FFC72C] text-[#0E1A2B]"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#B54708] shrink-0 mt-0.5" />
        <div className="space-y-2 flex-1">
          <div>
            <h3
              className="text-[15px] font-bold text-[#0E1A2B] leading-tight"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {missingItems.length} {missingItems.length === 1 ? 'thing' : 'things'} to finish before you can send invoices
            </h3>
            <p className="text-xs text-[#5B6676] mt-0.5">
              These details are required on legally compliant invoice documents.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {missingItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onNavigateSection) {
                    onNavigateSection(item.section, item.fieldId);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8E0CF] text-xs font-semibold text-[#0E1A2B] hover:border-[#0047AB] hover:text-[#0047AB] transition-colors shadow-2xs"
              >
                <span>Add {item.label.toLowerCase()}</span>
                <ChevronRight className="w-3 h-3 text-[#5B6676]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Building,
  CreditCard,
  Receipt,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { maskAccountNumber } from './settingsConstants';

export function LivePreviewCard({ formData }) {
  const [showMasked, setShowMasked] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Address line composite
  const addressParts = [
    formData.addressLine1,
    formData.addressLine2,
    formData.city,
    formData.state,
    formData.postalCode,
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  const bank = formData.paymentMethods?.bankTransfer;
  const paypal = formData.paymentMethods?.paypal;
  const online = formData.paymentMethods?.onlinePayment;
  const upi = formData.paymentMethods?.upi;
  const other = formData.paymentMethods?.other;
  const defaultMethod = formData.paymentMethods?.defaultMethod || 'bankTransfer';

  const isIndiaOrInr = formData.country === 'IN' || formData.defaultCurrency === 'INR' || formData.currency === 'INR';

  const previewContent = (
    <div className="space-y-5 text-xs text-[#0E1A2B]">
      {/* 1. Letterhead Card */}
      <div className="bg-[#FAF5EA]/50 rounded-xl p-3.5 border border-[#E8E0CF] space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6676] block">
          Document header
        </span>

        {formData.logoUrl ? (
          <img
            src={formData.logoUrl}
            alt="Studio logo"
            className="h-8 max-w-[140px] object-contain"
          />
        ) : (
          <h2
            className="text-base font-extrabold text-[#0E1A2B] tracking-tight leading-none"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            {formData.businessName || formData.name || 'Your Studio Name'}
          </h2>
        )}

        <div className="text-[11px] text-[#5B6676] space-y-0.5 leading-tight">
          {formData.businessEmail && <p>{formData.businessEmail}</p>}
          {formData.businessPhone && <p>{formData.businessPhone}</p>}
          {fullAddress && <p className="whitespace-pre-line">{fullAddress}</p>}
          {formData.website && <p className="text-[#0047AB]">{formData.website}</p>}
        </div>

        {formData.taxEnabled && formData.taxId && (
          <div className="pt-1.5 border-t border-[#E8E0CF] text-[11px] font-semibold text-[#0E1A2B]">
            {formData.taxIdLabel || formData.taxType || 'Tax ID'}: {formData.taxId}
          </div>
        )}
      </div>

      {/* 2. Tax Summary Preview */}
      <div className="bg-[#FAF5EA]/50 rounded-xl p-3.5 border border-[#E8E0CF] space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6676] block">
          Tax configuration
        </span>
        {formData.taxEnabled ? (
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#5B6676]">{formData.taxType || 'Tax'} rate:</span>
              <span className="font-bold text-[#0E1A2B]">{formData.taxRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5B6676]">Calculation:</span>
              <span className="font-semibold text-[#0E1A2B] capitalize">
                {formData.taxMode === 'inclusive' ? 'Tax-inclusive' : 'Tax-exclusive'}
              </span>
            </div>
            {formData.country === 'IN' && formData.stateOfSupply && (
              <div className="flex items-center justify-between">
                <span className="text-[#5B6676]">State of supply:</span>
                <span className="font-semibold text-[#0E1A2B]">{formData.stateOfSupply}</span>
              </div>
            )}
            {formData.reverseChargeNote && (
              <p className="pt-1 text-[10px] italic text-[#5B6676] border-t border-[#E8E0CF] leading-tight">
                {formData.reverseChargeText || 'VAT reverse charge applies: the customer is liable for VAT.'}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[#5B6676] italic">
            Tax is disabled. No tax line items will appear on invoices.
          </p>
        )}
      </div>

      {/* 3. Invoice Remittance Preview */}
      <div className="bg-[#FAF5EA]/50 rounded-xl p-3.5 border border-[#E8E0CF] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6676]">
            Invoice remittance
          </span>
          <span className="text-[10px] font-semibold text-[#0047AB] bg-[#E8F0FB] px-1.5 py-0.5 rounded">
            Live preview
          </span>
        </div>

        {/* Bank transfer */}
        {bank?.enabled && (
          <div
            className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
              defaultMethod === 'bankTransfer'
                ? 'bg-white border-[#0047AB]/30 shadow-xs'
                : 'bg-white/60 border-[#E8E0CF]'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-[#0E1A2B]">
              <span className="flex items-center gap-1">
                <Building className="w-3 h-3 text-[#0047AB]" />
                <span>Bank transfer</span>
              </span>
              {defaultMethod === 'bankTransfer' && (
                <span className="text-[10px] text-[#0047AB] bg-[#E8F0FB] px-1 py-0.2 rounded font-bold">
                  Default
                </span>
              )}
            </div>

            <div className="text-[#5B6676] space-y-0.5">
              {bank.accountHolder && <p>Name: <strong className="text-[#0E1A2B]">{bank.accountHolder}</strong></p>}
              {bank.bankName && <p>Bank: <strong className="text-[#0E1A2B]">{bank.bankName}</strong></p>}
              {(bank.accountNumber || bank.iban) && (
                <div className="flex items-center justify-between">
                  <p>
                    Account: <strong className="text-[#0E1A2B]">
                      {showMasked ? (bank.accountNumber || bank.iban) : maskAccountNumber(bank.accountNumber || bank.iban)}
                    </strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMasked(!showMasked)}
                    aria-label={showMasked ? 'Hide account number' : 'Show full account number'}
                    className="text-[#0047AB] hover:underline p-0.5"
                  >
                    {showMasked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              )}
              {bank.swiftBic && <p>SWIFT/BIC: <strong className="text-[#0E1A2B]">{bank.swiftBic}</strong></p>}
              {bank.routingCode && (
                <p>
                  {bank.routingCodeLabel || 'Routing'}: <strong className="text-[#0E1A2B]">{bank.routingCode}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* PayPal */}
        {paypal?.enabled && (
          <div
            className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
              defaultMethod === 'paypal'
                ? 'bg-white border-[#0047AB]/30 shadow-xs'
                : 'bg-white/60 border-[#E8E0CF]'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-[#0E1A2B]">
              <span>PayPal</span>
              {defaultMethod === 'paypal' && (
                <span className="text-[10px] text-[#0047AB] bg-[#E8F0FB] px-1 py-0.2 rounded font-bold">
                  Default
                </span>
              )}
            </div>
            <p className="text-[#5B6676]">{paypal.email}</p>
          </div>
        )}

        {/* Online link */}
        {online?.enabled && (
          <div
            className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
              defaultMethod === 'onlinePayment'
                ? 'bg-white border-[#0047AB]/30 shadow-xs'
                : 'bg-white/60 border-[#E8E0CF]'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-[#0E1A2B]">
              <span>{online.label || 'Online payment link'}</span>
              {defaultMethod === 'onlinePayment' && (
                <span className="text-[10px] text-[#0047AB] bg-[#E8F0FB] px-1 py-0.2 rounded font-bold">
                  Default
                </span>
              )}
            </div>
            <p className="text-[#0047AB] truncate">{online.url}</p>
          </div>
        )}

        {/* UPI */}
        {isIndiaOrInr && upi?.enabled && (
          <div
            className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
              defaultMethod === 'upi'
                ? 'bg-white border-[#0047AB]/30 shadow-xs'
                : 'bg-white/60 border-[#E8E0CF]'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-[#0E1A2B]">
              <span>UPI ID</span>
              {defaultMethod === 'upi' && (
                <span className="text-[10px] text-[#0047AB] bg-[#E8F0FB] px-1 py-0.2 rounded font-bold">
                  Default
                </span>
              )}
            </div>
            <p className="text-[#0E1A2B] font-mono font-bold">{upi.upiId}</p>
          </div>
        )}

        {/* Other */}
        {other?.enabled && other.instructions && (
          <div className="p-2.5 rounded-lg border bg-white/60 border-[#E8E0CF] text-[11px]">
            <p className="text-[#5B6676] whitespace-pre-line leading-relaxed">
              {other.instructions}
            </p>
          </div>
        )}

        {!bank?.enabled && !paypal?.enabled && !online?.enabled && (!upi?.enabled || !isIndiaOrInr) && !other?.enabled && (
          <p className="text-[11px] text-[#B54708] italic">
            No payment methods are currently active. Invoices will prompt you to configure payment methods.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Live Preview Card (320px) */}
      <aside className="hidden xl:block w-[320px] shrink-0 sticky top-6 self-start">
        <div className="bg-white rounded-2xl border border-[#E8E0CF] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E0CF]">
            <div>
              <h3
                className="text-base font-bold text-[#0E1A2B] leading-none"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                Live preview
              </h3>
              <p className="text-[11px] text-[#5B6676] mt-0.5">
                How clients see your documents
              </p>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#067647] animate-pulse" title="Syncing live" />
          </div>

          {previewContent}
        </div>
      </aside>

      {/* Mobile / Tablet Collapsible Drawer Card */}
      <div className="xl:hidden w-full mb-6">
        <div className="bg-white rounded-2xl border border-[#E8E0CF] overflow-hidden">
          <button
            type="button"
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FAF5EA]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#0047AB]" />
              <span className="text-sm font-bold text-[#0E1A2B]">
                Live document preview
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[#5B6676]">
              <span>{mobileExpanded ? 'Collapse' : 'Tap to expand'}</span>
              {mobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {mobileExpanded && (
            <div className="p-4 border-t border-[#E8E0CF] bg-[#FAF5EA]/30">
              {previewContent}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

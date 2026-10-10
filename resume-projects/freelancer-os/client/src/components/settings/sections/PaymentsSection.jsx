import React, { useState } from 'react';
import {
  Building,
  CreditCard,
  QrCode,
  Link as LinkIcon,
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { FormField, TextInput, SelectInput, ToggleSwitch } from '../FormField';
import { maskAccountNumber } from '../settingsConstants';

export function PaymentsSection({
  formData,
  errors,
  onChange,
  onBlur,
}) {
  const [showMaskedAccount, setShowMaskedAccount] = useState(false);

  const pm = formData.paymentMethods || {};
  const bank = pm.bankTransfer || {};
  const paypal = pm.paypal || {};
  const online = pm.onlinePayment || {};
  const upi = pm.upi || {};
  const other = pm.other || {};
  const defaultMethod = pm.defaultMethod || 'bankTransfer';

  const isIndiaOrInr = formData.country === 'IN' || formData.defaultCurrency === 'INR' || formData.currency === 'INR';

  // Helper to update nested paymentMethods
  const updateMethod = (methodKey, field, val) => {
    const updated = {
      ...pm,
      [methodKey]: {
        ...(pm[methodKey] || {}),
        [field]: val,
      },
    };
    onChange('paymentMethods', updated);
  };

  const setDefaultMethod = (methodKey) => {
    onChange('paymentMethods', {
      ...pm,
      defaultMethod: methodKey,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Payment methods & remittance
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Configure how clients pay you. The default method is featured in invoice summaries.
          </p>
        </div>

        {/* ==============================================================
           1. DIRECT BANK TRANSFER
           ============================================================== */}
        <div className="rounded-xl border border-[#E8E0CF] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E0CF]">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="defaultBank"
                name="defaultPaymentMethod"
                checked={defaultMethod === 'bankTransfer'}
                onChange={() => setDefaultMethod('bankTransfer')}
                className="w-4 h-4 text-[#0047AB] focus:ring-[#0047AB] cursor-pointer"
              />
              <div>
                <label
                  htmlFor="defaultBank"
                  className="text-sm font-bold text-[#0E1A2B] cursor-pointer flex items-center gap-1.5"
                >
                  <Building className="w-4 h-4 text-[#0047AB]" />
                  <span>Direct bank transfer (Wire / ACH / SEPA)</span>
                  {defaultMethod === 'bankTransfer' && (
                    <span className="text-[10px] bg-[#E8F0FB] text-[#0047AB] px-1.5 py-0.5 rounded font-bold">
                      Default
                    </span>
                  )}
                </label>
                <p className="text-xs text-[#5B6676]">
                  Standard commercial bank account details.
                </p>
              </div>
            </div>

            <ToggleSwitch
              id="bankTransferEnabled"
              checked={Boolean(bank.enabled)}
              onChange={(checked) => updateMethod('bankTransfer', 'enabled', checked)}
              label=""
            />
          </div>

          {bank.enabled && (
            <div className="space-y-4 animate-in fade-in duration-150 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="bankAccountHolder"
                  label="Account holder name"
                  value={bank.accountHolder}
                  error={errors['bankTransfer.accountHolder']}
                  required
                  helperText="Full legal individual or business name on account"
                >
                  <TextInput
                    id="bankAccountHolder"
                    value={bank.accountHolder}
                    onChange={(e) => updateMethod('bankTransfer', 'accountHolder', e.target.value)}
                    onBlur={() => onBlur('bankTransfer.accountHolder')}
                    placeholder="e.g. Alex Morgan / Studio Vertex LLC"
                    error={Boolean(errors['bankTransfer.accountHolder'])}
                  />
                </FormField>

                <FormField
                  id="bankName"
                  label="Bank name"
                  value={bank.bankName}
                  error={errors['bankTransfer.bankName']}
                  required
                  helperText="Name of receiving financial institution"
                >
                  <TextInput
                    id="bankName"
                    value={bank.bankName}
                    onChange={(e) => updateMethod('bankTransfer', 'bankName', e.target.value)}
                    onBlur={() => onBlur('bankTransfer.bankName')}
                    placeholder="e.g. Chase / Barclays / HDFC Bank"
                    error={Boolean(errors['bankTransfer.bankName'])}
                  />
                </FormField>

                <FormField
                  id="bankAccountNumber"
                  label="Account number or IBAN"
                  value={bank.accountNumber || bank.iban}
                  error={errors['bankTransfer.accountNumber']}
                  required
                  helperText="Masked with **** for security on preview"
                >
                  <div className="relative">
                    <TextInput
                      id="bankAccountNumber"
                      type={showMaskedAccount ? 'text' : 'password'}
                      value={bank.accountNumber || bank.iban}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateMethod('bankTransfer', 'accountNumber', val);
                        updateMethod('bankTransfer', 'iban', val);
                      }}
                      onBlur={() => onBlur('bankTransfer.accountNumber')}
                      placeholder="e.g. GB29NWBK60161331926819 or 123456789"
                      error={Boolean(errors['bankTransfer.accountNumber'])}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMaskedAccount(!showMaskedAccount)}
                      aria-label={showMaskedAccount ? 'Hide account number' : 'Show account number'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6676] hover:text-[#0E1A2B] p-1"
                    >
                      {showMaskedAccount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormField>

                <FormField
                  id="bankSwiftBic"
                  label="SWIFT / BIC code"
                  value={bank.swiftBic}
                  error={errors['bankTransfer.swiftBic']}
                  helperText="8 or 11 alphanumeric characters for international wires"
                >
                  <TextInput
                    id="bankSwiftBic"
                    value={bank.swiftBic}
                    onChange={(e) => updateMethod('bankTransfer', 'swiftBic', e.target.value.toUpperCase())}
                    onBlur={() => onBlur('bankTransfer.swiftBic')}
                    placeholder="e.g. CHASUS33"
                    error={Boolean(errors['bankTransfer.swiftBic'])}
                  />
                </FormField>

                <FormField
                  id="bankRoutingCode"
                  label={
                    formData.country === 'IN'
                      ? 'IFSC code'
                      : formData.country === 'GB'
                      ? 'Sort code'
                      : formData.country === 'US'
                      ? 'Routing number (ABA)'
                      : formData.country === 'AU'
                      ? 'BSB number'
                      : bank.routingCodeLabel || 'Local routing code'
                  }
                  value={bank.routingCode}
                  error={errors['bankTransfer.routingCode']}
                  helperText={
                    formData.country === 'IN'
                      ? '11-character Indian Financial System Code (e.g. HDFC0001234)'
                      : 'Local domestic clearing code'
                  }
                >
                  <TextInput
                    id="bankRoutingCode"
                    value={bank.routingCode}
                    onChange={(e) => updateMethod('bankTransfer', 'routingCode', e.target.value)}
                    onBlur={() => onBlur('bankTransfer.routingCode')}
                    placeholder={
                      formData.country === 'IN'
                        ? 'HDFC0001234'
                        : formData.country === 'GB'
                        ? '60-16-13'
                        : formData.country === 'US'
                        ? '122105155'
                        : 'Local code'
                    }
                    error={Boolean(errors['bankTransfer.routingCode'])}
                  />
                </FormField>

                <FormField
                  id="bankCurrency"
                  label="Account currency"
                  value={bank.currency}
                  helperText="Currency denomination for this bank account"
                >
                  <SelectInput
                    id="bankCurrency"
                    value={bank.currency || formData.defaultCurrency || 'USD'}
                    onChange={(e) => updateMethod('bankTransfer', 'currency', e.target.value)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="AED">AED (AED)</option>
                  </SelectInput>
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* ==============================================================
           2. PAYPAL
           ============================================================== */}
        <div className="rounded-xl border border-[#E8E0CF] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E0CF]">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="defaultPaypal"
                name="defaultPaymentMethod"
                checked={defaultMethod === 'paypal'}
                onChange={() => setDefaultMethod('paypal')}
                className="w-4 h-4 text-[#0047AB] focus:ring-[#0047AB] cursor-pointer"
              />
              <div>
                <label
                  htmlFor="defaultPaypal"
                  className="text-sm font-bold text-[#0E1A2B] cursor-pointer flex items-center gap-1.5"
                >
                  <span>PayPal</span>
                  {defaultMethod === 'paypal' && (
                    <span className="text-[10px] bg-[#E8F0FB] text-[#0047AB] px-1.5 py-0.5 rounded font-bold">
                      Default
                    </span>
                  )}
                </label>
                <p className="text-xs text-[#5B6676]">
                  Receive funds via PayPal email or personalized paypal.me link.
                </p>
              </div>
            </div>

            <ToggleSwitch
              id="paypalEnabled"
              checked={Boolean(paypal.enabled)}
              onChange={(checked) => updateMethod('paypal', 'enabled', checked)}
              label=""
            />
          </div>

          {paypal.enabled && (
            <div className="animate-in fade-in duration-150 pt-1">
              <FormField
                id="paypalEmail"
                label="PayPal email or paypal.me link"
                value={paypal.email}
                error={errors['paypal.email']}
                required
                helperText="e.g. payments@yourstudio.com or https://paypal.me/yourstudio"
              >
                <TextInput
                  id="paypalEmail"
                  value={paypal.email}
                  onChange={(e) => updateMethod('paypal', 'email', e.target.value)}
                  onBlur={() => onBlur('paypal.email')}
                  placeholder="payments@yourstudio.com"
                  error={Boolean(errors['paypal.email'])}
                />
              </FormField>
            </div>
          )}
        </div>

        {/* ==============================================================
           3. CARD OR ONLINE PAYMENT LINK
           ============================================================== */}
        <div className="rounded-xl border border-[#E8E0CF] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E0CF]">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="defaultOnline"
                name="defaultPaymentMethod"
                checked={defaultMethod === 'onlinePayment'}
                onChange={() => setDefaultMethod('onlinePayment')}
                className="w-4 h-4 text-[#0047AB] focus:ring-[#0047AB] cursor-pointer"
              />
              <div>
                <label
                  htmlFor="defaultOnline"
                  className="text-sm font-bold text-[#0E1A2B] cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4 text-[#0047AB]" />
                  <span>Card or online payment link</span>
                  {defaultMethod === 'onlinePayment' && (
                    <span className="text-[10px] bg-[#E8F0FB] text-[#0047AB] px-1.5 py-0.5 rounded font-bold">
                      Default
                    </span>
                  )}
                </label>
                <p className="text-xs text-[#5B6676]">
                  Your universal Stripe Payment Link, Razorpay Payment Link, or portal.
                </p>
              </div>
            </div>

            <ToggleSwitch
              id="onlineEnabled"
              checked={Boolean(online.enabled)}
              onChange={(checked) => updateMethod('onlinePayment', 'enabled', checked)}
              label=""
            />
          </div>

          {online.enabled && (
            <div className="space-y-4 animate-in fade-in duration-150 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="onlineUrl"
                  label="Payment link URL"
                  value={online.url}
                  error={errors['onlinePayment.url']}
                  required
                  helperText="Must be a valid https:// URL (e.g. buy.stripe.com/... or rzp.io/...)"
                >
                  <TextInput
                    id="onlineUrl"
                    type="url"
                    value={online.url}
                    onChange={(e) => updateMethod('onlinePayment', 'url', e.target.value)}
                    onBlur={() => onBlur('onlinePayment.url')}
                    placeholder="https://buy.stripe.com/..."
                    error={Boolean(errors['onlinePayment.url'])}
                  />
                </FormField>

                <FormField
                  id="onlineLabel"
                  label="Button label on invoice"
                  value={online.label}
                  helperText="Text shown on the clickable payment button"
                >
                  <TextInput
                    id="onlineLabel"
                    value={online.label || 'Pay by Credit / Debit Card'}
                    onChange={(e) => updateMethod('onlinePayment', 'label', e.target.value)}
                    placeholder="Pay by Credit / Debit Card"
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* ==============================================================
           4. UPI (Shown ONLY when country is India or currency is INR)
           ============================================================== */}
        {isIndiaOrInr && (
          <div className="rounded-xl border border-[#E8E0CF] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E0CF]">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="defaultUpi"
                  name="defaultPaymentMethod"
                  checked={defaultMethod === 'upi'}
                  onChange={() => setDefaultMethod('upi')}
                  className="w-4 h-4 text-[#0047AB] focus:ring-[#0047AB] cursor-pointer"
                />
                <div>
                  <label
                    htmlFor="defaultUpi"
                    className="text-sm font-bold text-[#0E1A2B] cursor-pointer flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-[#0047AB]" />
                    <span>UPI (Unified Payments Interface)</span>
                    {defaultMethod === 'upi' && (
                      <span className="text-[10px] bg-[#E8F0FB] text-[#0047AB] px-1.5 py-0.5 rounded font-bold">
                        Default
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-[#5B6676]">
                    Instant INR settlements via UPI apps (GPay, PhonePe, Paytm).
                  </p>
                </div>
              </div>

              <ToggleSwitch
                id="upiEnabled"
                checked={Boolean(upi.enabled)}
                onChange={(checked) => updateMethod('upi', 'enabled', checked)}
                label=""
              />
            </div>

            {upi.enabled && (
              <div className="animate-in fade-in duration-150 pt-1">
                <FormField
                  id="upiId"
                  label="UPI ID / VPA"
                  value={upi.upiId}
                  error={errors['upi.upiId']}
                  required
                  helperText="Format: name@bank or mobilenumber@upi (e.g. yourname@okhdfcbank)"
                >
                  <TextInput
                    id="upiId"
                    value={upi.upiId}
                    onChange={(e) => updateMethod('upi', 'upiId', e.target.value)}
                    onBlur={() => onBlur('upi.upiId')}
                    placeholder="studio@okhdfcbank"
                    error={Boolean(errors['upi.upiId'])}
                  />
                </FormField>
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
           5. OTHER PAYMENT INSTRUCTIONS
           ============================================================== */}
        <div className="rounded-xl border border-[#E8E0CF] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E0CF]">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="defaultOther"
                name="defaultPaymentMethod"
                checked={defaultMethod === 'other'}
                onChange={() => setDefaultMethod('other')}
                className="w-4 h-4 text-[#0047AB] focus:ring-[#0047AB] cursor-pointer"
              />
              <div>
                <label
                  htmlFor="defaultOther"
                  className="text-sm font-bold text-[#0E1A2B] cursor-pointer flex items-center gap-1.5"
                >
                  <span>Other custom instructions</span>
                  {defaultMethod === 'other' && (
                    <span className="text-[10px] bg-[#E8F0FB] text-[#0047AB] px-1.5 py-0.5 rounded font-bold">
                      Default
                    </span>
                  )}
                </label>
                <p className="text-xs text-[#5B6676]">
                  Free-text notes for cash, cheque, escrow, or bespoke settlement terms (max 500 characters).
                </p>
              </div>
            </div>

            <ToggleSwitch
              id="otherEnabled"
              checked={Boolean(other.enabled)}
              onChange={(checked) => updateMethod('other', 'enabled', checked)}
              label=""
            />
          </div>

          {other.enabled && (
            <div className="animate-in fade-in duration-150 pt-1">
              <FormField
                id="otherInstructions"
                label="Custom remittance instructions"
                value={other.instructions}
                error={errors['other.instructions']}
                helperText={`${(other.instructions || '').length}/500 characters`}
              >
                <textarea
                  id="otherInstructions"
                  rows={3}
                  maxLength={500}
                  value={other.instructions || ''}
                  onChange={(e) => updateMethod('other', 'instructions', e.target.value)}
                  onBlur={() => onBlur('other.instructions')}
                  placeholder="e.g. Cheques payable to Studio Vertex Ltd. For cash payments, obtain signed official receipt."
                  className={`w-full p-3.5 bg-white text-[#0E1A2B] text-[15px] rounded-xl border transition-colors outline-none font-sans ${
                    errors['other.instructions']
                      ? 'border-[#B42318] focus-visible:ring-2 focus-visible:ring-[#B42318]'
                      : 'border-[#E8E0CF] hover:border-[#0E1A2B]/40 focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:border-[#0047AB]'
                  }`}
                  style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
                />
              </FormField>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

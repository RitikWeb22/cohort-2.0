import React from 'react';
import { Info, Receipt, AlertCircle } from 'lucide-react';
import { FormField, TextInput, SelectInput, ToggleSwitch } from '../FormField';
import { INDIAN_STATES } from '../settingsConstants';

export function TaxesSection({ formData, errors, warnings, onChange, onBlur }) {
  const isIndia = formData.country === 'IN';

  return (
    <div className="space-y-6">
      {/* Primary Tax Toggle Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Taxes & indirect levies
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Manage tax rates, registration IDs, and reverse charge liability.
          </p>
        </div>

        {/* Master Tax Switch */}
        <div className="pb-4 border-b border-[#E8E0CF]">
          <ToggleSwitch
            id="taxEnabled"
            checked={Boolean(formData.taxEnabled)}
            onChange={(checked) => onChange('taxEnabled', checked)}
            label="I charge tax on my invoices"
            description="When disabled, all tax lines are excluded from client proposals and invoice calculations."
          />
        </div>

        {/* Tax Fields (Only rendered when taxEnabled is true) */}
        {formData.taxEnabled && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tax Label */}
              <FormField
                id="taxType"
                label="Tax label"
                value={formData.taxType}
                error={errors.taxType}
                helperText="How this tax is named on invoices (e.g. GST, VAT, Sales tax)"
              >
                <div className="space-y-2">
                  <SelectInput
                    id="taxType"
                    value={formData.taxType}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange('taxType', val);
                      if (val === 'GST') onChange('taxIdLabel', isIndia ? 'GSTIN' : 'GST number');
                      if (val === 'VAT') onChange('taxIdLabel', 'VAT number');
                      if (val === 'Sales tax') onChange('taxIdLabel', 'EIN');
                      if (val === 'GST/HST') onChange('taxIdLabel', 'Business number');
                    }}
                    onBlur={() => onBlur('taxType')}
                  >
                    <option value="GST">GST (Goods and Services Tax)</option>
                    <option value="VAT">VAT (Value Added Tax)</option>
                    <option value="Sales tax">Sales tax</option>
                    <option value="GST/HST">GST/HST</option>
                    <option value="Tax">General Tax</option>
                  </SelectInput>
                </div>
              </FormField>

              {/* Tax Rate (0-100 with % suffix) */}
              <FormField
                id="taxRate"
                label="Standard tax rate"
                value={formData.taxRate}
                error={errors.taxRate}
                suffix="%"
                helperText="Percentage added or included in invoice totals (0 to 100)"
              >
                <TextInput
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => onChange('taxRate', e.target.value)}
                  onBlur={() => onBlur('taxRate')}
                  placeholder={isIndia ? '18' : '20'}
                  error={Boolean(errors.taxRate)}
                />
              </FormField>

              {/* Tax ID / Registration number */}
              <FormField
                id="taxId"
                label={formData.taxIdLabel || 'Tax ID / Registration number'}
                value={formData.taxId}
                error={errors.taxId}
                warning={warnings?.taxId}
                requiredForInvoice
                helperText={isIndia ? '15-character GSTIN (e.g. 29ABCDE1234F1Z5)' : 'Your official corporate or business tax number'}
              >
                <TextInput
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => onChange('taxId', e.target.value)}
                  onBlur={() => onBlur('taxId')}
                  placeholder={isIndia ? '29ABCDE1234F1Z5' : 'GB123456789 or XX-XXXXXXX'}
                  error={Boolean(errors.taxId)}
                />
              </FormField>

              {/* Tax Calculation Mode (exclusive vs inclusive) */}
              <FormField
                id="taxMode"
                label="Prices I enter are"
                value={formData.taxMode}
                helperText="Tax-exclusive adds tax on top; inclusive extracts tax from the total"
              >
                <SelectInput
                  id="taxMode"
                  value={formData.taxMode}
                  onChange={(e) => onChange('taxMode', e.target.value)}
                  onBlur={() => onBlur('taxMode')}
                >
                  <option value="exclusive">Tax-exclusive (tax added on top)</option>
                  <option value="inclusive">Tax-inclusive (tax included in item price)</option>
                </SelectInput>
              </FormField>
            </div>

            {/* India-Only Subsection */}
            {isIndia && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#FAF5EA]/50 border border-[#E8E0CF] space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#0047AB]" />
                  <h3 className="text-sm font-bold text-[#0E1A2B]">
                    India GST specifications
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="stateOfSupply"
                    label="State of supply"
                    value={formData.stateOfSupply}
                    error={errors.stateOfSupply}
                    helperText="Used to determine intra-state (CGST+SGST) vs inter-state (IGST)"
                  >
                    <SelectInput
                      id="stateOfSupply"
                      value={formData.stateOfSupply}
                      onChange={(e) => onChange('stateOfSupply', e.target.value)}
                      onBlur={() => onBlur('stateOfSupply')}
                    >
                      <option value="">Select supply state...</option>
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </SelectInput>
                  </FormField>

                  <FormField
                    id="defaultHsnSac"
                    label="Default HSN/SAC code"
                    value={formData.defaultHsnSac}
                    error={errors.defaultHsnSac}
                    helperText="Standard software services code: 998314"
                  >
                    <TextInput
                      id="defaultHsnSac"
                      value={formData.defaultHsnSac}
                      onChange={(e) => onChange('defaultHsnSac', e.target.value)}
                      onBlur={() => onBlur('defaultHsnSac')}
                      placeholder="998314"
                      error={Boolean(errors.defaultHsnSac)}
                    />
                  </FormField>
                </div>

                <div className="p-3 rounded-lg bg-[#E8F0FB] text-xs text-[#0047AB] font-medium leading-relaxed">
                  Note: CGST+SGST vs IGST is chosen automatically from your state and your client's registered state.
                </div>
              </div>
            )}

            {/* Reverse Charge Configuration */}
            <div className="pt-4 border-t border-[#E8E0CF] space-y-4">
              <ToggleSwitch
                id="reverseChargeNote"
                checked={Boolean(formData.reverseChargeNote)}
                onChange={(checked) => onChange('reverseChargeNote', checked)}
                label="Add a reverse charge note to cross-border B2B invoices"
                description="Indicates that the buyer is responsible for accounting and remitting tax."
              />

              {formData.reverseChargeNote && (
                <FormField
                  id="reverseChargeText"
                  label="Reverse charge note text"
                  value={formData.reverseChargeText}
                  error={errors.reverseChargeText}
                  helperText="Printed on international invoices when reverse charge applies"
                >
                  <TextInput
                    id="reverseChargeText"
                    value={formData.reverseChargeText}
                    onChange={(e) => onChange('reverseChargeText', e.target.value)}
                    onBlur={() => onBlur('reverseChargeText')}
                    placeholder="VAT reverse charge applies: the customer is liable for VAT."
                    error={Boolean(errors.reverseChargeText)}
                  />
                </FormField>
              )}
            </div>
          </div>
        )}

        {/* Informational Notice */}
        <div className="pt-4 border-t border-[#E8E0CF] flex items-center gap-2 text-xs text-[#5B6676]">
          <Info className="w-4 h-4 text-[#0047AB] shrink-0" />
          <span>Changing tax settings affects new proposals and invoices only. Sent ones keep their original tax.</span>
        </div>
      </div>
    </div>
  );
}

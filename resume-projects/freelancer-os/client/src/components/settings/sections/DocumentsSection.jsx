import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { FormField, TextInput, SelectInput, ToggleSwitch } from '../FormField';

export function DocumentsSection({
  formData,
  errors,
  highestInvoiceNumber = 0,
  userPlan = 'solo',
  onChange,
  onBlur,
}) {
  const isAgencyPlan = userPlan?.toLowerCase() === 'agency';

  return (
    <div className="space-y-6">
      {/* Document Numbering Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Document numbering sequences
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Define sequential prefixes and automatic calendar counters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            id="proposalPrefix"
            label="Proposal prefix"
            value={formData.proposalPrefix}
            error={errors.proposalPrefix}
            helperText="e.g. PROP- -> PROP-2026-001"
          >
            <TextInput
              id="proposalPrefix"
              value={formData.proposalPrefix}
              onChange={(e) => onChange('proposalPrefix', e.target.value.toUpperCase())}
              onBlur={() => onBlur('proposalPrefix')}
              placeholder="PROP-"
              error={Boolean(errors.proposalPrefix)}
            />
          </FormField>

          <FormField
            id="invoicePrefix"
            label="Invoice prefix"
            value={formData.invoicePrefix}
            error={errors.invoicePrefix}
            helperText="e.g. INV- -> INV-2026-001"
          >
            <TextInput
              id="invoicePrefix"
              value={formData.invoicePrefix}
              onChange={(e) => onChange('invoicePrefix', e.target.value.toUpperCase())}
              onBlur={() => onBlur('invoicePrefix')}
              placeholder="INV-"
              error={Boolean(errors.invoicePrefix)}
            />
          </FormField>

          <FormField
            id="receiptPrefix"
            label="Payment receipt prefix"
            value={formData.receiptPrefix}
            error={errors.receiptPrefix}
            helperText="e.g. RCT- -> RCT-2026-001"
          >
            <TextInput
              id="receiptPrefix"
              value={formData.receiptPrefix}
              onChange={(e) => onChange('receiptPrefix', e.target.value.toUpperCase())}
              onBlur={() => onBlur('receiptPrefix')}
              placeholder="RCT-"
              error={Boolean(errors.receiptPrefix)}
            />
          </FormField>
        </div>

        <div className="pt-2 border-t border-[#E8E0CF] space-y-4">
          <ToggleSwitch
            id="yearSequenceEnabled"
            checked={Boolean(formData.yearSequenceEnabled)}
            onChange={(checked) => onChange('yearSequenceEnabled', checked)}
            label="Include current year in document numbers"
            description="Adds four-digit year (e.g. INV-2026-001 instead of INV-001)."
          />

          <FormField
            id="nextInvoiceNumber"
            label="Next invoice number"
            value={formData.nextInvoiceNumber}
            error={errors.nextInvoiceNumber}
            helperText={`Highest invoice number issued in your account is #${highestInvoiceNumber}. Number cannot be lower than ${highestInvoiceNumber + 1}.`}
          >
            <TextInput
              id="nextInvoiceNumber"
              type="number"
              min={highestInvoiceNumber + 1}
              value={formData.nextInvoiceNumber}
              onChange={(e) => onChange('nextInvoiceNumber', e.target.value)}
              onBlur={() => onBlur('nextInvoiceNumber')}
              placeholder={String(highestInvoiceNumber + 1)}
              error={Boolean(errors.nextInvoiceNumber)}
            />
          </FormField>
        </div>
      </div>

      {/* Commercial Terms & Defaults Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Default terms & schedules
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Pre-filled defaults applied to newly created clients and contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="defaultPaymentTerms"
            label="Default payment terms"
            value={formData.defaultPaymentTerms}
            helperText="Standard invoice settlement window"
          >
            <SelectInput
              id="defaultPaymentTerms"
              value={formData.defaultPaymentTerms}
              onChange={(e) => onChange('defaultPaymentTerms', e.target.value)}
              onBlur={() => onBlur('defaultPaymentTerms')}
            >
              <option value="Due on receipt">Due on receipt</option>
              <option value="Net 7">Net 7 days</option>
              <option value="Net 15">Net 15 days</option>
              <option value="Net 30">Net 30 days</option>
            </SelectInput>
          </FormField>

          <FormField
            id="defaultDepositSchedule"
            label="Default deposit schedule"
            value={formData.defaultDepositSchedule}
            helperText="Milestone installment breakdown"
          >
            <SelectInput
              id="defaultDepositSchedule"
              value={formData.defaultDepositSchedule}
              onChange={(e) => onChange('defaultDepositSchedule', e.target.value)}
              onBlur={() => onBlur('defaultDepositSchedule')}
            >
              <option value="100_upfront">100% upfront before work commences</option>
              <option value="50_50">50% upfront deposit / 50% on completion</option>
              <option value="30_40_30">30% deposit / 40% midpoint / 30% delivery</option>
              <option value="4_milestones">4 equal milestones (25% / 25% / 25% / 25%)</option>
            </SelectInput>
          </FormField>

          <FormField
            id="defaultProposalValidityDays"
            label="Proposal validity (days)"
            value={formData.defaultProposalValidityDays}
            error={errors.defaultProposalValidityDays}
            helperText="Number of days proposals remain valid before expiring"
          >
            <TextInput
              id="defaultProposalValidityDays"
              type="number"
              min="1"
              max="90"
              value={formData.defaultProposalValidityDays}
              onChange={(e) => onChange('defaultProposalValidityDays', e.target.value)}
              onBlur={() => onBlur('defaultProposalValidityDays')}
              placeholder="14"
              error={Boolean(errors.defaultProposalValidityDays)}
            />
          </FormField>

          <FormField
            id="reviewDays"
            label="Client review turnaround (days)"
            value={formData.reviewDays}
            error={errors?.reviewDays}
            helperText="Default turnaround for client feedback on milestones (used in {{review_days}})"
          >
            <TextInput
              id="reviewDays"
              type="number"
              min="1"
              max="60"
              value={formData.reviewDays ?? 5}
              onChange={(e) => onChange('reviewDays', parseInt(e.target.value, 10) || 5)}
              onBlur={() => onBlur && onBlur('reviewDays')}
              placeholder="5"
              error={Boolean(errors?.reviewDays)}
            />
          </FormField>

          <FormField
            id="governingLaw"
            label="Governing law / jurisdiction"
            value={formData.governingLaw}
            error={errors?.governingLaw}
            helperText="Jurisdiction inserted into contract clauses (used in {{governing_law}})"
          >
            <TextInput
              id="governingLaw"
              value={formData.governingLaw || ''}
              onChange={(e) => onChange('governingLaw', e.target.value)}
              onBlur={() => onBlur && onBlur('governingLaw')}
              placeholder="e.g. State of California, USA"
              error={Boolean(errors?.governingLaw)}
            />
          </FormField>

          <FormField
            id="lateFeeType"
            label="Late payment interest policy"
            value={formData.lateFeeType}
            helperText="Condition printed on invoice terms block"
          >
            <SelectInput
              id="lateFeeType"
              value={formData.lateFeeType}
              onChange={(e) => onChange('lateFeeType', e.target.value)}
            >
              <option value="none">No late fee charged</option>
              <option value="percent">Percentage interest per month (e.g. 1.5%)</option>
              <option value="fixed">Fixed administrative late fee</option>
            </SelectInput>
          </FormField>

          {formData.lateFeeType !== 'none' && (
            <div className="sm:col-span-2">
              <FormField
                id="lateFeeValue"
                label={formData.lateFeeType === 'percent' ? 'Interest rate (% per month)' : 'Fixed fee amount'}
                value={formData.lateFeeValue}
                suffix={formData.lateFeeType === 'percent' ? '%' : undefined}
                error={errors.lateFeeValue}
              >
                <TextInput
                  id="lateFeeValue"
                  type="number"
                  step="0.1"
                  value={formData.lateFeeValue}
                  onChange={(e) => onChange('lateFeeValue', e.target.value)}
                  onBlur={() => onBlur('lateFeeValue')}
                  placeholder={formData.lateFeeType === 'percent' ? '1.5' : '50'}
                  error={Boolean(errors.lateFeeValue)}
                />
              </FormField>
            </div>
          )}

          <div className="sm:col-span-2">
            <FormField
              id="defaultInvoiceNote"
              label="Default invoice footer note"
              value={formData.defaultInvoiceNote}
              helperText="Appears on every outgoing invoice (e.g. thank you message or bank instructions)"
            >
              <textarea
                id="defaultInvoiceNote"
                rows={2}
                value={formData.defaultInvoiceNote || ''}
                onChange={(e) => onChange('defaultInvoiceNote', e.target.value)}
                placeholder="Thank you for your business. Please reference your invoice number during bank transfer."
                className="w-full p-3.5 bg-white text-[#0E1A2B] text-[15px] rounded-xl border border-[#E8E0CF] hover:border-[#0E1A2B]/40 focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:border-[#0047AB] transition-colors outline-none font-sans"
              />
            </FormField>
          </div>

          <div className="sm:col-span-2">
            <FormField
              id="defaultProposalNote"
              label="Default proposal executive note"
              value={formData.defaultProposalNote}
              helperText="Pre-filled on proposal cover overview"
            >
              <textarea
                id="defaultProposalNote"
                rows={2}
                value={formData.defaultProposalNote || ''}
                onChange={(e) => onChange('defaultProposalNote', e.target.value)}
                placeholder="We look forward to delivering exceptional craftsmanship on your project."
                className="w-full p-3.5 bg-white text-[#0E1A2B] text-[15px] rounded-xl border border-[#E8E0CF] hover:border-[#0E1A2B]/40 focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:border-[#0047AB] transition-colors outline-none font-sans"
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Presentation & PDF Options Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Presentation & export settings
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Configure how calculations, hours, and branding appear on generated PDFs.
          </p>
        </div>

        <div className="space-y-4">
          <ToggleSwitch
            id="showHoursToClient"
            checked={Boolean(formData.showHoursToClient)}
            onChange={(checked) => onChange('showHoursToClient', checked)}
            label="Show estimated hours to client"
            description="When enabled, hours and hourly rates appear on proposal deliverables. When disabled, only line-item deliverable totals are visible."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <FormField
              id="floorAdjustmentMode"
              label="Minimum-fee adjustment"
              value={formData.floorAdjustmentMode}
              helperText="How minimum project floor adjustments appear"
            >
              <SelectInput
                id="floorAdjustmentMode"
                value={formData.floorAdjustmentMode}
                onChange={(e) => onChange('floorAdjustmentMode', e.target.value)}
              >
                <option value="spread">Spread across deliverables (default)</option>
                <option value="separate">Separate line item</option>
              </SelectInput>
            </FormField>

            <FormField
              id="paperSize"
              label="Standard paper size"
              value={formData.paperSize}
              helperText="A4 for international, Letter for North America"
            >
              <SelectInput
                id="paperSize"
                value={formData.paperSize}
                onChange={(e) => onChange('paperSize', e.target.value)}
              >
                <option value="A4">A4 (210 x 297 mm)</option>
                <option value="Letter">Letter (8.5 x 11 in)</option>
              </SelectInput>
            </FormField>

            <FormField
              id="dateFormat"
              label="Date format"
              value={formData.dateFormat}
              helperText="Calendar date display convention"
            >
              <SelectInput
                id="dateFormat"
                value={formData.dateFormat}
                onChange={(e) => onChange('dateFormat', e.target.value)}
              >
                <option value="auto">Auto (from locale)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/10/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/15/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
              </SelectInput>
            </FormField>
          </div>

          {/* White-Label Watermark Toggle (Agency plan only) */}
          <div className="pt-4 border-t border-[#E8E0CF]">
            <div className="flex items-start justify-between gap-4 py-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#0E1A2B]">
                    "Created with Floorly" document footer watermark
                  </span>
                  {!isAgencyPlan && (
                    <span className="text-[10px] bg-[#FFF4CC] text-[#B54708] px-2 py-0.5 rounded font-bold">
                      Agency plan only
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5B6676]">
                  {isAgencyPlan
                    ? 'Toggle whether the Floorly platform watermark appears at the bottom of client proposal and invoice PDFs.'
                    : 'The Floorly watermark is included on Free, Solo, and Pro plans.'}
                </p>
                {!isAgencyPlan && (
                  <Link
                    to="/pricing"
                    className="inline-block text-xs font-bold text-[#0047AB] hover:underline pt-0.5"
                  >
                    Upgrade to Agency for white-label documents &rarr;
                  </Link>
                )}
              </div>

              <input
                type="checkbox"
                id="whiteLabel"
                disabled={!isAgencyPlan}
                checked={isAgencyPlan ? Boolean(formData.whiteLabel) : true}
                onChange={(e) => isAgencyPlan && onChange('whiteLabel', e.target.checked)}
                className="w-5 h-5 rounded text-[#0047AB] border-[#E8E0CF] focus:ring-[#0047AB] cursor-pointer disabled:cursor-not-allowed mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

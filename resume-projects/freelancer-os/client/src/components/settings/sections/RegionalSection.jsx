import React, { useEffect } from 'react';
import { Globe, Clock, Info } from 'lucide-react';
import { FormField, TextInput, SelectInput } from '../FormField';

export function RegionalSection({ formData, onChange, onBlur }) {
  // Auto-detect timezone if not set
  useEffect(() => {
    if (!formData.timezone || formData.timezone === 'UTC') {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) {
          onChange('timezone', detected);
        }
      } catch {
        // fallback
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Regional & locale preferences
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Set calendar formats, timezone synchronization, and document default currencies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Display Language */}
          <FormField
            id="locale"
            label="Display language"
            value={formData.locale}
            helperText="English is currently the supported system interface language"
          >
            <SelectInput
              id="locale"
              value={formData.locale || 'en-US'}
              onChange={(e) => onChange('locale', e.target.value)}
            >
              <option value="en-US">English (US / International)</option>
              <option value="en-GB">English (UK)</option>
              <option value="more" disabled>More languages coming soon...</option>
            </SelectInput>
          </FormField>

          {/* Timezone */}
          <FormField
            id="timezone"
            label="Timezone"
            value={formData.timezone}
            helperText="Used for activity timestamps, due date reminders, and milestone tracking"
          >
            <TextInput
              id="timezone"
              value={formData.timezone}
              onChange={(e) => onChange('timezone', e.target.value)}
              onBlur={() => onBlur('timezone')}
              placeholder="e.g. America/New_York or Asia/Kolkata"
            />
          </FormField>

          {/* Week Starts On */}
          <FormField
            id="weekStartsOn"
            label="Week starts on"
            value={formData.weekStartsOn}
            helperText="Determines calendar date picker beginning day"
          >
            <SelectInput
              id="weekStartsOn"
              value={formData.weekStartsOn || 'monday'}
              onChange={(e) => onChange('weekStartsOn', e.target.value)}
            >
              <option value="monday">Monday (ISO standard)</option>
              <option value="sunday">Sunday (US / North America)</option>
            </SelectInput>
          </FormField>

          {/* Number Format */}
          <FormField
            id="numberFormat"
            label="Number format"
            value={formData.numberFormat}
            helperText="Digit grouping and decimal conventions"
          >
            <SelectInput
              id="numberFormat"
              value={formData.numberFormat || 'auto'}
              onChange={(e) => onChange('numberFormat', e.target.value)}
            >
              <option value="auto">Auto (detect from currency & locale)</option>
              <option value="1,234.56">Standard (1,234.56)</option>
              <option value="1.234,56">European (1.234,56)</option>
              <option value="1 234,56">French / Nordic (1 234,56)</option>
              <option value="1,23,456.00">Indian Lakhs / Crores (1,23,456.00)</option>
            </SelectInput>
          </FormField>
        </div>

        {/* Default Currency For NEW Documents */}
        <div className="pt-4 border-t border-[#E8E0CF] space-y-3">
          <FormField
            id="defaultCurrency"
            label="Default currency for NEW documents"
            value={formData.defaultCurrency || formData.currency}
            helperText="Applied automatically whenever you draft a new proposal, invoice, or client project. Note: The currency selector in the top navbar only changes how totals are DISPLAYED on your overview dashboard. It does not re-price existing client contracts or invoices."
          >
            <SelectInput
              id="defaultCurrency"
              value={formData.defaultCurrency || formData.currency || 'USD'}
              onChange={(e) => {
                onChange('defaultCurrency', e.target.value);
                onChange('currency', e.target.value);
              }}
            >
              <option value="USD">USD - United States Dollar ($)</option>
              <option value="EUR">EUR - Euro (€)</option>
              <option value="GBP">GBP - British Pound Sterling (£)</option>
              <option value="INR">INR - Indian Rupee (₹)</option>
              <option value="AUD">AUD - Australian Dollar (A$)</option>
              <option value="CAD">CAD - Canadian Dollar (C$)</option>
              <option value="AED">AED - United Arab Emirates Dirham (AED)</option>
              <option value="SGD">SGD - Singapore Dollar (S$)</option>
            </SelectInput>
          </FormField>

          <div className="p-3 rounded-xl bg-[#E8F0FB] text-xs text-[#0047AB] flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Changing this default currency does not alter existing proposals or invoices. Every historical document permanently stores its own agreed currency.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

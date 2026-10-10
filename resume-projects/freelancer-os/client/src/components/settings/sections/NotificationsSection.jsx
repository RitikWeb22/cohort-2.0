import React from 'react';
import { Bell, Mail, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { ToggleSwitch, FormField, TextInput } from '../FormField';

export function NotificationsSection({ formData, onChange }) {
  const notif = formData.notifications || {};

  const updateNotif = (key, val) => {
    onChange('notifications', {
      ...notif,
      [key]: val,
    });
  };

  return (
    <div className="space-y-6">
      {/* Transactional Email Events Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Email notifications
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Choose which commercial events trigger instant alerts to your billing email.
          </p>
        </div>

        <div className="divide-y divide-[#E8E0CF]">
          <ToggleSwitch
            id="notifProposalViewed"
            checked={Boolean(notif.emailProposalViewed ?? true)}
            onChange={(checked) => updateNotif('emailProposalViewed', checked)}
            label="Proposal viewed by client"
            description="Send an email when a prospective client opens your private proposal link for the first time."
          />

          <ToggleSwitch
            id="notifProposalAccepted"
            checked={Boolean(notif.emailProposalAccepted ?? true)}
            onChange={(checked) => updateNotif('emailProposalAccepted', checked)}
            label="Proposal accepted or revision requested"
            description="Alert you immediately when a proposal is electronically accepted or requested for amendments."
          />

          <ToggleSwitch
            id="notifInvoiceViewed"
            checked={Boolean(notif.emailInvoiceViewed ?? true)}
            onChange={(checked) => updateNotif('emailInvoiceViewed', checked)}
            label="Invoice viewed"
            description="Notify you when a client opens an invoice document or payment link."
          />

          <ToggleSwitch
            id="notifPaymentRecorded"
            checked={Boolean(notif.emailPaymentRecorded ?? true)}
            onChange={(checked) => updateNotif('emailPaymentRecorded', checked)}
            label="Payment received or recorded"
            description="Confirmation whenever a client settles an invoice or an offline payment is recorded."
          />

          <ToggleSwitch
            id="notifInvoiceOverdue"
            checked={Boolean(notif.emailInvoiceOverdue ?? true)}
            onChange={(checked) => updateNotif('emailInvoiceOverdue', checked)}
            label="Invoice becomes overdue"
            description="Alert you on the day an invoice crosses its due date without full settlement."
          />

          <ToggleSwitch
            id="notifWeeklySummary"
            checked={Boolean(notif.emailWeeklySummary ?? false)}
            onChange={(checked) => updateNotif('emailWeeklySummary', checked)}
            label="Weekly business digest"
            description="A Monday morning summary of outstanding receivables, active milestone progress, and revenue."
          />
        </div>
      </div>

      {/* Automatic Client Invoice Reminders Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Automated payment reminders
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5">
            Polite automated email reminders sent directly to clients for unpaid invoices.
          </p>
        </div>

        <div className="space-y-5">
          <ToggleSwitch
            id="remindersEnabled"
            checked={Boolean(notif.remindersEnabled)}
            onChange={(checked) => updateNotif('remindersEnabled', checked)}
            label="Enable automated client reminders"
            description="Sends pre-scheduled reminder emails with invoice summary and payment links."
          />

          {notif.remindersEnabled && (
            <div className="p-4 rounded-xl bg-[#FAF5EA]/50 border border-[#E8E0CF] space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  id="reminderDaysBefore"
                  label="Days before due date"
                  value={notif.reminderDaysBefore}
                  helperText="Advance courtesy reminder"
                >
                  <TextInput
                    id="reminderDaysBefore"
                    type="number"
                    min="1"
                    max="14"
                    value={notif.reminderDaysBefore ?? 3}
                    onChange={(e) => updateNotif('reminderDaysBefore', parseInt(e.target.value, 10) || 3)}
                    placeholder="3"
                  />
                </FormField>

                <div className="flex flex-col justify-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#0E1A2B]">
                    <input
                      type="checkbox"
                      checked={Boolean(notif.reminderOnDueDate ?? true)}
                      onChange={(e) => updateNotif('reminderOnDueDate', e.target.checked)}
                      className="w-4 h-4 rounded text-[#0047AB] focus:ring-[#0047AB]"
                    />
                    <span>Remind on the exact due date</span>
                  </label>
                </div>

                <FormField
                  id="reminderDaysAfter"
                  label="Days overdue interval"
                  value={notif.reminderDaysAfter}
                  helperText="Recurring reminder for overdue bills"
                >
                  <TextInput
                    id="reminderDaysAfter"
                    type="number"
                    min="1"
                    max="30"
                    value={notif.reminderDaysAfter ?? 7}
                    onChange={(e) => updateNotif('reminderDaysAfter', parseInt(e.target.value, 10) || 7)}
                    placeholder="7"
                  />
                </FormField>
              </div>

              <div className="pt-2 border-t border-[#E8E0CF] flex items-center justify-between text-xs text-[#5B6676]">
                <span>Reminders use the polite default template with your studio letterhead.</span>
                <span className="text-[#0047AB] font-semibold cursor-default">
                  Configured per client
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

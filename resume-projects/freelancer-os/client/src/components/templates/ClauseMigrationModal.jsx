import React from 'react';
import { X, Sparkles, ArrowRight, Check, AlertCircle } from 'lucide-react';

export const LEGACY_MIGRATION_PAIRS = [
  {
    title: 'Standard Payment Terms',
    oldCategory: 'Payment',
    newCategory: 'Payment',
    oldText:
      'Client agrees to an initial 40% non-refundable kickoff deposit upon contract execution. A second milestone payment of 35% is due upon staging/beta demonstration. The remaining 25% balance is due prior to final production source code handover or DNS domain live pointing.',
    newText:
      'Client agrees to the milestone payment schedule: {{payment_schedule}}. Invoices are issued per agreed deliverable and are payable per the agreed terms. Final deliverables and production source assets are handed over upon settlement of all milestone balances.',
    rationale: 'Replaces hardcoded 40/35/25 split with dynamic {{payment_schedule}} matching each proposal.',
  },
  {
    title: 'Revision Allowance & Change Requests',
    oldCategory: 'Scope Guard',
    newCategory: 'Scope and changes',
    oldText:
      'The quotation includes up to two (2) consolidated rounds of feedback and cosmetic adjustments per approved milestone. Any subsequent functional additions, workflow alterations, or architectural deviations shall be formally quoted as independent Change Orders.',
    newText:
      'The quotation includes up to {{revision_rounds}} consolidated rounds of feedback and cosmetic revisions per approved deliverable. Any subsequent functional additions, workflow alterations, or out-of-scope requests will be quoted separately under a written change order before work begins.',
    rationale: 'Uses dynamic {{revision_rounds}} from chosen tier and updates category to "Scope and changes".',
  },
  {
    title: 'Third-Party Services & Subscriptions',
    oldCategory: 'Infrastructure',
    newCategory: 'Third-party costs',
    oldText:
      'Client is solely responsible for direct ongoing operational costs of third-party platforms, including cloud hosting (AWS, Vercel), domain registrar renewals, transactional messaging APIs (Twilio, Gupshup), and payment gateway processing fees.',
    newText:
      'Client is solely responsible for direct ongoing operational costs of third-party platforms, including hosting, domains, software licenses, stock assets, transactional messaging, and payment gateway processing fees.',
    rationale: 'Removes specific provider brand names (AWS, Vercel, Twilio, Gupshup) for neutral industry wording.',
  },
  {
    title: 'Client Review & Feedback Timelines',
    oldCategory: 'Project SLA',
    newCategory: 'Delivery and reviews',
    oldText:
      'To prevent project delays, Client agrees to provide consolidated reviews within five (5) business days of milestone handover. Unresponsive periods exceeding fourteen (14) days may require milestone rescheduling.',
    newText:
      'To keep the project on schedule, Client agrees to provide consolidated reviews and feedback within {{review_days}} business days of deliverable handover. Unresponsive periods exceeding fourteen (14) days may require milestone rescheduling.',
    rationale: 'Connects to your configurable {{review_days}} setting and updates category to "Delivery and reviews".',
  },
  {
    title: 'Intellectual Property & Ownership Transfer',
    oldCategory: 'Legal',
    newCategory: 'Ownership and IP',
    oldText:
      'All custom source code, design assets, and technical documentation produced exclusively under this agreement will transfer full, perpetual intellectual property ownership to the Client upon receipt of 100% of agreed contract fees.',
    newText:
      'All custom deliverables, design assets, and technical documentation produced exclusively under this agreement transfer full, perpetual intellectual property ownership to the Client upon receipt of 100% of the total agreed investment of {{total}} {{currency}}.',
    rationale: 'Clarifies complete IP transfer upon full settlement and moves to "Ownership and IP".',
  },
];

export function ClauseMigrationModal({
  isOpen,
  onClose,
  onAcceptMigration,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/40 backdrop-blur-xs animate-fade-in font-['Instrument_Sans',sans-serif]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[var(--line,#E8E0CF)] flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--cobalt,#0047AB)]" />
              <h2
                id="migration-modal-title"
                className="text-[20px] font-bold text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]"
              >
                Review suggested clause upgrades
              </h2>
            </div>
            <p className="text-[13px] text-[var(--muted,#5B6676)] mt-0.5">
              Upgrade your existing clauses to use smart variables (like dynamic payment schedules and revision counts).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] rounded-xl transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Comparison List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-[var(--cobalt-tint,#E8F0FB)] border border-[var(--cobalt,#0047AB)]/20 text-xs text-[var(--cobalt,#0047AB)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Your existing clauses will remain fully editable. Accepting these upgrades will replace hardcoded numbers
              with dynamic variables that adjust automatically per proposal.
            </span>
          </div>

          <div className="space-y-4">
            {LEGACY_MIGRATION_PAIRS.map((pair, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[var(--line,#E8E0CF)] bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[15px] text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                    {pair.title}
                  </span>
                  <span className="text-[11px] text-[var(--muted,#5B6676)] italic">{pair.rationale}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Old Text */}
                  <div className="p-3 rounded-lg bg-[var(--page,#FAF5EA)]/40 border border-[var(--line,#E8E0CF)] space-y-1">
                    <span className="font-semibold text-[var(--muted,#5B6676)] block text-[10px] uppercase">
                      Current wording ({pair.oldCategory})
                    </span>
                    <p className="text-[var(--ink,#0E1A2B)]/80 leading-relaxed">{pair.oldText}</p>
                  </div>

                  {/* New Text */}
                  <div className="p-3 rounded-lg bg-[var(--success-tint,#E7F6EC)]/40 border border-[var(--success,#067647)]/30 space-y-1">
                    <span className="font-bold text-[var(--success,#067647)] block text-[10px] uppercase flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Upgraded variable wording ({pair.newCategory})
                    </span>
                    <p className="text-[var(--ink,#0E1A2B)] leading-relaxed font-medium">{pair.newText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-[var(--line,#E8E0CF)] bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-medium text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 rounded-xl"
          >
            Keep existing as is
          </button>
          <button
            type="button"
            onClick={() => {
              onAcceptMigration(LEGACY_MIGRATION_PAIRS);
              onClose();
            }}
            className="h-10 px-5 rounded-full text-[14px] font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 shadow-xs"
          >
            Accept variable upgrades
          </button>
        </footer>
      </div>
    </div>
  );
}

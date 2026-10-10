import React from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowLeft, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { Logo } from '../components/common/Logo';

export function RefundPage() {
  return (
    <div className="min-h-screen bg-background text-charcoal-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white/90 backdrop-blur-md border-b border-charcoal-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <div className="h-4 w-px bg-charcoal-200" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-mint">Official Policy</span>
          <span className="text-xs text-charcoal-400">Last Updated: October 2026</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="card-premium p-8 sm:p-12 space-y-8">
          <div className="border-b border-charcoal-100 pb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-900">
              Refund & Cancellation Policy
            </h1>
            <p className="text-sm text-charcoal-500 mt-2">
              Transparent terms regarding platform usage, account cancellation, and client-freelancer commercial arrangements.
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">1. Platform Subscriptions & Billing</h2>
              <p>
                Floorly offers free tiers as well as subscription plans for professional freelancers, agencies, and teams. 
              </p>
              <div className="p-4 rounded-xl bg-mint-50/60 border border-mint-200 text-charcoal-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-mint-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-charcoal-900">Zero Commission on Freelance Earnings: </span>
                  Floorly never takes a percentage, cut, or commission from your client contracts, invoices, or project earnings. All project revenues belong 100% to you.
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">2. Account Cancellation & Data Export</h2>
              <p>
                You may discontinue your use of Floorly at any time without fees, penalties, or advance notice requirements:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li>You can export all your project proposals, financial invoice records, and generated <code className="bg-charcoal-100 px-1 py-0.5 rounded text-xs font-mono">AGENTS.md</code> files prior to deactivating your workspace.</li>
                <li>To permanently purge your workspace and all associated database records, simply send an account cancellation request to <a href="mailto:support@floorly.ai" className="text-brand-600 underline font-medium">support@floorly.ai</a>.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">3. Freelancer-to-Client Contractual Transactions</h2>
              <p>
                Floorly equips freelancers with requirement scoping, itemized proposals, and invoice tracking utilities. However:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li><strong>Independent Commercial Contracts:</strong> All commercial contracts, payment schedules, deliverable milestones, and refund commitments made between you and your clients are solely negotiated between the respective contracting parties.</li>
                <li><strong>No Escrow or Intermediary Role:</strong> Floorly is not an escrow service, payment processor, or legal party to your client contracts. Payments received via direct wire, UPI, bank transfer, or cash are settled directly between you and your client.</li>
                <li><strong>Dispute Resolution:</strong> Floorly does not arbitrate deliverable disputes or mediate refund demands between freelancers and their clients.</li>
              </ul>
            </section>

            <section className="space-y-3 bg-charcoal-50/60 border border-charcoal-200/80 rounded-xl p-5">
              <div className="flex items-center gap-2 text-charcoal-900 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-brand-600" />
                <span>4. Recommended Freelancer Policy Practices</span>
              </div>
              <p className="text-xs sm:text-sm text-charcoal-600">
                When generating proposals and quotations in Floorly, we encourage freelancers to utilize our built-in contractual safeguards:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600 text-xs">
                <li><strong>Advance Milestone Deposits:</strong> Require a non-refundable upfront deposit (e.g., 30–50%) before commencement of architectural or design work.</li>
                <li><strong>Milestone Sign-off:</strong> Require explicit written sign-off before commencing the next milestone. Completed and approved milestones should be marked non-refundable.</li>
                <li><strong>Scope Change Orders:</strong> Use Floorly's Scope Change manager to re-quote when clients request feature expansions rather than modifying existing contracts.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">5. Recording Refunds and Credit Adjustments</h2>
              <p>
                In the event that you mutually agree to issue a partial or full refund to one of your clients, Floorly's Invoicing module allows you to record manual negative balance adjustments, reversals, and credit notes so your profit & receivable metrics stay accurate.
              </p>
            </section>

            <section className="space-y-2 pt-4 border-t border-charcoal-100">
              <h2 className="text-base font-bold text-charcoal-900">6. Questions or Inquiries</h2>
              <p>
                For any inquiries regarding this policy, reach out to our support team at{' '}
                <a href="mailto:support@floorly.ai" className="text-brand-600 underline font-semibold">
                  support@floorly.ai
                </a>{' '}
                or visit our <Link to="/contact" className="text-brand-600 underline font-semibold">Contact Page</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer isPublic={true} />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { Logo } from '../components/common/Logo';
import { siteConfig } from '../config/site';

export function TermsPage() {
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
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-900">
              Terms & Conditions
            </h1>
            <p className="text-sm text-charcoal-500 mt-2">
              Please read these terms and conditions carefully before using Floorly.
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">1. Acceptance of Terms</h2>
              <p>
                By creating an account, accessing, or using Floorly ("the Service" or "Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to all terms, you may not access or use the application.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">2. Nature and Purpose of the Service</h2>
              <p>
                Floorly is an AI-powered freelance management workstation designed to help independent developers, designers, agencies, and freelancers convert unstructured client communications into structured scopes of work, transparent quotations, itemized proposals, client-specific <code className="bg-charcoal-100 px-1.5 py-0.5 rounded text-xs font-mono">AGENTS.md</code> instruction files, and track payment receivables.
              </p>
              <p>
                Floorly is a software productivity platform. Floorly is <strong>not</strong> an employer, broker, employment agency, or escrow agent. All contracts, service deliverables, and payment obligations established between you and your freelance clients remain strictly between the respective contracting parties.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">3. AI Requirement Scoping and Estimates</h2>
              <p>
                The AI Requirement Analyzer leverages large language models (such as Google Gemini) to assist in organizing briefs, identifying ambiguities, estimating task complexity, and drafting technical proposals.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li>AI analysis outputs are assistive tools and recommendations, not contractual guarantees.</li>
                <li>You retain full editorial responsibility to review, customize, verify, and approve all scopes, timeline hours, and pricing before presenting them to a client.</li>
                <li>Floorly does not guarantee that client projects will be executed within estimated hours or without technical discrepancies.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">4. Smart Floor Pricing Rules & Safeguards</h2>
              <p>
                The Smart Pricing Engine enforces your user-configured minimum acceptable rates ("floor fees"). While Floorly assists you in preventing unintentional undercharging:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li>Configured rates reflect your personal business rules, not legal market price minimums.</li>
                <li>You maintain complete freedom to alter, override, or discount your rates as you deem commercially viable.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">5. User Accounts and Data Ownership</h2>
              <p>
                You are responsible for maintaining the confidentiality of your login credentials. You retain full ownership, title, and intellectual property rights in and to the client documents, proposal contents, custom code instructions, and invoices generated through your account.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">6. Acceptable Use Policy</h2>
              <p>You agree not to use Floorly to:</p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li>Upload malicious, fraudulent, defamatory, or unlawful materials.</li>
                <li>Attempt prompt injections intended to override backend guardrails or reveal confidential data.</li>
                <li>Issue fraudulent invoices or disguise unlawful financial transactions.</li>
                <li>Reverse-engineer or disrupt the platform infrastructure.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">7. Platform Pricing & Subscriptions</h2>
              <p>
                Floorly offers free access tiers, trial allowances, and optional premium subscriptions or enterprise plans. We reserve the right to modify pricing structures, add premium features, or update plans in the future with prior notice to users.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by applicable law, Floorly and its contributors shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from client disputes, lost revenue, scope creep, project cancellations, or data inaccuracies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">9. Modifications and Termination</h2>
              <p>
                We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance. You may terminate your account at any time by contacting our support team or deleting your workspace data.
              </p>
            </section>

            <section className="space-y-2 pt-4 border-t border-charcoal-100">
              <h2 className="text-base font-bold text-charcoal-900">10. Contact Us</h2>
              <p>
                For questions regarding these Terms & Conditions, please contact us at{' '}
                <a href={`mailto:${siteConfig.supportEmail}`} className="text-brand-600 underline font-semibold">
                  {siteConfig.supportEmail}
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

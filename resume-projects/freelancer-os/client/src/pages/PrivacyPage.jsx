import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Lock, EyeOff, Database, Cpu } from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { Logo } from '../components/common/Logo';

export function PrivacyPage() {
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-900">
              Privacy Policy
            </h1>
            <p className="text-sm text-charcoal-500 mt-2">
              Your privacy, intellectual property, and client confidentiality are our paramount commitments at Floorly.
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">1. Information We Collect</h2>
              <p>When you use Floorly, we collect minimal and necessary information to provide our services:</p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li><strong>Account Information:</strong> Name, email address, password hash, and optional business details (business name, contact info, default currency).</li>
                <li><strong>Client & Project Data:</strong> Client contact details, raw WhatsApp/email messages, project briefs, uploaded specification documents, and notes that you input into the AI Requirement Analyzer.</li>
                <li><strong>Commercial Settings:</strong> Configured hourly rates, minimum floor pricing, margin preferences, and proposal drafts.</li>
                <li><strong>Invoices & Financial Records:</strong> Created invoice line items, milestone breakdowns, payment status notes, and direct remittance references.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">2. How We Use Your Information</h2>
              <p>We process your data strictly to execute core application functionality:</p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li>Extracting and classifying software requirements from unstructured client briefs.</li>
                <li>Calculating deterministic project quotations and enforcing configured floor boundaries.</li>
                <li>Generating production-grade client proposals, PDF summaries, and project-specific <code className="bg-charcoal-100 px-1.5 py-0.5 rounded text-xs font-mono">AGENTS.md</code> files.</li>
                <li>Tracking client receivables, payment schedules, and project milestone fulfillment.</li>
                <li>Maintaining authentication sessions and application security.</li>
              </ul>
            </section>

            <section className="space-y-3 bg-mint-50/50 border border-mint-200/80 rounded-xl p-5">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm">
                <Lock className="w-4 h-4 text-brand-600" />
                <span>3. Zero AI Training on Your Client Briefs</span>
              </div>
              <p className="text-xs sm:text-sm text-charcoal-700">
                Floorly connects with enterprise-tier model providers (e.g., Google Gemini API via official enterprise agreements). Under our configuration:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600 text-xs">
                <li>Your client briefs, confidential communications, project scopes, and pricing rules are <strong>never used to train</strong> public or foundational AI models.</li>
                <li>API transmissions are ephemeral, encrypted in transit using TLS 1.3, and discarded by model endpoints following token generation.</li>
                <li>All intellectual property, proprietary software specs, and generated <code className="bg-charcoal-100 px-1 py-0.5 rounded text-xs font-mono">AGENTS.md</code> documents remain exclusively owned by you.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">4. Data Isolation & Multi-Tenant Security</h2>
              <p>
                Every user workspace in Floorly is strictly isolated at the database level. Each database query verifies account ownership tokens. No user or organization can view, query, or infer another freelancer's clients, proposals, custom pricing rates, or invoice ledger.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">5. Payment & Financial Data Handling</h2>
              <p>
                Floorly does not store raw credit card numbers, CVVs, or sensitive banking PINs. Invoicing features operate on direct client settlement (Wire/IBAN, UPI, Direct Transfer, Cheque, Cash) with manual receipt recording managed exclusively by you.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">6. Data Retention and Account Deletion</h2>
              <p>
                We retain your data for as long as your workspace account remains active. You maintain the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-charcoal-600">
                <li>Export all client proposals, generated AGENTS.md files, and invoice histories at any time.</li>
                <li>Request complete account deletion, upon which all associated clients, requirement records, proposals, and logs will be permanently expunged from our production databases within 14 business days.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">7. Cookies & Session Storage</h2>
              <p>
                Floorly uses essential session tokens and HTTP-only cookies necessary to keep you securely signed in. We do not deploy third-party advertising cookies or cross-site tracking pixels.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-charcoal-900">8. Compliance & Your Rights (GDPR & CCPA)</h2>
              <p>
                Depending on your location, you may have rights under the GDPR or CCPA to access, correct, port, or erase your personal information. To exercise any of these rights, email our privacy team directly.
              </p>
            </section>

            <section className="space-y-2 pt-4 border-t border-charcoal-100">
              <h2 className="text-base font-bold text-charcoal-900">9. Contact Our Data Protection Officer</h2>
              <p>
                If you have questions, feedback, or data requests regarding this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@floorly.ai" className="text-brand-600 underline font-semibold">
                  privacy@floorly.ai
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

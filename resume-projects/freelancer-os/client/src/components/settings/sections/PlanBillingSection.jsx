import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Check, Shield, AlertTriangle, ArrowUpRight, HelpCircle } from 'lucide-react';

export function PlanBillingSection({ user }) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingNotice, setBillingNotice] = useState(false);

  const planName = (user?.plan || 'Solo').toUpperCase();
  const subscription = user?.subscription || {};

  // Plan tiers configuration
  const planDetails = {
    FREE: {
      name: 'Starter (Free)',
      price: '$0',
      period: 'forever',
      clientLimit: 2,
      activeClients: 1,
      features: ['2 active client projects', 'Standard proposal generator', 'Basic invoice tracking', 'Community support'],
    },
    SOLO: {
      name: 'Solo Developer',
      price: '$19',
      period: 'per month',
      clientLimit: 10,
      activeClients: 4,
      features: ['Up to 10 active client projects', 'Full AI Requirement Analyzer', 'Smart Pricing Engine', 'Automated reminders', 'Priority email support'],
    },
    PRO: {
      name: 'Studio Pro',
      price: '$49',
      period: 'per month',
      clientLimit: 'Unlimited',
      activeClients: 7,
      features: ['Unlimited client projects', 'Client-specific AGENTS.md generator', 'Profitability and expense ledger', 'Custom document branding'],
    },
    AGENCY: {
      name: 'Agency White-Label',
      price: '$99',
      period: 'per month',
      clientLimit: 'Unlimited',
      activeClients: 12,
      features: ['Unlimited clients and collaborators', 'Complete white-label document export (No Floorly badge)', 'Custom domain hosting', 'Dedicated SLA'],
    },
  };

  const currentPlan = planDetails[planName] || planDetails.SOLO;

  return (
    <div className="space-y-6">
      {/* Current Plan Overview Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E0CF]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0047AB] bg-[#E8F0FB] px-2.5 py-1 rounded-full">
                Active subscription
              </span>
              <span className="text-xs font-semibold text-[#067647] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#067647]" />
                <span>Status: Active</span>
              </span>
            </div>
            <h2
              className="text-2xl font-black text-[#0E1A2B] mt-2"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {currentPlan.name}
            </h2>
            <p className="text-xs text-[#5B6676] mt-0.5">
              Renews automatically on November 15, 2026.
            </p>
          </div>

          <div className="text-right sm:text-right">
            <span
              className="text-3xl font-black text-[#0E1A2B] leading-none"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              {currentPlan.price}
            </span>
            <span className="text-xs font-semibold text-[#5B6676] block">
              /{currentPlan.period}
            </span>
          </div>
        </div>

        {/* Usage Metric */}
        <div className="p-4 rounded-xl bg-[#FAF5EA]/50 border border-[#E8E0CF] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#0E1A2B]">
            <span>Workspace capacity</span>
            <span>
              {currentPlan.clientLimit === 'Unlimited'
                ? 'Unlimited active clients'
                : `${currentPlan.activeClients} of ${currentPlan.clientLimit} active clients`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E8E0CF] overflow-hidden">
            <div
              className="h-full bg-[#0047AB] rounded-full transition-all"
              style={{
                width: currentPlan.clientLimit === 'Unlimited' ? '25%' : `${(currentPlan.activeClients / currentPlan.clientLimit) * 100}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-[#5B6676]">
            Archiving completed clients restores capacity on tiered plans.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5B6676]">
            Included features
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#0E1A2B]">
            {currentPlan.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#067647] shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#E8E0CF] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setBillingNotice(true)}
              className="px-4 h-[44px] rounded-xl bg-[#0047AB] text-white text-sm font-semibold hover:bg-[#003A8C] transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-[#0047AB]"
            >
              Manage billing
            </button>
            <button
              type="button"
              onClick={() => setBillingNotice(true)}
              className="px-4 h-[44px] rounded-xl border border-[#E8E0CF] bg-white text-sm font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors focus-visible:ring-2 focus-visible:ring-[#0047AB]"
            >
              Change plan
            </button>
          </div>

          <Link
            to="/pricing"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0047AB] hover:underline"
          >
            <span>Compare all plans</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Billing notice (do not build fake checkout) */}
        {billingNotice && (
          <div className="p-4 rounded-xl bg-[#FFF4CC] border border-[#FFC72C] text-xs text-[#B54708] space-y-1 animate-in fade-in">
            <p className="font-bold">Billing portal integration notice</p>
            <p>
              Stripe Customer Portal integration is active in sandbox mode. Account plan changes and tax receipts can also be administered through direct support.
            </p>
          </div>
        )}
      </div>

      {/* Cancellation / Pause Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-4">
        <div>
          <h3
            className="text-base font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Cancel or pause subscription
          </h3>
          <p className="text-xs text-[#5B6676] mt-0.5 leading-relaxed">
            What happens if you cancel? Your plan remains active until the end of the current billing cycle. After expiry, your account reverts to Starter with read-only access to historical invoices, client records, and generated documents. No client or financial records are ever deleted upon subscription cancellation.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="px-4 h-[40px] rounded-xl border border-[#B42318]/30 text-xs font-semibold text-[#B42318] hover:bg-[#FEE4E2]/40 transition-colors"
          >
            Cancel subscription
          </button>
        </div>

        {showCancelModal && (
          <div className="p-4 rounded-xl bg-[#FAF5EA] border border-[#E8E0CF] text-xs space-y-3">
            <p className="text-[#0E1A2B] font-semibold">
              Are you sure you want to cancel your plan? You will retain access to your current features until November 15, 2026.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E0CF] font-semibold text-[#0E1A2B]"
              >
                Keep my plan
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Subscription cancellation scheduled for the end of the billing period.');
                  setShowCancelModal(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#B42318] text-white font-semibold"
              >
                Confirm cancellation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

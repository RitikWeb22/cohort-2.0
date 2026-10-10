import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Trash2,
  Database,
  AlertTriangle,
  ShieldCheck,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { api } from '../../../lib/api';

export function DataPrivacySection({ user, onLogout }) {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isDemoClearing, setIsDemoClearing] = useState(false);

  // Modal dialog states
  const [showLoadConfirm, setShowLoadConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: demoStatus, refetch: refetchDemoStatus } = useQuery({
    queryKey: ['demo-status'],
    queryFn: () => api.getDemoStatus(),
  });

  // Handle Export Data
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('floorly_token') || localStorage.getItem('freelanceos_token');
      const response = await fetch('/api/v1/auth/export-data', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Export request failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `floorly-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Load Demo Data
  const handleLoadDemoData = async (confirmed = false) => {
    try {
      setIsDemoLoading(true);
      const res = await api.loadDemoData({ confirmed });
      await refetchDemoStatus();
      queryClient.invalidateQueries();
      alert('Sample international demo data loaded successfully! Demo records are tagged with a demo indicator.');
      setShowLoadConfirm(false);
    } catch (err) {
      if (err.data?.requiresConfirmation || err.status === 409) {
        setShowLoadConfirm(true);
      } else {
        alert(err.message || 'Failed to load demo data');
      }
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Handle Clear Demo Data (Leaves real records intact)
  const handleClearDemoData = async () => {
    try {
      setIsDemoClearing(true);
      const res = await api.clearDemoData();
      await refetchDemoStatus();
      queryClient.invalidateQueries();
      alert(res.message || 'Demo records cleared successfully. Your real data remains untouched.');
      setShowClearConfirm(false);
    } catch (err) {
      alert(err.message || 'Failed to clear demo data');
    } finally {
      setIsDemoClearing(false);
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    if (deleteConfirmationEmail.toLowerCase().trim() !== user?.email?.toLowerCase().trim()) {
      setDeleteError('Email confirmation does not match your account email address.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      await api.deleteAccount({ email: deleteConfirmationEmail });
      alert('Your account and all associated data have been permanently removed.');
      if (onLogout) {
        onLogout();
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Data Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-4">
        <div>
          <h2
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Export workspace data
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5 leading-relaxed">
            Download a portable, complete snapshot of all your clients, proposals, projects, line items, invoices, payment receipts, and expenses as a standardized JSON data package.
          </p>
        </div>

        <div>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportData}
            className="inline-flex items-center gap-2 px-4 h-[44px] rounded-xl bg-white border border-[#E8E0CF] hover:border-[#0047AB] text-sm font-semibold text-[#0E1A2B] hover:text-[#0047AB] transition-colors focus-visible:ring-2 focus-visible:ring-[#0047AB]"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-[#0047AB]" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'Preparing export...' : 'Export my data (JSON package)'}</span>
          </button>
        </div>
      </div>

      {/* Demo Workspace Data Management Card */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-lg font-bold text-[#0E1A2B]"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
            >
              Demo & sample data
            </h2>
            {demoStatus?.hasDemoData && (
              <span className="text-[10px] font-bold bg-[#FFF4CC] text-[#B54708] px-2 py-0.5 rounded">
                Active in workspace
              </span>
            )}
          </div>
          <p className="text-xs text-[#5B6676] mt-0.5 leading-relaxed">
            Load realistic international clients, proposals, milestones, and sample invoices to test layout previews and calculations. Demo records are isolated with an internal demo flag so clearing them will never affect your real data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={isDemoLoading}
            onClick={() => {
              if (demoStatus?.hasRealInvoices) {
                setShowLoadConfirm(true);
              } else {
                handleLoadDemoData(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 h-[44px] rounded-xl bg-[#0047AB] text-white text-sm font-semibold hover:bg-[#003A8C] transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-[#0047AB]"
          >
            {isDemoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            <span>Load demo data</span>
          </button>

          <button
            type="button"
            disabled={isDemoClearing || !demoStatus?.hasDemoData}
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-2 px-4 h-[44px] rounded-xl border border-[#E8E0CF] bg-white text-sm font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors focus-visible:ring-2 focus-visible:ring-[#0047AB] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDemoClearing ? <Loader2 className="w-4 h-4 animate-spin text-[#B42318]" /> : <Trash2 className="w-4 h-4 text-[#B42318]" />}
            <span>Clear demo data</span>
          </button>
        </div>

        {demoStatus?.hasDemoData && (
          <p className="text-[11px] text-[#B54708] font-medium bg-[#FFF4CC] p-2.5 rounded-xl border border-[#FFC72C]/40">
            A yellow demo banner is currently displayed across the app to remind you that sample records are loaded.
          </p>
        )}
      </div>

      {/* AI Data & Privacy Disclosure */}
      <div className="bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#0047AB]">
          <ShieldCheck className="w-5 h-5" />
          <h3
            className="text-base font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            AI privacy & model usage policy
          </h3>
        </div>
        <p className="text-xs text-[#5B6676] leading-relaxed">
          {/* AI Provider Data Usage Notice: Floorly does NOT use your proprietary client contracts, project briefs, or business identity data to train public foundation models. All model invocations use private enterprise endpoints. Confirm wording with provider before launch. */}
          Floorly processes your client briefs and requirements through secure, enterprise-grade AI endpoints. Your prompt text, business parameters, and client contracts are never stored for foundation model training or public sharing.
        </p>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="bg-[#FAF5EA]/50 rounded-2xl border border-[#B42318]/30 p-6 space-y-4">
        <div>
          <h2
            className="text-lg font-bold text-[#B42318]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Delete account & all data
          </h2>
          <p className="text-xs text-[#5B6676] mt-0.5 leading-relaxed">
            Permanently deletes your studio profile, clients, proposals, accepted projects, invoices, recorded payments, and expenses. This action is irreversible.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 h-[44px] rounded-xl bg-[#B42318] text-white text-sm font-semibold hover:bg-[#912018] transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-[#B42318]"
          >
            Delete my account
          </button>
          <button
            type="button"
            onClick={handleExportData}
            className="px-4 h-[44px] rounded-xl border border-[#E8E0CF] bg-white text-sm font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors"
          >
            Export data first
          </button>
        </div>
      </div>

      {/* Confirmation Dialog: Load Demo Data when Real Invoices Exist */}
      {showLoadConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-[#B54708]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#0E1A2B]">Real invoices detected</h3>
            </div>
            <p className="text-xs text-[#5B6676] leading-relaxed">
              You already have real invoices created in your account. Loading demo data will add sample records alongside your actual invoices. Demo records can be removed at any time using "Clear demo data".
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLoadConfirm(false)}
                className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] text-xs font-semibold text-[#0E1A2B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemoData(true)}
                className="px-4 h-[40px] rounded-xl bg-[#0047AB] text-white text-xs font-semibold"
              >
                Proceed & load demo data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Clear Demo Data */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E0CF] p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#0E1A2B]">Clear all demo records?</h3>
            <p className="text-xs text-[#5B6676] leading-relaxed">
              This will remove ONLY sample clients, demo proposals, and demo invoices. Your real clients and real financial transactions will remain completely intact.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] text-xs font-semibold text-[#0E1A2B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearDemoData}
                className="px-4 h-[40px] rounded-xl bg-[#B42318] text-white text-xs font-semibold"
              >
                Clear demo records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Account */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#B42318]/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#B42318]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold">Permanently delete account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-[#5B6676] hover:text-[#0E1A2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5B6676] leading-relaxed">
              To confirm deletion, please type your account email address: <strong className="text-[#0E1A2B]">{user?.email}</strong>.
            </p>

            <input
              type="email"
              value={deleteConfirmationEmail}
              onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
              placeholder={user?.email}
              className="w-full h-[44px] px-3.5 bg-white text-[#0E1A2B] text-sm rounded-xl border border-[#E8E0CF] focus:border-[#B42318] focus:ring-2 focus:ring-[#B42318] outline-none"
            />

            {deleteError && (
              <p className="text-xs font-medium text-[#B42318]">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 h-[40px] rounded-xl border border-[#E8E0CF] text-xs font-semibold text-[#0E1A2B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmationEmail.toLowerCase().trim() !== user?.email?.toLowerCase().trim()}
                onClick={handleDeleteAccount}
                className="px-4 h-[40px] rounded-xl bg-[#B42318] text-white text-xs font-semibold hover:bg-[#912018] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Permanently delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

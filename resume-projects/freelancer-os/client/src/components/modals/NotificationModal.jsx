import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';

export function NotificationModal() {
  const { toasts, removeToast, confirmModal, closeConfirm } = useNotificationStore();

  const handleConfirmAction = () => {
    if (confirmModal.onConfirm) {
      confirmModal.onConfirm();
    }
    closeConfirm();
  };

  return (
    <>
      {/* Floating Toast Notification Popups (Top-Right) */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl shadow-elevated border flex items-start gap-3 backdrop-blur-md animate-slide-in transition-all ${
                isSuccess
                  ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                  : isError
                  ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                  : isWarning
                  ? 'bg-amber-50/95 border-amber-200 text-amber-950'
                  : 'bg-white/95 border-charcoal-200 text-charcoal-900'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-brand-600" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-xs font-bold tracking-tight">{toast.title}</h4>
                )}
                <p className="text-xs text-charcoal-700 leading-relaxed break-words mt-0.5">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-black/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog Popup */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-charcoal-200 shadow-modal w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    confirmModal.isDestructive
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-brand-50 text-brand-600 border border-brand-200'
                  }`}
                >
                  {confirmModal.isDestructive ? (
                    <Trash2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-charcoal-900">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">Please confirm to proceed</p>
                </div>
              </div>

              <p className="text-xs text-charcoal-700 leading-relaxed mb-6">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="px-4 py-2 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs ${
                    confirmModal.isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  <span>{confirmModal.confirmText || 'Confirm'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useEffect, useRef } from 'react';
import { Globe, X } from 'lucide-react';

export function CountryChangeDialog({
  isOpen,
  targetCountry,
  onApply,
  onKeepCurrent,
  onClose,
}) {
  const dialogRef = useRef(null);

  // Focus trap & escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Focus primary button
    const timer = setTimeout(() => {
      dialogRef.current?.querySelector('button[data-primary="true"]')?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !targetCountry) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/40 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-white rounded-2xl border border-[#E8E0CF] shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F0FB] flex items-center justify-center text-[#0047AB] shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-[#5B6676] hover:bg-[#FAF5EA] hover:text-[#0E1A2B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3
            id="country-dialog-title"
            className="text-lg font-bold text-[#0E1A2B]"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
          >
            Update defaults for {targetCountry.name}?
          </h3>
          <p className="text-sm text-[#5B6676] mt-1 leading-relaxed">
            Update tax label ({targetCountry.taxLabel}), tax ID label ({targetCountry.taxIdLabel}), paper size ({targetCountry.paperSize}) and payment options to match {targetCountry.name}?
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onKeepCurrent}
            className="px-4 h-[44px] rounded-xl border border-[#E8E0CF] bg-white text-sm font-semibold text-[#0E1A2B] hover:bg-[#FAF5EA] transition-colors focus-visible:ring-2 focus-visible:ring-[#0047AB]"
          >
            Keep current
          </button>
          <button
            type="button"
            data-primary="true"
            onClick={onApply}
            className="px-5 h-[44px] rounded-xl bg-[#0047AB] text-white text-sm font-semibold hover:bg-[#003A8C] transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:ring-offset-2"
          >
            Apply defaults
          </button>
        </div>
      </div>
    </div>
  );
}

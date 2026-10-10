import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Archive,
  Trash2,
  X,
  FileText,
  Receipt,
  FolderGit2,
} from 'lucide-react';

export function DeleteClientDialog({
  isOpen,
  client,
  onClose,
  onConfirmDelete,
  onConfirmArchive,
}) {
  const modalRef = useRef(null);
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTypedName('');
    setIsDeleting(false);
  }, [isOpen, client]);

  // Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !client) return null;

  const clientName = (client.company || client.name || 'Client').trim();
  const invoicesCount = Number(client.invoicesCount || 0);
  const acceptedProposalsCount = Number(client.acceptedProposalsCount || 0);
  const proposalsCount = Number(client.proposalsCount || 0);
  const projectsCount = Number(client.projectsCount || 0);

  // Business Rule: If client has any invoices or accepted proposals, DISABLE Delete and offer Archive instead!
  const hasFinancialRecords = invoicesCount > 0 || acceptedProposalsCount > 0;
  const hasLinkedDraftsOnly = !hasFinancialRecords && (proposalsCount > 0 || projectsCount > 0);

  // When linked records exist, delete requires typing the client name
  const nameMatches = typedName.trim().toLowerCase() === clientName.toLowerCase();
  const canDelete = !hasFinancialRecords && (!hasLinkedDraftsOnly || nameMatches);

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await onConfirmDelete(client);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    await onConfirmArchive(client);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-[var(--line,#E8E0CF)] shadow-2xl p-6 space-y-4 overflow-hidden"
        style={{ color: 'var(--ink, #0E1A2B)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              hasFinancialRecords
                ? 'bg-[var(--warning-tint,#FEF0C7)] text-[var(--warning,#B54708)]'
                : 'bg-[var(--error-tint,#FEE4E2)] text-[var(--error,#B42318)]'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="delete-dialog-title"
                className="text-base font-bold text-[var(--ink,#0E1A2B)]"
                style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
              >
                {hasFinancialRecords ? `Cannot delete ${clientName}` : `Delete ${clientName}?`}
              </h3>
              <p className="text-xs text-[var(--muted,#5B6676)]">
                {hasFinancialRecords ? 'Client has linked financial records.' : 'This action cannot be undone.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-full text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Affected records list */}
        {(proposalsCount > 0 || invoicesCount > 0 || projectsCount > 0) && (
          <div className="p-3.5 rounded-xl bg-[var(--page,#FAF5EA)] border border-[var(--line,#E8E0CF)] space-y-2 text-xs">
            <span className="font-semibold text-[var(--ink,#0E1A2B)] block">
              Associated records affected:
            </span>
            <ul className="space-y-1 text-[var(--muted,#5B6676)]">
              {proposalsCount > 0 && (
                <li className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--cobalt,#0047AB)]" />
                  <span>{proposalsCount} proposal{proposalsCount === 1 ? '' : 's'} {acceptedProposalsCount > 0 ? `(${acceptedProposalsCount} accepted)` : ''}</span>
                </li>
              )}
              {invoicesCount > 0 && (
                <li className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[var(--warning,#B54708)]" />
                  <span>{invoicesCount} invoice{invoicesCount === 1 ? '' : 's'}</span>
                </li>
              )}
              {projectsCount > 0 && (
                <li className="flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-[var(--success,#067647)]" />
                  <span>{projectsCount} project{projectsCount === 1 ? '' : 's'}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Guard message if financial records exist */}
        {hasFinancialRecords ? (
          <div className="p-3.5 rounded-xl bg-[var(--warning-tint,#FEF0C7)] border border-[var(--warning,#B54708)]/30 text-xs text-[var(--warning,#B54708)] space-y-1.5">
            <p className="font-semibold">
              Delete is disabled to protect financial audit integrity.
            </p>
            <p className="leading-relaxed">
              This client has finalized invoices or accepted proposals. You can archive the client instead to hide them from active lists without losing billing history.
            </p>
          </div>
        ) : hasLinkedDraftsOnly ? (
          <div className="space-y-2 text-xs">
            <p className="text-[var(--muted,#5B6676)]">
              Type <strong className="text-[var(--ink,#0E1A2B)]">{clientName}</strong> below to confirm deletion of this client and linked draft records:
            </p>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={clientName}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line,#E8E0CF)] bg-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--error,#B42318)]"
            />
          </div>
        ) : (
          <p className="text-xs text-[var(--muted,#5B6676)] leading-relaxed">
            Are you sure you want to delete <strong>{clientName}</strong>? All client information will be permanently removed.
          </p>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[var(--line,#E8E0CF)] text-xs font-semibold text-[var(--muted,#5B6676)] hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
          >
            Cancel
          </button>

          {hasFinancialRecords ? (
            <button
              type="button"
              onClick={handleArchive}
              className="px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--cobalt, #0047AB)' }}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive instead</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!canDelete || isDeleting}
              onClick={handleDelete}
              className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-[var(--error,#B42318)] hover:bg-[#911B12] disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete client'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

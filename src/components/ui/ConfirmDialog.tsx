import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [busy, onCancel, open]);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  if (!open) return null;

  const isDanger = tone === 'danger';
  const confirmClass = isDanger
    ? 'border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 focus:ring-neutral-500'
    : 'bg-primary text-white hover:bg-primary-hover focus:ring-primary';

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-white shadow-md">
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isDanger ? 'border-neutral-200 bg-neutral-50 text-neutral-700' : 'border-primary/15 bg-primary-light text-primary'}`}>
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-xl p-1.5 text-text-tertiary transition-colors hover:bg-surface-subtle hover:text-text-primary disabled:opacity-50"
              aria-label="Close confirmation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 id="confirm-dialog-title" className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
          ) : null}
        </div>

        <div className="flex gap-2.5 px-6 pb-5">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteSectionModalProps {
  sectionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteSectionModal: React.FC<DeleteSectionModalProps> = ({
  sectionLabel,
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onConfirm, onCancel]);

  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-white shadow-md">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
              <Trash2 size={18} className="text-neutral-700" />
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <h2 className="text-base font-semibold text-gray-900 mb-1.5">
Remove this section?
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
This will remove the section and its content from this page. If you are unsure, cancel and hide it instead.
          </p>
        </div>

        <div className="flex gap-2.5 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className="flex-1 rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
          >
Remove it
          </button>
        </div>
      </div>
    </div>
  );
};

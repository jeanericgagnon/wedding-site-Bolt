import React, { useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteSectionModalProps {
  sectionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  onHideInstead?: () => void;
}

export const DeleteSectionModal: React.FC<DeleteSectionModalProps> = ({
  sectionLabel,
  onConfirm,
  onCancel,
  onHideInstead,
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <h2 className="text-base font-semibold text-gray-900 mb-1.5">
            Remove this section?
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-700">{sectionLabel}</span> will be removed from this page with its current content and layout.
            {onHideInstead
              ? ' If you might want it later, hide it instead and keep the work in place.'
              : ' This cannot be undone from this dialog, so cancel if you are unsure.'}
          </p>
        </div>

        <div className={`px-6 pb-5 ${onHideInstead ? 'space-y-2.5' : ''}`}>
          {onHideInstead && (
            <button
              onClick={onHideInstead}
              className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              Hide instead
            </button>
          )}
          <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
          >
            Remove it
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

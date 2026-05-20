import type { PlanningVendor } from './planningService';

type PendingVendorBudgetPromptProps = {
  vendor: PlanningVendor;
  onConfirm: () => void;
  onClose: () => void;
};

export function PendingVendorBudgetPrompt({
  vendor,
  onConfirm,
  onClose,
}: PendingVendorBudgetPromptProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-2">Add this vendor to your budget?</h3>
        <p className="text-sm text-text-secondary mb-4">
          "{vendor.name}" was added. Would you like to create a matching budget line too?
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="rounded-xl border border-border-subtle px-3 py-2 text-text-secondary hover:text-text-primary"
            onClick={onClose}
          >
            No thanks
          </button>
          <button
            className="rounded-xl bg-primary px-3 py-2 text-white hover:bg-primary/90"
            onClick={onConfirm}
          >
            Yes, add it to budget
          </button>
        </div>
      </div>
    </div>
  );
}

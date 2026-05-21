import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui';
import { X, Loader2 } from 'lucide-react';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import type { VaultConfig } from './vaultService';

const DURATION_OPTIONS = [
  { value: 1, label: '1 year (1st anniversary)' },
  { value: 2, label: '2 years (2nd anniversary)' },
  { value: 3, label: '3 years (3rd anniversary)' },
  { value: 5, label: '5 years (5th anniversary)' },
  { value: 10, label: '10 years (10th anniversary)' },
  { value: 15, label: '15 years (15th anniversary)' },
  { value: 20, label: '20 years (20th anniversary)' },
  { value: 25, label: '25 years (25th anniversary)' },
  { value: 50, label: '50 years (50th anniversary)' },
];

function defaultVaultLabel(index: number, years: number): string {
  const ordinals: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 5: '5th', 10: '10th', 15: '15th', 20: '20th', 25: '25th', 50: '50th' };
  const ordinal = ordinals[years] ?? `${years}th`;
  return `${ordinal} Anniversary Vault`;
}

function safeVaultModalError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

export interface EditVaultModalProps {
  config: VaultConfig;
  hasEntries: boolean;
  onSave: (id: string, label: string, durationYears: number) => Promise<void>;
  onClose: () => void;
}

export function EditVaultModal({ config, hasEntries, onSave, onClose }: EditVaultModalProps) {
  const [label, setLabel] = useState(config.label);
  const [durationYears, setDurationYears] = useState(config.duration_years);
  const [labelManuallyEdited, setLabelManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const clearLocalError = () => setLocalError(null);

  useEffect(() => {
    setLabel(config.label);
    setDurationYears(config.duration_years);
    setLabelManuallyEdited(false);
    setSaving(false);
    setLocalError(null);
  }, [config.duration_years, config.id, config.label]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setSaving(true);
    try {
      await onSave(config.id, label, durationYears);
      onClose();
    } catch (err) {
      setLocalError(safeVaultModalError(err, 'Couldn’t save your vault changes right now.'));
    } finally {
      setSaving(false);
    }
  }

  const isCustom = !DURATION_OPTIONS.find((option) => option.value === durationYears);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-[20px] max-w-md w-full p-6 border border-border shadow-none">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-text-primary">Edit Vault Settings</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-surface-subtle text-text-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {localError && (
              <div className="rounded-xl border border-border-subtle bg-surface-subtle p-3 text-sm font-semibold text-text-primary">
                {localError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Vault Name</label>
              <input
                type="text"
                value={label}
                onChange={(e) => { clearLocalError(); setLabel(e.target.value); setLabelManuallyEdited(true); }}
                placeholder="e.g. 1st Anniversary"
                maxLength={60}
                className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Opens After</label>
              <select
                value={isCustom ? 'custom' : String(durationYears)}
                disabled={hasEntries}
                onChange={(e) => {
                  clearLocalError();
                  if (e.target.value !== 'custom') {
                    const newYears = Number(e.target.value);
                    setDurationYears(newYears);
                    if (!labelManuallyEdited) {
                      setLabel(defaultVaultLabel(config.vault_index, newYears));
                    }
                  }
                }}
                className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={String(option.value)}>{option.label}</option>
                ))}
                <option value="custom">Custom…</option>
              </select>
              {isCustom && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={durationYears}
                    disabled={hasEntries}
                    onChange={(e) => {
                      clearLocalError();
                      setDurationYears(Math.max(1, Math.min(100, Number(e.target.value))));
                    }}
                    className="w-24 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-text-secondary">years after wedding date</span>
                </div>
              )}
              <p className="text-xs text-text-tertiary mt-1.5">
                {hasEntries
                  ? 'This vault already has submissions, so its anniversary year is locked.'
                  : 'Guests can contribute at any time, but content stays sealed until this date.'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth disabled={saving}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Saving…</> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

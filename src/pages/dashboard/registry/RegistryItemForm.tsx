import React, { useState } from 'react';
import { Link2, Loader2, X, ImageOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui';
import { fetchUrlPreview } from './registryService';
import { normalizeUrl, isValidUrl } from '../../../lib/urlUtils';
import type { RegistryItem, RegistryItemDraft, RegistryPreview } from './registryTypes';

interface Props {
  initial?: RegistryItem | null;
  onSave: (draft: RegistryItemDraft) => Promise<void>;
  onCancel: () => void;
}

function itemToDraft(item: RegistryItem): RegistryItemDraft {
  return {
    item_name: item.item_name,
    price_label: item.price_label ?? '',
    price_amount: item.price_amount != null ? String(item.price_amount) : '',
    merchant: item.merchant ?? item.store_name ?? '',
    item_url: item.item_url ?? '',
    image_url: item.image_url ?? '',
    notes: item.notes ?? item.description ?? '',
    desired_quantity: String(item.quantity_needed ?? 1),
    hide_when_purchased: item.hide_when_purchased ?? false,
  };
}

export const RegistryItemForm: React.FC<Props> = ({ initial, onSave, onCancel }) => {
  const [draft, setDraft] = useState<RegistryItemDraft>(() =>
    initial ? itemToDraft(initial) : {
      item_name: '',
      price_label: '',
      price_amount: '',
      merchant: '',
      item_url: '',
      image_url: '',
      notes: '',
      desired_quantity: '1',
      hide_when_purchased: false,
    }
  );

  const [urlInput, setUrlInput] = useState(initial?.item_url ?? '');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchDone, setFetchDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof RegistryItemDraft>(key: K, value: RegistryItemDraft[K]) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  async function handleFetch() {
    if (!urlInput.trim()) return;
    const normalized = normalizeUrl(urlInput.trim());
    if (!isValidUrl(normalized)) {
      setFetchError('Please enter a valid URL (e.g. https://amazon.com/product)');
      return;
    }
    setFetching(true);
    setFetchError(null);
    setFetchDone(false);
    try {
      const preview: RegistryPreview = await fetchUrlPreview(normalized);
      if (preview.error && !preview.title) {
        setFetchError(`Could not extract details: ${preview.error}. You can still fill in the form manually.`);
      } else {
        setFetchDone(true);
      }
      setDraft(prev => ({
        ...prev,
        item_name: preview.title ?? prev.item_name,
        price_label: preview.price_label ?? prev.price_label,
        price_amount: preview.price_amount != null ? String(preview.price_amount) : prev.price_amount,
        merchant: preview.merchant ?? prev.merchant,
        item_url: preview.canonical_url ?? normalized,
        image_url: preview.image_url ?? prev.image_url,
      }));
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Fetch failed. You can still fill in the form manually.');
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.item_name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(draft);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEdit ? 'Edit Registry Item' : 'Add Registry Item'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-surface-subtle text-text-secondary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* URL Import */}
          {!isEdit && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">
                Import from URL
                <span className="ml-2 text-xs text-text-tertiary font-normal">(any store, domain-agnostic)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } }}
                    placeholder="https://amazon.com/product/… or any store URL"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetch}
                  disabled={fetching || !urlInput.trim()}
                >
                  {fetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Fetch details'
                  )}
                </Button>
              </div>

              {fetchError && (
                <div className="flex items-start gap-2 p-3 bg-warning-light rounded-lg text-sm text-warning border border-warning/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{fetchError}</span>
                </div>
              )}
              {fetchDone && !fetchError && (
                <div className="flex items-center gap-2 p-3 bg-success-light rounded-lg text-sm text-success border border-success/20">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Details fetched — review and edit below before saving.</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Image preview + URL */}
            <div className="flex gap-4">
              <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-surface-subtle border border-border overflow-hidden flex items-center justify-center">
                {draft.image_url ? (
                  <img
                    src={draft.image_url}
                    alt="Product"
                    className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <ImageOff className="w-6 h-6 text-text-tertiary" />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={draft.image_url}
                  onChange={e => set('image_url', e.target.value)}
                  placeholder="https://…/product-image.jpg"
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Item Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={draft.item_name}
                onChange={e => set('item_name', e.target.value)}
                required
                placeholder="e.g. KitchenAid Stand Mixer"
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Price row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Price Label
                </label>
                <input
                  type="text"
                  value={draft.price_label}
                  onChange={e => set('price_label', e.target.value)}
                  placeholder="e.g. $349.99"
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Price (numeric)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price_amount}
                  onChange={e => set('price_amount', e.target.value)}
                  placeholder="349.99"
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Merchant + URL */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Store / Merchant
                </label>
                <input
                  type="text"
                  value={draft.merchant}
                  onChange={e => set('merchant', e.target.value)}
                  placeholder="e.g. Amazon, Target"
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Product URL
                </label>
                <input
                  type="url"
                  value={draft.item_url}
                  onChange={e => set('item_url', e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Desired quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Desired Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.desired_quantity}
                  onChange={e => set('desired_quantity', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draft.hide_when_purchased}
                    onChange={e => set('hide_when_purchased', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">Hide when purchased</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Notes
                <span className="ml-1 text-xs text-text-tertiary font-normal">(optional — visible to guests)</span>
              </label>
              <textarea
                value={draft.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                placeholder="Any notes for guests, e.g. preferred color or variant…"
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-error-light rounded-lg text-sm text-error border border-error/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {saveError}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving || !draft.item_name.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Add to Registry'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, Loader2, X, ImageOff, AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui';
import { fetchUrlPreview, findDuplicateItem } from './registryService';
import { normalizeUrl, isValidUrl } from '../../../lib/urlUtils';
import type { RegistryItem, RegistryItemDraft, RegistryPreview, MetadataConfidence } from './registryTypes';
import { computeConfidence, getBlockedMessage } from './registryTypes';
import { getSafePublicImageUrl, getSafePublicWebUrl } from '../../../sections/publicLinks';
import { customerSafeErrorMessage } from '../../../lib/customerSafeError';

interface Props {
  initial?: RegistryItem | null;
  existingItems?: RegistryItem[];
  onSave: (draft: RegistryItemDraft) => Promise<void>;
  onCancel: () => void;
}

function itemToDraft(item: RegistryItem): RegistryItemDraft {
  return {
    item_type: item.item_type ?? 'product',
    item_name: item.item_name,
    price_label: item.price_label ?? '',
    price_amount: item.price_amount != null ? String(item.price_amount) : '',
    merchant: item.merchant ?? item.store_name ?? '',
    item_url: item.item_url ?? item.canonical_url ?? '',
    image_url: item.image_url ?? '',
    notes: item.notes ?? item.description ?? '',
    desired_quantity: String(item.quantity_needed ?? 1),
    hide_when_purchased: item.hide_when_purchased ?? false,
    fund_goal_amount: item.fund_goal_amount != null ? String(item.fund_goal_amount) : '',
    fund_received_amount: item.fund_received_amount != null ? String(item.fund_received_amount) : '',
    fund_venmo_url: item.fund_venmo_url ?? '',
    fund_paypal_url: item.fund_paypal_url ?? '',
    fund_zelle_handle: item.fund_zelle_handle ?? '',
    fund_custom_url: item.fund_custom_url ?? '',
    fund_custom_label: item.fund_custom_label ?? '',
    canonical_url: item.canonical_url ?? '',
    description: item.description ?? '',
    availability: item.availability ?? '',
    metadata_fetch_status: (item.metadata_fetch_status as RegistryItemDraft['metadata_fetch_status']) ?? '',
    metadata_confidence_score: item.metadata_confidence_score ?? null,
    metadata_source_method: (item.metadata_source_method as RegistryItemDraft['metadata_source_method']) ?? null,
    metadata_retailer: item.metadata_retailer ?? '',
  };
}

function normalizeRegistryFormWebUrl(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return '';
  return getSafePublicWebUrl(normalizeUrl(raw)) || '';
}

function sanitizeRegistryFormDraft(draft: RegistryItemDraft): RegistryItemDraft {
  return {
    ...draft,
    item_url: normalizeRegistryFormWebUrl(draft.item_url),
    canonical_url: normalizeRegistryFormWebUrl(draft.canonical_url),
    image_url: getSafePublicImageUrl(draft.image_url) || '',
    fund_venmo_url: normalizeRegistryFormWebUrl(draft.fund_venmo_url),
    fund_paypal_url: normalizeRegistryFormWebUrl(draft.fund_paypal_url),
    fund_custom_url: normalizeRegistryFormWebUrl(draft.fund_custom_url),
  };
}

export const RegistryItemForm: React.FC<Props> = ({ initial, existingItems = [], onSave, onCancel }) => {
  const [draft, setDraft] = useState<RegistryItemDraft>(() =>
    initial ? itemToDraft(initial) : {
      item_type: 'product',
      item_name: '',
      price_label: '',
      price_amount: '',
      merchant: '',
      item_url: '',
      image_url: '',
      notes: '',
      desired_quantity: '1',
      hide_when_purchased: false,
      fund_goal_amount: '',
      fund_received_amount: '',
      fund_venmo_url: '',
      fund_paypal_url: '',
      fund_zelle_handle: '',
      fund_custom_url: '',
      fund_custom_label: '',
      canonical_url: '',
      description: '',
      availability: '',
      metadata_fetch_status: '',
      metadata_confidence_score: null,
      metadata_source_method: null,
      metadata_retailer: '',
    }
  );

  const [urlInput, setUrlInput] = useState(initial?.item_url ?? initial?.canonical_url ?? '');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const autoFetchTimerRef = useRef<number | null>(null);
  const lastAutoFetchedUrlRef = useRef<string>('');
  const [fetchDone, setFetchDone] = useState(false);
  const [fetchConfidence, setFetchConfidence] = useState<MetadataConfidence | null>(null);
  const [lastPreview, setLastPreview] = useState<RegistryPreview | null>(null);
  const [dedupeWarning, setDedupeWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const imageUrlLooksDirect = (() => {
    const v = (getSafePublicImageUrl(draft.image_url) || '').trim();
    if (!v) return true;
    try {
      const u = new URL(v);
      const path = u.pathname.toLowerCase();
      return /\.(png|jpe?g|webp|gif|avif|heic)(\?.*)?$/i.test(path);
    } catch {
      return false;
    }
  })();

  const itemUrlHostHint = (() => {
    const v = (urlInput || draft.item_url || '').trim();
    if (!v) return null;
    try {
      const host = new URL(normalizeUrl(v)).hostname.toLowerCase();
      if (host.includes('amazon.')) return 'Amazon tip: Use the full product page. If details still look light, try once more, then fill in the title or price.';
      if (host.includes('target.')) return 'Target tip: Full item pages work best. If details still look off, fill in the title or price before saving.';
      if (host.includes('walmart.')) return 'Walmart tip: Try once more if details look light, then double-check price and image before saving.';
      if (host.includes('etsy.')) return 'Etsy tip: Listing pages usually import well, but variants and pricing can still need a quick look.';
      if (host.includes('crateandbarrel.') || host.includes('cb2.')) return 'Crate & Barrel / CB2 tip: saving the link helps, and these stores may need a little detail cleanup today.';
      return 'Tip: Product page URLs are fine. We will try to fill in details, but a quick detail check is normal when a store shares limited information.';
    } catch {
      return null;
    }
  })();

  const missingFieldSet = new Set(lastPreview?.missing_fields ?? []);
  const missingPrice = missingFieldSet.has('price') || (!draft.price_amount.trim() && !draft.price_label.trim() && !!lastPreview);
  const missingImage = missingFieldSet.has('image') || (!draft.image_url.trim() && !!lastPreview);
  const missingMerchant = missingFieldSet.has('merchant') || (!draft.merchant.trim() && !!lastPreview);

  const imageSourceHint = (() => {
    const src = (getSafePublicImageUrl(draft.image_url) || '').toLowerCase();
    if (!src && (draft.item_url || '').trim()) return { label: 'Product photo: Will try to fill from link', tone: 'text-primary' };
    if (!src) return { label: 'Product photo: Needed', tone: 'text-text-secondary' };
    if (src.includes('thum.io') || src.includes('weserv.nl')) return { label: 'Product photo: Store preview', tone: 'text-gray-600' };
    return { label: 'Product photo: Ready', tone: 'text-primary' };
  })();

  function set<K extends keyof RegistryItemDraft>(key: K, value: RegistryItemDraft[K]) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  const doFetch = useCallback(async (urlToFetch: string, forceRefresh = false) => {
    const normalized = normalizeUrl(urlToFetch.trim());
    if (!isValidUrl(normalized)) {
      setFetchError('Please enter a valid URL (e.g. https://amazon.com/product)');
      return;
    }
    setFetching(true);
    setFetchError(null);
    setFetchDone(false);
    setFetchConfidence(null);
    setDedupeWarning(null);
    try {
      const preview: RegistryPreview = await fetchUrlPreview(normalized, forceRefresh);
      setLastPreview(preview);
      const confidence = computeConfidence(preview);
      setFetchConfidence(confidence);
      const blockedMsg = getBlockedMessage(preview);

      if (blockedMsg) {
        setFetchError(blockedMsg);
      } else if (preview.partial && preview.missing_fields && preview.missing_fields.length > 0) {
        const missing = preview.missing_fields.join(', ');
        setFetchError(`We could only import part of this item (missing: ${missing}). Please confirm the details below.`);
      } else if (confidence === 'manual') {
        setFetchError(
          preview.error
            ? `We could not fill in details from this URL. Add the gift details below.`
            : `We could not fill in details automatically. Add the gift details below.`
        );
      } else {
        setFetchDone(true);
      }
      const canonicalToCheck = preview.canonical_url ?? normalized;
      const duplicate = findDuplicateItem(canonicalToCheck, preview.title, existingItems, initial?.id);
      if (duplicate) {
        setDedupeWarning(`"${duplicate.item_name}" may already be in your registry. You can still add it if it's a different item.`);
      }
      setDraft(prev => {
        const targetUrl = preview.canonical_url ?? normalized;
        const previousNormalized = normalizeUrl(prev.item_url || '');
        const urlChanged = previousNormalized !== targetUrl;
        const missing = new Set(preview.missing_fields ?? []);

        const nextMerchant = preview.store_name
          ?? preview.merchant
          ?? preview.retailer
          ?? preview.brand
          ?? (urlChanged ? '' : prev.merchant);

        const nextNotes = (() => {
          const existing = (prev.notes || '').trim();
          if (existing) return prev.notes;

          const parts = [preview.description?.trim(), preview.availability?.trim()]
            .filter((value): value is string => Boolean(value && value.length > 0));

          return parts.length > 0 ? parts.join('\n\n') : prev.notes;
        })();

        return {
          ...prev,
          item_name: preview.title ?? (urlChanged ? '' : prev.item_name),
          price_label: preview.price_label ?? (urlChanged ? '' : prev.price_label),
          price_amount: preview.price_amount != null ? String(preview.price_amount) : (urlChanged ? '' : prev.price_amount),
          merchant: nextMerchant,
          item_url: targetUrl,
          image_url: preview.image_url ?? (urlChanged || missing.has('image') ? '' : prev.image_url),
          notes: nextNotes,
          canonical_url: preview.canonical_url ?? prev.canonical_url ?? '',
          description: preview.description ?? prev.description ?? '',
          availability: preview.availability ?? prev.availability ?? '',
          metadata_fetch_status: preview.fetch_status ?? '',
          metadata_confidence_score: preview.confidence_score ?? null,
          metadata_source_method: preview.source_method ?? null,
          metadata_retailer: preview.retailer ?? prev.metadata_retailer ?? '',
        };
      });
    } catch (err: unknown) {
      setFetchError(customerSafeErrorMessage(err, 'We could not fill this automatically. You can still add the details by hand.'));
      setDraft(prev => ({
        ...prev,
        item_url: prev.item_url || normalized,
      }));
    } finally {
      setFetching(false);
    }
  }, [existingItems, initial?.id]);

  async function handleFetch() {
    if (!urlInput.trim()) return;
    const normalized = normalizeUrl(urlInput.trim());
    if (autoFetchTimerRef.current) {
      window.clearTimeout(autoFetchTimerRef.current);
      autoFetchTimerRef.current = null;
    }
    await doFetch(urlInput);
    if (isValidUrl(normalized)) {
      lastAutoFetchedUrlRef.current = normalized;
    }
  }

  async function handleRefetch() {
    const urlToUse = urlInput.trim() || draft.item_url;
    if (!urlToUse) return;
    await doFetch(urlToUse, true);
  }

  useEffect(() => {
    if (draft.item_type === 'cash_fund') return;

    const normalized = normalizeUrl(urlInput.trim());
    if (!isValidUrl(normalized)) return;

    if (lastAutoFetchedUrlRef.current === normalized) return;

    if (autoFetchTimerRef.current) {
      window.clearTimeout(autoFetchTimerRef.current);
    }

    autoFetchTimerRef.current = window.setTimeout(() => {
      void (async () => {
        if (lastAutoFetchedUrlRef.current === normalized) return;
        await doFetch(normalized);
        lastAutoFetchedUrlRef.current = normalized;
      })();
    }, 700);

    return () => {
      if (autoFetchTimerRef.current) {
        window.clearTimeout(autoFetchTimerRef.current);
        autoFetchTimerRef.current = null;
      }
    };
  }, [urlInput, draft.item_type, doFetch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.item_name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(sanitizeRegistryFormDraft(draft));
    } catch (err: unknown) {
      setSaveError(customerSafeErrorMessage(err, 'Couldn’t save this gift.'));
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border-subtle bg-surface">
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
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
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Item Type</label>
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button type="button" className={`px-3 py-1.5 text-sm ${draft.item_type !== 'cash_fund' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => set('item_type', 'product')}>Product</button>
              <button type="button" className={`px-3 py-1.5 text-sm border-l border-border ${draft.item_type === 'cash_fund' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => set('item_type', 'cash_fund')}>Cash Fund</button>
            </div>
          </div>

          {/* URL Import */}
          {draft.item_type !== 'cash_fund' && <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-primary">
                {isEdit ? 'Product link' : 'Add from a link'}
                <span className="ml-2 text-xs text-text-tertiary font-normal">(any store)</span>
              </label>
              {isEdit && draft.item_url && (
                <button
                  type="button"
                  onClick={handleRefetch}
                  disabled={fetching}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh details
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => {
                    const nextUrl = e.target.value;
                    setUrlInput(nextUrl);
                    setDraft(prev => ({
                      ...prev,
                      item_url: nextUrl,
                      canonical_url: nextUrl,
                    }));
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } }}
                  placeholder="https://amazon.com/product/… or any store URL"
                  className="w-full pl-9 pr-3 py-2.5 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              {!isEdit && (
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
                    'Fill details'
                  )}
                </Button>
              )}
            </div>

            {itemUrlHostHint && (
              <p className="text-xs text-text-tertiary">{itemUrlHostHint}</p>
            )}

            {fetchError && (
              <div className="flex items-start gap-2 p-3 bg-surface-subtle rounded-lg text-sm text-text-secondary border border-border-subtle">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" />
                <div className="flex-1">
                  <span>{fetchError}</span>
                  {lastPreview?.fetch_status !== 'blocked' && (
                    <p className="mt-1 text-xs opacity-80">
                      The URL has been saved to the product link field. Just fill in the name, price, and store below.
                    </p>
                  )}
                </div>
              </div>
            )}
            {fetchDone && !fetchError && fetchConfidence === 'full' && (
              <div className="flex items-center gap-2 p-3 bg-success-light rounded-lg text-sm text-success border border-success/20">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Auto-filled — all details imported. Review and save.</span>
              </div>
            )}
            {fetchDone && !fetchError && fetchConfidence === 'partial' && (
              <div className="flex items-start gap-2 p-3 bg-primary-light rounded-lg text-sm text-primary border border-primary/20">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span>Please review — some details were imported but a few fields may need filling in below.</span>
                  {lastPreview?.missing_fields && lastPreview.missing_fields.length > 0 && (
                    <p className="mt-1 text-xs opacity-80">Missing: {lastPreview.missing_fields.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
            {dedupeWarning && (
              <div className="flex items-start gap-2 p-3 bg-surface-subtle rounded-lg text-sm text-text-secondary border border-border-subtle">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-text-tertiary" />
                <span>{dedupeWarning}</span>
              </div>
            )}
          </div>}

          <div className="grid grid-cols-1 gap-4">
            {/* Image preview + URL */}
            {draft.item_type !== 'cash_fund' && <div className="flex gap-4">
              <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-surface-subtle border border-border overflow-hidden flex items-center justify-center">
                {getSafePublicImageUrl(draft.image_url) ? (
                  <img
                    src={getSafePublicImageUrl(draft.image_url)}
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
                <p className="mt-1 text-xs text-text-tertiary">{imageSourceHint.label}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(imageSourceHint.label.includes('Missing') || imageSourceHint.label.includes('Fallback')) && (
                    <button
                      type="button"
                      onClick={() => void handleRefetch()}
                      disabled={fetching || !(urlInput.trim() || draft.item_url)}
                      className="text-[11px] rounded border border-border px-2 py-0.5 text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      Refresh from product link
                    </button>
                  )}
                  {draft.image_url && (
                    <button
                      type="button"
                      onClick={() => set('image_url', '')}
                      className="text-[11px] rounded border border-border px-2 py-0.5 text-text-secondary hover:border-primary hover:text-primary"
                    >
                      Clear image URL
                    </button>
                  )}
                </div>
                {!imageUrlLooksDirect && (
                  <p className="mt-1 text-xs text-text-tertiary">Use a direct image URL (.jpg/.png/etc). Product page URLs may open blank and won’t render as images.</p>
                )}
                {missingImage && (
                  <p className="mt-1 text-xs text-text-tertiary">Image could not be imported cleanly. You can still save, but adding a direct image URL will make the card look better.</p>
                )}
              </div>
            </div>}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Item Name <span className="text-text-tertiary">*</span>
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

            {draft.item_type !== 'cash_fund' ? <>
            {/* Price row */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price_amount}
                  onChange={e => set('price_amount', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2 bg-surface-subtle border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${missingPrice ? 'border-border-subtle' : 'border-border'}`}
                />
              </div>
              {missingPrice && (
                <p className="mt-1 text-xs text-text-tertiary">Price could not be filled in reliably from this store. Please enter it before saving.</p>
              )}
            </div>

            {/* Merchant */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Store
              </label>
              <input
                type="text"
                value={draft.merchant}
                onChange={e => set('merchant', e.target.value)}
                placeholder="e.g. Amazon, Target"
                className={`w-full px-3 py-2 bg-surface-subtle border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${missingMerchant ? 'border-border-subtle' : 'border-border'}`}
              />
              {missingMerchant && (
                <p className="mt-1 text-xs text-text-tertiary">Store name was not filled in. Add the merchant so guests know where the gift comes from.</p>
              )}
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
            </> : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Fund goal</label>
                    <input type="number" min="0" step="0.01" value={draft.fund_goal_amount ?? ''} onChange={e => set('fund_goal_amount', e.target.value)} placeholder="e.g. 2000" className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Received so far</label>
                    <input type="number" min="0" step="0.01" value={draft.fund_received_amount ?? ''} onChange={e => set('fund_received_amount', e.target.value)} placeholder="e.g. 350" className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Venmo Link</label>
                    <input type="url" value={draft.fund_venmo_url ?? ''} onChange={e => set('fund_venmo_url', e.target.value)} placeholder="https://venmo.com/yourhandle" className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">PayPal Link</label>
                    <input type="url" value={draft.fund_paypal_url ?? ''} onChange={e => set('fund_paypal_url', e.target.value)} placeholder="https://paypal.me/yourname" className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Zelle</label>
                    <input type="text" value={draft.fund_zelle_handle ?? ''} onChange={e => set('fund_zelle_handle', e.target.value)} placeholder="Email or phone for Zelle" className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Other payment link</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={draft.fund_custom_label ?? ''} onChange={e => set('fund_custom_label', e.target.value)} placeholder="Label" className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm" />
                      <input type="url" value={draft.fund_custom_url ?? ''} onChange={e => set('fund_custom_url', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              </>
            )}

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
            <div className="flex items-center gap-2 p-3 bg-surface-subtle rounded-lg text-sm text-text-secondary border border-border-subtle">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-text-tertiary" />
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

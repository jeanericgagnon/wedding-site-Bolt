import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, Pencil, Trash2, GripVertical, Package, CheckCircle2, ShoppingBag, RefreshCw } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { ageExceedsMs, formatRegistryItemDate } from '../registryItemTime';
import { getOwnerRegistryDisplayTitle, getRegistryItemMetadataState, sanitizeRegistryQuantityState, type RegistryItem, type PurchaseStatus } from './registryTypes';
import { copyTextOrDownload } from '../../../lib/copyText';
import { getSafePublicImageUrl, getSafePublicWebUrl } from '../../../sections/publicLinks';

interface Props {
  item: RegistryItem;
  onEdit: (item: RegistryItem) => void;
  onDelete: (id: string) => void;
  onMarkPurchased?: (item: RegistryItem, qty: number) => Promise<void>;
  onResetPurchaseState?: (item: RegistryItem) => Promise<void>;
  onRefetchMetadata?: (item: RegistryItem, silent?: boolean, replaceExisting?: boolean) => Promise<unknown>;
}

function statusBadge(status: PurchaseStatus, qty: number, needed: number) {
  if (status === 'purchased') {
    return (
      <Badge variant="success">
        Purchased{needed > 1 ? ` (${qty}/${needed})` : ''}
      </Badge>
    );
  }
  if (status === 'partial') {
    return (
      <Badge variant="warning">
        Partial — {qty}/{needed} bought
      </Badge>
    );
  }
  return <Badge variant="neutral">Available</Badge>;
}

export function getOwnerRegistryPurchaserLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {
  if (!item.purchaser_name || item.purchase_status === 'available') return null;
  return item.purchase_status === 'purchased'
    ? `Purchased by ${item.purchaser_name}`
    : `by ${item.purchaser_name}`;
}

export function normalizeOwnerRegistryItemState(item: RegistryItem): RegistryItem {
  const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased, item.quantity_needed);
  return {
    ...item,
    item_url: getSafePublicWebUrl(item.item_url) || null,
    canonical_url: getSafePublicWebUrl(item.canonical_url) || null,
    image_url: getSafePublicImageUrl(item.image_url) || null,
    fund_venmo_url: getSafePublicWebUrl(item.fund_venmo_url) || null,
    fund_paypal_url: getSafePublicWebUrl(item.fund_paypal_url) || null,
    fund_custom_url: getSafePublicWebUrl(item.fund_custom_url) || null,
    quantity_needed: quantityState.quantityNeeded,
    quantity_purchased: quantityState.quantityPurchased,
    purchase_status: quantityState.purchaseStatus,
    purchaser_name: quantityState.purchaseStatus === 'available' ? null : item.purchaser_name,
  };
}

export function getOwnerRegistrySourceLabel(sourceMethod: string | null | undefined): string | null {
  if (!sourceMethod) return null;
  const normalized = sourceMethod.toLowerCase();
  if (normalized === 'manual') return 'Details entered by you';
  if (normalized === 'adapter') return 'Imported from store page';
  if (normalized === 'jsonld') return 'Imported from product data';
  if (normalized === 'opengraph') return 'Imported from page preview';
  if (normalized === 'heuristic') return 'Imported with partial details';
  return 'Imported from source link';
}

interface PurchaseConfirmProps {
  item: RegistryItem;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
  busy: boolean;
}

const PurchaseConfirmPanel: React.FC<PurchaseConfirmProps> = ({ item, onConfirm, onCancel, busy }) => {
  const remaining = item.quantity_needed - item.quantity_purchased;
  const [qty, setQty] = useState(Math.min(1, remaining));

  return (
    <div className="absolute inset-0 z-10 bg-surface/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-4 gap-3">
      <div className="text-center">
        <p className="font-semibold text-text-primary text-sm leading-snug mb-1">Mark as purchased?</p>
        <p className="text-xs text-text-secondary">This lets guests know it's been bought.</p>
      </div>
      {item.quantity_needed > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Qty:</label>
          <input
            type="number"
            min={1}
            max={remaining}
            value={qty}
            onChange={e => setQty(Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 text-sm border border-border rounded-lg bg-surface-subtle text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-text-tertiary">of {remaining} left</span>
        </div>
      )}
      <div className="flex gap-2 w-full">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-subtle transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(qty)}
          disabled={busy}
          className="flex-1 py-1.5 text-xs font-medium text-white bg-success hover:bg-success/90 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {busy ? (
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          Confirm
        </button>
      </div>
    </div>
  );
};

export const RegistryItemCard: React.FC<Props> = ({ item, onEdit, onDelete, onMarkPurchased, onResetPurchaseState, onRefetchMetadata }) => {
  const normalizedItem = normalizeOwnerRegistryItemState(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [copiedHint, setCopiedHint] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCashFund = normalizedItem.item_type === 'cash_fund';
  const displayPrice = normalizedItem.price_amount != null
    ? `$${normalizedItem.price_amount.toFixed(2)}`
    : normalizedItem.price_label
    ? normalizedItem.price_label
    : null;

  const displayUrl = normalizedItem.item_url ?? normalizedItem.canonical_url;
  const merchant = normalizedItem.merchant ?? normalizedItem.store_name ?? null;
  const isPurchased = normalizedItem.purchase_status === 'purchased';
  const canMarkPurchased = !isPurchased && !!onMarkPurchased;
  const stale = !normalizedItem.metadata_last_checked_at
    || ageExceedsMs(normalizedItem.metadata_last_checked_at, 1000 * 60 * 60 * 24 * 7);
  const priceChanged = normalizedItem.previous_price_amount != null && normalizedItem.price_amount != null && normalizedItem.previous_price_amount !== normalizedItem.price_amount;
  const outOfStock = (normalizedItem.availability || '').toLowerCase().includes('out');
  const metadataState = getRegistryItemMetadataState(normalizedItem);
  const extractionConfidence = metadataState.confidence;
  const blockedMessage = metadataState.blockedMessage;
  const missingSummary = metadataState.missingSummary;
  const hasBadImportTitle = metadataState.hasBadImportTitle;
  const repairStates = metadataState.repairStates ?? [];

  const imageSource = (() => {
    const src = (normalizedItem.image_url || '').toLowerCase();
    if (src.includes('thum.io') || src.includes('weserv.nl')) return { label: 'Backup image', tone: 'neutral' as const, hint: 'Using a page preview image.' };
    if (normalizedItem.image_url) return { label: 'Product image', tone: 'primary' as const, hint: 'Using the product image.' };
    return { label: 'Needs image', tone: 'neutral' as const, hint: 'No image source available yet.' };
  })();
  const asOfLabel = normalizedItem.metadata_last_checked_at
    ? formatRegistryItemDate(normalizedItem.metadata_last_checked_at, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const nextCheckLabel = normalizedItem.next_refresh_at
    ? formatRegistryItemDate(normalizedItem.next_refresh_at, { month: 'short', day: 'numeric' })
    : null;
  const failCount = normalizedItem.refresh_fail_count ?? 0;
  const sourceLabel = getOwnerRegistrySourceLabel(normalizedItem.metadata_source_method);
  const retailerLabel = normalizedItem.metadata_retailer ? `Retailer: ${normalizedItem.metadata_retailer}` : null;
  const repairGuidance = (() => {
    const retailer = (normalizedItem.metadata_retailer || normalizedItem.merchant || normalizedItem.store_name || '').toLowerCase();
    if (retailer.includes('amazon')) return 'Amazon often needs a quick title or price check after import.';
    if (retailer.includes('target')) return 'Target imports can drift; re-import first, then confirm title and price.';
    if (retailer.includes('walmart')) return 'Walmart usually benefits from a quick image and price check.';
    if (retailer.includes('etsy')) return 'Etsy listings can hide variant-specific details; review before save.';
    if (retailer.includes('crate') || retailer.includes('cb2')) return 'Crate & Barrel / CB2 may still need a quick detail cleanup today.';
    return null;
  })();
  const goal = normalizedItem.fund_goal_amount ?? 0;
  const received = normalizedItem.fund_received_amount ?? 0;
  const fundPct = goal > 0 ? Math.min(100, Math.round((received / goal) * 100)) : null;
  const venmoUrl = normalizedItem.fund_venmo_url;
  const paypalUrl = normalizedItem.fund_paypal_url;
  const customFundUrl = normalizedItem.fund_custom_url;
  const displayTitle = getOwnerRegistryDisplayTitle(normalizedItem.item_name);

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(item.id);
    } else {
      setConfirmDelete(true);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      cooldownRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  async function handlePurchaseConfirm(qty: number) {
    if (!onMarkPurchased || purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      await onMarkPurchased(normalizedItem, qty);
      setShowPurchaseConfirm(false);
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function handleRefetch() {
    if (!onRefetchMetadata || refetching) return;
    setRefetching(true);
    try {
      await onRefetchMetadata(normalizedItem);
    } finally {
      setRefetching(false);
    }
  }

  async function copyText(label: string, text: string) {
    if (!text) return;
    try {
      const result = await copyTextOrDownload(text, `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'registry'}-link.txt`);
      setCopiedHint(result === 'copied' ? `${label} copied` : `${label} downloaded`);
      setTimeout(() => setCopiedHint(null), 1800);
    } catch {
      setCopiedHint('Copy needs retry');
      setTimeout(() => setCopiedHint(null), 1800);
    }
  }

  useEffect(() => {
    setImgFailed(false);
    setImgSrc(normalizedItem.image_url ?? null);
  }, [normalizedItem.id, normalizedItem.image_url]);

  if (isCashFund) {
    return (
      <div data-testid="owner-registry-item-card" className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-text-primary leading-snug">{item.item_name}</h3>
          <Badge variant="neutral">Cash Fund</Badge>
        </div>
        {item.notes && <p className="text-sm text-text-secondary">{item.notes}</p>}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 rounded-lg bg-surface-subtle border border-border">
            <p className="text-xs text-text-tertiary">Goal</p>
            <p className="font-semibold text-text-primary">{goal > 0 ? `$${goal.toFixed(0)}` : '—'}</p>
          </div>
          <div className="p-2 rounded-lg bg-surface-subtle border border-border">
            <p className="text-xs text-text-tertiary">Received</p>
            <p className="font-semibold text-text-primary">${received.toFixed(0)}</p>
          </div>
        </div>
        {fundPct != null && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-lg border border-border bg-surface-subtle">
              <div className="h-full rounded-lg bg-primary" style={{ width: `${fundPct}%` }} />
            </div>
            <p className="text-xs text-text-tertiary mt-1">{fundPct}% funded</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min="0" step="0.01" value={received} onChange={() => {}} readOnly className="hidden" />
          <button onClick={() => onEdit(normalizedItem)} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" />Edit</button>
          <button onClick={handleDeleteClick} className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${confirmDelete ? 'text-text-primary border-border bg-surface-subtle' : 'text-text-secondary border-border hover:border-text-tertiary hover:text-text-primary'}`}>
            <Trash2 className="w-3.5 h-3.5" />{confirmDelete ? 'Confirm' : 'Delete'}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {venmoUrl && <a href={venmoUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 border rounded-lg">Venmo</a>}
          {paypalUrl && <a href={paypalUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 border rounded-lg">PayPal</a>}
          {item.fund_zelle_handle && <span className="text-xs px-2 py-1 border rounded-lg">Zelle: {item.fund_zelle_handle}</span>}
          {customFundUrl && <a href={customFundUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 border rounded-lg">{item.fund_custom_label || 'Link'}</a>}
          {item.fund_zelle_handle && (
            <button onClick={() => copyText('Zelle', item.fund_zelle_handle || '')} className="text-xs px-2 py-1 border rounded-lg hover:border-primary hover:text-primary">Copy Zelle</button>
          )}
          <button
            onClick={() => copyText('Payout details', [
              venmoUrl ? `Venmo: ${venmoUrl}` : null,
              paypalUrl ? `PayPal: ${paypalUrl}` : null,
              item.fund_zelle_handle ? `Zelle: ${item.fund_zelle_handle}` : null,
              customFundUrl ? `${item.fund_custom_label || 'Link'}: ${customFundUrl}` : null,
            ].filter(Boolean).join('\n'))}
            className="text-xs px-2 py-1 border rounded-lg hover:border-primary hover:text-primary"
          >
            Copy all
          </button>
        </div>
        {copiedHint && <p className="text-[11px] text-text-tertiary">{copiedHint}</p>}
      </div>
    );
  }

  return (
    <div data-testid="owner-registry-item-card" className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      {showPurchaseConfirm && (
        <PurchaseConfirmPanel
          item={item}
          onConfirm={handlePurchaseConfirm}
          onCancel={() => setShowPurchaseConfirm(false)}
          busy={purchaseBusy}
        />
      )}

      <div className="relative aspect-[4/3] bg-surface-subtle flex-shrink-0">
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={normalizedItem.item_name}
            className={`w-full h-full object-cover transition-opacity ${isPurchased ? 'opacity-40' : ''}`}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className={`w-10 h-10 ${isPurchased ? 'text-text-tertiary/40' : 'text-text-tertiary'}`} />
          </div>
        )}
        {isPurchased && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-lg bg-success/90 px-3 py-1.5 text-xs font-semibold text-white">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Purchased
            </div>
          </div>
        )}
        {normalizedItem.hide_when_purchased && isPurchased && (
          <div className="absolute top-2 right-2 bg-surface/90 text-text-tertiary text-xs px-2 py-0.5 rounded border border-border">
            Hidden on site
          </div>
        )}
        <button
          className="absolute top-2 left-2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-surface/80 rounded-md border border-border"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-text-tertiary" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary leading-snug line-clamp-2">{displayTitle}</h3>
          {merchant && (
            <p className="text-xs text-text-tertiary mt-0.5">{merchant}</p>
          )}
        </div>

        {displayPrice && (
          <p className="text-lg font-bold text-primary leading-none">{displayPrice}</p>
        )}

        <div className="flex items-center justify-between">
          {statusBadge(normalizedItem.purchase_status, normalizedItem.quantity_purchased, normalizedItem.quantity_needed)}
          {normalizedItem.quantity_needed > 1 && (
            <span className="text-xs text-text-tertiary">
              Want {normalizedItem.quantity_needed}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {outOfStock && <Badge variant="neutral">Out of stock</Badge>}
          {priceChanged && <Badge variant="success">Price changed</Badge>}
          {stale && <Badge variant="neutral">Check details</Badge>}
          {failCount > 0 && <Badge variant="neutral">Retry {failCount}</Badge>}
          {repairStates.includes('broken-import') && <Badge variant="neutral">Needs repair</Badge>}
          {repairStates.includes('partial-import') && <Badge variant="neutral">Needs a quick check</Badge>}
          {repairStates.includes('stale-details') && <Badge variant="neutral">Stale details</Badge>}
          {repairStates.includes('manual-review') && <Badge variant="neutral">Worth checking</Badge>}
          {normalizedItem.metadata_fetch_status === 'blocked' && <Badge variant="neutral">Needs details</Badge>}
          {normalizedItem.metadata_fetch_status === 'error' && <Badge variant="neutral">Could use update</Badge>}
          {normalizedItem.metadata_fetch_status === 'timeout' && <Badge variant="neutral">Update paused</Badge>}
          {normalizedItem.metadata_fetch_status === 'parse_failure' && <Badge variant="neutral">Could use details</Badge>}
          {hasBadImportTitle && <Badge variant="neutral">Needs title fix</Badge>}
          {extractionConfidence === 'full' && <Badge variant="success">Imported well</Badge>}
          {extractionConfidence === 'partial' && <Badge variant="neutral">Needs a quick check</Badge>}
          {extractionConfidence === 'manual' && <Badge variant="neutral">Added by you</Badge>}
          <span title={imageSource.hint}>
            <Badge variant={imageSource.tone}>{imageSource.label}</Badge>
          </span>
          {sourceLabel && <Badge variant="neutral">{sourceLabel}</Badge>}
          {retailerLabel && <Badge variant="neutral">{retailerLabel}</Badge>}
        </div>
        {(imageSource.label === 'Needs image' || imageSource.label === 'Backup image') && (
          <p className="text-[11px] text-text-tertiary">
            Tip: paste a direct image link in Edit, or refresh details from the product URL.
          </p>
        )}
        {(missingSummary || blockedMessage || hasBadImportTitle || repairGuidance) && (
          <div className="space-y-1">
            {missingSummary && <p className="text-[11px] text-text-tertiary">{missingSummary}</p>}
            {blockedMessage && <p className="text-[11px] text-text-secondary">{blockedMessage}</p>}
            {hasBadImportTitle && <p className="text-[11px] text-text-secondary">This imported link resolved to a broken page title. Use Refresh, Re-import, or Edit to replace it before sharing.</p>}
            {repairGuidance && <p className="text-[11px] text-text-tertiary">{repairGuidance}</p>}
          </div>
        )}
        {(asOfLabel || nextCheckLabel || priceChanged || failCount > 0) && (
          <div className="space-y-1 text-[11px] text-text-tertiary">
            {(asOfLabel || nextCheckLabel) && (
              <p>
                {asOfLabel ? `Checked ${asOfLabel}` : 'Not checked yet'}
                {nextCheckLabel ? ` • Next review ${nextCheckLabel}` : ''}
              </p>
            )}
            {priceChanged && normalizedItem.previous_price_amount != null && normalizedItem.price_amount != null && (
              <p>
                Price moved from ${normalizedItem.previous_price_amount.toFixed(2)} to ${normalizedItem.price_amount.toFixed(2)}.
              </p>
            )}
            {failCount > 0 && (
              <p>{failCount === 1 ? '1 retry is queued for this gift.' : `${failCount} retries are queued for this gift.`}</p>
            )}
          </div>
        )}

        {getOwnerRegistryPurchaserLabel(normalizedItem) && (
          <p className="text-xs text-text-secondary">{getOwnerRegistryPurchaserLabel(normalizedItem)}</p>
        )}

        {canMarkPurchased && (
          <button
            onClick={() => setShowPurchaseConfirm(true)}
            className="w-full py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-success hover:text-success hover:bg-success/5 transition-colors flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Mark as purchased
          </button>
        )}
        {!canMarkPurchased && normalizedItem.purchase_status !== 'available' && onResetPurchaseState && (
          <button
            onClick={() => void onResetPurchaseState(normalizedItem)}
            className="w-full py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
          >
            Clear purchase state
          </button>
        )}

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </a>
          )}
          <button
            onClick={() => onEdit(normalizedItem)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          {onRefetchMetadata && displayUrl && (
            <>
            <button
              onClick={handleRefetch}
              disabled={refetching}
              title="Refresh gift details from the store"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {refetching ? (
                <span className="w-3.5 h-3.5 border-2 border-text-tertiary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refresh
            </button>
            <button
              onClick={() => { if (!refetching) { setRefetching(true); Promise.resolve(onRefetchMetadata?.(item, false, true)).finally(() => setRefetching(false)); } }}
              disabled={refetching}
              title="Re-import this item from the source link and replace weak details"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-import
            </button>
            </>
          )}
          <button
            onClick={handleDeleteClick}
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              confirmDelete
                ? 'border-border bg-surface-subtle text-text-primary'
                : 'text-text-tertiary border-transparent hover:border-text-tertiary hover:text-text-primary'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmDelete ? 'Confirm' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

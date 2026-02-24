import React, { useState, useRef } from 'react';
import { ExternalLink, Pencil, Trash2, GripVertical, Package, CheckCircle2, ShoppingBag, RefreshCw } from 'lucide-react';
import { Badge } from '../../../components/ui';
import type { RegistryItem, PurchaseStatus } from './registryTypes';

interface Props {
  item: RegistryItem;
  onEdit: (item: RegistryItem) => void;
  onDelete: (id: string) => void;
  onMarkPurchased?: (item: RegistryItem, qty: number) => Promise<void>;
  onRefetchMetadata?: (item: RegistryItem) => Promise<void>;
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
    <div className="absolute inset-0 z-10 bg-surface/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 gap-3">
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

export const RegistryItemCard: React.FC<Props> = ({ item, onEdit, onDelete, onMarkPurchased, onRefetchMetadata }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCashFund = item.item_type === 'cash_fund';
  const displayPrice = item.price_label
    ? item.price_label
    : item.price_amount != null
    ? `$${item.price_amount.toFixed(2)}`
    : null;

  const displayUrl = item.item_url ?? item.canonical_url;
  const merchant = item.merchant ?? item.store_name ?? null;
  const isPurchased = item.purchase_status === 'purchased';
  const canMarkPurchased = !isPurchased && !!onMarkPurchased;
  const stale = !item.metadata_last_checked_at || (Date.now() - new Date(item.metadata_last_checked_at).getTime()) > 1000 * 60 * 60 * 24 * 7;
  const priceChanged = item.previous_price_amount != null && item.price_amount != null && item.previous_price_amount !== item.price_amount;
  const outOfStock = (item.availability || '').toLowerCase().includes('out');
  const asOfLabel = item.metadata_last_checked_at
    ? new Date(item.metadata_last_checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const nextCheckLabel = item.next_refresh_at
    ? new Date(item.next_refresh_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const failCount = item.refresh_fail_count ?? 0;
  const goal = item.fund_goal_amount ?? 0;
  const received = item.fund_received_amount ?? 0;
  const fundPct = goal > 0 ? Math.min(100, Math.round((received / goal) * 100)) : null;

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
      await onMarkPurchased(item, qty);
      setShowPurchaseConfirm(false);
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function handleRefetch() {
    if (!onRefetchMetadata || refetching) return;
    setRefetching(true);
    try {
      await onRefetchMetadata(item);
    } finally {
      setRefetching(false);
    }
  }

  if (isCashFund) {
    return (
      <div className="group relative bg-surface border border-border rounded-xl overflow-hidden flex flex-col transition-shadow hover:shadow-md p-4 gap-3">
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
            <div className="w-full h-2 rounded-full bg-surface-subtle border border-border overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${fundPct}%` }} />
            </div>
            <p className="text-xs text-text-tertiary mt-1">{fundPct}% funded</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min="0" step="0.01" value={received} onChange={() => {}} readOnly className="hidden" />
          <button onClick={() => onEdit(item)} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"><Pencil className="w-3.5 h-3.5" />Edit</button>
          <button onClick={handleDeleteClick} className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${confirmDelete ? 'text-error border-error bg-error/5' : 'text-text-secondary border-border hover:border-error hover:text-error'}`}>
            <Trash2 className="w-3.5 h-3.5" />{confirmDelete ? 'Confirm' : 'Delete'}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {item.fund_venmo_url && <a href={item.fund_venmo_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border rounded-lg">Venmo</a>}
          {item.fund_paypal_url && <a href={item.fund_paypal_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border rounded-lg">PayPal</a>}
          {item.fund_zelle_handle && <span className="text-xs px-2 py-1 border rounded-lg">Zelle: {item.fund_zelle_handle}</span>}
          {item.fund_custom_url && <a href={item.fund_custom_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border rounded-lg">{item.fund_custom_label || 'Link'}</a>}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-surface border border-border rounded-xl overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      {showPurchaseConfirm && (
        <PurchaseConfirmPanel
          item={item}
          onConfirm={handlePurchaseConfirm}
          onCancel={() => setShowPurchaseConfirm(false)}
          busy={purchaseBusy}
        />
      )}

      <div className="relative aspect-[4/3] bg-surface-subtle flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className={`w-full h-full object-cover transition-opacity ${isPurchased ? 'opacity-40' : ''}`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className={`w-10 h-10 ${isPurchased ? 'text-text-tertiary/40' : 'text-text-tertiary'}`} />
          </div>
        )}
        {isPurchased && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-success/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Purchased
            </div>
          </div>
        )}
        {item.hide_when_purchased && isPurchased && (
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
          <h3 className="font-semibold text-text-primary leading-snug line-clamp-2">{item.item_name}</h3>
          {merchant && (
            <p className="text-xs text-text-tertiary mt-0.5">{merchant}</p>
          )}
        </div>

        {displayPrice && (
          <p className="text-lg font-bold text-primary leading-none">{displayPrice}</p>
        )}

        <div className="flex items-center justify-between">
          {statusBadge(item.purchase_status, item.quantity_purchased, item.quantity_needed)}
          {item.quantity_needed > 1 && (
            <span className="text-xs text-text-tertiary">
              Want {item.quantity_needed}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {outOfStock && <Badge variant="warning">Out of stock</Badge>}
          {priceChanged && <Badge variant="success">Price changed</Badge>}
          {stale && <Badge variant="neutral">Needs refresh</Badge>}
          {failCount > 0 && <Badge variant="error">Retry {failCount}</Badge>}
        </div>

        {item.purchaser_name && item.purchase_status !== 'available' && (
          <p className="text-xs text-text-secondary">by {item.purchaser_name}</p>
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
            onClick={() => onEdit(item)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          {onRefetchMetadata && item.item_url && (
            <button
              onClick={handleRefetch}
              disabled={refetching}
              title="Re-fetch product details from the store"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {refetching ? (
                <span className="w-3.5 h-3.5 border-2 border-text-tertiary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refresh
            </button>
          )}
          <button
            onClick={handleDeleteClick}
            className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              confirmDelete
                ? 'border-error text-error bg-error-light'
                : 'text-text-tertiary border-transparent hover:border-error/40 hover:text-error'
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

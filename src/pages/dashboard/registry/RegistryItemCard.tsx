import React, { useState, useRef } from 'react';
import { ExternalLink, Pencil, Trash2, GripVertical, Package, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Badge } from '../../../components/ui';
import type { RegistryItem, PurchaseStatus } from './registryTypes';

interface Props {
  item: RegistryItem;
  onEdit: (item: RegistryItem) => void;
  onDelete: (id: string) => void;
  onMarkPurchased?: (item: RegistryItem, qty: number) => Promise<void>;
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

export const RegistryItemCard: React.FC<Props> = ({ item, onEdit, onDelete, onMarkPurchased }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayPrice = item.price_label
    ? item.price_label
    : item.price_amount != null
    ? `$${item.price_amount.toFixed(2)}`
    : null;

  const displayUrl = item.item_url ?? item.canonical_url;
  const merchant = item.merchant ?? item.store_name ?? null;
  const isPurchased = item.purchase_status === 'purchased';
  const canMarkPurchased = !isPurchased && !!onMarkPurchased;

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

        <div className="flex items-center gap-2 pt-1">
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

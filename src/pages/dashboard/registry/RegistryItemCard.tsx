import React, { useState } from 'react';
import { ExternalLink, Pencil, Trash2, GripVertical, Package } from 'lucide-react';
import { Badge } from '../../../components/ui';
import type { RegistryItem, PurchaseStatus } from './registryTypes';

interface Props {
  item: RegistryItem;
  onEdit: (item: RegistryItem) => void;
  onDelete: (id: string) => void;
}

function statusBadge(status: PurchaseStatus, qty: number, needed: number) {
  if (status === 'purchased') {
    return <Badge variant="success">Purchased</Badge>;
  }
  if (status === 'partial') {
    return <Badge variant="warning">Partial ({qty}/{needed})</Badge>;
  }
  return <Badge variant="neutral">Available</Badge>;
}

export const RegistryItemCard: React.FC<Props> = ({ item, onEdit, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayPrice = item.price_label
    ? item.price_label
    : item.price_amount != null
    ? `$${item.price_amount.toFixed(2)}`
    : null;

  const displayUrl = item.item_url ?? item.canonical_url;
  const merchant = item.merchant ?? item.store_name ?? null;

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(item.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <div className="group bg-surface border border-border rounded-xl overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] bg-surface-subtle flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-text-tertiary" />
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

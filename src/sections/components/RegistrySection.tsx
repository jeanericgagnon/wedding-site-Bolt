import React, { useState, useEffect } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { ExternalLink, Gift, Package, CheckCircle2, Loader2, X, ShoppingBag } from 'lucide-react';
import { useSiteView } from '../../contexts/SiteViewContext';
import { publicFetchRegistryItems, publicIncrementPurchase } from '../../pages/dashboard/registry/registryService';
import type { RegistryItem } from '../../pages/dashboard/registry/registryTypes';
import { sanitizeRegistryQuantityState } from '../../pages/dashboard/registry/registryTypes';
import { readBuilderValue } from '../../lib/weddingProfile';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function usePublicRegistryItems(weddingSiteId: string | null) {
  const [items, setItems] = useState<RegistryItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weddingSiteId) return;
    setLoading(true);
    publicFetchRegistryItems(weddingSiteId)
      .then(data => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [weddingSiteId]);

  function updateItem(updated: RegistryItem) {
    setItems(prev => prev?.map(i => (i.id === updated.id ? updated : i)) ?? prev);
  }

  return { items, loading, updateItem };
}

export function shouldUseLiveRegistryItems(items: RegistryItem[] | null): items is RegistryItem[] {
  return items !== null;
}

export function normalizePublicRegistryItemState(item: RegistryItem): RegistryItem {
  const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased, item.quantity_needed);
  return {
    ...item,
    quantity_needed: quantityState.quantityNeeded,
    quantity_purchased: quantityState.quantityPurchased,
    purchase_status: quantityState.purchaseStatus,
    purchaser_name: quantityState.purchaseStatus === 'available' ? null : item.purchaser_name,
  };
}

interface PurchaseModalProps {
  item: RegistryItem;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ item, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(name.trim());
      setDone(true);
      setTimeout(onClose, 2000);
    } finally {
      setLoading(false);
    }
  }

  const displayPrice = item.price_label ?? (item.price_amount != null ? `$${item.price_amount.toFixed(2)}` : null);
  const dialogCopy = getRegistryPurchaseDialogCopy(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-text-primary/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {done ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <p className="font-semibold text-text-primary">Thank you!</p>
            <p className="text-sm text-text-secondary">{dialogCopy.successMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="font-semibold text-text-primary">{dialogCopy.title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="flex items-center gap-3 p-3 bg-surface-subtle rounded-xl border border-border">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 border border-border">
                    <Package className="w-5 h-5 text-text-tertiary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2">{item.item_name}</p>
                  {displayPrice && <p className="text-sm text-primary font-semibold mt-0.5">{displayPrice}</p>}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Your name
                  <span className="ml-1 text-xs text-text-tertiary font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aunt Susan"
                  className="w-full px-3 py-2.5 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Saving…' : dialogCopy.confirmLabel}
              </button>
              <button type="button" onClick={onClose} className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors py-1">
                Cancel
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

interface RegistryCardProps {
  item: RegistryItem;
  onPurchase: (item: RegistryItem) => void;
}

export function getRegistryPurchaseCtaLabel(item: Pick<RegistryItem, 'purchase_status'>): string {
  return item.purchase_status === 'partial' ? 'Buy remaining' : 'Mark as purchasing';
}

export function getRegistryPurchaseDialogCopy(item: Pick<RegistryItem, 'purchase_status'>): {
  title: string;
  confirmLabel: string;
  successMessage: string;
} {
  if (item.purchase_status === 'partial') {
    return {
      title: 'Buy remaining gift',
      confirmLabel: 'Confirm remaining purchase',
      successMessage: 'This gift is now updated with the remaining purchase.',
    };
  }

  return {
    title: 'Mark as purchasing',
    confirmLabel: 'Confirm purchase',
    successMessage: 'This gift is now marked as being purchased.',
  };
}

export function getRegistryPurchaserStatusLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {
  if (!item.purchaser_name || item.purchase_status === 'available') return null;
  return item.purchase_status === 'purchased'
    ? `Purchased by ${item.purchaser_name}`
    : `Purchasing: ${item.purchaser_name}`;
}

export function getRegistryDisplayPriority(item: Pick<RegistryItem, 'purchase_status' | 'item_type'>): number {
  const purchaseScore = item.purchase_status === 'available'
    ? 2
    : item.purchase_status === 'partial'
      ? 1
      : 0;

  return purchaseScore + (item.item_type === 'cash_fund' ? 1 : 0);
}

export function getRegistryEmptyStateMessage(
  allItems: Array<Pick<RegistryItem, 'purchase_status' | 'hide_when_purchased' | 'item_type'>>,
  groupMode: 'all' | 'funds' | 'stores',
): string {
  const visibleByPurchase = allItems.filter((item) => !item.hide_when_purchased || item.purchase_status !== 'purchased');
  const visibleForGroup = visibleByPurchase.filter((item) => {
    if (groupMode === 'funds') return item.item_type === 'cash_fund';
    if (groupMode === 'stores') return item.item_type !== 'cash_fund';
    return true;
  });

  if (visibleForGroup.length > 0) return '';
  if (groupMode !== 'all' && visibleByPurchase.length > 0) return 'No items match this filter right now.';
  return 'All items have been purchased. Thank you!';
}

const RegistryCard: React.FC<RegistryCardProps> = ({ item, onPurchase }) => {
  const isCashFund = item.item_type === 'cash_fund';
  const isPurchased = item.purchase_status === 'purchased';
  const [copiedZelle, setCopiedZelle] = useState(false);
  const isPartial = item.purchase_status === 'partial';
  const displayPrice = item.price_label ?? (item.price_amount != null ? `$${item.price_amount.toFixed(2)}` : null);
  const displayUrl = item.item_url ?? item.canonical_url;
  const merchant = item.merchant ?? item.store_name;

  if (isCashFund) {
    const goal = item.fund_goal_amount ?? 0;
    const received = item.fund_received_amount ?? 0;
    const pct = goal > 0 ? Math.min(100, Math.round((received / goal) * 100)) : null;
    return (
      <div className="bg-surface rounded-2xl border border-border p-4 md:p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-text-primary text-sm line-clamp-2">{item.item_name}</h3>
          <span className="text-[10px] uppercase px-2 py-1 rounded border border-primary/30 text-primary bg-primary/10">Cash Fund</span>
        </div>
        {item.notes && <p className="text-xs text-text-secondary leading-relaxed">{item.notes}</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg border border-border bg-surface-subtle">Goal: {goal > 0 ? `$${goal.toFixed(0)}` : '—'}</div>
          <div className="p-2 rounded-lg border border-border bg-surface-subtle">Raised: ${received.toFixed(0)}</div>
        </div>
        {pct != null && (
          <div>
            <div className="h-2 w-full rounded-full bg-surface-subtle border border-border overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">{pct}% funded</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {item.fund_venmo_url && <a href={item.fund_venmo_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors">Venmo</a>}
          {item.fund_paypal_url && <a href={item.fund_paypal_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors">PayPal</a>}
          {item.fund_custom_url && <a href={item.fund_custom_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors">{item.fund_custom_label || 'Contribute'}</a>}
          {item.fund_zelle_handle && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(item.fund_zelle_handle || '');
                  setCopiedZelle(true);
                  setTimeout(() => setCopiedZelle(false), 1600);
                } catch {}
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors"
              title={`Copy Zelle: ${item.fund_zelle_handle}`}
            >
              {copiedZelle ? 'Copied ✓' : `Zelle: ${item.fund_zelle_handle}`}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl border overflow-hidden flex flex-col ui-motion-emphasis ${
      isPurchased ? 'border-success/30 bg-success-light/10 opacity-75' : 'border-border hover:border-primary/30 hover:shadow-md'
    }`}>
      <div className="relative aspect-[4/3] bg-surface-subtle flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className={`w-full h-full object-cover transition-opacity ${isPurchased ? 'opacity-60' : ''}`}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-text-tertiary" />
          </div>
        )}
        {isPurchased && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-surface/90 rounded-full p-2.5 shadow-md">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 flex flex-col gap-2.5 flex-1">
        <div className="flex-1">
          <h3 className="font-medium text-text-primary leading-snug line-clamp-2 text-sm">{item.item_name}</h3>
          {merchant && <p className="text-xs text-text-tertiary mt-0.5">{merchant}</p>}
        </div>

        {displayPrice && (
          <p className="text-base font-semibold tracking-tight text-primary">{displayPrice}</p>
        )}

        {item.notes && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{item.notes}</p>
        )}

        {isPartial && (
          <p className="text-xs text-warning font-medium">
            {item.quantity_purchased} of {item.quantity_needed} purchased
          </p>
        )}

        {getRegistryPurchaserStatusLabel(item) && (
          <p className="text-xs text-text-tertiary">{getRegistryPurchaserStatusLabel(item)}</p>
        )}

        <div className="flex gap-2 pt-1">
          {isPurchased ? (
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-success bg-success-light rounded-xl border border-success/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Purchased
            </span>
          ) : (
            <button
              onClick={() => onPurchase(item)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-text-inverse text-xs font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {getRegistryPurchaseCtaLabel(item)}
            </button>
          )}

          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 border border-border rounded-xl hover:border-primary/40 text-text-tertiary hover:text-primary transition-colors flex-shrink-0"
              title="Open registry item"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

function RegistryItemsDisplay({ items, settings, notes, updateItem }: {
  items: RegistryItem[];
  settings: SectionInstance['settings'];
  notes?: string;
  updateItem: (item: RegistryItem) => void;
}) {
  const normalizedItems = items.map(normalizePublicRegistryItemState);
  const [purchasingItem, setPurchasingItem] = useState<RegistryItem | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'recommended' | 'price-low' | 'price-high'>('recommended');
  const [groupMode, setGroupMode] = useState<'all' | 'funds' | 'stores'>('all');

  const visibleItems = normalizedItems.filter(item => {
    if (item.hide_when_purchased && item.purchase_status === 'purchased') return false;
    if (groupMode === 'funds') return item.item_type === 'cash_fund';
    if (groupMode === 'stores') return item.item_type !== 'cash_fund';
    return true;
  });

  const sortedItems = [...visibleItems].sort((a, b) => {
    const priceA = a.price_amount ?? 0;
    const priceB = b.price_amount ?? 0;
    if (sortMode === 'price-low') return priceA - priceB;
    if (sortMode === 'price-high') return priceB - priceA;
    const scoreA = getRegistryDisplayPriority(a);
    const scoreB = getRegistryDisplayPriority(b);
    return scoreB - scoreA;
  });

  async function handleConfirmPurchase(purchaserName: string) {
    if (!purchasingItem) return;
    setPurchaseError(null);
    try {
      const updated = await publicIncrementPurchase(purchasingItem.id, purchaserName || undefined);
      updateItem(normalizePublicRegistryItemState(updated));
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : 'Could not save that purchase right now. Try again.');
      throw err;
    }
  }

  return (
    <>
      <div className="text-center mb-10">
        {settings.showTitle !== false && (
          <>
            <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Registry</p>
            <h2 className="text-4xl font-light tracking-tight text-text-primary">{readBuilderValue(settings.title, 'Registry')}</h2>
          </>
        )}
        {notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{notes}</p>}
        <div className="w-10 h-px bg-primary mx-auto mt-6" />
      </div>

      {purchaseError && (
        <div className="mb-6 p-3 bg-error-light text-error text-sm rounded-xl border border-error/20 text-center max-w-md mx-auto">
          {purchaseError}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-1">
          {[
            { id: 'all', label: 'All gifts' },
            { id: 'funds', label: 'Funds' },
            { id: 'stores', label: 'Stores' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGroupMode(opt.id as typeof groupMode)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${groupMode === opt.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-subtle'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-1">
          {[
            { id: 'recommended', label: 'Recommended' },
            { id: 'price-low', label: 'Price ↑' },
            { id: 'price-high', label: 'Price ↓' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortMode(opt.id as typeof sortMode)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${sortMode === opt.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-subtle'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">{getRegistryEmptyStateMessage(items, groupMode)}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
          {sortedItems.map(item => (
            <RegistryCard key={item.id} item={item} onPurchase={setPurchasingItem} />
          ))}
        </div>
      )}

      {purchasingItem && (
        <PurchaseModal
          item={purchasingItem}
          onClose={() => { setPurchasingItem(null); setPurchaseError(null); }}
          onConfirm={handleConfirmPurchase}
        />
      )}
    </>
  );
}

export const RegistrySection: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  const { weddingSiteId } = useSiteView();
  const { items, loading, updateItem } = usePublicRegistryItems(weddingSiteId);

  const linksToShow = bindings.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;

  if (loading) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading registry…
        </div>
      </section>
    );
  }

  if (shouldUseLiveRegistryItems(items)) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <RegistryItemsDisplay items={items} settings={settings} notes={registry.notes} updateItem={updateItem} />
        </div>
      </section>
    );
  }

  if (linksToShow.length === 0) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle !== false && (
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-6">{readBuilderValue(settings.title, 'Registry')}</h2>
          )}
          <p className="text-text-secondary">Registry links and gift details will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary text-center mb-8">{readBuilderValue(settings.title, 'Registry')}</h2>
        )}
        {registry.notes && <p className="text-text-secondary text-center mb-8 leading-relaxed">{registry.notes}</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-surface-subtle rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <span className="font-medium tracking-tight text-text-primary">{link.label || link.url}</span>
              <ExternalLink className="w-5 h-5 text-primary" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export const RegistryGrid: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  const { weddingSiteId } = useSiteView();
  const { items, loading, updateItem } = usePublicRegistryItems(weddingSiteId);

  const linksToShow = bindings.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;

  if (loading) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading registry…
        </div>
      </section>
    );
  }

  if (shouldUseLiveRegistryItems(items)) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-6xl mx-auto">
          <RegistryItemsDisplay items={items} settings={settings} notes={registry.notes} updateItem={updateItem} />
        </div>
      </section>
    );
  }

  if (linksToShow.length === 0) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle !== false && (
            <h2 className="text-4xl font-light text-text-primary mb-8">{readBuilderValue(settings.title, 'Registry')}</h2>
          )}
          <p className="text-text-secondary">Registry links and gift details will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Registry</p>
            <h2 className="text-4xl font-light tracking-tight text-text-primary">{readBuilderValue(settings.title, 'Registry')}</h2>
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{registry.notes}</p>}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center p-8 bg-surface rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-text-primary text-center mb-3">{link.label || link.url}</span>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                Open registry
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export const RegistryFundHighlight: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  const { weddingSiteId } = useSiteView();
  const { items, loading, updateItem } = usePublicRegistryItems(weddingSiteId);

  const linksToShow = bindings.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;

  if (loading) {
    return (
      <section className="py-16 md:py-20 px-4 bg-surface">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading registry…
        </div>
      </section>
    );
  }

  if (shouldUseLiveRegistryItems(items)) {
    return (
      <section className="py-20 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            {settings.showTitle !== false && (
              <>
                <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Registry</p>
                <h2 className="text-3xl md:text-4xl font-light tracking-tight text-text-primary leading-tight">{readBuilderValue(settings.title, 'Registry')}</h2>
              </>
            )}
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{registry.notes}</p>}
          </div>

          <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 text-center">
            <h3 className="text-xl font-semibold tracking-tight text-text-primary">Honeymoon & Experiences Fund</h3>
            <p className="text-sm text-text-secondary leading-relaxed mt-2 max-w-2xl mx-auto">
              Your love and support means so much. If you’d like, you can also contribute toward future plans and shared experiences.
            </p>
          </div>

          <RegistryItemsDisplay items={items} settings={{ ...settings, showTitle: false }} notes={undefined} updateItem={updateItem} />
        </div>
      </section>
    );
  }

  if (linksToShow.length === 0) {
    return (
      <section className="py-16 md:py-20 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle !== false && <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-8 leading-tight">{readBuilderValue(settings.title, 'Registry')}</h2>}
          <p className="text-text-secondary">Registry links and gift details will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  const featured = linksToShow[0];
  const remaining = linksToShow.slice(1);

  return (
    <section className="py-16 md:py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-8 md:mb-10">
            <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Registry</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-text-primary leading-tight">{readBuilderValue(settings.title, 'Registry')}</h2>
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{registry.notes}</p>}
          </div>
        )}

        <a
          href={featured.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-primary/25 bg-primary/5 p-7 md:p-9 mb-6 hover:border-primary/40 transition-colors shadow-sm"
        >
          <p className="text-xs uppercase tracking-[0.24em] text-primary font-medium mb-2">Featured fund</p>
          <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">{featured.label || featured.url}</h3>
          <p className="text-text-secondary mt-3 max-w-2xl leading-relaxed">Contribute toward our honeymoon and the first chapter of married life.</p>
          <span className="inline-flex items-center gap-2 mt-5 text-primary font-medium">
            Contribute to this fund
            <ExternalLink className="w-4 h-4" />
          </span>
        </a>

        {remaining.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {remaining.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-surface-subtle rounded-xl border border-border hover:border-primary/30 transition-colors shadow-sm"
              >
                <span className="font-medium tracking-tight text-text-primary">{link.label || link.url}</span>
                <ExternalLink className="w-4 h-4 text-primary" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

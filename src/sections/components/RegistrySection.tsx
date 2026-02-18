import React, { useState, useEffect } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { ExternalLink, Gift, Package, CheckCircle2, Loader2, X, ShoppingBag } from 'lucide-react';
import { useSiteView } from '../../contexts/SiteViewContext';
import { publicFetchRegistryItems, publicIncrementPurchase } from '../../pages/dashboard/registry/registryService';
import type { RegistryItem } from '../../pages/dashboard/registry/registryTypes';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function usePublicRegistryItems(weddingSiteId: string | null) {
  const [items, setItems] = useState<RegistryItem[]>([]);
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
    setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
  }

  return { items, loading, updateItem };
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
            <p className="text-sm text-text-secondary">Marked as being purchased.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="font-semibold text-text-primary">Mark as Purchasing</h3>
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
                {loading ? 'Saving…' : 'Confirm Purchase'}
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

const RegistryCard: React.FC<RegistryCardProps> = ({ item, onPurchase }) => {
  const isPurchased = item.purchase_status === 'purchased';
  const isPartial = item.purchase_status === 'partial';
  const displayPrice = item.price_label ?? (item.price_amount != null ? `$${item.price_amount.toFixed(2)}` : null);
  const displayUrl = item.item_url ?? item.canonical_url;
  const merchant = item.merchant ?? item.store_name;

  return (
    <div className={`bg-surface rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 ${
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

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <h3 className="font-medium text-text-primary leading-snug line-clamp-2 text-sm">{item.item_name}</h3>
          {merchant && <p className="text-xs text-text-tertiary mt-0.5">{merchant}</p>}
        </div>

        {displayPrice && (
          <p className="text-base font-bold text-primary">{displayPrice}</p>
        )}

        {item.notes && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{item.notes}</p>
        )}

        {isPartial && (
          <p className="text-xs text-warning font-medium">
            {item.quantity_purchased} of {item.quantity_needed} purchased
          </p>
        )}

        {item.purchaser_name && !isPurchased && (
          <p className="text-xs text-text-tertiary">Purchasing: {item.purchaser_name}</p>
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
              I'll buy this
            </button>
          )}

          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 border border-border rounded-xl hover:border-primary/40 text-text-tertiary hover:text-primary transition-colors flex-shrink-0"
              title="View product"
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
  const [purchasingItem, setPurchasingItem] = useState<RegistryItem | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const visibleItems = items.filter(item =>
    !(item.hide_when_purchased && item.purchase_status === 'purchased')
  );

  async function handleConfirmPurchase(purchaserName: string) {
    if (!purchasingItem) return;
    setPurchaseError(null);
    try {
      const updated = await publicIncrementPurchase(purchasingItem.id, purchaserName || undefined);
      updateItem(updated);
    } catch (err: unknown) {
      setPurchaseError(err instanceof Error ? err.message : 'Could not save purchase. Try again.');
      throw err;
    }
  }

  return (
    <>
      <div className="text-center mb-10">
        {settings.showTitle !== false && (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Gift Registry</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Registry'}</h2>
          </>
        )}
        {notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto">{notes}</p>}
        <div className="w-10 h-px bg-primary mx-auto mt-6" />
      </div>

      {purchaseError && (
        <div className="mb-6 p-3 bg-error-light text-error text-sm rounded-xl border border-error/20 text-center max-w-md mx-auto">
          {purchaseError}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">All items have been purchased. Thank you!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visibleItems.map(item => (
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

  if (items.length > 0) {
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
            <h2 className="text-4xl font-bold text-text-primary mb-8">{settings.title || 'Registry'}</h2>
          )}
          <p className="text-text-secondary">Registry details coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-8">{settings.title || 'Registry'}</h2>
        )}
        {registry.notes && <p className="text-text-secondary text-center mb-8">{registry.notes}</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-surface-subtle rounded-lg hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium text-text-primary">{link.label || link.url}</span>
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

  if (items.length > 0) {
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
            <h2 className="text-4xl font-light text-text-primary mb-8">{settings.title || 'Registry'}</h2>
          )}
          <p className="text-text-secondary">Registry details coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Gift registry</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Registry'}</h2>
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto">{registry.notes}</p>}
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
              className="group flex flex-col items-center p-8 bg-surface rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-text-primary text-center mb-3">{link.label || link.url}</span>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                View registry
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button } from '../../components/ui';
import { Gift, Plus, CheckCircle2, DollarSign, Search, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchRegistryItems,
  createRegistryItem,
  updateRegistryItem,
  deleteRegistryItem,
  ownerMarkPurchased,
  fetchUrlPreview,
} from './registry/registryService';
import { RegistryItemCard } from './registry/RegistryItemCard';
import { RegistryItemForm } from './registry/RegistryItemForm';
import type { RegistryItem, RegistryFilter, RegistryItemDraft } from './registry/registryTypes';
import { demoWeddingSite, demoRegistryItems } from '../../lib/demoData';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          t.type === 'error'
            ? 'bg-error-light text-error border-error/20'
            : 'bg-success-light text-success border-success/20'
        }`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

const FILTER_TABS: { key: RegistryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'partial', label: 'Partial' },
  { key: 'purchased', label: 'Purchased' },
];

export const DashboardRegistry: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RegistryFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RegistryItem | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  function toast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  function toDemoRegistryItem(item: typeof demoRegistryItems[number], index: number): RegistryItem {
    const quantityPurchased = item.quantity_purchased ?? 0;
    const quantityNeeded = item.quantity_needed ?? 1;
    const purchaseStatus: RegistryItem['purchase_status'] =
      quantityPurchased <= 0 ? 'available' : quantityPurchased >= quantityNeeded ? 'purchased' : 'partial';

    return {
      id: item.id,
      wedding_site_id: demoWeddingSite.id,
      item_name: item.item_name,
      price_label: null,
      price_amount: item.price ?? null,
      store_name: item.store_name ?? null,
      merchant: item.store_name ?? null,
      item_url: null,
      canonical_url: null,
      image_url: null,
      description: null,
      notes: null,
      quantity_needed: quantityNeeded,
      quantity_purchased: quantityPurchased,
      purchaser_name: null,
      purchase_status: purchaseStatus,
      hide_when_purchased: false,
      sort_order: index,
      priority: item.priority,
      availability: null,
      metadata_last_checked_at: null,
      metadata_fetch_status: null,
      metadata_confidence_score: null,
      previous_price_amount: null,
      price_last_changed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const loadItems = useCallback(async (siteId: string) => {
    try {
      const data = await fetchRegistryItems(siteId);
      setItems(data);
    } catch {
      toast('Failed to load registry items', 'error');
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        if (isDemoMode) {
          setWeddingSiteId(demoWeddingSite.id);
          setItems(demoRegistryItems.map(toDemoRegistryItem));
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: site } = await supabase
          .from('wedding_sites')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (site?.id) {
          setWeddingSiteId(site.id);
          await loadItems(site.id);
        }
      } catch {
        toast('Failed to initialize', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isDemoMode, loadItems]);

  async function handleSave(draft: RegistryItemDraft) {
    if (!weddingSiteId) throw new Error('No wedding site found');

    const parsedPrice = draft.price_amount ? parseFloat(draft.price_amount) : null;
    const fields: Partial<RegistryItem> = {
      item_name: draft.item_name.trim(),
      price_label: draft.price_label || null,
      price_amount: parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null,
      merchant: draft.merchant || null,
      store_name: draft.merchant || null,
      item_url: draft.item_url || null,
      image_url: draft.image_url || null,
      notes: draft.notes || null,
      quantity_needed: parseInt(draft.desired_quantity) || 1,
      hide_when_purchased: draft.hide_when_purchased,
      metadata_last_checked_at: new Date().toISOString(),
    };

    if (isDemoMode) {
      if (editItem) {
        setItems(prev => prev.map(i => (i.id === editItem.id ? { ...i, ...fields, updated_at: new Date().toISOString() } : i)));
        toast('Item updated');
      } else {
        const created: RegistryItem = {
          id: `demo-registry-${Date.now()}`,
          wedding_site_id: weddingSiteId,
          item_name: fields.item_name || 'Untitled item',
          price_label: fields.price_label ?? null,
          price_amount: fields.price_amount ?? null,
          store_name: fields.store_name ?? null,
          merchant: fields.merchant ?? null,
          item_url: fields.item_url ?? null,
          canonical_url: null,
          image_url: fields.image_url ?? null,
          description: null,
          notes: fields.notes ?? null,
          quantity_needed: fields.quantity_needed ?? 1,
          quantity_purchased: 0,
          purchaser_name: null,
          purchase_status: 'available',
          hide_when_purchased: fields.hide_when_purchased ?? false,
          sort_order: items.length,
          priority: 'medium',
          availability: null,
          metadata_last_checked_at: new Date().toISOString(),
          metadata_fetch_status: 'manual',
          metadata_confidence_score: null,
          previous_price_amount: null,
          price_last_changed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setItems(prev => [...prev, created]);
        toast('Item added to registry');
      }
      setShowForm(false);
      setEditItem(null);
      return;
    }

    if (editItem) {
      const updated = await updateRegistryItem(editItem.id, fields);
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      toast('Item updated');
    } else {
      const created = await createRegistryItem(weddingSiteId, fields);
      setItems(prev => [...prev, created]);
      toast('Item added to registry');
    }

    setShowForm(false);
    setEditItem(null);
  }

  async function handleDelete(id: string) {
    try {
      if (!isDemoMode) {
        await deleteRegistryItem(id);
      }
      setItems(prev => prev.filter(i => i.id !== id));
      toast('Item removed');
    } catch {
      toast('Failed to delete item', 'error');
    }
  }

  async function handleMarkPurchased(item: RegistryItem, qty: number) {
    try {
      const updated = isDemoMode
        ? (() => {
            const newQty = Math.min(item.quantity_purchased + qty, item.quantity_needed);
            const newStatus: RegistryItem['purchase_status'] =
              newQty >= item.quantity_needed ? 'purchased' : newQty > 0 ? 'partial' : 'available';
            return {
              ...item,
              quantity_purchased: newQty,
              purchase_status: newStatus,
              updated_at: new Date().toISOString(),
            };
          })()
        : await ownerMarkPurchased(item.id, qty);

      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      toast(
        updated.purchase_status === 'purchased'
          ? `"${item.item_name}" marked as fully purchased`
          : `"${item.item_name}" updated — ${updated.quantity_purchased}/${updated.quantity_needed} purchased`
      );
    } catch {
      toast('Failed to update purchase status', 'error');
    }
  }

  async function handleRefetchMetadata(item: RegistryItem) {
    const url = item.item_url ?? item.canonical_url;
    if (!url) return;
    if (isDemoMode) {
      toast('Demo: sample product details are already populated', 'success');
      return;
    }
    try {
      const preview = await fetchUrlPreview(url, true);
      const fields: Partial<RegistryItem> = {
        metadata_last_checked_at: new Date().toISOString(),
        metadata_fetch_status: preview.fetch_status ?? 'success',
        metadata_confidence_score: preview.confidence_score ?? null,
        availability: preview.availability ?? null,
      };
      if (preview.title && !item.item_name) fields.item_name = preview.title;
      if (preview.price_label) fields.price_label = preview.price_label;
      if (preview.price_amount != null) {
        if (item.price_amount != null && item.price_amount !== preview.price_amount) {
          fields.previous_price_amount = item.price_amount;
          fields.price_last_changed_at = new Date().toISOString();
        }
        fields.price_amount = preview.price_amount;
      }
      if (preview.image_url) fields.image_url = preview.image_url;
      if (preview.merchant ?? preview.brand) fields.merchant = (preview.merchant ?? preview.brand)!;
      if (preview.canonical_url) fields.canonical_url = preview.canonical_url;
      if (Object.keys(fields).length > 0) {
        const updated = await updateRegistryItem(item.id, fields);
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
        toast('Product details refreshed');
      } else {
        toast('No new details found — details are up to date');
      }
    } catch {
      toast('Failed to refresh product details', 'error');
    }
  }


  async function handleAutoRefreshStale(silent = false) {
    if (isDemoMode || autoRefreshing) return;
    const staleCandidates = items
      .filter((item) => !!(item.item_url || item.canonical_url))
      .filter((item) => !item.metadata_last_checked_at || (Date.now() - new Date(item.metadata_last_checked_at).getTime()) > 1000 * 60 * 60 * 24)
      .slice(0, 12);

    if (staleCandidates.length === 0) {
      if (!silent) toast('Registry metadata is already fresh.');
      return;
    }

    setAutoRefreshing(true);
    let updatedCount = 0;
    for (const item of staleCandidates) {
      const url = item.item_url ?? item.canonical_url;
      if (!url) continue;
      try {
        const preview = await fetchUrlPreview(url, true);
        const fields: Partial<RegistryItem> = {
          metadata_last_checked_at: new Date().toISOString(),
          metadata_fetch_status: preview.fetch_status ?? 'success',
          metadata_confidence_score: preview.confidence_score ?? null,
          availability: preview.availability ?? null,
        };
        if (preview.price_label) fields.price_label = preview.price_label;
        if (preview.price_amount != null) {
          if (item.price_amount != null && item.price_amount !== preview.price_amount) {
            fields.previous_price_amount = item.price_amount;
            fields.price_last_changed_at = new Date().toISOString();
          }
          fields.price_amount = preview.price_amount;
        }
        if (preview.image_url) fields.image_url = preview.image_url;
        if (preview.canonical_url) fields.canonical_url = preview.canonical_url;
        if (preview.merchant ?? preview.brand) fields.merchant = (preview.merchant ?? preview.brand)!;

        const updated = await updateRegistryItem(item.id, fields);
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
        updatedCount += 1;
      } catch {
        // keep going item-by-item
      }
    }
    setAutoRefreshing(false);
    if (!silent) toast(`Refreshed ${updatedCount} item${updatedCount === 1 ? '' : 's'}.`);
  }

  async function handleBulkImport() {
    if (!weddingSiteId) return;
    const urls = Array.from(new Set(bulkUrls.split('\n').map((u) => u.trim()).filter(Boolean)));
    if (urls.length === 0) {
      toast('Paste at least one URL to import.', 'error');
      return;
    }

    setBulkImportBusy(true);
    let createdCount = 0;
    for (const url of urls.slice(0, 30)) {
      try {
        const preview = await fetchUrlPreview(url, false);
        const itemName = preview.title?.trim() || new URL(url).hostname;
        const fields: Partial<RegistryItem> = {
          item_name: itemName,
          price_label: preview.price_label ?? null,
          price_amount: preview.price_amount ?? null,
          merchant: (preview.merchant ?? preview.store_name ?? preview.brand) ?? null,
          store_name: (preview.merchant ?? preview.store_name ?? preview.brand) ?? null,
          item_url: preview.canonical_url ?? url,
          canonical_url: preview.canonical_url ?? null,
          image_url: preview.image_url ?? null,
          notes: preview.description ?? null,
          quantity_needed: 1,
          hide_when_purchased: false,
          metadata_last_checked_at: new Date().toISOString(),
          metadata_fetch_status: preview.fetch_status ?? 'success',
          metadata_confidence_score: preview.confidence_score ?? null,
          availability: preview.availability ?? null,
        };
        const created = await createRegistryItem(weddingSiteId, fields);
        setItems(prev => [...prev, created]);
        createdCount += 1;
      } catch {
        // continue importing
      }
    }

    setBulkImportBusy(false);
    setBulkImportOpen(false);
    setBulkUrls('');
    toast(`Imported ${createdCount} item${createdCount === 1 ? '' : 's'} from URLs.`);
  }

  function handleEdit(item: RegistryItem) {
    setEditItem(item);
    setShowForm(true);
  }

  function handleAddNew() {
    setEditItem(null);
    setShowForm(true);
  }

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.item_name.toLowerCase().includes(q) ||
      (item.merchant ?? '').toLowerCase().includes(q) ||
      (item.store_name ?? '').toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || item.purchase_status === filter;
    return matchesSearch && matchesFilter;
  });


  useEffect(() => {
    if (loading || isDemoMode || items.length === 0) return;
    const hasStale = items.some((item) => !item.metadata_last_checked_at || (Date.now() - new Date(item.metadata_last_checked_at).getTime()) > 1000 * 60 * 60 * 24);
    if (!hasStale) return;
    handleAutoRefreshStale(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isDemoMode, items.length]);

  const counts = {
    total: items.length,
    purchased: items.filter(i => i.purchase_status === 'purchased').length,
    partial: items.filter(i => i.purchase_status === 'partial').length,
    available: items.filter(i => i.purchase_status === 'available').length,
    totalValue: items.reduce((s, i) => s + (i.price_amount ?? 0), 0),
  };

  const tabCount = (key: RegistryFilter) => {
    if (key === 'all') return counts.total;
    if (key === 'available') return counts.available;
    if (key === 'partial') return counts.partial;
    if (key === 'purchased') return counts.purchased;
    return 0;
  };

  return (
    <DashboardLayout currentPage="registry">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-1">Gift Registry</h1>
            <p className="text-sm text-text-secondary">
              Paste any product URL to import items from any store
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="md" onClick={() => setBulkImportOpen(true)} disabled={!weddingSiteId}>
              Bulk Import URLs
            </Button>
            <Button variant="outline" size="md" onClick={() => handleAutoRefreshStale(false)} disabled={!weddingSiteId || autoRefreshing}>
              {autoRefreshing ? 'Refreshing…' : 'Refresh stale metadata'}
            </Button>
            <Button variant="primary" size="md" onClick={handleAddNew} disabled={!weddingSiteId}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Gift, bg: 'bg-primary-light', color: 'text-primary', val: counts.total, label: 'Total Items' },
            { icon: CheckCircle2, bg: 'bg-success-light', color: 'text-success', val: counts.purchased, label: 'Purchased' },
            { icon: Package, bg: 'bg-surface-subtle', color: 'text-text-secondary', val: counts.available + counts.partial, label: 'Remaining' },
            { icon: DollarSign, bg: 'bg-primary-light', color: 'text-primary', val: `$${counts.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, label: 'Est. Value' },
          ].map(({ icon: Icon, bg, color, val, label }) => (
            <Card key={label} variant="bordered" padding="md">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 ${bg} rounded-lg flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary leading-none">{val}</p>
                  <p className="text-xs text-text-secondary mt-1">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card variant="bordered" padding="lg">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or store…"
                className="w-full pl-9 pr-4 py-2.5 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-1 bg-surface-subtle rounded-lg p-1 border border-border">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    filter === tab.key
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                  {tabCount(tab.key) > 0 && (
                    <span className="ml-1 text-xs text-text-tertiary">{tabCount(tab.key)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-secondary">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading registry…
            </div>
          ) : !weddingSiteId ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <AlertCircle className="w-10 h-10 text-text-tertiary" />
              <p className="text-text-secondary">No wedding site found. Complete onboarding first.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center">
                <Gift className="w-8 h-8 text-text-tertiary" />
              </div>
              <div>
                <p className="text-text-primary font-semibold mb-1">
                  {items.length === 0 ? 'Your registry is empty' : 'No items match your filter'}
                </p>
                <p className="text-sm text-text-secondary max-w-xs mx-auto">
                  {items.length === 0
                    ? 'Paste any product URL from any store to get started.'
                    : 'Try adjusting your search or selecting a different filter.'}
                </p>
              </div>
              {items.length === 0 && (
                <Button variant="primary" size="md" onClick={handleAddNew}>
                  <Plus className="w-4 h-4" />
                  Add your first item
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(item => (
                <RegistryItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkPurchased={handleMarkPurchased}
                  onRefetchMetadata={handleRefetchMetadata}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {showForm && (
        <RegistryItemForm
          initial={editItem}
          existingItems={items}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {bulkImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Bulk import registry URLs</h3>
              <button className="text-text-tertiary hover:text-text-primary" onClick={() => setBulkImportOpen(false)}>Close</button>
            </div>
            <p className="text-sm text-text-secondary">Paste one URL per line (up to 30). We'll auto-fetch metadata and add items.</p>
            <textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              rows={10}
              placeholder="https://www.amazon.com/...\nhttps://www.target.com/..."
              className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkImportOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleBulkImport} disabled={bulkImportBusy}>
                {bulkImportBusy ? 'Importing…' : 'Import URLs'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};

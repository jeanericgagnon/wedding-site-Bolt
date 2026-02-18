import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button } from '../../components/ui';
import { Gift, Plus, CheckCircle2, DollarSign, Search, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  fetchRegistryItems,
  createRegistryItem,
  updateRegistryItem,
  deleteRegistryItem,
} from './registry/registryService';
import { RegistryItemCard } from './registry/RegistryItemCard';
import { RegistryItemForm } from './registry/RegistryItemForm';
import type { RegistryItem, RegistryFilter, RegistryItemDraft } from './registry/registryTypes';

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
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RegistryFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RegistryItem | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(draft: RegistryItemDraft) {
    if (!weddingSiteId) throw new Error('No wedding site found');

    const fields: Partial<RegistryItem> = {
      item_name: draft.item_name.trim(),
      price_label: draft.price_label || null,
      price_amount: draft.price_amount ? parseFloat(draft.price_amount) : null,
      merchant: draft.merchant || null,
      store_name: draft.merchant || null,
      item_url: draft.item_url || null,
      image_url: draft.image_url || null,
      notes: draft.notes || null,
      quantity_needed: parseInt(draft.desired_quantity) || 1,
      hide_when_purchased: draft.hide_when_purchased,
    };

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
      await deleteRegistryItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast('Item removed');
    } catch {
      toast('Failed to delete item', 'error');
    }
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
          <Button variant="primary" size="md" onClick={handleAddNew} disabled={!weddingSiteId}>
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
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

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};

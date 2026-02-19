import React, { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PlanningBudgetItem, PlanningVendor } from './planningService';

interface Props {
  items: PlanningBudgetItem[];
  vendors: PlanningVendor[];
  onAdd: (item: Partial<PlanningBudgetItem>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PlanningBudgetItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const BUDGET_CATEGORIES = [
  'Venue', 'Catering', 'Photography', 'Videography', 'Florals & Decor',
  'Music & Entertainment', 'Attire & Beauty', 'Transportation', 'Stationery',
  'Rings & Jewelry', 'Honeymoon', 'Officiant', 'Miscellaneous',
];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function BudgetForm({ initial, vendors, onSave, onCancel }: {
  initial?: Partial<PlanningBudgetItem>;
  vendors: PlanningVendor[];
  onSave: (item: Partial<PlanningBudgetItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    category: initial?.category ?? '',
    item_name: initial?.item_name ?? '',
    estimated_amount: initial?.estimated_amount ?? 0,
    actual_amount: initial?.actual_amount ?? 0,
    paid_amount: initial?.paid_amount ?? 0,
    due_date: initial?.due_date ?? '',
    vendor_id: initial?.vendor_id ?? '',
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      due_date: form.due_date || null,
      vendor_id: form.vendor_id || null,
      estimated_amount: Number(form.estimated_amount),
      actual_amount: Number(form.actual_amount),
      paid_amount: Number(form.paid_amount),
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-surface-subtle rounded-xl border border-border-subtle">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Category *</label>
          <select
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            required
          >
            <option value="">Select category</option>
            {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Item Name *</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.item_name}
            onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
            placeholder="e.g. Venue deposit"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Estimated ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.estimated_amount}
            onChange={e => setForm(f => ({ ...f, estimated_amount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Actual ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.actual_amount}
            onChange={e => setForm(f => ({ ...f, actual_amount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Paid ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.paid_amount}
            onChange={e => setForm(f => ({ ...f, paid_amount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Payment Due</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.due_date ?? ''}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </div>
        {vendors.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Vendor</label>
            <select
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.vendor_id}
              onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
            >
              <option value="">None</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </form>
  );
}

export const BudgetTab: React.FC<Props> = ({ items, vendors, onAdd, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanningBudgetItem | null>(null);

  const totalEstimated = items.reduce((s, i) => s + (i.estimated_amount || 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const totalPaid = items.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const remaining = totalActual - totalPaid;

  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  const overBudgetCategories = categories.filter(cat => {
    const est = items.filter(i => i.category === cat).reduce((s, i) => s + i.estimated_amount, 0);
    const act = items.filter(i => i.category === cat).reduce((s, i) => s + i.actual_amount, 0);
    return act > est && est > 0;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Estimated', value: totalEstimated, color: 'text-text-primary' },
          { label: 'Actual', value: totalActual, color: totalActual > totalEstimated ? 'text-error' : 'text-text-primary' },
          { label: 'Paid', value: totalPaid, color: 'text-success' },
          { label: 'Remaining', value: remaining, color: remaining > 0 ? 'text-warning' : 'text-text-tertiary' },
        ].map(stat => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs text-text-tertiary mb-0.5">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{fmt(stat.value)}</p>
          </Card>
        ))}
      </div>

      {overBudgetCategories.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-error/5 border border-error/20 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <span className="text-text-primary">
            Over budget: <span className="font-medium text-error">{overBudgetCategories.join(', ')}</span>
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      {showAdd && (
        <BudgetForm
          vendors={vendors}
          onSave={async (item) => { await onAdd(item); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {items.length === 0 && !showAdd ? (
        <Card padding="lg" className="text-center">
          <p className="text-text-secondary mb-1">No budget items yet.</p>
          <p className="text-sm text-text-tertiary">Track all your wedding expenses here.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map(cat => {
            const catItems = items.filter(i => i.category === cat);
            const catEst = catItems.reduce((s, i) => s + i.estimated_amount, 0);
            const catAct = catItems.reduce((s, i) => s + i.actual_amount, 0);
            const isOverBudget = catAct > catEst && catEst > 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-semibold ${isOverBudget ? 'text-error' : 'text-text-primary'}`}>
                    {cat}
                    {isOverBudget && <AlertTriangle className="w-3.5 h-3.5 inline ml-1.5" />}
                  </h3>
                  <span className="text-xs text-text-tertiary">{fmt(catAct)} / {fmt(catEst)}</span>
                </div>
                <div className="space-y-2">
                  {catItems.map(item => (
                    <div key={item.id}>
                      {editingItem?.id === item.id ? (
                        <BudgetForm
                          initial={editingItem}
                          vendors={vendors}
                          onSave={async (u) => { await onUpdate(item.id, u); setEditingItem(null); }}
                          onCancel={() => setEditingItem(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg border border-border-subtle hover:border-border transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{item.item_name}</p>
                            {item.notes && <p className="text-xs text-text-tertiary truncate">{item.notes}</p>}
                          </div>
                          <div className="flex gap-4 text-sm flex-shrink-0">
                            <span className="text-text-tertiary hidden sm:block">{fmt(item.estimated_amount)}</span>
                            <span className={item.actual_amount > item.estimated_amount && item.estimated_amount > 0 ? 'text-error font-medium' : 'text-text-primary'}>{fmt(item.actual_amount)}</span>
                            <span className="text-success hidden sm:block">{fmt(item.paid_amount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditingItem(item)} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onDelete(item.id)} className="p-1 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {items.length > 0 && (
            <div className="flex items-center justify-between text-xs text-text-tertiary px-3">
              <span>Est.</span>
              <span>Actual</span>
              <span>Paid</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, Globe, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PlanningVendor } from './planningService';

interface Props {
  vendors: PlanningVendor[];
  onAdd: (v: Partial<PlanningVendor>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PlanningVendor>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const VENDOR_TYPES = [
  'Venue', 'Photographer', 'Videographer', 'Caterer', 'Florist',
  'DJ', 'Band', 'Officiant', 'Hair & Makeup', 'Transportation',
  'Baker', 'Planner', 'Stationery', 'Other',
];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function VendorForm({ initial, onSave, onCancel }: {
  initial?: Partial<PlanningVendor>;
  onSave: (v: Partial<PlanningVendor>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    vendor_type: initial?.vendor_type ?? '',
    name: initial?.name ?? '',
    contact_name: initial?.contact_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    website: initial?.website ?? '',
    contract_total: initial?.contract_total ?? 0,
    amount_paid: initial?.amount_paid ?? 0,
    next_payment_due: initial?.next_payment_due ?? '',
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      contract_total: Number(form.contract_total),
      amount_paid: Number(form.amount_paid),
      next_payment_due: form.next_payment_due || null,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-surface-subtle rounded-xl border border-border-subtle">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type *</label>
          <select
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.vendor_type}
            onChange={e => setForm(f => ({ ...f, vendor_type: e.target.value }))}
            required
          >
            <option value="">Select type</option>
            {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Business Name *</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Vendor business name"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Contact Name</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.contact_name}
            onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            placeholder="Primary contact"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="vendor@email.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Phone</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="(555) 000-0000"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Website</label>
          <input
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://vendor.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Contract Total ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.contract_total}
            onChange={e => setForm(f => ({ ...f, contract_total: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Amount Paid ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.amount_paid}
            onChange={e => setForm(f => ({ ...f, amount_paid: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Next Payment Due</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.next_payment_due ?? ''}
            onChange={e => setForm(f => ({ ...f, next_payment_due: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
          <textarea
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Contract notes, special requirements..."
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save Vendor'}</Button>
      </div>
    </form>
  );
}

export const VendorsTab: React.FC<Props> = ({ vendors, onAdd, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingVendor, setEditingVendor] = useState<PlanningVendor | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const totalBalance = vendors.reduce((s, v) => s + (v.balance_due || 0), 0);

  return (
    <div className="space-y-4">
      {totalBalance > 0 && (
        <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border-subtle">
          <span className="text-sm text-text-secondary">Total vendor balance due</span>
          <span className="font-bold text-text-primary">{fmt(totalBalance)}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Vendor
        </Button>
      </div>

      {showAdd && (
        <VendorForm
          onSave={async (v) => { await onAdd(v); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {vendors.length === 0 && !showAdd ? (
        <Card padding="lg" className="text-center">
          <p className="text-text-secondary mb-1">No vendors yet.</p>
          <p className="text-sm text-text-tertiary">Keep all your vendor contacts and payment details in one place.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {vendors.map(vendor => {
            const isExpanded = expandedId === vendor.id;
            const isDueSoon = vendor.next_payment_due && vendor.balance_due > 0 && new Date(vendor.next_payment_due) <= in7Days;
            const balancePct = vendor.contract_total > 0 ? (vendor.amount_paid / vendor.contract_total) * 100 : 0;

            return (
              <div key={vendor.id}>
                {editingVendor?.id === vendor.id ? (
                  <VendorForm
                    initial={editingVendor}
                    onSave={async (u) => { await onUpdate(vendor.id, u); setEditingVendor(null); }}
                    onCancel={() => setEditingVendor(null)}
                  />
                ) : (
                  <Card padding="sm" className={isDueSoon ? 'border-warning/40' : ''}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">{vendor.name}</p>
                          <Badge variant="neutral">{vendor.vendor_type}</Badge>
                          {isDueSoon && <Badge variant="warning">Payment due soon</Badge>}
                        </div>
                        {vendor.contact_name && (
                          <p className="text-xs text-text-tertiary mt-0.5">{vendor.contact_name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                              <span>Paid {fmt(vendor.amount_paid)} of {fmt(vendor.contract_total)}</span>
                              <span className={vendor.balance_due > 0 ? 'text-warning font-medium' : 'text-success'}>
                                {vendor.balance_due > 0 ? `${fmt(vendor.balance_due)} due` : 'Paid in full'}
                              </span>
                            </div>
                            <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, balancePct)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : vendor.id)}
                          className="p-1.5 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingVendor(vendor)} className="p-1.5 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(vendor.id)} className="p-1.5 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                        <div className="flex flex-wrap gap-3">
                          {vendor.email && (
                            <a href={`mailto:${vendor.email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Mail className="w-3.5 h-3.5" />{vendor.email}
                            </a>
                          )}
                          {vendor.phone && (
                            <a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Phone className="w-3.5 h-3.5" />{vendor.phone}
                            </a>
                          )}
                          {vendor.website && (
                            <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Globe className="w-3.5 h-3.5" />Website
                            </a>
                          )}
                        </div>
                        {vendor.next_payment_due && (
                          <p className="text-xs text-text-secondary">
                            Next payment: <span className={`font-medium ${isDueSoon ? 'text-warning' : 'text-text-primary'}`}>
                              {new Date(vendor.next_payment_due).toLocaleDateString()}
                            </span>
                          </p>
                        )}
                        {vendor.notes && (
                          <p className="text-xs text-text-tertiary">{vendor.notes}</p>
                        )}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

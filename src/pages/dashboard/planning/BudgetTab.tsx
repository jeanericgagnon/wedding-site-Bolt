import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Sparkles, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { PlanningBudgetItem, PlanningVendor } from './planningService';
import { buildBudgetQuickCheck } from '../../../lib/invisibleIntelligence';
import { budgetVendorLedgerToCsv, buildBudgetPaymentReview, buildBudgetVendorLedgerReadiness, buildBudgetVendorReconciliation } from '../../../lib/budgetVendorLedgerReadiness';
import { downloadTextFile } from '../../../lib/copyText';
import type { VendorMetaMap } from './vendorMetaStorage';

interface Props {
  items: PlanningBudgetItem[];
  vendors: PlanningVendor[];
  vendorMeta?: VendorMetaMap;
  totalBudget: number;
  onTotalBudgetChange: (value: number) => Promise<void>;
  onAdd: (item: Partial<PlanningBudgetItem>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PlanningBudgetItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canEdit?: boolean;
}

interface BudgetFormProps {
  initial?: Partial<PlanningBudgetItem>;
  vendors: PlanningVendor[];
  onSave: (item: Partial<PlanningBudgetItem>) => Promise<void>;
  onCancel: () => void;
}

const BUDGET_CATEGORIES = [
  'Venue', 'Catering', 'Photography', 'Videography', 'Florals & Decor',
  'Music & Entertainment', 'Attire & Beauty', 'Transportation', 'Stationery',
  'Rings & Jewelry', 'Honeymoon', 'Officiant', 'Miscellaneous',
];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case 'overdue': return 'Overdue';
    case 'due-soon': return 'Due soon';
    case 'paid': return 'Paid';
    default: return 'Open';
  }
}

function BudgetForm({ initial, vendors, onSave, onCancel }: BudgetFormProps) {
  const { toast } = useToast();
  const fieldId = (name: string) => `budget-form-${name}`;
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
    try {
      await onSave({
        ...form,
        due_date: form.due_date || null,
        vendor_id: form.vendor_id || null,
        estimated_amount: Number(form.estimated_amount),
        actual_amount: Number(form.actual_amount),
        paid_amount: Number(form.paid_amount),
      });
    } catch {
      toast('Couldn’t save that budget item right now.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[20px] border border-border-subtle bg-surface-subtle p-4 shadow-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={fieldId('category')} className="block text-xs font-medium text-text-secondary mb-1">Category *</label>
          <select
            id={fieldId('category')}
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            required
          >
            <option value="">Select category</option>
            {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={fieldId('item-name')} className="block text-xs font-medium text-text-secondary mb-1">Item Name *</label>
          <input
            id={fieldId('item-name')}
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.item_name}
            onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
            placeholder="e.g. Venue deposit"
            required
          />
        </div>
        <div>
          <label htmlFor={fieldId('estimated')} className="block text-xs font-medium text-text-secondary mb-1">Estimated ($)</label>
          <input
            id={fieldId('estimated')}
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.estimated_amount}
            onChange={e => setForm(f => ({ ...f, estimated_amount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label htmlFor={fieldId('actual')} className="block text-xs font-medium text-text-secondary mb-1">Actual ($)</label>
          <input
            id={fieldId('actual')}
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.actual_amount}
            onChange={e => setForm(f => ({ ...f, actual_amount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label htmlFor={fieldId('paid')} className="block text-xs font-medium text-text-secondary mb-1">Paid ($)</label>
          <input
            id={fieldId('paid')}
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.paid_amount}
            onChange={e => setForm(f => ({ ...f, paid_amount: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label htmlFor={fieldId('due-date')} className="block text-xs font-medium text-text-secondary mb-1">Payment Due</label>
          <input
            id={fieldId('due-date')}
            type="date"
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.due_date ?? ''}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </div>
        {vendors.length > 0 && (
          <div>
            <label htmlFor={fieldId('vendor')} className="block text-xs font-medium text-text-secondary mb-1">Vendor</label>
            <select
              id={fieldId('vendor')}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.vendor_id}
              onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}
            >
              <option value="">None</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor={fieldId('notes')} className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
          <input
            id={fieldId('notes')}
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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

export const BudgetTab: React.FC<Props> = ({ items, vendors, vendorMeta = {}, totalBudget, onTotalBudgetChange, onAdd, onUpdate, onDelete, canEdit = true }) => {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanningBudgetItem | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'sheet'>('cards');
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const [budgetInput, setBudgetInput] = useState<number>(totalBudget || 0);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetSavedAt, setBudgetSavedAt] = useState<number | null>(null);
  const budgetAutoSaveTimer = useRef<number | null>(null);
  const latestBudgetInputRef = useRef<number>(totalBudget || 0);
  const latestBudgetSaveRequestRef = useRef(0);
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;

  useEffect(() => {
    setBudgetInput(totalBudget || 0);
    latestBudgetInputRef.current = totalBudget || 0;
  }, [totalBudget]);

  useEffect(() => {
    if (!canEdit) {
      if (budgetAutoSaveTimer.current) window.clearTimeout(budgetAutoSaveTimer.current);
      latestBudgetSaveRequestRef.current += 1;
      setBudgetSaving(false);
      return;
    }
    if (budgetInput === (totalBudget || 0)) return;

    latestBudgetInputRef.current = budgetInput;
    if (budgetAutoSaveTimer.current) window.clearTimeout(budgetAutoSaveTimer.current);
    budgetAutoSaveTimer.current = window.setTimeout(async () => {
      const saveRequestId = latestBudgetSaveRequestRef.current + 1;
      latestBudgetSaveRequestRef.current = saveRequestId;
      const pendingBudgetValue = budgetInput;
      setBudgetSaving(true);
      try {
        if (!canEditRef.current) return;
        await onTotalBudgetChange(pendingBudgetValue);
        if (canEditRef.current && latestBudgetInputRef.current === pendingBudgetValue) {
          setBudgetSavedAt(Date.now());
        }
      } catch {
        if (canEditRef.current && latestBudgetInputRef.current === pendingBudgetValue) {
          setBudgetSavedAt(null);
        }
        if (canEditRef.current && latestBudgetSaveRequestRef.current === saveRequestId) {
          toast('Couldn’t save the budget goal right now.', 'error');
        }
      } finally {
        if (canEditRef.current && latestBudgetSaveRequestRef.current === saveRequestId) {
          setBudgetSaving(false);
        }
      }
    }, 700);

    return () => {
      if (budgetAutoSaveTimer.current) window.clearTimeout(budgetAutoSaveTimer.current);
    };
  }, [budgetInput, canEdit, totalBudget, onTotalBudgetChange, toast]);

  useEffect(() => {
    if (canEdit) return;
    setShowAdd(false);
    setEditingItem(null);
    setPendingDeleteIds(new Set());
  }, [canEdit]);

  const totalEstimated = items.reduce((s, i) => s + (i.estimated_amount || 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_amount || 0), 0);
  const totalPaid = items.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const remaining = (totalBudget || 0) - totalActual;
  const usedPct = totalBudget > 0 ? Math.min(100, Math.max(0, (totalActual / totalBudget) * 100)) : 0;

  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  const overBudgetCategories = categories.filter(cat => {
    const est = items.filter(i => i.category === cat).reduce((s, i) => s + i.estimated_amount, 0);
    const act = items.filter(i => i.category === cat).reduce((s, i) => s + i.actual_amount, 0);
    return act > est && est > 0;
  });
  const quickChecks = buildBudgetQuickCheck({
    totalBudget,
    estimated: totalEstimated,
    actual: totalActual,
    paid: totalPaid,
    categoryCount: categories.length,
  });
  const ledgerReadiness = buildBudgetVendorLedgerReadiness({
    budgetItems: items,
    vendors,
    totalBudget,
  });
  const paymentReview = buildBudgetPaymentReview({
    budgetItems: items,
    vendors,
  });
  const reconciliation = buildBudgetVendorReconciliation({
    budgetItems: items,
    vendors,
    vendorMeta,
  });
  const ledgerTone = ledgerReadiness.status === 'ready'
    ? 'border-success/25 bg-success/5'
    : ledgerReadiness.status === 'needs-review'
      ? 'border-primary/25 bg-primary/5'
      : 'border-border-subtle bg-surface';

  function exportLedgerCsv() {
    const csv = budgetVendorLedgerToCsv({ budgetItems: items, vendors, vendorMeta });
    downloadTextFile(
      `dayof-budget-vendor-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  }

  async function handleDeleteItem(itemId: string) {
    if (!canEditRef.current || pendingDeleteIds.has(itemId)) return;

    setPendingDeleteIds((current) => new Set(current).add(itemId));
    try {
      if (!canEditRef.current) return;
      await onDelete(itemId);
    } catch {
      if (!canEditRef.current) return;
      toast('Couldn’t delete that budget item right now.', 'error');
    } finally {
      if (canEditRef.current) {
        setPendingDeleteIds((current) => {
          const next = new Set(current);
          next.delete(itemId);
          return next;
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Card padding="sm" className="rounded-[20px] border-border-subtle bg-surface-subtle shadow-none">
          <p className="text-sm font-semibold text-text-primary">Owner and planner financial details</p>
          <p className="mt-1 text-sm text-text-secondary">
            Budget readback stays visible here for planning review. Editing is turned off in this role, and guest-facing surfaces do not expose these financial details.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Budget goal', value: totalBudget || 0, color: 'text-text-primary', format: 'currency' },
          { label: 'Estimated', value: totalEstimated, color: 'text-text-primary', format: 'currency' },
          { label: 'Actual', value: totalActual, color: 'text-text-primary', format: 'currency' },
          { label: 'Remaining', value: remaining, color: remaining < 0 ? 'text-text-primary' : 'text-success', format: 'currency' },
        ].map(stat => (
          <Card key={stat.label} padding="sm" className="rounded-[20px] shadow-none">
            <p className="text-xs text-text-tertiary mb-0.5">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.format === 'currency' ? fmt(stat.value) : stat.value}</p>
          </Card>
        ))}
      </div>

      <Card padding="sm" className="space-y-2 rounded-[20px] shadow-none">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Spent so far</span>
          <span>{usedPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-xl bg-surface-subtle">
          <div
            className={`h-full rounded-xl ${usedPct >= 100 ? 'bg-text-secondary' : usedPct >= 80 ? 'bg-primary' : 'bg-success'}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </Card>

      {overBudgetCategories.length > 0 && (
        <div className="flex items-start gap-2 rounded-[20px] border border-border-subtle bg-white p-3 text-sm shadow-none">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <span className="text-text-primary">
            Worth a second look: <span className="font-medium text-text-primary">{overBudgetCategories.join(', ')}</span>
          </span>
        </div>
      )}

      {quickChecks.length > 0 && (
        <Card padding="sm" className="space-y-2 rounded-[20px] border-primary/20 bg-primary-light/40 shadow-none">
          <p className="text-sm font-semibold text-text-primary">Quick check</p>
          {quickChecks.map((check) => (
            <p key={check.id} className="text-sm leading-5 text-text-secondary">{check.detail}</p>
          ))}
        </Card>
      )}

      <div className={`rounded-[20px] border p-4 shadow-none ${ledgerTone}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {ledgerReadiness.status === 'ready' ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-primary" />
              )}
              <p className="text-sm font-semibold text-text-primary">Budget and vendor ledger</p>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{ledgerReadiness.summary}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
              <p className="text-lg font-semibold text-text-primary">{ledgerReadiness.vendorCount}</p>
              <p className="text-[11px] text-text-tertiary">Vendors</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
              <p className="text-lg font-semibold text-text-primary">{fmt(ledgerReadiness.openBalance)}</p>
              <p className="text-[11px] text-text-tertiary">Open</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
              <p className="text-lg font-semibold text-text-primary">{ledgerReadiness.dueSoonCount}</p>
              <p className="text-[11px] text-text-tertiary">Due soon</p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {ledgerReadiness.checklist.map((item) => {
            const iconClass = item.state === 'ready'
              ? 'text-success'
              : item.state === 'needs-action'
                ? 'text-primary'
                : 'text-text-tertiary';
            return (
              <div key={item.id} className="flex gap-2 rounded-xl border border-border-subtle bg-surface px-3 py-2">
                {item.state === 'ready' ? (
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClass}`} />
                ) : (
                  <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconClass}`} />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-secondary">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card padding="sm" className="space-y-3 rounded-[20px] shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Payment review</p>
            <p className="mt-1 text-xs text-text-secondary">{paymentReview.summary}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[300px]">
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{fmt(paymentReview.openTotal)}</p>
              <p className="text-[11px] text-text-tertiary">Open</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{paymentReview.overdueCount}</p>
              <p className="text-[11px] text-text-tertiary">Overdue</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{paymentReview.dueSoonCount}</p>
              <p className="text-[11px] text-text-tertiary">Due soon</p>
            </div>
          </div>
        </div>
        {paymentReview.rows.length > 0 ? (
          <div className="space-y-2">
            {paymentReview.rows.slice(0, 4).map((row) => (
              <div key={row.id} className="grid gap-2 rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-xs sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary truncate">{row.name}</p>
                  <p className="text-text-tertiary truncate">{row.vendorName || (row.source === 'budget' ? 'Budget line' : 'Vendor')}</p>
                </div>
                <p className="text-text-secondary">{row.dueDate || 'No date'}</p>
                <p className="font-medium text-text-primary">{fmt(row.open)}</p>
                <div className="flex items-center gap-2 sm:justify-end">
                  <span className="rounded-xl border border-border-subtle bg-surface px-2 py-0.5 text-[11px] text-text-secondary">{paymentStatusLabel(row.status)}</span>
                  {!row.hasContact && <span className="text-[11px] text-primary">Contact</span>}
                  {!row.hasDocument && <span className="text-[11px] text-primary">Doc</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-secondary">Add vendor contracts or budget payment rows to review reminders.</p>
        )}
        <p className="text-[11px] text-text-tertiary">{paymentReview.privacyNote}</p>
      </Card>

      <Card padding="sm" className="space-y-3 rounded-[20px] shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Vendor balance reconciliation</p>
            <p className="mt-1 text-xs text-text-secondary">{reconciliation.summary}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:min-w-[420px] lg:grid-cols-5">
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{reconciliation.mismatchedCount}</p>
              <p className="text-[11px] text-text-tertiary">Need review</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{reconciliation.contactReadyCount}/{vendors.length}</p>
              <p className="text-[11px] text-text-tertiary">Contact ready</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{reconciliation.dueDateReadyCount}/{vendors.length}</p>
              <p className="text-[11px] text-text-tertiary">Due dates saved</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{reconciliation.fileReadyCount}/{vendors.length}</p>
              <p className="text-[11px] text-text-tertiary">Files saved</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-2">
              <p className="text-sm font-semibold text-text-primary">{reconciliation.milestoneReadyCount}/{vendors.length}</p>
              <p className="text-[11px] text-text-tertiary">Milestones</p>
            </div>
          </div>
        </div>
        {reconciliation.rows.length > 0 ? (
          <div className="space-y-2">
            {reconciliation.rows.slice(0, 4).map((row) => (
              <div key={row.vendorId} className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text-primary">{row.vendorName}</p>
                  <p className="text-[11px] text-text-tertiary">{fmt(row.contractTotal)} contract</p>
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">
                  Linked budget {fmt(row.linkedActualTotal || row.linkedEstimatedTotal)} · paid {fmt(row.vendorPaid)} vs {fmt(row.linkedPaidTotal)} in budget
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.issues.length > 0 ? row.issues.map((issue) => (
                    <span key={issue} className="rounded-xl border border-border-subtle bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
                      {issue}
                    </span>
                  )) : (
                    <span className="rounded-xl border border-success/20 bg-success/5 px-2 py-0.5 text-[11px] text-success">
                      Totals, files, and milestones are lined up
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
            Add vendors before reviewing contract and payment-schedule continuity.
          </p>
        )}
      </Card>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Budget goal</label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-40 px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              value={budgetInput}
              onChange={(e) => {
                setBudgetSavedAt(null);
                const nextBudgetInput = Number(e.target.value) || 0;
                latestBudgetInputRef.current = nextBudgetInput;
                setBudgetInput(nextBudgetInput);
              }}
              disabled={!canEdit}
            />
            <p className="mt-1 text-[11px] text-text-tertiary">
              {!canEdit
                ? 'Read only in this role'
                : budgetSaving
                ? 'Saving…'
                : budgetSavedAt
                ? `Saved ${new Date(budgetSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Saves automatically'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-xl text-xs border ${viewMode === 'cards' ? 'bg-surface border-border text-text-primary' : 'bg-surface-subtle border-border-subtle text-text-secondary'}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('sheet')}
            className={`px-3 py-1.5 rounded-xl text-xs border ${viewMode === 'sheet' ? 'bg-surface border-border text-text-primary' : 'bg-surface-subtle border-border-subtle text-text-secondary'}`}
          >
            Table
          </button>
          <Button size="sm" variant="outline" onClick={exportLedgerCsv}>
            <Download className="w-4 h-4 mr-1" /> Export ledger
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={!canEdit}>
            <Plus className="w-4 h-4 mr-1" /> Add expense
          </Button>
        </div>
      </div>

      {showAdd && (
        <BudgetForm
          vendors={vendors}
          onSave={async (item) => {
            if (!canEdit) return;
            await onAdd(item);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {items.length === 0 && !showAdd ? (
        <Card padding="lg" className="rounded-[20px] text-center shadow-none">
          <p className="text-text-secondary mb-1">No budget items yet.</p>
          <p className="text-sm text-text-tertiary">Keep all your wedding costs in one place.</p>
        </Card>
      ) : viewMode === 'sheet' ? (
        <Card variant="bordered" padding="none" className="overflow-auto rounded-[20px] shadow-none">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-surface-subtle text-text-secondary">
              <tr>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-right px-3 py-2">Estimated</th>
                <th className="text-right px-3 py-2">Actual</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Edit</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-border-subtle">
                  <td className="px-3 py-2">{item.category}</td>
                  <td className="px-3 py-2">{item.item_name}</td>
                  <td className="px-3 py-2 text-right">{fmt(item.estimated_amount)}</td>
                  <td className={`px-3 py-2 text-right ${item.actual_amount > item.estimated_amount && item.estimated_amount > 0 ? 'text-text-primary font-medium' : ''}`}>{fmt(item.actual_amount)}</td>
                  <td className="px-3 py-2 text-right text-success">{fmt(item.paid_amount)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button aria-label={`Edit budget item ${item.item_name}`} onClick={() => canEdit && !pendingDeleteIds.has(item.id) && setEditingItem(item)} disabled={!canEdit || pendingDeleteIds.has(item.id)} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-40">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button aria-label={`Delete budget item ${item.item_name}`} onClick={() => canEdit && !pendingDeleteIds.has(item.id) && void handleDeleteItem(item.id)} disabled={!canEdit || pendingDeleteIds.has(item.id)} className="p-1 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="space-y-7">
          {categories.map(cat => {
            const catItems = items.filter(i => i.category === cat);
            const catEst = catItems.reduce((s, i) => s + i.estimated_amount, 0);
            const catAct = catItems.reduce((s, i) => s + i.actual_amount, 0);
            const isOverBudget = catAct > catEst && catEst > 0;
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {cat}
                    {isOverBudget && <span className="ml-2 rounded-xl border border-primary/20 bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">Worth checking</span>}
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
                          onSave={async (u) => {
                            if (!canEdit) return;
                            await onUpdate(item.id, u);
                            setEditingItem(null);
                          }}
                          onCancel={() => setEditingItem(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 py-2.5 transition-colors hover:border-primary/25">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{item.item_name}</p>
                            {item.notes && <p className="text-xs text-text-tertiary truncate">{item.notes}</p>}
                          </div>
                          <div className="flex gap-4 text-sm flex-shrink-0">
                            <span className="text-text-tertiary hidden sm:block">{fmt(item.estimated_amount)}</span>
                            <span className={item.actual_amount > item.estimated_amount && item.estimated_amount > 0 ? 'text-text-primary font-medium' : 'text-text-primary'}>{fmt(item.actual_amount)}</span>
                            <span className="text-success hidden sm:block">{fmt(item.paid_amount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button aria-label={`Edit budget item ${item.item_name}`} onClick={() => canEdit && !pendingDeleteIds.has(item.id) && setEditingItem(item)} disabled={!canEdit || pendingDeleteIds.has(item.id)} className="p-1 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-40">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button aria-label={`Delete budget item ${item.item_name}`} onClick={() => canEdit && !pendingDeleteIds.has(item.id) && void handleDeleteItem(item.id)} disabled={!canEdit || pendingDeleteIds.has(item.id)} className="p-1 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors disabled:opacity-40">
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

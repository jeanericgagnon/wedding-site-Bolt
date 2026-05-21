import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, Globe, FileText, ChevronDown, ChevronUp, Copy, Download, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { PlanningVendor } from './planningService';
import { formatVendorDate, isVendorDateOnOrBefore } from './vendorDate';
import { buildVendorReminderLedgerSummary, formatVendorReminderChannel, formatVendorReminderLeadDays } from './vendorReminderLedger';
import type { VendorContractFileEntry, VendorMetaMap, VendorPaymentMilestoneEntry } from './vendorMetaStorage';
import { copyTextOrDownload, downloadTextFile } from '../../../lib/copyText';
import { getSafePublicEmailHref, getSafePublicTelHref, getSafePublicWebUrl } from '../../../sections/publicLinks';
import { isVendorProfileCreationEnabled } from '../../../lib/vendorProfileLaunch';

interface Props {
  vendorMeta: VendorMetaMap;
  vendors: PlanningVendor[];
  onAdd: (v: Partial<PlanningVendor>) => Promise<void>;
  onSaveVendorMeta: (meta: VendorMetaMap) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PlanningVendor>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canEdit?: boolean;
}

interface VendorFormProps {
  initial?: Partial<PlanningVendor>;
  onSave: (v: Partial<PlanningVendor>) => Promise<void>;
  onCancel: () => void;
}

interface VendorRatingProps {
  rating?: number | null;
}

const VENDOR_TYPES = [
  'Venue', 'Photographer', 'Videographer', 'Caterer', 'Florist',
  'DJ', 'Band', 'Officiant', 'Hair & Makeup', 'Transportation',
  'Baker', 'Planner', 'Stationery', 'Other',
];

const VENDOR_RATING_STATUSES = ['Researching', 'Reached out', 'Proposal received', 'Shortlist', 'Booked', 'Passed'];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function nextVendorFileEntries(patch: VendorContractFileEntry[]): VendorContractFileEntry[] | undefined {
  const next = patch
    .map((entry, index) => ({
      id: entry.id || `file-${index + 1}`,
      kind: entry.kind || 'contract',
      label: entry.label?.trim() ?? '',
      url: entry.url?.trim() ?? '',
    }))
    .filter((entry) => entry.label || entry.url)
    .slice(0, 8);
  return next.length > 0 ? next : undefined;
}

function nextVendorMilestoneEntries(patch: VendorPaymentMilestoneEntry[]): VendorPaymentMilestoneEntry[] | undefined {
  const next = patch
    .map((entry, index) => ({
      id: entry.id || `milestone-${index + 1}`,
      label: entry.label?.trim() ?? '',
      amount: Number.isFinite(Number(entry.amount)) ? Math.max(0, Number(entry.amount)) : undefined,
      dueDate: entry.dueDate?.trim() ? entry.dueDate.trim().slice(0, 10) : undefined,
      status: entry.status || 'todo',
    }))
    .filter((entry) => entry.label || entry.amount || entry.dueDate)
    .slice(0, 8);
  return next.length > 0 ? next : undefined;
}

function vendorProfileCreateUrl(vendor: Partial<PlanningVendor>) {
  const params = new URLSearchParams();
  if (vendor.name) params.set('vendorName', vendor.name);
  if (vendor.website) params.set('websiteUrl', vendor.website);
  if (vendor.email) params.set('contactEmail', vendor.email);
  return `/vendor-profile-v1${params.toString() ? `?${params.toString()}` : ''}`;
}

function clampVendorRating(value: unknown): number | null {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return Math.max(1, Math.min(5, Math.round(rating)));
}

function getVendorStage(vendor: PlanningVendor, compareDate: Date): 'due-soon' | 'open-balance' | 'paid' {
  const dueSoon = Boolean(vendor.balance_due > 0 && isVendorDateOnOrBefore(vendor.next_payment_due, compareDate));
  if (dueSoon) return 'due-soon';
  if ((vendor.balance_due || 0) > 0) return 'open-balance';
  return 'paid';
}

function buildVendorExportRow(vendor: PlanningVendor, meta: VendorMetaMap[string] | undefined) {
  return [
    vendor.name,
    vendor.vendor_type,
    vendor.contact_name,
    vendor.email,
    vendor.phone,
    vendor.website,
    vendor.internal_rating ? String(vendor.internal_rating) : '',
    vendor.rating_status ?? '',
    vendor.rating_notes ?? '',
    String(vendor.contract_total || 0),
    String(vendor.amount_paid || 0),
    String(vendor.balance_due || 0),
    vendor.next_payment_due ?? '',
    meta?.nextFollowUp ?? '',
    formatVendorReminderChannel(meta?.reminderChannel),
    formatVendorReminderLeadDays(meta?.reminderLeadDays),
    meta?.reminderLastQueuedAt ?? '',
    vendor.document_label ?? '',
    vendor.document_url ?? '',
    (meta?.contractFiles ?? []).map((file) => `${file.kind}: ${file.label || file.url}`).join(' | '),
    (meta?.paymentMilestones ?? []).map((milestone) => [
      milestone.label,
      milestone.dueDate,
      milestone.amount ? fmt(milestone.amount) : null,
      milestone.status,
    ].filter(Boolean).join(' / ')).join(' | '),
  ];
}

const VendorRating: React.FC<VendorRatingProps> = ({ rating }) => {
  const safeRating = clampVendorRating(rating) ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={safeRating > 0 ? `${safeRating} out of 5 internal rating` : 'No internal rating yet'}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-3.5 w-3.5 ${value <= safeRating ? 'fill-warning text-warning' : 'text-text-tertiary'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
};

function VendorForm({ initial, onSave, onCancel }: VendorFormProps) {
  const { toast } = useToast();
  const fieldId = (name: string) => `vendor-form-${name}`;
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
    document_label: initial?.document_label ?? '',
    document_url: initial?.document_url ?? '',
    notes: initial?.notes ?? '',
    internal_rating: initial?.internal_rating ?? 0,
    rating_status: initial?.rating_status ?? 'Researching',
    rating_notes: initial?.rating_notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        contract_total: Number(form.contract_total),
        amount_paid: Number(form.amount_paid),
        next_payment_due: form.next_payment_due || null,
        document_label: form.document_label || null,
        document_url: form.document_url || null,
        internal_rating: clampVendorRating(form.internal_rating),
        rating_status: form.rating_status || null,
        rating_notes: form.rating_notes || null,
      });
    } catch {
      toast('Couldn’t save that vendor right now.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[20px] border border-border-subtle bg-surface-subtle p-4 shadow-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={fieldId('type')} className="block text-xs font-medium text-text-secondary mb-1">Type *</label>
          <select
            id={fieldId('type')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.vendor_type}
            onChange={e => setForm(f => ({ ...f, vendor_type: e.target.value }))}
            required
          >
            <option value="">Select type</option>
            {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={fieldId('business-name')} className="block text-xs font-medium text-text-secondary mb-1">Business Name *</label>
          <input
            id={fieldId('business-name')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Vendor business name"
            required
          />
        </div>
        <div>
          <label htmlFor={fieldId('contact-name')} className="block text-xs font-medium text-text-secondary mb-1">Contact Name</label>
          <input
            id={fieldId('contact-name')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.contact_name}
            onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            placeholder="Primary contact"
          />
        </div>
        <div>
          <label htmlFor={fieldId('email')} className="block text-xs font-medium text-text-secondary mb-1">Email</label>
          <input
            id={fieldId('email')}
            type="email"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="vendor@email.com"
          />
        </div>
        <div>
          <label htmlFor={fieldId('phone')} className="block text-xs font-medium text-text-secondary mb-1">Phone</label>
          <input
            id={fieldId('phone')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="(555) 000-0000"
          />
        </div>
        <div>
          <label htmlFor={fieldId('website')} className="block text-xs font-medium text-text-secondary mb-1">Website</label>
          <input
            id={fieldId('website')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://vendor.com"
          />
        </div>
        <div>
          <label htmlFor={fieldId('contract-total')} className="block text-xs font-medium text-text-secondary mb-1">Contract Total ($)</label>
          <input
            id={fieldId('contract-total')}
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.contract_total}
            onChange={e => setForm(f => ({ ...f, contract_total: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label htmlFor={fieldId('amount-paid')} className="block text-xs font-medium text-text-secondary mb-1">Amount Paid ($)</label>
          <input
            id={fieldId('amount-paid')}
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.amount_paid}
            onChange={e => setForm(f => ({ ...f, amount_paid: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label htmlFor={fieldId('next-payment-due')} className="block text-xs font-medium text-text-secondary mb-1">Next Payment Due</label>
          <input
            id={fieldId('next-payment-due')}
            type="date"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.next_payment_due ?? ''}
            onChange={e => setForm(f => ({ ...f, next_payment_due: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor={fieldId('document-label')} className="block text-xs font-medium text-text-secondary mb-1">Document Label</label>
          <input
            id={fieldId('document-label')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.document_label}
            onChange={e => setForm(f => ({ ...f, document_label: e.target.value }))}
            placeholder="Contract, invoice, proposal"
          />
        </div>
        <div>
          <label htmlFor={fieldId('document-link')} className="block text-xs font-medium text-text-secondary mb-1">Document Link</label>
          <input
            id={fieldId('document-link')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.document_url}
            onChange={e => setForm(f => ({ ...f, document_url: e.target.value }))}
            placeholder="https://drive.google.com/..."
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={fieldId('notes')} className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
          <textarea
            id={fieldId('notes')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="Contract notes, special requirements..."
          />
        </div>
        <div>
          <label htmlFor={fieldId('internal-rating')} className="block text-xs font-medium text-text-secondary mb-1">Internal rating</label>
          <select
            id={fieldId('internal-rating')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.internal_rating}
            onChange={e => setForm(f => ({ ...f, internal_rating: Number(e.target.value) }))}
          >
            <option value={0}>Not rated</option>
            {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={fieldId('rating-status')} className="block text-xs font-medium text-text-secondary mb-1">Rating status</label>
          <select
            id={fieldId('rating-status')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.rating_status}
            onChange={e => setForm(f => ({ ...f, rating_status: e.target.value }))}
          >
            {VENDOR_RATING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={fieldId('rating-notes')} className="block text-xs font-medium text-text-secondary mb-1">Private rating notes</label>
          <textarea
            id={fieldId('rating-notes')}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            value={form.rating_notes}
            onChange={e => setForm(f => ({ ...f, rating_notes: e.target.value }))}
            rows={2}
            placeholder="Why they are a fit, concerns, package notes, response quality..."
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

export const VendorsTab: React.FC<Props> = ({ vendorMeta, vendors, onAdd, onSaveVendorMeta, onUpdate, onDelete, canEdit = true }) => {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingVendor, setEditingVendor] = useState<PlanningVendor | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [pendingVendorDeleteIds, setPendingVendorDeleteIds] = useState<Set<string>>(new Set());
  const [copyingVendorBrief, setCopyingVendorBrief] = useState(false);
  const [vendorBriefCopyNotice, setVendorBriefCopyNotice] = useState<'copied' | 'downloaded' | null>(null);
  const vendorBriefCopyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const canEditRef = useRef(canEdit);
  const vendorProfileCreationEnabled = isVendorProfileCreationEnabled();

  canEditRef.current = canEdit;

  useEffect(() => () => {
    mountedRef.current = false;
    vendorBriefCopyRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    if (canEdit) return;
    setShowAdd(false);
    setEditingVendor(null);
  }, [canEdit]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const totalBalance = vendors.reduce((s, v) => s + (v.balance_due || 0), 0);
  const documentedCount = vendors.filter((vendor) => Boolean(vendor.document_url)).length;
  const contactableCount = vendors.filter((vendor) => Boolean(vendor.email || vendor.phone)).length;
  const reminderSummary = useMemo(() => buildVendorReminderLedgerSummary({
    vendors,
    vendorMeta,
    compareDate: in7Days,
  }), [in7Days, vendorMeta, vendors]);
  const vendorBriefContextKey = useMemo(() => JSON.stringify(vendors.map((vendor) => [
    vendor.id,
    vendor.name,
    vendor.vendor_type,
    vendor.contact_name,
    vendor.email,
    vendor.phone,
    vendor.balance_due,
    vendor.next_payment_due,
    vendor.document_url,
    vendor.internal_rating,
    vendor.rating_status,
    vendor.rating_notes,
  ])), [vendors]);
  const vendorBriefContextKeyRef = useRef(vendorBriefContextKey);
  vendorBriefContextKeyRef.current = vendorBriefContextKey;

  useEffect(() => {
    vendorBriefCopyRequestIdRef.current += 1;
    setCopyingVendorBrief(false);
    setVendorBriefCopyNotice(null);
  }, [vendorBriefContextKey]);
  const followUpDueCount = reminderSummary.followUpDueCount;

  const saveVendorMetaEntry = async (vendorId: string, patch: Partial<VendorMetaMap[string]>) => {
    if (!canEditRef.current) return;
    const nextMeta = {
      ...vendorMeta,
      [vendorId]: {
        ...(vendorMeta[vendorId] ?? {}),
        ...patch,
      },
    };
    try {
      await onSaveVendorMeta(nextMeta);
    } catch {
      toast('Couldn’t save vendor follow-up details right now.', 'error');
    }
  };

  const saveVendorContractFiles = (vendorId: string, files: VendorContractFileEntry[]) => {
    void saveVendorMetaEntry(vendorId, { contractFiles: nextVendorFileEntries(files) });
  };

  const saveVendorPaymentMilestones = (vendorId: string, milestones: VendorPaymentMilestoneEntry[]) => {
    void saveVendorMetaEntry(vendorId, { paymentMilestones: nextVendorMilestoneEntries(milestones) });
  };

  const updateVendorContractFile = (
    vendorId: string,
    files: VendorContractFileEntry[],
    index: number,
    patch: Partial<VendorContractFileEntry>,
  ) => {
    saveVendorContractFiles(
      vendorId,
      files.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
    );
  };

  const removeVendorContractFile = (
    vendorId: string,
    files: VendorContractFileEntry[],
    index: number,
  ) => {
    saveVendorContractFiles(vendorId, files.filter((_, entryIndex) => entryIndex !== index));
  };

  const addVendorContractFile = (
    vendorId: string,
    files: VendorContractFileEntry[],
  ) => {
    saveVendorContractFiles(vendorId, [
      ...files,
      { id: `file-${Date.now()}`, kind: 'contract', label: '', url: '' },
    ]);
  };

  const updateVendorPaymentMilestone = (
    vendorId: string,
    milestones: VendorPaymentMilestoneEntry[],
    index: number,
    patch: Partial<VendorPaymentMilestoneEntry>,
  ) => {
    saveVendorPaymentMilestones(
      vendorId,
      milestones.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
    );
  };

  const removeVendorPaymentMilestone = (
    vendorId: string,
    milestones: VendorPaymentMilestoneEntry[],
    index: number,
  ) => {
    saveVendorPaymentMilestones(vendorId, milestones.filter((_, entryIndex) => entryIndex !== index));
  };

  const addVendorPaymentMilestone = (
    vendorId: string,
    milestones: VendorPaymentMilestoneEntry[],
  ) => {
    saveVendorPaymentMilestones(vendorId, [
      ...milestones,
      { id: `milestone-${Date.now()}`, label: '', dueDate: '', amount: undefined, status: 'todo' },
    ]);
  };

  async function handleVendorDelete(vendorId: string) {
    if (!canEditRef.current || pendingVendorDeleteIds.has(vendorId)) return;

    setPendingVendorDeleteIds((current) => new Set(current).add(vendorId));
    try {
      await onDelete(vendorId);
    } catch {
      toast('Couldn’t delete that vendor right now.', 'error');
    } finally {
      setPendingVendorDeleteIds((current) => {
        const next = new Set(current);
        next.delete(vendorId);
        return next;
      });
    }
  }

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      [v.name, v.vendor_type, v.contact_name, v.email, v.phone]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [vendors, search]);

  const pipelineGroups = {
    'due-soon': filteredVendors.filter((v) => getVendorStage(v, in7Days) === 'due-soon'),
    'open-balance': filteredVendors.filter((v) => getVendorStage(v, in7Days) === 'open-balance'),
    paid: filteredVendors.filter((v) => getVendorStage(v, in7Days) === 'paid'),
  };

  async function copyVendorBrief() {
    if (copyingVendorBrief) return;

    const requestId = vendorBriefCopyRequestIdRef.current + 1;
    vendorBriefCopyRequestIdRef.current = requestId;
    const requestContextKey = vendorBriefContextKeyRef.current;
    const isCurrentVendorBriefCopy = () => (
      mountedRef.current &&
      requestId === vendorBriefCopyRequestIdRef.current &&
      requestContextKey === vendorBriefContextKeyRef.current
    );

    setCopyingVendorBrief(true);
    setVendorBriefCopyNotice(null);
    const text = vendors.map((vendor) => [
      vendor.name,
      vendor.vendor_type ? `Type: ${vendor.vendor_type}` : null,
      vendor.contact_name ? `Contact: ${vendor.contact_name}` : null,
      vendor.email ? `Email: ${vendor.email}` : null,
      vendor.phone ? `Phone: ${vendor.phone}` : null,
      `Balance: ${fmt(vendor.balance_due || 0)}`,
      vendor.next_payment_due ? `Next due: ${formatVendorDate(vendor.next_payment_due)}` : null,
      vendor.document_url ? `Document: ${vendor.document_url}` : 'Document: missing',
      vendor.internal_rating ? `Internal rating: ${vendor.internal_rating}/5` : 'Internal rating: not rated',
      vendor.rating_status ? `Status: ${vendor.rating_status}` : null,
      vendor.rating_notes ? `Private rating notes: ${vendor.rating_notes}` : null,
    ].filter(Boolean).join('\n')).join('\n\n');
    try {
      const result = await copyTextOrDownload(text || 'No vendors yet.', 'dayof-vendor-brief.txt');
      if (!isCurrentVendorBriefCopy()) return;
      setVendorBriefCopyNotice(result);
      toast(result === 'copied' ? 'Vendor brief copied.' : 'Clipboard was blocked, so the vendor brief downloaded.', 'success');
    } catch {
      if (!isCurrentVendorBriefCopy()) return;
      toast('Couldn’t copy the vendor brief right now.', 'error');
    } finally {
      if (isCurrentVendorBriefCopy()) {
        setCopyingVendorBrief(false);
      }
    }
  }

  function exportVendors() {
    const csvRows = [
      ['Name', 'Type', 'Contact', 'Email', 'Phone', 'Website', 'Internal rating', 'Rating status', 'Rating notes', 'Contract total', 'Paid', 'Balance', 'Next due', 'Next follow-up', 'Reminder channel', 'Reminder lead days', 'Last reminder queued', 'Document label', 'Document URL', 'Saved files', 'Payment milestones'],
      ...vendors.map((vendor) => {
        const meta = vendorMeta[vendor.id] ?? {};
        return buildVendorExportRow(vendor, meta);
      }),
    ];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    downloadTextFile(
      `dayof-vendors-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Card padding="sm" className="rounded-[20px] border-border-subtle bg-surface-subtle shadow-none">
          <p className="text-sm font-semibold text-text-primary">Owner and planner financial details</p>
          <p className="mt-1 text-sm text-text-secondary">
            Vendor balances, reminders, and contract notes stay visible for planning readback here. Editing is turned off in this role, and guest-facing pages do not expose vendor financial details.
          </p>
        </Card>
      )}

      {(vendors.length > 0 || totalBalance > 0 || followUpDueCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-white p-3 shadow-none transition-colors hover:border-primary/25">
            <span className="text-sm text-text-secondary">Still to pay vendors</span>
            <span className="font-bold text-text-primary">{fmt(totalBalance)}</span>
          </div>
          <div className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-white p-3 shadow-none">
            <span className="text-sm text-text-secondary">Follow-ups due (7d)</span>
            <span className="font-bold text-text-primary">{followUpDueCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-white p-3 shadow-none">
            <span className="text-sm text-text-secondary">Docs linked</span>
            <span className="font-bold text-text-primary">{documentedCount}/{vendors.length}</span>
          </div>
          <div className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-white p-3 shadow-none">
            <span className="text-sm text-text-secondary">Reachable</span>
            <span className="font-bold text-text-primary">{contactableCount}/{vendors.length}</span>
          </div>
          <div className="flex items-center justify-between rounded-[20px] border border-border-subtle bg-white p-3 shadow-none">
            <span className="text-sm text-text-secondary">Reminder-ready</span>
            <span className="font-bold text-text-primary">{reminderSummary.reminderReadyCount}/{vendors.length}</span>
          </div>
        </div>
      )}

      {vendors.length > 0 && (
        <Card padding="sm" className="space-y-1.5 rounded-[20px] shadow-none">
          <p className="text-sm font-semibold text-text-primary">Vendor reminder ledger</p>
          <p className="text-sm text-text-secondary">{reminderSummary.summary}</p>
          <p className="text-xs text-text-tertiary">
            {reminderSummary.queuedCount > 0
              ? `${reminderSummary.queuedCount} vendor reminder${reminderSummary.queuedCount === 1 ? '' : 's'} already have queued readback saved.`
              : 'Queue readback appears here after you prepare a reminder.'}
          </p>
        </Card>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your vendors"
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
          />
          <div className="inline-flex overflow-hidden rounded-xl border border-border">
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-1 text-xs ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`}>List</button>
            <button onClick={() => setViewMode('pipeline')} className={`px-2.5 py-1 text-xs border-l border-border ${viewMode === 'pipeline' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`}>Stages</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void copyVendorBrief()} disabled={copyingVendorBrief}>
            <Copy className="w-4 h-4 mr-1" />
            {copyingVendorBrief
              ? 'Copying brief...'
              : vendorBriefCopyNotice === 'downloaded'
                ? 'Downloaded brief'
                : vendorBriefCopyNotice === 'copied'
                  ? 'Copied brief'
                  : 'Copy brief'}
          </Button>
          <Button size="sm" variant="outline" onClick={exportVendors}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Link to="/vendor-templates" className="inline-flex items-center rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">
            Template lab
          </Link>
          {!canEdit && <p className="text-xs text-text-tertiary">Read-only role: editing is turned off here.</p>}
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={!canEdit}>
            <Plus className="w-4 h-4 mr-1" /> Add vendor
          </Button>
        </div>
      </div>

      {showAdd && (
        <VendorForm
          onSave={async (v) => {
            if (!canEditRef.current) return;
            await onAdd(v);
            if (canEditRef.current) setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {filteredVendors.length === 0 && !showAdd ? (
        <Card padding="lg" className="rounded-[20px] text-center shadow-none">
          <p className="text-text-secondary mb-1">No vendors yet.</p>
          <p className="text-sm text-text-tertiary">Try a different search or add your first vendor.</p>
        </Card>
      ) : viewMode === 'pipeline' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            ['due-soon', 'Due soon'],
            ['open-balance', 'Open balance'],
            ['paid', 'Paid'],
          ] as const).map(([key, label]) => (
            <div key={key} className="rounded-[20px] border border-border-subtle bg-white p-3 shadow-none">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-tertiary">{label}</p>
                <span className="text-xs text-text-secondary">{pipelineGroups[key].length}</span>
              </div>
              <div className="space-y-2">
                {pipelineGroups[key].slice(0, 8).map((vendor) => (
                  <div key={vendor.id} className="rounded-xl border border-border/35 bg-surface-subtle/40 px-2.5 py-2">
                    <p className="text-sm text-text-primary font-medium truncate">{vendor.name}</p>
                    <p className="text-[11px] text-text-tertiary">{vendor.vendor_type} · {fmt(vendor.balance_due || 0)} due</p>
                  </div>
                ))}
                {pipelineGroups[key].length === 0 && <p className="text-xs text-text-tertiary">Nothing here yet</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVendors.map(vendor => {
            const isExpanded = expandedId === vendor.id;
            const deletePending = pendingVendorDeleteIds.has(vendor.id);
            const isDueSoon = Boolean(vendor.balance_due > 0 && isVendorDateOnOrBefore(vendor.next_payment_due, in7Days));
            const balancePct = vendor.contract_total > 0 ? (vendor.amount_paid / vendor.contract_total) * 100 : 0;
            const meta = vendorMeta[vendor.id] ?? {};
            const safeEmailHref = getSafePublicEmailHref(vendor.email);
            const safePhoneHref = getSafePublicTelHref(vendor.phone);
            const safeWebsiteUrl = getSafePublicWebUrl(vendor.website);
            const safeDocumentUrl = getSafePublicWebUrl(vendor.document_url);
            const contractFiles = meta.contractFiles ?? [];
            const paymentMilestones = meta.paymentMilestones ?? [];

            return (
              <div key={vendor.id}>
                {editingVendor?.id === vendor.id ? (
                  <VendorForm
                    initial={editingVendor}
                    onSave={async (u) => {
                      if (!canEditRef.current) return;
                      await onUpdate(vendor.id, u);
                      if (canEditRef.current) setEditingVendor(null);
                    }}
                    onCancel={() => setEditingVendor(null)}
                  />
                ) : (
                  <Card padding="sm" className={`rounded-[20px] shadow-none ${isDueSoon ? 'border-warning/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">{vendor.name}</p>
                          <Badge variant="neutral">{vendor.vendor_type}</Badge>
                          {vendor.rating_status && <Badge variant="secondary">{vendor.rating_status}</Badge>}
                          {isDueSoon && <Badge variant="warning">Payment due soon</Badge>}
                          {!vendor.document_url && <Badge variant="warning">Doc missing</Badge>}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <VendorRating rating={vendor.internal_rating} />
                          <span className="text-[11px] text-text-tertiary">Internal only</span>
                        </div>
                        {vendor.contact_name && (
                          <p className="text-xs text-text-tertiary mt-0.5">{vendor.contact_name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                              <span>Paid {fmt(vendor.amount_paid)} of {fmt(vendor.contract_total)}</span>
                              <span className={vendor.balance_due > 0 ? 'text-warning font-medium' : 'text-success'}>
                                {vendor.balance_due > 0 ? `${fmt(vendor.balance_due)} left` : 'Paid in full'}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-xl bg-surface-subtle">
                              <div className="h-full rounded-xl bg-primary" style={{ width: `${Math.min(100, balancePct)}%` }} />
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
                        <button aria-label={`Edit vendor ${vendor.name}`} onClick={() => canEdit && !deletePending && setEditingVendor(vendor)} disabled={!canEdit || deletePending} className="p-1.5 hover:bg-surface-subtle rounded text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-40">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button aria-label={`Delete vendor ${vendor.name}`} onClick={() => canEdit && !deletePending && void handleVendorDelete(vendor.id)} disabled={!canEdit || deletePending} className="p-1.5 hover:bg-error/10 rounded text-text-tertiary hover:text-error transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                        <div className="flex flex-wrap gap-3">
                          {safeEmailHref && (
                            <a href={safeEmailHref} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Mail className="w-3.5 h-3.5" />{vendor.email}
                            </a>
                          )}
                          {safePhoneHref && (
                            <a href={safePhoneHref} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Phone className="w-3.5 h-3.5" />{vendor.phone}
                            </a>
                          )}
                          {safeWebsiteUrl && (
                            <a href={safeWebsiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Globe className="w-3.5 h-3.5" />Website
                            </a>
                          )}
                          {safeDocumentUrl && (
                            <a href={safeDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <FileText className="w-3.5 h-3.5" />{vendor.document_label || 'Document'}
                            </a>
                          )}
                          {vendorProfileCreationEnabled && (
                            <a href={vendorProfileCreateUrl(vendor)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Globe className="w-3.5 h-3.5" />Generate vendor page
                            </a>
                          )}
                        </div>
                        {vendor.next_payment_due && (
                          <p className="text-xs text-text-secondary">
                            Next payment: <span className={`font-medium ${isDueSoon ? 'text-warning' : 'text-text-primary'}`}>
                              {formatVendorDate(vendor.next_payment_due)}
                            </span>
                          </p>
                        )}
                        <div className="rounded-xl border border-border/35 bg-surface-subtle/40 px-2.5 py-2 space-y-1.5">
                          <p className="text-[11px] text-text-tertiary">Follow-up</p>
                          <p className="text-xs text-text-secondary">
                            Last contacted: {meta.lastContacted ? formatVendorDate(meta.lastContacted) : 'Not added yet'}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => canEdit && saveVendorMetaEntry(vendor.id, { lastContacted: new Date().toISOString() })}
                              disabled={!canEdit}
                              className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                            >
                              Mark as contacted
                            </button>
                            <input
                              type="date"
                              value={meta.nextFollowUp ? String(meta.nextFollowUp).slice(0, 10) : ''}
                              onChange={(e) => canEdit && saveVendorMetaEntry(vendor.id, { nextFollowUp: e.target.value || undefined })}
                              disabled={!canEdit}
                              className="text-[11px] rounded border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40"
                            />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="space-y-1 text-[11px] text-text-tertiary">
                              <span className="block">Reminder channel</span>
                              <select
                                value={meta.reminderChannel ?? 'none'}
                                onChange={(event) => canEdit && saveVendorMetaEntry(vendor.id, {
                                  reminderChannel: event.target.value as 'none' | 'email' | 'phone',
                                })}
                                disabled={!canEdit}
                              className="w-full rounded-xl border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40"
                              >
                                <option value="none">No reminder</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone</option>
                              </select>
                            </label>
                            <label className="space-y-1 text-[11px] text-text-tertiary">
                              <span className="block">Lead time</span>
                              <select
                                value={String(meta.reminderLeadDays ?? '')}
                                onChange={(event) => canEdit && saveVendorMetaEntry(vendor.id, {
                                  reminderLeadDays: event.target.value ? Number(event.target.value) as 1 | 3 | 7 | 14 : undefined,
                                })}
                                disabled={!canEdit}
                                className="w-full rounded-xl border border-border bg-white px-2 py-1 text-text-secondary disabled:opacity-40"
                              >
                                <option value="">Not set</option>
                                <option value="1">1 day before</option>
                                <option value="3">3 days before</option>
                                <option value="7">7 days before</option>
                                <option value="14">14 days before</option>
                              </select>
                            </label>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Saved reminder: {formatVendorReminderChannel(meta.reminderChannel)} · {formatVendorReminderLeadDays(meta.reminderLeadDays)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => canEdit && saveVendorMetaEntry(vendor.id, { reminderLastQueuedAt: new Date().toISOString() })}
                              disabled={!canEdit}
                              className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                            >
                              Mark reminder queued
                            </button>
                            {meta.reminderLastQueuedAt && (
                              <span className="text-[11px] text-text-tertiary">
                                Last queued: {formatVendorDate(meta.reminderLastQueuedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/35 bg-surface-subtle/40 px-2.5 py-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-text-tertiary">Contract and invoice files</p>
                            {canEdit && (
                              <button
                                onClick={() => addVendorContractFile(vendor.id, contractFiles)}
                                className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary"
                              >
                                Add file
                              </button>
                            )}
                          </div>
                          {contractFiles.length > 0 ? (
                            <div className="space-y-2">
                              {contractFiles.map((file, index) => (
                                <div key={file.id} className="grid gap-2 sm:grid-cols-[0.8fr_1fr_1.6fr_auto]">
                                  <select
                                    value={file.kind}
                                    onChange={(event) => canEdit && updateVendorContractFile(vendor.id, contractFiles, index, {
                                      kind: event.target.value as VendorContractFileEntry['kind'],
                                    })}
                                    disabled={!canEdit}
                                    className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                                  >
                                    <option value="contract">Contract</option>
                                    <option value="invoice">Invoice</option>
                                    <option value="proposal">Proposal</option>
                                  </select>
                                  <input
                                    value={file.label}
                                    onChange={(event) => canEdit && updateVendorContractFile(vendor.id, contractFiles, index, {
                                      label: event.target.value,
                                    })}
                                    disabled={!canEdit}
                                    placeholder="Label"
                                    className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                                  />
                                  <input
                                    value={file.url}
                                    onChange={(event) => canEdit && updateVendorContractFile(vendor.id, contractFiles, index, {
                                      url: event.target.value,
                                    })}
                                    disabled={!canEdit}
                                    placeholder="https://..."
                                    className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                                  />
                                  {canEdit && (
                                    <button
                                      onClick={() => removeVendorContractFile(vendor.id, contractFiles, index)}
                                      className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-text-secondary">Save contract, invoice, or proposal links here so the ledger handoff is not stuck on one document field.</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-border/35 bg-surface-subtle/40 px-2.5 py-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-text-tertiary">Payment milestones</p>
                            {canEdit && (
                              <button
                                onClick={() => addVendorPaymentMilestone(vendor.id, paymentMilestones)}
                                className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary"
                              >
                                Add milestone
                              </button>
                            )}
                          </div>
                          {paymentMilestones.length > 0 ? (
                            <div className="space-y-2">
                              {paymentMilestones.map((milestone, index) => (
                                <div key={milestone.id} className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
                                  <input
                                    value={milestone.label}
                                    onChange={(event) => canEdit && updateVendorPaymentMilestone(vendor.id, paymentMilestones, index, {
                                      label: event.target.value,
                                    })}
                                    disabled={!canEdit}
                                    placeholder="Balance, installment, final invoice"
                                    className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                                  />
                                  <input
                                    type="date"
                                    value={milestone.dueDate ?? ''}
                                    onChange={(event) => canEdit && updateVendorPaymentMilestone(vendor.id, paymentMilestones, index, {
                                      dueDate: event.target.value,
                                    })}
                                    disabled={!canEdit}
                                    className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={milestone.amount ?? ''}
                                    onChange={(event) => canEdit && updateVendorPaymentMilestone(vendor.id, paymentMilestones, index, {
                                      amount: event.target.value ? Number(event.target.value) : undefined,
                                    })}
                                    disabled={!canEdit}
                                    placeholder="Amount"
                                    className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                                  />
                                  <select
                                    value={milestone.status}
                                    onChange={(event) => canEdit && updateVendorPaymentMilestone(vendor.id, paymentMilestones, index, {
                                      status: event.target.value as VendorPaymentMilestoneEntry['status'],
                                    })}
                                    disabled={!canEdit}
                                    className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary disabled:opacity-40"
                                  >
                                    <option value="todo">To do</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="paid">Paid</option>
                                  </select>
                                  {canEdit && (
                                    <button
                                      onClick={() => removeVendorPaymentMilestone(vendor.id, paymentMilestones, index)}
                                      className="rounded-xl border border-border bg-white px-2 py-1 text-[11px] text-text-secondary"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-text-secondary">Break deposits and balances into named milestones so the owner and planner can track what is still due.</p>
                          )}
                        </div>
                        {vendor.notes && (
                          <p className="text-xs text-text-tertiary">{vendor.notes}</p>
                        )}
                        {(vendor.internal_rating || vendor.rating_notes) && (
                          <div className="rounded-xl border border-border/35 bg-white px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-text-tertiary">Internal rating</p>
                              <VendorRating rating={vendor.internal_rating} />
                            </div>
                            {vendor.rating_notes && <p className="mt-1 text-xs text-text-secondary">{vendor.rating_notes}</p>}
                          </div>
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, DollarSign, Download, ExternalLink, ReceiptText } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import type { PlanningBudgetItem, PlanningVendor } from './planningService';
import { formatVendorDate, isVendorDateOnOrBefore } from './vendorDate';
import { buildVendorReminderLedgerSummary, formatVendorReminderChannel, formatVendorReminderLeadDays } from './vendorReminderLedger';
import type { VendorMetaMap } from './vendorMetaStorage';
import { copyTextOrDownload, downloadTextFile } from '../../../lib/copyText';
import { getSafePublicWebUrl } from '../../../sections/publicLinks';

interface Props {
  items: PlanningBudgetItem[];
  vendorMeta: VendorMetaMap;
  vendors: PlanningVendor[];
  onUpdateBudgetItem: (id: string, updates: Partial<PlanningBudgetItem>) => Promise<void>;
  onUpdateVendor: (id: string, updates: Partial<PlanningVendor>) => Promise<void>;
  canEdit?: boolean;
}

type PaymentRow = {
  id: string;
  source: 'budget' | 'vendor';
  label: string;
  owner: string;
  dueDate: string | null;
  total: number;
  paid: number;
  remaining: number;
  documentUrl?: string | null;
};

type PaymentFilter = 'open' | 'due' | 'paid' | 'all';

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export const PaymentsTab: React.FC<Props> = ({ items, vendorMeta, vendors, onUpdateBudgetItem, onUpdateVendor, canEdit = true }) => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<PaymentFilter>('open');
  const [pendingPaymentIds, setPendingPaymentIds] = useState<Set<string>>(new Set());
  const [copyingSummary, setCopyingSummary] = useState(false);
  const [summaryCopyNotice, setSummaryCopyNotice] = useState<'copied' | 'downloaded' | null>(null);
  const summaryCopyNoticeTimeoutRef = useRef<number | null>(null);
  const summaryCopyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => () => {
    mountedRef.current = false;
    summaryCopyRequestIdRef.current += 1;
    if (summaryCopyNoticeTimeoutRef.current) window.clearTimeout(summaryCopyNoticeTimeoutRef.current);
  }, []);

  const rows = useMemo<PaymentRow[]>(() => {
    const budgetRows = items.map((item) => {
      const total = Number(item.actual_amount || item.estimated_amount || 0);
      const paid = Number(item.paid_amount || 0);
      const vendor = vendors.find((candidate) => candidate.id === item.vendor_id);
      return {
        id: item.id,
        source: 'budget' as const,
        label: item.item_name,
        owner: vendor?.name || item.category || 'Budget',
        dueDate: item.due_date,
        total,
        paid,
        remaining: Math.max(0, total - paid),
        documentUrl: vendor?.document_url ?? null,
      };
    });

    const vendorRows = vendors
      .filter((vendor) => !items.some((item) => item.vendor_id === vendor.id))
      .map((vendor) => ({
        id: vendor.id,
        source: 'vendor' as const,
        label: vendor.name,
        owner: vendor.vendor_type || 'Vendor',
        dueDate: vendor.next_payment_due,
        total: Number(vendor.contract_total || 0),
        paid: Number(vendor.amount_paid || 0),
        remaining: Math.max(0, Number(vendor.balance_due ?? (vendor.contract_total || 0) - (vendor.amount_paid || 0))),
        documentUrl: vendor.document_url ?? null,
      }));

    return [...budgetRows, ...vendorRows].sort((a, b) => {
      if (a.remaining === 0 && b.remaining > 0) return 1;
      if (a.remaining > 0 && b.remaining === 0) return -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [items, vendors]);

  const totalDue = rows.reduce((sum, row) => sum + row.remaining, 0);
  const paidTotal = rows.reduce((sum, row) => sum + row.paid, 0);
  const overdue = rows.filter((row) => row.remaining > 0 && isVendorDateOnOrBefore(row.dueDate, today)).length;
  const totalCommitted = rows.reduce((sum, row) => sum + row.total, 0);
  const paidPct = totalCommitted > 0 ? Math.round((paidTotal / totalCommitted) * 100) : 0;
  const paymentSummaryContextKey = useMemo(() => JSON.stringify({
    rows: rows.map((row) => [row.id, row.source, row.label, row.remaining, row.dueDate]),
    totalDue,
    paidTotal,
    overdue,
  }), [overdue, paidTotal, rows, totalDue]);
  const paymentSummaryContextKeyRef = useRef(paymentSummaryContextKey);
  paymentSummaryContextKeyRef.current = paymentSummaryContextKey;
  const reminderSummary = useMemo(() => buildVendorReminderLedgerSummary({
    vendors,
    vendorMeta,
    compareDate: today,
  }), [today, vendorMeta, vendors]);
  const filteredRows = rows.filter((row) => {
    if (filter === 'all') return true;
    if (filter === 'paid') return row.remaining <= 0;
    if (filter === 'due') return row.remaining > 0 && isVendorDateOnOrBefore(row.dueDate, today);
    return row.remaining > 0;
  });

  useEffect(() => {
    summaryCopyRequestIdRef.current += 1;
    setCopyingSummary(false);
    setSummaryCopyNotice(null);
    if (summaryCopyNoticeTimeoutRef.current) {
      window.clearTimeout(summaryCopyNoticeTimeoutRef.current);
      summaryCopyNoticeTimeoutRef.current = null;
    }
  }, [paymentSummaryContextKey]);

  useEffect(() => {
    if (!canEdit) setPendingPaymentIds(new Set());
  }, [canEdit]);

  async function markPaid(row: PaymentRow) {
    const rowKey = `${row.source}-${row.id}`;
    if (!canEditRef.current || pendingPaymentIds.has(rowKey)) return;

    setPendingPaymentIds((current) => new Set(current).add(rowKey));
    try {
      if (row.source === 'budget') {
        await onUpdateBudgetItem(row.id, {
          paid_amount: row.total,
          notes: appendPaymentNote(items.find((item) => item.id === row.id)?.notes, row.total),
        });
      } else {
        await onUpdateVendor(row.id, {
          amount_paid: row.total,
          balance_due: 0,
          notes: appendPaymentNote(vendors.find((vendor) => vendor.id === row.id)?.notes, row.total),
        });
      }
    } catch {
      toast('Couldn’t mark that payment as paid right now.', 'error');
    } finally {
      setPendingPaymentIds((current) => {
        const next = new Set(current);
        next.delete(rowKey);
        return next;
      });
    }
  }

  function appendPaymentNote(notes: string | null | undefined, amount: number) {
    const stamp = `Marked paid in dayof on ${new Date().toLocaleDateString()} (${fmt(amount)}).`;
    return notes ? `${notes}\n${stamp}` : stamp;
  }

  async function copySummary() {
    if (copyingSummary) return;

    const requestId = summaryCopyRequestIdRef.current + 1;
    summaryCopyRequestIdRef.current = requestId;
    const requestContextKey = paymentSummaryContextKeyRef.current;
    const isCurrentSummaryCopy = () => (
      mountedRef.current &&
      requestId === summaryCopyRequestIdRef.current &&
      requestContextKey === paymentSummaryContextKeyRef.current
    );

    setCopyingSummary(true);
    setSummaryCopyNotice(null);
    const summary = [
      `Payment summary`,
      `Open: ${fmt(totalDue)}`,
      `Paid: ${fmt(paidTotal)}`,
      `Due now: ${overdue}`,
      '',
      ...rows.filter((row) => row.remaining > 0).slice(0, 12).map((row) => `${row.label} — ${fmt(row.remaining)} open${row.dueDate ? `, due ${formatVendorDate(row.dueDate)}` : ''}`),
    ].join('\n');
    try {
      const result = await copyTextOrDownload(summary, 'dayof-payment-summary.txt');
      if (!isCurrentSummaryCopy()) return;
      setSummaryCopyNotice(result);
      if (result === 'copied') {
        toast('Payment summary copied.', 'success');
      } else {
        toast('Clipboard was blocked, so the payment summary downloaded.', 'success');
      }
      if (summaryCopyNoticeTimeoutRef.current) window.clearTimeout(summaryCopyNoticeTimeoutRef.current);
      summaryCopyNoticeTimeoutRef.current = window.setTimeout(() => {
        if (!isCurrentSummaryCopy()) return;
        setSummaryCopyNotice((current) => (current === result ? null : current));
      }, 1800);
    } catch {
      if (!isCurrentSummaryCopy()) return;
      toast('Couldn’t copy the payment summary right now.', 'error');
    } finally {
      if (isCurrentSummaryCopy()) {
        setCopyingSummary(false);
      }
    }
  }

  function exportCsv() {
    const csvRows = [
      ['Payment', 'Owner', 'Source', 'Due date', 'Total', 'Paid', 'Open', 'Reminder channel', 'Reminder lead days', 'Last reminder queued', 'Document URL'],
      ...rows.map((row) => {
        const meta = row.source === 'vendor' ? vendorMeta[row.id] : undefined;
        return [
          row.label,
          row.owner,
          row.source,
          row.dueDate ?? '',
          String(row.total),
          String(row.paid),
          String(row.remaining),
          formatVendorReminderChannel(meta?.reminderChannel),
          formatVendorReminderLeadDays(meta?.reminderLeadDays),
          meta?.reminderLastQueuedAt ?? '',
          row.documentUrl ?? '',
        ];
      }),
    ];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    downloadTextFile(
      `dayof-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card padding="sm" className="rounded-[20px] shadow-none">
          <p className="text-xs text-text-tertiary mb-0.5">Open payments</p>
          <p className="text-xl font-bold text-text-primary">{fmt(totalDue)}</p>
        </Card>
        <Card padding="sm" className="rounded-[20px] shadow-none">
          <p className="text-xs text-text-tertiary mb-0.5">Paid so far</p>
          <p className="text-xl font-bold text-success">{fmt(paidTotal)}</p>
        </Card>
        <Card padding="sm" className={`rounded-[20px] shadow-none ${overdue > 0 ? 'border-warning/40' : ''}`}>
          <p className="text-xs text-text-tertiary mb-0.5">Due now</p>
          <p className="text-xl font-bold text-text-primary">{overdue}</p>
        </Card>
        <Card padding="sm" className="rounded-[20px] shadow-none">
          <p className="text-xs text-text-tertiary mb-0.5">Reminder-ready</p>
          <p className="text-xl font-bold text-text-primary">{reminderSummary.reminderReadyCount}</p>
        </Card>
      </div>

      <Card padding="sm" className="space-y-3 rounded-[20px] shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary-light p-2">
              <ReceiptText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Payment check-in</p>
              <p className="text-sm text-text-secondary mt-0.5">{paidPct}% paid across tracked contracts and budget lines.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['open', 'due', 'paid', 'all'] as PaymentFilter[]).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-xl border px-3 py-1.5 text-xs capitalize ${filter === key ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`}
              >
                {key === 'due' ? 'Due now' : key}
              </button>
            ))}
            <Button size="sm" variant="outline" onClick={() => void copySummary()} disabled={copyingSummary}>
              <Copy className="w-4 h-4 mr-1" />
              {copyingSummary
                ? 'Copying...'
                : summaryCopyNotice === 'downloaded'
                  ? 'Downloaded payment summary'
                  : summaryCopyNotice === 'copied'
                    ? 'Copied payment summary'
                    : 'Copy summary'}
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-xl bg-surface-subtle">
          <div className="h-full rounded-xl bg-success" style={{ width: `${Math.min(100, paidPct)}%` }} />
        </div>
        <p className="text-xs text-text-tertiary">
          {reminderSummary.summary}
        </p>
      </Card>

      {rows.length === 0 ? (
        <Card padding="lg" className="rounded-[20px] text-center shadow-none">
          <DollarSign className="w-8 h-8 mx-auto text-text-tertiary mb-2" />
          <p className="text-text-secondary mb-1">No payment records yet.</p>
          <p className="text-sm text-text-tertiary">Budget items and vendor balances will appear here automatically.</p>
        </Card>
      ) : (
        <Card variant="bordered" padding="none" className="overflow-auto rounded-[20px] shadow-none">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-subtle text-text-secondary">
              <tr>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-left px-3 py-2">Source</th>
                <th className="text-left px-3 py-2">Due</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Open</th>
                <th className="text-right px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isDue = row.remaining > 0 && isVendorDateOnOrBefore(row.dueDate, today);
                const isPending = pendingPaymentIds.has(`${row.source}-${row.id}`);
                const safeDocumentUrl = getSafePublicWebUrl(row.documentUrl);
                return (
                  <tr key={`${row.source}-${row.id}`} className="border-t border-border-subtle">
                    <td className="px-3 py-2">
                      <p className="font-medium text-text-primary">{row.label}</p>
                      <p className="text-xs text-text-tertiary">{row.owner}</p>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{row.source === 'budget' ? 'Budget' : 'Vendor'}</td>
                    <td className={`px-3 py-2 ${isDue ? 'text-warning font-medium' : 'text-text-secondary'}`}>
                      {row.dueDate ? formatVendorDate(row.dueDate) : 'No due date'}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(row.total)}</td>
                    <td className="px-3 py-2 text-right text-success">{fmt(row.paid)}</td>
                    <td className={`px-3 py-2 text-right ${row.remaining > 0 ? 'text-text-primary font-medium' : 'text-success'}`}>{fmt(row.remaining)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        {safeDocumentUrl && (
                          <a href={safeDocumentUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-text-tertiary hover:text-primary" aria-label="Open document">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <Button size="sm" variant="outline" disabled={!canEdit || row.remaining <= 0 || isPending} onClick={() => markPaid(row)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {isPending ? 'Saving...' : 'Paid'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-text-tertiary">No payments match this view.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

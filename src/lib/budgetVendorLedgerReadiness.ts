export type BudgetVendorLedgerStatus = 'ready' | 'needs-review' | 'empty';
export type BudgetVendorLedgerChecklistState = 'ready' | 'needs-action' | 'planned';

export interface BudgetLedgerItem {
  id: string;
  category: string;
  item_name: string;
  estimated_amount?: number | null;
  actual_amount?: number | null;
  paid_amount?: number | null;
  due_date?: string | null;
  vendor_id?: string | null;
  notes?: string | null;
}

export interface VendorLedgerItem {
  id: string;
  vendor_type?: string | null;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  contract_total?: number | null;
  amount_paid?: number | null;
  balance_due?: number | null;
  next_payment_due?: string | null;
  document_url?: string | null;
  document_label?: string | null;
  notes?: string | null;
  internal_rating?: number | null;
  rating_status?: string | null;
  rating_notes?: string | null;
}

export interface BudgetVendorLedgerChecklistItem {
  id: string;
  label: string;
  detail: string;
  state: BudgetVendorLedgerChecklistState;
}

export interface BudgetVendorLedgerReadiness {
  status: BudgetVendorLedgerStatus;
  summary: string;
  totalBudget: number;
  estimatedTotal: number;
  actualTotal: number;
  paidTotal: number;
  openBalance: number;
  budgetItemCount: number;
  vendorCount: number;
  contactableVendorCount: number;
  documentedVendorCount: number;
  dueSoonCount: number;
  unlinkedBudgetItemCount: number;
  checklist: BudgetVendorLedgerChecklistItem[];
}

export type BudgetPaymentReviewStatus = 'overdue' | 'due-soon' | 'open' | 'paid';
export type BudgetPaymentReviewSource = 'budget' | 'vendor';

export interface BudgetPaymentReviewRow {
  id: string;
  source: BudgetPaymentReviewSource;
  name: string;
  vendorName: string;
  dueDate: string;
  total: number;
  paid: number;
  open: number;
  status: BudgetPaymentReviewStatus;
  hasContact: boolean;
  hasDocument: boolean;
}

export interface BudgetPaymentReview {
  status: 'ready' | 'needs-review' | 'empty';
  summary: string;
  openTotal: number;
  overdueCount: number;
  dueSoonCount: number;
  missingContactCount: number;
  missingDocumentCount: number;
  rows: BudgetPaymentReviewRow[];
  privacyNote: string;
}

export interface VendorLedgerMeta {
  lastContacted?: string | null;
  nextFollowUp?: string | null;
  reminderChannel?: string | null;
  reminderLeadDays?: number | null;
  reminderLastQueuedAt?: string | null;
  contractFiles?: Array<{
    id?: string;
    kind?: string | null;
    label?: string | null;
    url?: string | null;
  }>;
  paymentMilestones?: Array<{
    id?: string;
    label?: string | null;
    amount?: number | null;
    dueDate?: string | null;
    status?: string | null;
  }>;
}

export interface BudgetVendorReconciliationRow {
  vendorId: string;
  vendorName: string;
  contractTotal: number;
  vendorPaid: number;
  linkedEstimatedTotal: number;
  linkedActualTotal: number;
  linkedPaidTotal: number;
  milestoneCount: number;
  fileCount: number;
  contractGap: number;
  paidGap: number;
  issueCount: number;
  issues: string[];
}

export interface BudgetVendorReconciliation {
  status: 'ready' | 'needs-review' | 'empty';
  summary: string;
  mismatchedCount: number;
  contactReadyCount: number;
  dueDateReadyCount: number;
  milestoneReadyCount: number;
  fileReadyCount: number;
  rows: BudgetVendorReconciliationRow[];
}

function money(value: number | null | undefined): number {
  return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
}

function isOnOrBefore(dateValue: string | null | undefined, target: Date): boolean {
  if (!dateValue) return false;
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date <= target;
}

function formatReminderChannel(value: string | null | undefined): string {
  if (value === 'email') return 'Email';
  if (value === 'phone') return 'Phone';
  if (value === 'none') return 'No reminder';
  return '';
}

function formatReminderLeadDays(value: number | null | undefined): string {
  if (value === 1) return '1 day before';
  if (value === 3 || value === 7 || value === 14) return `${value} days before`;
  return '';
}

function summarizeVendorFiles(meta: VendorLedgerMeta | undefined): string {
  const entries = Array.isArray(meta?.contractFiles) ? meta.contractFiles : [];
  return entries
    .map((entry) => {
      const label = typeof entry?.label === 'string' ? entry.label.trim() : '';
      const kind = typeof entry?.kind === 'string' ? entry.kind.trim() : '';
      if (!label && !kind) return '';
      return kind && label ? `${kind}: ${label}` : label || kind;
    })
    .filter(Boolean)
    .join(' | ');
}

function summarizeVendorMilestones(meta: VendorLedgerMeta | undefined): string {
  const entries = Array.isArray(meta?.paymentMilestones) ? meta.paymentMilestones : [];
  return entries
    .map((entry) => {
      const label = typeof entry?.label === 'string' ? entry.label.trim() : '';
      const status = typeof entry?.status === 'string' ? entry.status.trim() : '';
      const dueDate = typeof entry?.dueDate === 'string' ? entry.dueDate.trim().slice(0, 10) : '';
      const amount = Number.isFinite(Number(entry?.amount))
        ? Number(entry?.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        : '';
      const detail = [status, dueDate, amount].filter(Boolean).join(', ');
      if (!label && !detail) return '';
      return detail ? `${label || 'Milestone'} (${detail})` : label;
    })
    .filter(Boolean)
    .join(' | ');
}

export function buildBudgetVendorLedgerReadiness(input: {
  budgetItems: BudgetLedgerItem[];
  vendors: VendorLedgerItem[];
  totalBudget: number;
  today?: Date;
}): BudgetVendorLedgerReadiness {
  const today = input.today ? new Date(input.today) : new Date();
  today.setHours(0, 0, 0, 0);
  const nextTwoWeeks = new Date(today);
  nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

  const estimatedTotal = input.budgetItems.reduce((sum, item) => sum + money(item.estimated_amount), 0);
  const actualTotal = input.budgetItems.reduce((sum, item) => sum + money(item.actual_amount), 0);
  const budgetPaidTotal = input.budgetItems.reduce((sum, item) => sum + money(item.paid_amount), 0);
  const vendorPaidTotal = input.vendors.reduce((sum, vendor) => sum + money(vendor.amount_paid), 0);
  const vendorOpenBalance = input.vendors.reduce((sum, vendor) => {
    if (vendor.balance_due != null) return sum + money(vendor.balance_due);
    return sum + Math.max(0, money(vendor.contract_total) - money(vendor.amount_paid));
  }, 0);
  const openBudgetBalance = input.budgetItems.reduce((sum, item) => {
    const total = money(item.actual_amount) || money(item.estimated_amount);
    return sum + Math.max(0, total - money(item.paid_amount));
  }, 0);

  const vendorIds = new Set(input.vendors.map((vendor) => vendor.id));
  const unlinkedBudgetItemCount = input.budgetItems.filter((item) => !item.vendor_id || !vendorIds.has(item.vendor_id)).length;
  const contactableVendorCount = input.vendors.filter((vendor) => Boolean(vendor.email || vendor.phone)).length;
  const documentedVendorCount = input.vendors.filter((vendor) => Boolean(vendor.document_url)).length;
  const dueSoonCount = [
    ...input.budgetItems.filter((item) => {
      const total = money(item.actual_amount) || money(item.estimated_amount);
      return total > money(item.paid_amount) && isOnOrBefore(item.due_date, nextTwoWeeks);
    }),
    ...input.vendors.filter((vendor) => {
      const remaining = vendor.balance_due != null ? money(vendor.balance_due) : Math.max(0, money(vendor.contract_total) - money(vendor.amount_paid));
      return remaining > 0 && isOnOrBefore(vendor.next_payment_due, nextTwoWeeks);
    }),
  ].length;

  const totalBudget = money(input.totalBudget);
  const paidTotal = Math.max(budgetPaidTotal, vendorPaidTotal);
  const openBalance = Math.max(openBudgetBalance, vendorOpenBalance);
  const hasLedger = input.budgetItems.length > 0 || input.vendors.length > 0;
  const checklist: BudgetVendorLedgerChecklistItem[] = [
    {
      id: 'budget-goal',
      label: 'Budget goal',
      detail: totalBudget > 0 ? 'Overall budget is set.' : 'Add an overall budget before relying on totals.',
      state: totalBudget > 0 ? 'ready' : 'needs-action',
    },
    {
      id: 'budget-lines',
      label: 'Budget lines',
      detail: input.budgetItems.length > 0
        ? `${input.budgetItems.length} budget item${input.budgetItems.length === 1 ? '' : 's'} are tracked.`
        : 'Add budget lines for deposits, balances, and estimates.',
      state: input.budgetItems.length > 0 ? 'ready' : 'needs-action',
    },
    {
      id: 'vendor-contacts',
      label: 'Vendor contacts',
      detail: input.vendors.length === 0
        ? 'Add vendors before planner handoff.'
        : `${contactableVendorCount}/${input.vendors.length} vendors have an email or phone.`,
      state: input.vendors.length > 0 && contactableVendorCount === input.vendors.length ? 'ready' : 'needs-action',
    },
    {
      id: 'contracts-docs',
      label: 'Contracts and invoices',
      detail: input.vendors.length === 0
        ? 'No vendor documents are tracked yet.'
        : `${documentedVendorCount}/${input.vendors.length} vendors have a document link.`,
      state: input.vendors.length > 0 && documentedVendorCount === input.vendors.length ? 'ready' : 'needs-action',
    },
    {
      id: 'payment-reminders',
      label: 'Payment dates',
      detail: dueSoonCount > 0
        ? `${dueSoonCount} open payment${dueSoonCount === 1 ? '' : 's'} are due within 14 days or overdue.`
        : 'No open payments are due in the next 14 days.',
      state: dueSoonCount > 0 ? 'needs-action' : 'ready',
    },
    {
      id: 'vendor-linking',
      label: 'Budget/vendor links',
      detail: unlinkedBudgetItemCount === 0
        ? 'Budget lines are connected to vendor records where available.'
        : `${unlinkedBudgetItemCount} budget line${unlinkedBudgetItemCount === 1 ? '' : 's'} are not linked to a vendor.`,
      state: unlinkedBudgetItemCount === 0 ? 'ready' : 'planned',
    },
  ];

  const needsAction = checklist.filter((item) => item.state === 'needs-action').length;
  const status: BudgetVendorLedgerStatus = !hasLedger
    ? 'empty'
    : needsAction > 0
      ? 'needs-review'
      : 'ready';

  const summary = status === 'ready'
    ? 'Ready for a planner or payment check-in.'
    : status === 'empty'
      ? 'Add budget items and vendors before this ledger can guide payment decisions.'
      : `${needsAction} item${needsAction === 1 ? '' : 's'} need review before this ledger is planner-ready.`;

  return {
    status,
    summary,
    totalBudget,
    estimatedTotal,
    actualTotal,
    paidTotal,
    openBalance,
    budgetItemCount: input.budgetItems.length,
    vendorCount: input.vendors.length,
    contactableVendorCount,
    documentedVendorCount,
    dueSoonCount,
    unlinkedBudgetItemCount,
    checklist,
  };
}

export function budgetVendorLedgerToCsv(input: {
  budgetItems: BudgetLedgerItem[];
  vendors: VendorLedgerItem[];
  vendorMeta?: Record<string, VendorLedgerMeta | undefined> | null;
}): string {
  const vendorMap = new Map(input.vendors.map((vendor) => [vendor.id, vendor]));
  const vendorMeta = input.vendorMeta ?? {};
  const reconciliation = buildBudgetVendorReconciliation({
    budgetItems: input.budgetItems,
    vendors: input.vendors,
    vendorMeta,
  });
  const reconciliationMap = new Map(reconciliation.rows.map((row) => [row.vendorId, row]));
  const linkedBudgetItemsByVendor = new Map(
    input.vendors.map((vendor) => [
      vendor.id,
      input.budgetItems.filter((item) => item.vendor_id === vendor.id),
    ]),
  );
  const rows = [
    ['Record Type', 'Name', 'Category or Type', 'Vendor', 'Estimated', 'Actual or Contract', 'Paid', 'Open', 'Due Date', 'Contact', 'Contact Name', 'Website', 'Reminder Channel', 'Follow Up', 'Reminder Lead Time', 'Reminder Last Queued', 'Document Label', 'Document URL', 'Files', 'Milestones', 'Internal Rating', 'Rating Status', 'Private Rating Notes', 'Contact Ready', 'Due Date Ready', 'File Count', 'Milestone Count', 'Linked Budget Count', 'Linked Budget Lines', 'Linked Budget Categories', 'Linked Budget Due Dates', 'Linked Budget Estimated', 'Linked Budget Actual', 'Linked Budget Paid', 'Contract Gap', 'Paid Gap', 'Ledger Issue Count', 'Ledger Issues', 'Notes'],
    ...input.budgetItems.map((item) => {
      const total = money(item.actual_amount) || money(item.estimated_amount);
      const paid = money(item.paid_amount);
      const vendor = item.vendor_id ? vendorMap.get(item.vendor_id) : undefined;
      const meta = item.vendor_id ? vendorMeta[item.vendor_id] : undefined;
      const reconciliationRow = item.vendor_id ? reconciliationMap.get(item.vendor_id) : undefined;
      const linkedBudgetItems = item.vendor_id ? linkedBudgetItemsByVendor.get(item.vendor_id) ?? [] : [];
      return [
        'Budget item',
        item.item_name,
        item.category,
        vendor?.name ?? '',
        String(money(item.estimated_amount)),
        String(money(item.actual_amount)),
        String(paid),
        String(Math.max(0, total - paid)),
        item.due_date ?? '',
        vendor ? [vendor.email, vendor.phone].filter(Boolean).join(' / ') : '',
        vendor?.contact_name ?? '',
        vendor?.website ?? '',
        formatReminderChannel(meta?.reminderChannel),
        meta?.nextFollowUp ?? '',
        formatReminderLeadDays(meta?.reminderLeadDays),
        meta?.reminderLastQueuedAt ?? '',
        vendor?.document_label ?? '',
        vendor?.document_url ?? '',
        summarizeVendorFiles(meta),
        summarizeVendorMilestones(meta),
        vendor?.internal_rating != null ? String(vendor.internal_rating) : '',
        vendor?.rating_status ?? '',
        vendor?.rating_notes ?? '',
        vendor ? (vendor.email || vendor.phone ? 'Yes' : 'No') : '',
        vendor ? ((reconciliationRow ? reconciliationRow.issues.includes('Open balance has no saved due date') : false) ? 'No' : 'Yes') : '',
        reconciliationRow ? String(reconciliationRow.fileCount) : '',
        reconciliationRow ? String(reconciliationRow.milestoneCount) : '',
        linkedBudgetItems.length > 0 ? String(linkedBudgetItems.length) : '',
        linkedBudgetItems.map((budgetItem) => budgetItem.item_name).filter(Boolean).join(' | '),
        linkedBudgetItems.map((budgetItem) => budgetItem.category).filter(Boolean).join(' | '),
        linkedBudgetItems.map((budgetItem) => budgetItem.due_date ?? '').filter(Boolean).join(' | '),
        reconciliationRow ? String(reconciliationRow.linkedEstimatedTotal) : '',
        reconciliationRow ? String(reconciliationRow.linkedActualTotal) : '',
        reconciliationRow ? String(reconciliationRow.linkedPaidTotal) : '',
        reconciliationRow ? String(reconciliationRow.contractGap) : '',
        reconciliationRow ? String(reconciliationRow.paidGap) : '',
        reconciliationRow ? String(reconciliationRow.issueCount) : '',
        reconciliationRow ? reconciliationRow.issues.join(' | ') : '',
        item.notes ?? '',
      ];
    }),
    ...input.vendors.map((vendor) => {
      const total = money(vendor.contract_total);
      const paid = money(vendor.amount_paid);
      const open = vendor.balance_due != null ? money(vendor.balance_due) : Math.max(0, total - paid);
      const meta = vendorMeta[vendor.id];
      const reconciliationRow = reconciliationMap.get(vendor.id);
      const linkedBudgetItems = linkedBudgetItemsByVendor.get(vendor.id) ?? [];
      return [
        'Vendor',
        vendor.name,
        vendor.vendor_type ?? '',
        vendor.name,
        '',
        String(total),
        String(paid),
        String(open),
        vendor.next_payment_due ?? '',
        [vendor.email, vendor.phone].filter(Boolean).join(' / '),
        vendor.contact_name ?? '',
        vendor.website ?? '',
        formatReminderChannel(meta?.reminderChannel),
        meta?.nextFollowUp ?? '',
        formatReminderLeadDays(meta?.reminderLeadDays),
        meta?.reminderLastQueuedAt ?? '',
        vendor.document_label ?? '',
        vendor.document_url ?? '',
        summarizeVendorFiles(meta),
        summarizeVendorMilestones(meta),
        vendor.internal_rating != null ? String(vendor.internal_rating) : '',
        vendor.rating_status ?? '',
        vendor.rating_notes ?? '',
        vendor.email || vendor.phone ? 'Yes' : 'No',
        reconciliationRow?.issues.includes('Open balance has no saved due date') ? 'No' : 'Yes',
        reconciliationRow ? String(reconciliationRow.fileCount) : '',
        reconciliationRow ? String(reconciliationRow.milestoneCount) : '',
        linkedBudgetItems.length > 0 ? String(linkedBudgetItems.length) : '',
        linkedBudgetItems.map((budgetItem) => budgetItem.item_name).filter(Boolean).join(' | '),
        linkedBudgetItems.map((budgetItem) => budgetItem.category).filter(Boolean).join(' | '),
        linkedBudgetItems.map((budgetItem) => budgetItem.due_date ?? '').filter(Boolean).join(' | '),
        reconciliationRow ? String(reconciliationRow.linkedEstimatedTotal) : '',
        reconciliationRow ? String(reconciliationRow.linkedActualTotal) : '',
        reconciliationRow ? String(reconciliationRow.linkedPaidTotal) : '',
        reconciliationRow ? String(reconciliationRow.contractGap) : '',
        reconciliationRow ? String(reconciliationRow.paidGap) : '',
        reconciliationRow ? String(reconciliationRow.issueCount) : '',
        reconciliationRow ? reconciliationRow.issues.join(' | ') : '',
        vendor.notes ?? '',
      ];
    }),
  ];

  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function paymentStatus(dueDate: string | null | undefined, open: number, today: Date, nextTwoWeeks: Date): BudgetPaymentReviewStatus {
  if (open <= 0) return 'paid';
  if (!dueDate) return 'open';
  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 'open';
  if (due < today) return 'overdue';
  if (due <= nextTwoWeeks) return 'due-soon';
  return 'open';
}

export function buildBudgetPaymentReview(input: {
  budgetItems: BudgetLedgerItem[];
  vendors: VendorLedgerItem[];
  today?: Date;
}): BudgetPaymentReview {
  const today = input.today ? new Date(input.today) : new Date();
  today.setHours(0, 0, 0, 0);
  const nextTwoWeeks = new Date(today);
  nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
  const vendorMap = new Map(input.vendors.map((vendor) => [vendor.id, vendor]));

  const budgetRows: BudgetPaymentReviewRow[] = input.budgetItems.map((item) => {
    const total = money(item.actual_amount) || money(item.estimated_amount);
    const paid = money(item.paid_amount);
    const open = Math.max(0, total - paid);
    const vendor = item.vendor_id ? vendorMap.get(item.vendor_id) : undefined;
    return {
      id: `budget:${item.id}`,
      source: 'budget',
      name: item.item_name || 'Budget item',
      vendorName: vendor?.name ?? '',
      dueDate: item.due_date ?? '',
      total,
      paid,
      open,
      status: paymentStatus(item.due_date, open, today, nextTwoWeeks),
      hasContact: vendor ? Boolean(vendor.email || vendor.phone) : false,
      hasDocument: vendor ? Boolean(vendor.document_url) : false,
    };
  });

  const vendorRows: BudgetPaymentReviewRow[] = input.vendors.map((vendor) => {
    const total = money(vendor.contract_total);
    const paid = money(vendor.amount_paid);
    const open = vendor.balance_due != null ? money(vendor.balance_due) : Math.max(0, total - paid);
    return {
      id: `vendor:${vendor.id}`,
      source: 'vendor',
      name: vendor.name || 'Vendor',
      vendorName: vendor.name || '',
      dueDate: vendor.next_payment_due ?? '',
      total,
      paid,
      open,
      status: paymentStatus(vendor.next_payment_due, open, today, nextTwoWeeks),
      hasContact: Boolean(vendor.email || vendor.phone),
      hasDocument: Boolean(vendor.document_url),
    };
  });

  const rows = [...budgetRows, ...vendorRows]
    .filter((row) => row.open > 0 || row.status !== 'paid')
    .sort((a, b) => {
      const priority: Record<BudgetPaymentReviewStatus, number> = { overdue: 0, 'due-soon': 1, open: 2, paid: 3 };
      if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && !b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate) || b.open - a.open || a.name.localeCompare(b.name);
    })
    .slice(0, 8);

  const openTotal = rows.reduce((sum, row) => sum + row.open, 0);
  const overdueCount = rows.filter((row) => row.status === 'overdue').length;
  const dueSoonCount = rows.filter((row) => row.status === 'due-soon').length;
  const missingContactCount = rows.filter((row) => !row.hasContact).length;
  const missingDocumentCount = rows.filter((row) => !row.hasDocument).length;
  const needsReview = overdueCount + dueSoonCount + missingContactCount + missingDocumentCount;
  const status = rows.length === 0 ? 'empty' : needsReview > 0 ? 'needs-review' : 'ready';

  return {
    status,
    summary: status === 'empty'
      ? 'Add vendor contracts or budget payments before reviewing reminders.'
      : status === 'ready'
        ? 'Open payments have contact details and no near-term due dates.'
        : `${needsReview} payment detail${needsReview === 1 ? '' : 's'} need review before planner handoff.`,
    openTotal,
    overdueCount,
    dueSoonCount,
    missingContactCount,
    missingDocumentCount,
    rows,
    privacyNote: 'Planner review stays owner/planner-only; public and guest surfaces must not expose financial details.',
  };
}

export function buildBudgetVendorReconciliation(input: {
  budgetItems: BudgetLedgerItem[];
  vendors: VendorLedgerItem[];
  vendorMeta?: Record<string, VendorLedgerMeta | undefined> | null;
}): BudgetVendorReconciliation {
  if (input.vendors.length === 0) {
    return {
      status: 'empty',
      summary: 'Add vendors before reconciling contracts and payment schedules.',
      mismatchedCount: 0,
      contactReadyCount: 0,
      dueDateReadyCount: 0,
      milestoneReadyCount: 0,
      fileReadyCount: 0,
      rows: [],
    };
  }

  const rows = input.vendors.map((vendor) => {
    const linkedBudgetItems = input.budgetItems.filter((item) => item.vendor_id === vendor.id);
    const meta = input.vendorMeta?.[vendor.id];
    const contractTotal = money(vendor.contract_total);
    const vendorPaid = money(vendor.amount_paid);
    const linkedEstimatedTotal = linkedBudgetItems.reduce((sum, item) => sum + money(item.estimated_amount), 0);
    const linkedActualTotal = linkedBudgetItems.reduce((sum, item) => sum + money(item.actual_amount), 0);
    const linkedPaidTotal = linkedBudgetItems.reduce((sum, item) => sum + money(item.paid_amount), 0);
    const comparisonTotal = linkedActualTotal > 0 ? linkedActualTotal : linkedEstimatedTotal;
    const contractGap = Math.abs(contractTotal - comparisonTotal);
    const paidGap = Math.abs(vendorPaid - linkedPaidTotal);
    const openBalance = vendor.balance_due != null ? money(vendor.balance_due) : Math.max(0, contractTotal - vendorPaid);
    const fileCount = Array.isArray(meta?.contractFiles) ? meta!.contractFiles!.filter((file) => file?.label || file?.url).length : 0;
    const milestoneCount = Array.isArray(meta?.paymentMilestones) ? meta!.paymentMilestones!.filter((milestone) => milestone?.label || milestone?.dueDate || milestone?.amount).length : 0;
    const issues: string[] = [];
    const hasContact = Boolean(vendor.email || vendor.phone);

    if (linkedBudgetItems.length === 0) issues.push('No linked budget lines');
    if (contractTotal > 0 && comparisonTotal > 0 && contractGap >= 1) issues.push(`Contract differs from linked budget by ${money(contractGap).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`);
    if (vendorPaid > 0 && linkedPaidTotal > 0 && paidGap >= 1) issues.push(`Paid totals differ by ${money(paidGap).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`);
    if (openBalance > 0 && !hasContact) issues.push('Open balance has no saved email or phone');
    if (openBalance > 0 && !vendor.next_payment_due) issues.push('Open balance has no saved due date');
    if (fileCount === 0) issues.push('No contract or invoice files saved');
    if (milestoneCount === 0 && openBalance > 0) issues.push('No payment milestones saved');

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      contractTotal,
      vendorPaid,
      linkedEstimatedTotal,
      linkedActualTotal,
      linkedPaidTotal,
      milestoneCount,
      fileCount,
      contractGap,
      paidGap,
      issueCount: issues.length,
      issues,
    };
  }).sort((a, b) => b.issueCount - a.issueCount || b.contractGap - a.contractGap || a.vendorName.localeCompare(b.vendorName));

  const mismatchedCount = rows.filter((row) => row.issueCount > 0).length;
  const contactReadyCount = input.vendors.filter((vendor) => Boolean(vendor.email || vendor.phone)).length;
  const dueDateReadyCount = input.vendors.filter((vendor) => {
    const openBalance = vendor.balance_due != null ? money(vendor.balance_due) : Math.max(0, money(vendor.contract_total) - money(vendor.amount_paid));
    return openBalance <= 0 || Boolean(vendor.next_payment_due);
  }).length;
  const milestoneReadyCount = rows.filter((row) => row.milestoneCount > 0).length;
  const fileReadyCount = rows.filter((row) => row.fileCount > 0).length;

  return {
    status: mismatchedCount > 0 ? 'needs-review' : 'ready',
    summary: mismatchedCount > 0
      ? `${mismatchedCount} vendor ledger row${mismatchedCount === 1 ? '' : 's'} still need contract, milestone, or balance reconciliation.`
      : 'Vendor contracts, files, and payment milestones line up with linked budget rows.',
    mismatchedCount,
    contactReadyCount,
    dueDateReadyCount,
    milestoneReadyCount,
    fileReadyCount,
    rows,
  };
}

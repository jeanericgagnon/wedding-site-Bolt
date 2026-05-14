export const VENDOR_META_STORAGE_KEY = 'dayof.vendor.meta.v1';

const VENDOR_META_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_VENDOR_META_ROWS = 200;
const MAX_VENDOR_ID_LENGTH = 120;
const REMINDER_CHANNELS = new Set(['none', 'email', 'phone']);
const REMINDER_LEAD_DAYS = new Set([1, 3, 7, 14]);
const FILE_KINDS = new Set(['contract', 'invoice', 'proposal']);
const MILESTONE_STATUSES = new Set(['todo', 'scheduled', 'paid']);
const MAX_VENDOR_FILES = 8;
const MAX_VENDOR_MILESTONES = 8;

export type VendorReminderChannel = 'none' | 'email' | 'phone';
export type VendorFileKind = 'contract' | 'invoice' | 'proposal';
export type VendorPaymentMilestoneStatus = 'todo' | 'scheduled' | 'paid';

export interface VendorContractFileEntry {
  id: string;
  kind: VendorFileKind;
  label: string;
  url: string;
}

export interface VendorPaymentMilestoneEntry {
  id: string;
  label: string;
  amount?: number;
  dueDate?: string;
  status: VendorPaymentMilestoneStatus;
}

export interface VendorMetaEntry {
  lastContacted?: string;
  nextFollowUp?: string;
  reminderChannel?: VendorReminderChannel;
  reminderLeadDays?: 1 | 3 | 7 | 14;
  reminderLastQueuedAt?: string;
  contractFiles?: VendorContractFileEntry[];
  paymentMilestones?: VendorPaymentMilestoneEntry[];
}

export type VendorMetaMap = Record<string, VendorMetaEntry>;

interface VendorMetaEnvelope {
  savedAtISO: string;
  vendors: VendorMetaMap;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isValidDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && Number.isFinite(new Date(trimmed).getTime());
};

const isReminderChannel = (value: unknown): value is VendorReminderChannel =>
  typeof value === 'string' && REMINDER_CHANNELS.has(value);

const isReminderLeadDays = (value: unknown): value is 1 | 3 | 7 | 14 =>
  typeof value === 'number' && REMINDER_LEAD_DAYS.has(value);

const isVendorFileKind = (value: unknown): value is VendorFileKind =>
  typeof value === 'string' && FILE_KINDS.has(value);

const isVendorPaymentMilestoneStatus = (value: unknown): value is VendorPaymentMilestoneStatus =>
  typeof value === 'string' && MILESTONE_STATUSES.has(value);

const normalizeVendorContractFiles = (value: unknown): VendorContractFileEntry[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.slice(0, MAX_VENDOR_FILES).flatMap((rawFile, index) => {
    if (!isRecord(rawFile)) return [];
    const id = typeof rawFile.id === 'string' && rawFile.id.trim() ? rawFile.id.trim().slice(0, 80) : `file-${index + 1}`;
    const kind = isVendorFileKind(rawFile.kind) ? rawFile.kind : 'contract';
    const label = typeof rawFile.label === 'string' ? rawFile.label.trim().slice(0, 120) : '';
    const url = typeof rawFile.url === 'string' ? rawFile.url.trim().slice(0, 1000) : '';
    if (!label && !url) return [];
    return [{ id, kind, label, url }];
  });
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeVendorPaymentMilestones = (value: unknown): VendorPaymentMilestoneEntry[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.slice(0, MAX_VENDOR_MILESTONES).flatMap((rawMilestone, index) => {
    if (!isRecord(rawMilestone)) return [];
    const id = typeof rawMilestone.id === 'string' && rawMilestone.id.trim() ? rawMilestone.id.trim().slice(0, 80) : `milestone-${index + 1}`;
    const label = typeof rawMilestone.label === 'string' ? rawMilestone.label.trim().slice(0, 120) : '';
    const dueDate = isValidDateString(rawMilestone.dueDate) ? rawMilestone.dueDate.trim().slice(0, 10) : undefined;
    const amount = Number.isFinite(Number(rawMilestone.amount)) ? Math.max(0, Number(rawMilestone.amount)) : undefined;
    const status = isVendorPaymentMilestoneStatus(rawMilestone.status) ? rawMilestone.status : 'todo';
    if (!label && !dueDate && !amount) return [];
    return [{ id, label, dueDate, amount, status }];
  });
  return normalized.length > 0 ? normalized : undefined;
};

export const normalizeVendorMeta = (value: unknown): VendorMetaMap => {
  if (!isRecord(value)) return {};
  const normalized: VendorMetaMap = {};
  Object.entries(value).slice(0, MAX_VENDOR_META_ROWS).forEach(([rawId, rawMeta]) => {
    const vendorId = rawId.trim().slice(0, MAX_VENDOR_ID_LENGTH);
    if (!vendorId || !isRecord(rawMeta)) return;
    const entry: VendorMetaEntry = {};
    if (isValidDateString(rawMeta.lastContacted)) entry.lastContacted = rawMeta.lastContacted.trim();
    if (isValidDateString(rawMeta.nextFollowUp)) entry.nextFollowUp = rawMeta.nextFollowUp.trim().slice(0, 10);
    if (isReminderChannel(rawMeta.reminderChannel)) entry.reminderChannel = rawMeta.reminderChannel;
    if (isReminderLeadDays(rawMeta.reminderLeadDays)) entry.reminderLeadDays = rawMeta.reminderLeadDays;
    if (isValidDateString(rawMeta.reminderLastQueuedAt)) entry.reminderLastQueuedAt = rawMeta.reminderLastQueuedAt.trim();
    const contractFiles = normalizeVendorContractFiles(rawMeta.contractFiles);
    if (contractFiles) entry.contractFiles = contractFiles;
    const paymentMilestones = normalizeVendorPaymentMilestones(rawMeta.paymentMilestones);
    if (paymentMilestones) entry.paymentMilestones = paymentMilestones;
    if (
      entry.lastContacted ||
      entry.nextFollowUp ||
      entry.reminderChannel ||
      entry.reminderLeadDays ||
      entry.reminderLastQueuedAt ||
      entry.contractFiles ||
      entry.paymentMilestones
    ) normalized[vendorId] = entry;
  });
  return normalized;
};

const buildEnvelope = (vendors: VendorMetaMap): VendorMetaEnvelope => ({
  savedAtISO: new Date().toISOString(),
  vendors: normalizeVendorMeta(vendors),
});

const isStaleEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > VENDOR_META_RETENTION_MS;
};

export const readVendorMetaStorage = (storageKey = VENDOR_META_STORAGE_KEY): VendorMetaMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      window.localStorage.removeItem(storageKey);
      return {};
    }
    if ('savedAtISO' in parsed || 'vendors' in parsed) {
      if (isStaleEnvelope(parsed.savedAtISO)) {
        window.localStorage.removeItem(storageKey);
        return {};
      }
      const vendors = normalizeVendorMeta(parsed.vendors);
      if (Object.keys(vendors).length === 0) {
        window.localStorage.removeItem(storageKey);
        return {};
      }
      window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(vendors)));
      return vendors;
    }
    const vendors = normalizeVendorMeta(parsed);
    if (Object.keys(vendors).length === 0) {
      window.localStorage.removeItem(storageKey);
      return {};
    }
    window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(vendors)));
    return vendors;
  } catch {
    window.localStorage.removeItem(storageKey);
    return {};
  }
};

export const writeVendorMetaStorage = (vendors: VendorMetaMap, storageKey = VENDOR_META_STORAGE_KEY): VendorMetaMap => {
  const normalized = normalizeVendorMeta(vendors);
  if (typeof window === 'undefined') return normalized;
  if (Object.keys(normalized).length === 0) {
    window.localStorage.removeItem(storageKey);
    return normalized;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(normalized)));
  return normalized;
};

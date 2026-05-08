export const VENDOR_META_STORAGE_KEY = 'dayof.vendor.meta.v1';

const VENDOR_META_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_VENDOR_META_ROWS = 200;
const MAX_VENDOR_ID_LENGTH = 120;

export interface VendorMetaEntry {
  lastContacted?: string;
  nextFollowUp?: string;
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

export const normalizeVendorMeta = (value: unknown): VendorMetaMap => {
  if (!isRecord(value)) return {};
  const normalized: VendorMetaMap = {};
  Object.entries(value).slice(0, MAX_VENDOR_META_ROWS).forEach(([rawId, rawMeta]) => {
    const vendorId = rawId.trim().slice(0, MAX_VENDOR_ID_LENGTH);
    if (!vendorId || !isRecord(rawMeta)) return;
    const entry: VendorMetaEntry = {};
    if (isValidDateString(rawMeta.lastContacted)) entry.lastContacted = rawMeta.lastContacted.trim();
    if (isValidDateString(rawMeta.nextFollowUp)) entry.nextFollowUp = rawMeta.nextFollowUp.trim().slice(0, 10);
    if (entry.lastContacted || entry.nextFollowUp) normalized[vendorId] = entry;
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

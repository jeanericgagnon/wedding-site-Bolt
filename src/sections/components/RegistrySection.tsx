import React, { useState, useEffect } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { ExternalLink, Gift, Package, CheckCircle2, Loader2, X, ShoppingBag } from 'lucide-react';
import { useSiteView } from '../../contexts/SiteViewContext';
import { publicFetchRegistryItems, publicIncrementPurchase } from '../../pages/dashboard/registry/registryService';
import type { RegistryItem } from '../../pages/dashboard/registry/registryTypes';
import { sanitizeRegistryQuantityState } from '../../pages/dashboard/registry/registryTypes';
import { readBuilderValue } from '../../lib/weddingProfile';
import { getSafePublicImageUrl, getSafePublicWebUrl } from '../publicLinks';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function safeFundAmount(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

const REGISTRY_PURCHASE_MEMORY_KEY = 'dayof_registry_purchase_memory_v1';
const REGISTRY_PURCHASE_COOKIE = 'dayof_registry_purchases_v1';
export const REGISTRY_PURCHASE_MEMORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
const REGISTRY_PURCHASE_COOKIE_MAX_AGE = Math.floor(REGISTRY_PURCHASE_MEMORY_RETENTION_MS / 1000);
const MAX_REGISTRY_PURCHASE_MEMORY_IDS = 80;
const MAX_REGISTRY_PURCHASE_MEMORY_ID_LENGTH = 120;

const BROKEN_REGISTRY_TITLE_PATTERNS = [
  /^page not found$/i,
  /^404\b/i,
  /^not found$/i,
  /^sorry\b.*(?:couldn.t|could not|not find)/i,
  /^access denied$/i,
  /^gift from [a-z0-9.-]+\.[a-z]{2,}$/i,
];

export function isGuestReadyRegistryItem(item: Pick<RegistryItem, 'item_name' | 'item_type'>): boolean {
  if (item.item_type === 'cash_fund') return true;

  const title = String(item.item_name ?? '').replace(/\s+/g, ' ').trim();
  if (!title) return false;
  return !BROKEN_REGISTRY_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function cleanPublicRegistryTitle(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/^(?:Amazon(?:\.com)?|Target|Walmart|Etsy|Crate\s*&\s*Barrel|Williams\s*Sonoma)\s*:\s*/i, '')
    .trim();
}

function cleanPublicRegistryMerchant(value?: string | null): string | null {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  if (/^[A-Z]\s+Co$/i.test(normalized)) return null;
  if (/^unknown$/i.test(normalized)) return null;
  return normalized;
}

export function isUsableRegistryImageUrl(url?: string | null): boolean {
  return Boolean(getSafePublicImageUrl(url));
}

function getSafePublicRegistryUrl(url?: string | null): string | null {
  return getSafePublicWebUrl(url) || null;
}

function normalizePublicRegistryLink(link: { id: string; label?: string; url: string }) {
  const url = getSafePublicRegistryUrl(link.url);
  return url ? { ...link, url } : null;
}

function normalizePublicRegistryLinks(links: Array<{ id: string; label?: string; url: string }>) {
  return links
    .map(normalizePublicRegistryLink)
    .filter((link): link is { id: string; label?: string; url: string } => Boolean(link));
}

type RegistryPurchaseMemoryEnvelope = {
  savedAtISO: string;
  ids: string[];
};

function normalizeRegistryPurchaseMemoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  value.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const id = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_REGISTRY_PURCHASE_MEMORY_ID_LENGTH);
    if (id) ids.add(id);
  });
  return Array.from(ids).slice(-MAX_REGISTRY_PURCHASE_MEMORY_IDS);
}

function parseRegistryPurchaseMemory(raw: string | null): { ids: string[]; shouldPersist: boolean; isStale: boolean } {
  if (!raw) return { ids: [], shouldPersist: false, isStale: false };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { ids: normalizeRegistryPurchaseMemoryIds(parsed), shouldPersist: true, isStale: false };
    }

    if (parsed && typeof parsed === 'object' && typeof parsed.savedAtISO === 'string') {
      const savedAt = Date.parse(parsed.savedAtISO);
      if (!Number.isFinite(savedAt) || Date.now() - savedAt > REGISTRY_PURCHASE_MEMORY_RETENTION_MS) {
        return { ids: [], shouldPersist: false, isStale: true };
      }
      return {
        ids: normalizeRegistryPurchaseMemoryIds((parsed as RegistryPurchaseMemoryEnvelope).ids),
        shouldPersist: false,
        isStale: false,
      };
    }
  } catch {
    return { ids: [], shouldPersist: false, isStale: true };
  }

  return { ids: [], shouldPersist: false, isStale: true };
}

function buildRegistryPurchaseMemoryPayload(ids: string[]): string {
  return JSON.stringify({
    savedAtISO: new Date().toISOString(),
    ids: normalizeRegistryPurchaseMemoryIds(ids),
  } satisfies RegistryPurchaseMemoryEnvelope);
}

function clearRegistryPurchaseCookie() {
  try {
    document.cookie = `${REGISTRY_PURCHASE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    // Non-critical continuity only.
  }
}

export function readRegistryPurchaseMemory(): string[] {
  if (typeof window === 'undefined') return [];
  const ids = new Set<string>();
  let shouldPersist = false;

  try {
    const raw = window.localStorage.getItem(REGISTRY_PURCHASE_MEMORY_KEY);
    const parsed = parseRegistryPurchaseMemory(raw);
    parsed.ids.forEach((id) => ids.add(id));
    shouldPersist = shouldPersist || parsed.shouldPersist;
    if (parsed.isStale) window.localStorage.removeItem(REGISTRY_PURCHASE_MEMORY_KEY);
  } catch {
    // Ignore corrupt client memory.
  }

  try {
    const cookie = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${REGISTRY_PURCHASE_COOKIE}=`));
    const raw = cookie ? decodeURIComponent(cookie.slice(REGISTRY_PURCHASE_COOKIE.length + 1)) : '';
    const parsed = parseRegistryPurchaseMemory(raw);
    parsed.ids.forEach((id) => ids.add(id));
    shouldPersist = shouldPersist || parsed.shouldPersist;
    if (parsed.isStale) clearRegistryPurchaseCookie();
  } catch {
    // Ignore corrupt cookie memory.
  }

  const normalized = normalizeRegistryPurchaseMemoryIds(Array.from(ids));
  if (shouldPersist && normalized.length > 0) {
    const payload = buildRegistryPurchaseMemoryPayload(normalized);
    try {
      window.localStorage.setItem(REGISTRY_PURCHASE_MEMORY_KEY, payload);
    } catch {
      // Non-critical continuity only.
    }
    try {
      document.cookie = `${REGISTRY_PURCHASE_COOKIE}=${encodeURIComponent(payload)}; Max-Age=${REGISTRY_PURCHASE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
    } catch {
      // Non-critical continuity only.
    }
  }
  return normalized;
}

export function rememberRegistryPurchase(itemId: string): string[] {
  if (typeof window === 'undefined' || !itemId) return [];
  const next = normalizeRegistryPurchaseMemoryIds([...readRegistryPurchaseMemory(), itemId]);
  const payload = buildRegistryPurchaseMemoryPayload(next);
  try {
    window.localStorage.setItem(REGISTRY_PURCHASE_MEMORY_KEY, payload);
  } catch {
    // Non-critical continuity only.
  }
  try {
    document.cookie = `${REGISTRY_PURCHASE_COOKIE}=${encodeURIComponent(payload)}; Max-Age=${REGISTRY_PURCHASE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  } catch {
    // Non-critical continuity only.
  }
  return next;
}

function usePublicRegistryItems(weddingSiteId: string | null) {
  const { inviteToken, passwordSession } = useSiteView();
  const [items, setItems] = useState<RegistryItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!weddingSiteId) return;
    setLoading(true);
    publicFetchRegistryItems(weddingSiteId, { inviteToken, passwordSession })
      .then(data => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [inviteToken, passwordSession, weddingSiteId]);

  function updateItem(updated: RegistryItem) {
    setItems(prev => prev?.map(i => (i.id === updated.id ? updated : i)) ?? prev);
  }

  return { items, loading, updateItem };
}

export function shouldUseLiveRegistryItems(items: RegistryItem[] | null): items is RegistryItem[] {
  return items !== null;
}

export function normalizePublicRegistryItemState(item: RegistryItem): RegistryItem {
  const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased, item.quantity_needed);
  return {
    ...item,
    item_name: cleanPublicRegistryTitle(item.item_name),
    merchant: cleanPublicRegistryMerchant(item.merchant),
    store_name: cleanPublicRegistryMerchant(item.store_name),
    image_url: getSafePublicImageUrl(item.image_url) || null,
    item_url: getSafePublicRegistryUrl(item.item_url),
    canonical_url: getSafePublicRegistryUrl(item.canonical_url),
    fund_venmo_url: getSafePublicRegistryUrl(item.fund_venmo_url),
    fund_paypal_url: getSafePublicRegistryUrl(item.fund_paypal_url),
    fund_custom_url: getSafePublicRegistryUrl(item.fund_custom_url),
    quantity_needed: quantityState.quantityNeeded,
    quantity_purchased: quantityState.quantityPurchased,
    purchase_status: quantityState.purchaseStatus,
    purchaser_name: quantityState.purchaseStatus === 'available' ? null : item.purchaser_name,
  };
}

export function sanitizePublicRegistryItems(items: RegistryItem[]): RegistryItem[] {
  return items
    .filter(isGuestReadyRegistryItem)
    .map(normalizePublicRegistryItemState);
}

export function getRegistryFundContributionMethods(item: Pick<RegistryItem, 'fund_venmo_url' | 'fund_paypal_url' | 'fund_custom_url' | 'fund_custom_label' | 'fund_zelle_handle'>) {
  const methods: Array<{ id: string; label: string; url?: string | null; value?: string | null }> = [];
  const venmoUrl = getSafePublicRegistryUrl(item.fund_venmo_url);
  const paypalUrl = getSafePublicRegistryUrl(item.fund_paypal_url);
  const customFundUrl = getSafePublicRegistryUrl(item.fund_custom_url);
  if (venmoUrl) methods.push({ id: 'venmo', label: 'Venmo', url: venmoUrl });
  if (paypalUrl) methods.push({ id: 'paypal', label: 'PayPal', url: paypalUrl });
  if (customFundUrl) methods.push({ id: 'custom', label: item.fund_custom_label || 'Contribute', url: customFundUrl });
  if (item.fund_zelle_handle) methods.push({ id: 'zelle', label: `Zelle: ${item.fund_zelle_handle}`, value: item.fund_zelle_handle });
  return methods;
}

export function pickFeaturedRegistryFund(items: RegistryItem[]): RegistryItem | null {
  const funds = sanitizePublicRegistryItems(items).filter((item) => item.item_type === 'cash_fund');
  if (funds.length === 0) return null;
  return [...funds].sort((a, b) => {
    const methodsA = getRegistryFundContributionMethods(a).length;
    const methodsB = getRegistryFundContributionMethods(b).length;
    if (methodsA !== methodsB) return methodsB - methodsA;
    const goalA = safeFundAmount(a.fund_goal_amount);
    const goalB = safeFundAmount(b.fund_goal_amount);
    if (goalA !== goalB) return goalB - goalA;
    return safeFundAmount(b.fund_received_amount) - safeFundAmount(a.fund_received_amount);
  })[0];
}

interface PurchaseModalProps {
  item: RegistryItem;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ item, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(name.trim());
      setDone(true);
      setTimeout(onClose, 2000);
    } finally {
      setLoading(false);
    }
  }

  const displayPrice = item.price_label ?? (item.price_amount != null ? `$${item.price_amount.toFixed(2)}` : null);
  const dialogCopy = getRegistryPurchaseDialogCopy(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-text-primary/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {done ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-success-light flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <p className="font-semibold text-text-primary">Thank you!</p>
            <p className="text-sm text-text-secondary">{dialogCopy.successMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="font-semibold text-text-primary">{dialogCopy.title}</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="flex items-center gap-3 p-3 bg-surface-subtle rounded-xl border border-border">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.item_name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 border border-border">
                    <Package className="w-5 h-5 text-text-tertiary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary leading-snug line-clamp-2">{item.item_name}</p>
                  {displayPrice && <p className="text-sm text-primary font-semibold mt-0.5">{displayPrice}</p>}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Your name
                  <span className="ml-1 text-xs text-text-tertiary font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Aunt Susan"
                  className="w-full px-3 py-2.5 bg-surface-subtle border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-text-inverse text-sm font-medium rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Saving…' : dialogCopy.confirmLabel}
              </button>
              <button type="button" onClick={onClose} className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors py-1">
                Cancel
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

interface RegistryCardProps {
  item: RegistryItem;
  onPurchase: (item: RegistryItem) => void;
  rememberedByGuest: boolean;
}

export function getRegistryPurchaseCtaLabel(item: Pick<RegistryItem, 'purchase_status'>): string {
  return item.purchase_status === 'partial' ? 'Buy remaining' : 'Mark as purchasing';
}

export function getRegistryPurchaseDialogCopy(item: Pick<RegistryItem, 'purchase_status'>): {
  title: string;
  confirmLabel: string;
  successMessage: string;
} {
  if (item.purchase_status === 'partial') {
    return {
      title: 'Buy remaining gift',
      confirmLabel: 'Confirm remaining purchase',
      successMessage: 'This gift is now updated with the remaining purchase.',
    };
  }

  return {
    title: 'Mark as purchasing',
    confirmLabel: 'Confirm purchase',
    successMessage: 'This gift is now marked as being purchased.',
  };
}

export function getRegistryPurchaserStatusLabel(item: Pick<RegistryItem, 'purchase_status' | 'purchaser_name'>): string | null {
  if (!item.purchaser_name || item.purchase_status === 'available') return null;
  return item.purchase_status === 'purchased'
    ? `Purchased by ${item.purchaser_name}`
    : `Purchasing: ${item.purchaser_name}`;
}

export function getRegistryDisplayPriority(item: Pick<RegistryItem, 'purchase_status' | 'item_type'>): number {
  const purchaseScore = item.purchase_status === 'available'
    ? 2
    : item.purchase_status === 'partial'
      ? 1
      : 0;

  return purchaseScore + (item.item_type === 'cash_fund' ? 1 : 0);
}

export function getRegistryEmptyStateMessage(
  allItems: Array<Pick<RegistryItem, 'purchase_status' | 'hide_when_purchased' | 'item_type'>>,
  groupMode: 'all' | 'funds' | 'stores',
): string {
  const visibleByPurchase = allItems.filter((item) => !item.hide_when_purchased || item.purchase_status !== 'purchased');
  const visibleForGroup = visibleByPurchase.filter((item) => {
    if (groupMode === 'funds') return item.item_type === 'cash_fund';
    if (groupMode === 'stores') return item.item_type !== 'cash_fund';
    return true;
  });

  if (visibleForGroup.length > 0) return '';
  if (groupMode !== 'all' && visibleByPurchase.length > 0) return 'No items match this filter right now.';
  return 'All items have been purchased. Thank you!';
}

export function safePublicRegistryPurchaseError(): string {
  return 'Could not save that purchase right now. Please try again.';
}

const RegistryCard: React.FC<RegistryCardProps> = ({ item, onPurchase, rememberedByGuest }) => {
  const isCashFund = item.item_type === 'cash_fund';
  const isPurchased = item.purchase_status === 'purchased';
  const [copiedZelle, setCopiedZelle] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const isPartial = item.purchase_status === 'partial';
  const displayPrice = item.price_label ?? (item.price_amount != null ? `$${item.price_amount.toFixed(2)}` : null);
  const displayUrl = getSafePublicRegistryUrl(item.item_url) ?? getSafePublicRegistryUrl(item.canonical_url);
  const imageUrl = isUsableRegistryImageUrl(item.image_url) ? item.image_url : null;
  const visibleImageUrl = imageFailed ? null : imageUrl;
  const merchant = item.merchant ?? item.store_name;
  const venmoUrl = getSafePublicRegistryUrl(item.fund_venmo_url);
  const paypalUrl = getSafePublicRegistryUrl(item.fund_paypal_url);
  const customFundUrl = getSafePublicRegistryUrl(item.fund_custom_url);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (isCashFund) {
    const goal = item.fund_goal_amount ?? 0;
    const received = item.fund_received_amount ?? 0;
    const pct = goal > 0 ? Math.min(100, Math.round((received / goal) * 100)) : null;
    return (
      <div className="bg-surface rounded-2xl border border-border p-4 md:p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-text-primary text-sm line-clamp-2">{item.item_name}</h3>
          <span className="text-xs px-2 py-1 rounded border border-primary/30 text-primary bg-primary/10">Cash fund</span>
        </div>
        {item.notes && <p className="text-xs text-text-secondary leading-relaxed">{item.notes}</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg border border-border bg-surface-subtle">Goal: {goal > 0 ? `$${goal.toFixed(0)}` : '—'}</div>
          <div className="p-2 rounded-lg border border-border bg-surface-subtle">Raised: ${received.toFixed(0)}</div>
        </div>
        {pct != null && (
          <div>
            <div className="h-2 w-full rounded-full bg-surface-subtle border border-border overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-text-tertiary mt-1">{pct}% funded</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {venmoUrl && <a href={venmoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors">Venmo</a>}
          {paypalUrl && <a href={paypalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors">PayPal</a>}
          {customFundUrl && <a href={customFundUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors">{item.fund_custom_label || 'Contribute'}</a>}
          {item.fund_zelle_handle && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(item.fund_zelle_handle || '');
                  setCopiedZelle(true);
                  setTimeout(() => setCopiedZelle(false), 1600);
                } catch {}
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors"
              title={`Copy Zelle: ${item.fund_zelle_handle}`}
            >
              {copiedZelle ? 'Copied ✓' : `Zelle: ${item.fund_zelle_handle}`}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-2xl border overflow-hidden flex flex-col ui-motion-emphasis ${
      isPurchased ? 'border-success/30 bg-success-light/10 opacity-75' : 'border-border hover:border-primary/30 hover:shadow-md'
    }`}>
      <div className="relative aspect-video flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#f6efe6] via-[#fbf8f2] to-[#e9efe5]">
        {visibleImageUrl ? (
          <img
            src={visibleImageUrl}
            alt={item.item_name}
            className={`h-full w-full object-contain p-4 mix-blend-multiply transition-opacity ${isPurchased ? 'opacity-60' : ''}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="relative flex h-full w-full items-end justify-between p-4">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/55" />
            <div className="absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-primary/10" />
            <div className="relative">
              <span className="block text-xs text-text-tertiary">Registry pick</span>
              <span className="mt-2 block max-w-[12rem] text-sm font-medium leading-snug text-text-primary line-clamp-2">{item.item_name}</span>
            </div>
            <div className="relative rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </div>
        )}
        {isPurchased && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-surface/90 rounded-full p-2.5 shadow-md">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 flex flex-col gap-2.5 flex-1">
        <div className="flex-1">
          <h3 className="font-medium text-text-primary leading-snug line-clamp-2 text-sm">{item.item_name}</h3>
          {merchant && <p className="text-xs text-text-tertiary mt-0.5">{merchant}</p>}
        </div>

        {displayPrice && (
          <p className="text-base font-semibold text-primary">{displayPrice}</p>
        )}

        {item.notes && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{item.notes}</p>
        )}

        {isPartial && (
          <p className="text-xs text-warning font-medium">
            {item.quantity_purchased} of {item.quantity_needed} purchased
          </p>
        )}

        {getRegistryPurchaserStatusLabel(item) && (
          <p className="text-xs text-text-tertiary">{getRegistryPurchaserStatusLabel(item)}</p>
        )}
        {rememberedByGuest && (
          <p className="text-xs font-medium text-primary">You marked this from this browser.</p>
        )}

        <div className="flex gap-2 pt-1">
          {isPurchased ? (
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-success bg-success-light rounded-xl border border-success/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Purchased
            </span>
          ) : (
            <button
              onClick={() => onPurchase(item)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-text-inverse text-xs font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {getRegistryPurchaseCtaLabel(item)}
            </button>
          )}

          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 border border-border rounded-xl hover:border-primary/40 text-text-tertiary hover:text-primary transition-colors flex-shrink-0"
              title="Open registry item"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export function RegistryItemsDisplay({ items, settings, notes, updateItem, excludeItemIds = [] }: {
  items: RegistryItem[];
  settings: SectionInstance['settings'];
  notes?: string;
  updateItem: (item: RegistryItem) => void;
  excludeItemIds?: string[];
}) {
  const normalizedItems = sanitizePublicRegistryItems(items);
  const [purchasingItem, setPurchasingItem] = useState<RegistryItem | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'recommended' | 'price-low' | 'price-high'>('recommended');
  const [groupMode, setGroupMode] = useState<'all' | 'funds' | 'stores'>('all');
  const [rememberedPurchaseIds, setRememberedPurchaseIds] = useState<string[]>(() => readRegistryPurchaseMemory());
  const rememberedPurchaseSet = new Set(rememberedPurchaseIds);

  const excludedIds = new Set(excludeItemIds);
  const visibleItems = normalizedItems.filter(item => {
    if (excludedIds.has(item.id)) return false;
    if (item.hide_when_purchased && item.purchase_status === 'purchased') return false;
    if (groupMode === 'funds') return item.item_type === 'cash_fund';
    if (groupMode === 'stores') return item.item_type !== 'cash_fund';
    return true;
  });

  const sortedItems = [...visibleItems].sort((a, b) => {
    const priceA = a.price_amount ?? 0;
    const priceB = b.price_amount ?? 0;
    if (sortMode === 'price-low') return priceA - priceB;
    if (sortMode === 'price-high') return priceB - priceA;
    const scoreA = getRegistryDisplayPriority(a);
    const scoreB = getRegistryDisplayPriority(b);
    return scoreB - scoreA;
  });

  async function handleConfirmPurchase(purchaserName: string) {
    if (!purchasingItem) return;
    setPurchaseError(null);
    try {
      const updated = await publicIncrementPurchase(purchasingItem.id, purchaserName || undefined);
      updateItem(normalizePublicRegistryItemState(updated));
      setRememberedPurchaseIds(rememberRegistryPurchase(purchasingItem.id));
    } catch {
      setPurchaseError(safePublicRegistryPurchaseError());
      throw new Error(safePublicRegistryPurchaseError());
    }
  }

  return (
    <>
      <div className="text-center mb-10">
        {settings.showTitle !== false && (
          <>
            <p className="text-sm text-primary mb-3 font-light">Registry</p>
            <h2 className="text-4xl font-light text-text-primary">{readBuilderValue(settings.title, 'Registry')}</h2>
          </>
        )}
        {notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{notes}</p>}
        <div className="w-10 h-px bg-primary mx-auto mt-6" />
      </div>

      {purchaseError && (
        <div className="mb-6 p-3 bg-error-light text-error text-sm rounded-xl border border-error/20 text-center max-w-md mx-auto">
          {purchaseError}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-1">
          {[
            { id: 'all', label: 'All gifts' },
            { id: 'funds', label: 'Funds' },
            { id: 'stores', label: 'Stores' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGroupMode(opt.id as typeof groupMode)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${groupMode === opt.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-subtle'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-1">
          {[
            { id: 'recommended', label: 'Recommended' },
            { id: 'price-low', label: 'Price ↑' },
            { id: 'price-high', label: 'Price ↓' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortMode(opt.id as typeof sortMode)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${sortMode === opt.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-subtle'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">{getRegistryEmptyStateMessage(normalizedItems, groupMode)}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
          {sortedItems.map(item => (
            <RegistryCard key={item.id} item={item} onPurchase={setPurchasingItem} rememberedByGuest={rememberedPurchaseSet.has(item.id)} />
          ))}
        </div>
      )}

      {purchasingItem && (
        <PurchaseModal
          item={purchasingItem}
          onClose={() => { setPurchasingItem(null); setPurchaseError(null); }}
          onConfirm={handleConfirmPurchase}
        />
      )}
    </>
  );
}

export const RegistrySection: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  const { weddingSiteId } = useSiteView();
  const { items, loading, updateItem } = usePublicRegistryItems(weddingSiteId);

  const rawLinksToShow = bindings?.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;
  const linksToShow = normalizePublicRegistryLinks(rawLinksToShow);

  if (loading) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading registry…
        </div>
      </section>
    );
  }

  if (shouldUseLiveRegistryItems(items)) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <RegistryItemsDisplay items={items} settings={settings} notes={registry.notes} updateItem={updateItem} />
        </div>
      </section>
    );
  }

  if (linksToShow.length === 0) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle !== false && (
            <h2 className="text-3xl md:text-4xl font-semibold text-text-primary mb-6">{readBuilderValue(settings.title, 'Registry')}</h2>
          )}
          <p className="text-text-secondary">Registry links and gift details will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <h2 className="text-3xl md:text-4xl font-semibold text-text-primary text-center mb-8">{readBuilderValue(settings.title, 'Registry')}</h2>
        )}
        {registry.notes && <p className="text-text-secondary text-center mb-8 leading-relaxed">{registry.notes}</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-surface-subtle rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <span className="font-medium text-text-primary">{link.label || link.url}</span>
              <ExternalLink className="w-5 h-5 text-primary" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export const RegistryGrid: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  const { weddingSiteId } = useSiteView();
  const { items, loading, updateItem } = usePublicRegistryItems(weddingSiteId);

  const rawLinksToShow = bindings?.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;
  const linksToShow = normalizePublicRegistryLinks(rawLinksToShow);

  if (loading) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading registry…
        </div>
      </section>
    );
  }

  if (shouldUseLiveRegistryItems(items)) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-6xl mx-auto">
          <RegistryItemsDisplay items={items} settings={settings} notes={registry.notes} updateItem={updateItem} />
        </div>
      </section>
    );
  }

  if (linksToShow.length === 0) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle !== false && (
            <h2 className="text-4xl font-light text-text-primary mb-8">{readBuilderValue(settings.title, 'Registry')}</h2>
          )}
          <p className="text-text-secondary">Registry links and gift details will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-12">
            <p className="text-sm text-primary mb-3 font-light">Registry</p>
            <h2 className="text-4xl font-light text-text-primary">{readBuilderValue(settings.title, 'Registry')}</h2>
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{registry.notes}</p>}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {linksToShow.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center p-8 bg-surface rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-text-primary text-center mb-3">{link.label || link.url}</span>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                Open registry
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export const RegistryFundHighlight: React.FC<Props> = ({ data, instance }) => {
  const { registry } = data;
  const { settings, bindings } = instance;
  const { weddingSiteId } = useSiteView();
  const { items, loading, updateItem } = usePublicRegistryItems(weddingSiteId);

  const rawLinksToShow = bindings?.linkIds && bindings.linkIds.length > 0
    ? registry.links.filter(l => bindings.linkIds!.includes(l.id))
    : registry.links;
  const linksToShow = normalizePublicRegistryLinks(rawLinksToShow);

  if (loading) {
    return (
      <section className="py-16 md:py-20 px-4 bg-surface">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading registry…
        </div>
      </section>
    );
  }

  if (shouldUseLiveRegistryItems(items)) {
    const featuredFund = pickFeaturedRegistryFund(items);
    const featuredFundMethods = featuredFund ? getRegistryFundContributionMethods(featuredFund) : [];
    const featuredFundGoal = featuredFund ? safeFundAmount(featuredFund.fund_goal_amount) : 0;
    const featuredFundReceived = featuredFund ? safeFundAmount(featuredFund.fund_received_amount) : 0;
    const featuredFundPct = featuredFund && featuredFundGoal > 0
      ? Math.min(100, Math.round((featuredFundReceived / featuredFundGoal) * 100))
      : null;
    return (
      <section className="py-20 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            {settings.showTitle !== false && (
              <>
                <p className="text-sm text-primary mb-3 font-light">Registry</p>
                <h2 className="text-3xl md:text-4xl font-light text-text-primary leading-tight">{readBuilderValue(settings.title, 'Registry')}</h2>
              </>
            )}
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{registry.notes}</p>}
          </div>

          {featuredFund ? (
            <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm text-primary font-light mb-2">Featured fund</p>
                  <h3 className="text-2xl md:text-3xl font-semibold text-text-primary">{featuredFund.item_name}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed mt-3">
                    {featuredFund.notes?.trim() || 'Your love and support means so much. If you’d like, you can contribute toward shared plans and experiences.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {featuredFundMethods.map((method) => (
                      method.url ? (
                        <a
                          key={method.id}
                          href={method.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:border-primary hover:text-primary transition-colors"
                        >
                          {method.label}
                        </a>
                      ) : (
                        <span key={method.id} className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-border rounded-xl text-text-secondary">
                          {method.label}
                        </span>
                      )
                    ))}
                  </div>
                </div>
                <div className="min-w-[220px] rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Fund status</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-text-tertiary">Goal</p>
                      <p className="font-semibold text-text-primary">{featuredFundGoal > 0 ? `$${featuredFundGoal.toFixed(0)}` : 'Flexible'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Raised</p>
                      <p className="font-semibold text-text-primary">${featuredFundReceived.toFixed(0)}</p>
                    </div>
                  </div>
                  {featuredFundPct != null && (
                    <div className="mt-4">
                      <div className="h-2 w-full rounded-full bg-surface-subtle border border-border overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${featuredFundPct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-text-tertiary">{featuredFundPct}% funded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 text-center">
              <h3 className="text-xl font-semibold text-text-primary">Honeymoon & Experiences Fund</h3>
              <p className="text-sm text-text-secondary leading-relaxed mt-2 max-w-2xl mx-auto">
                Your love and support means so much. If you’d like, you can also contribute toward future plans and shared experiences.
              </p>
            </div>
          )}

          <RegistryItemsDisplay
            items={items}
            settings={{ ...settings, showTitle: false }}
            notes={undefined}
            updateItem={updateItem}
            excludeItemIds={featuredFund ? [featuredFund.id] : []}
          />
        </div>
      </section>
    );
  }

  if (linksToShow.length === 0) {
    return (
      <section className="py-16 md:py-20 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle !== false && <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-8 leading-tight">{readBuilderValue(settings.title, 'Registry')}</h2>}
          <p className="text-text-secondary">Registry links and gift details will appear here once they’re added.</p>
        </div>
      </section>
    );
  }

  const featured = linksToShow[0];
  const remaining = linksToShow.slice(1);

  return (
    <section className="py-16 md:py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <div className="text-center mb-8 md:mb-10">
            <p className="text-sm text-primary mb-3 font-light">Registry</p>
            <h2 className="text-3xl md:text-4xl font-light text-text-primary leading-tight">{readBuilderValue(settings.title, 'Registry')}</h2>
            {registry.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">{registry.notes}</p>}
          </div>
        )}

        <a
          href={featured.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-primary/25 bg-primary/5 p-7 md:p-9 mb-6 hover:border-primary/40 transition-colors shadow-sm"
        >
          <p className="text-sm text-primary font-light mb-2">Featured fund</p>
          <h3 className="text-2xl md:text-3xl font-semibold text-text-primary">{featured.label || featured.url}</h3>
          <p className="text-text-secondary mt-3 max-w-2xl leading-relaxed">Contribute toward our honeymoon and the first chapter of married life.</p>
          <span className="inline-flex items-center gap-2 mt-5 text-primary font-medium">
            Contribute to this fund
            <ExternalLink className="w-4 h-4" />
          </span>
        </a>

        {remaining.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {remaining.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-surface-subtle rounded-xl border border-border hover:border-primary/30 transition-colors shadow-sm"
              >
                <span className="font-medium text-text-primary">{link.label || link.url}</span>
                <ExternalLink className="w-4 h-4 text-primary" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

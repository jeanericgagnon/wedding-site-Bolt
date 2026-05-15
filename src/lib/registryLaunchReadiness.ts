import { getSafePublicWebUrl } from '../sections/publicLinks';
import type { RegistryItem } from '../pages/dashboard/registry/registryTypes';

export type RegistryLaunchReadinessStatus = 'ready' | 'needs-review' | 'empty';
export type RegistryLaunchReadinessTone = 'ready' | 'review' | 'planned';

export interface RegistryLaunchReadinessItem {
  id: string;
  label: string;
  detail: string;
  tone: RegistryLaunchReadinessTone;
  count: number;
}

export interface RegistryLaunchReadiness {
  status: RegistryLaunchReadinessStatus;
  headline: string;
  summary: string;
  reviewCount: number;
  readyCount: number;
  items: RegistryLaunchReadinessItem[];
}

export type RegistryThankYouPlanStatus = 'ready' | 'planned' | 'quiet';
export type RegistryThankYouTaskStatus = 'todo' | 'done' | 'needs-purchaser';

export interface RegistryThankYouLedgerEntry {
  itemId: string;
  giftName: string;
  purchaserName: string | null;
  quantityPurchased: number;
  quantityNeeded: number;
  status: RegistryThankYouTaskStatus;
  generatedAt: string;
  completedAt: string | null;
}

export type RegistryThankYouLedger = Record<string, RegistryThankYouLedgerEntry>;

export interface RegistryThankYouPlanItem {
  id: string;
  giftName: string;
  purchaserLabel: string;
  detail: string;
  status: RegistryThankYouPlanStatus;
  taskStatus: RegistryThankYouTaskStatus;
  completedAt: string | null;
}

export interface RegistryThankYouPlan {
  headline: string;
  summary: string;
  purchasedCount: number;
  namedPurchaserCount: number;
  missingPurchaserCount: number;
  completedCount: number;
  items: RegistryThankYouPlanItem[];
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function conjugateBe(count: number): 'is' | 'are' {
  return count === 1 ? 'is' : 'are';
}

function hasSafeLink(value: string | null | undefined): boolean {
  return Boolean(getSafePublicWebUrl(value));
}

function hasUnsafeLink(value: string | null | undefined): boolean {
  const raw = (value ?? '').trim();
  return Boolean(raw) && !hasSafeLink(raw);
}

function safePaymentLinkCount(item: RegistryItem): number {
  return [
    item.fund_venmo_url,
    item.fund_paypal_url,
    item.fund_custom_url,
  ].filter(hasSafeLink).length;
}

export function buildRegistryLaunchReadiness(items: RegistryItem[], ledger: RegistryThankYouLedger = {}): RegistryLaunchReadiness {
  const total = items.length;
  const productItems = items.filter((item) => item.item_type !== 'cash_fund');
  const cashFunds = items.filter((item) => item.item_type === 'cash_fund');
  const availableOrPartial = items.filter((item) => item.purchase_status !== 'purchased');
  const purchasedItems = items.filter((item) => item.purchase_status === 'purchased' || safeCount(item.quantity_purchased ?? 0) > 0);
  const productLinksReady = productItems.filter((item) => hasSafeLink(item.item_url) || hasSafeLink(item.canonical_url)).length;
  const productLinksMissing = productItems.length - productLinksReady;
  const unsafeProductLinks = productItems.filter((item) => hasUnsafeLink(item.item_url) || hasUnsafeLink(item.canonical_url)).length;
  const unsafePaymentLinks = cashFunds.filter((item) => [
    item.fund_venmo_url,
    item.fund_paypal_url,
    item.fund_custom_url,
  ].some(hasUnsafeLink)).length;
  const cashFundsReady = cashFunds.filter((item) => safePaymentLinkCount(item) > 0 || Boolean((item.fund_zelle_handle ?? '').trim())).length;
  const cashFundsNeedingPayment = cashFunds.length - cashFundsReady;
  const hiddenPurchased = items.filter((item) => item.hide_when_purchased).length;
  const syncedLedger = syncRegistryThankYouLedger(items, ledger);
  const thankYouFollowUps = Object.values(syncedLedger).length;
  const thankYouNamedPurchasers = Object.values(syncedLedger).filter((entry) => Boolean(entry.purchaserName)).length;
  const productLinkCoverageRate = percent(productLinksReady, productItems.length);
  const fundShareReadyRate = percent(cashFundsReady, cashFunds.length);
  const thankYouAttributionCoverageRate = percent(thankYouNamedPurchasers, thankYouFollowUps);

  const itemsOut: RegistryLaunchReadinessItem[] = [
    {
      id: 'external-links',
      label: 'Gift links ready to share',
      count: productLinksMissing + unsafeProductLinks,
      detail: productItems.length === 0
        ? 'No product gifts are listed yet, so there are no gift links to share right now.'
        : productLinksMissing + unsafeProductLinks > 0
          ? `${plural(productLinksReady, 'product gift')} ${conjugateBe(productLinksReady)} ready to share (${productLinkCoverageRate}% coverage). ${plural(productLinksMissing + unsafeProductLinks, 'product gift')} still need a share-safe link.`
          : `${plural(productLinksReady, 'product gift')} ${conjugateBe(productLinksReady)} ready to share (${productLinkCoverageRate}% coverage).`,
      tone: productLinksMissing + unsafeProductLinks > 0 ? 'review' : 'ready',
    },
    {
      id: 'cash-funds',
      label: 'Fund links ready to share',
      count: cashFundsNeedingPayment + unsafePaymentLinks,
      detail: cashFunds.length === 0
        ? 'No cash funds are listed right now, which is fine for a gift-only registry.'
        : cashFundsNeedingPayment + unsafePaymentLinks > 0
          ? `${plural(cashFundsReady, 'cash fund')} ${conjugateBe(cashFundsReady)} ready to share (${fundShareReadyRate}% coverage). ${plural(cashFundsNeedingPayment + unsafePaymentLinks, 'cash fund')} still need a share path or handle.`
          : `${plural(cashFundsReady, 'cash fund')} ${conjugateBe(cashFundsReady)} ready to share with a share path or handle (${fundShareReadyRate}% coverage).`,
      tone: cashFundsNeedingPayment + unsafePaymentLinks > 0 ? 'review' : 'ready',
    },
    {
      id: 'purchase-state',
      label: 'Purchased-state clarity',
      count: availableOrPartial.length,
      detail: purchasedItems.length > 0
        ? `${plural(purchasedItems.length, 'gift')} already marked purchased or partially purchased.`
        : 'No gifts are marked purchased yet.',
      tone: 'ready',
    },
    {
      id: 'thank-you-follow-up',
      label: 'Thank-you list',
      count: thankYouFollowUps,
      detail: thankYouFollowUps > 0
        ? `${plural(thankYouFollowUps, 'gift')} are in the thank-you follow-up list with ${thankYouAttributionCoverageRate}% purchaser attribution coverage.`
        : 'No purchased gifts need thank-you follow-up right now.',
      tone: thankYouFollowUps > 0 ? 'ready' : 'ready',
    },
    {
      id: 'hide-purchased',
      label: 'Hide after purchase',
      count: hiddenPurchased,
      detail: hiddenPurchased > 0
        ? `${plural(hiddenPurchased, 'gift')} will hide after purchase so guests do not chase unavailable items.`
        : 'No gifts hide after purchase right now.',
      tone: 'ready',
    },
  ];

  const reviewCount = itemsOut.filter((item) => item.tone === 'review').reduce((sum, item) => sum + item.count, 0);
  const readyCount = itemsOut.filter((item) => item.tone === 'ready').length;
  const status: RegistryLaunchReadinessStatus = total === 0 ? 'empty' : reviewCount > 0 ? 'needs-review' : 'ready';

  return {
    status,
    headline: status === 'empty'
      ? 'Registry share setup is still empty.'
      : status === 'needs-review'
        ? 'A few registry share details still need review.'
        : 'Registry share setup looks ready to share.',
    summary: status === 'empty'
      ? 'Add product gifts or funds when you want registry links ready to share.'
      : reviewCount > 0
        ? `${plural(reviewCount, 'link or fund setup item')} still need a quick share-readiness check.`
        : 'Gift links, fund links, and purchase-state basics look ready to share right now.',
    reviewCount,
    readyCount,
    items: itemsOut,
  };
}

export function buildRegistryThankYouPlan(items: RegistryItem[]): RegistryThankYouPlan {
  return buildRegistryThankYouPlanWithLedger(items, {});
}

function safeRegistryIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function normalizeRegistryThankYouLedger(value: unknown): RegistryThankYouLedger {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>);
  const next: RegistryThankYouLedger = {};
  for (const [key, raw] of entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const itemId = typeof entry.itemId === 'string' && entry.itemId.trim() ? entry.itemId.trim() : key.trim();
    if (!itemId) continue;
    const quantityPurchased = safeCount(Number(entry.quantityPurchased));
    const quantityNeeded = Math.max(1, safeCount(Number(entry.quantityNeeded) || 1));
    const purchaserName = typeof entry.purchaserName === 'string' && entry.purchaserName.trim() ? entry.purchaserName.trim() : null;
    const completedAt = safeRegistryIso(typeof entry.completedAt === 'string' ? entry.completedAt : null);
    const status = entry.status === 'done'
      ? 'done'
      : purchaserName
        ? 'todo'
        : 'needs-purchaser';
    next[itemId] = {
      itemId,
      giftName: typeof entry.giftName === 'string' && entry.giftName.trim() ? entry.giftName.trim() : 'Registry gift',
      purchaserName,
      quantityPurchased,
      quantityNeeded,
      status,
      generatedAt: safeRegistryIso(typeof entry.generatedAt === 'string' ? entry.generatedAt : null) ?? new Date(0).toISOString(),
      completedAt: status === 'done' ? (completedAt ?? new Date(0).toISOString()) : null,
    };
  }
  return next;
}

export function syncRegistryThankYouLedger(items: RegistryItem[], ledger: RegistryThankYouLedger, nowIso = new Date().toISOString()): RegistryThankYouLedger {
  const purchasedItems = items.filter((item) => item.purchase_status === 'purchased' || safeCount(item.quantity_purchased ?? 0) > 0);
  const next: RegistryThankYouLedger = {};
  for (const item of purchasedItems) {
    const purchased = safeCount(item.quantity_purchased ?? 0);
    const needed = Math.max(safeCount(item.quantity_needed ?? 1), 1);
    const purchaser = item.purchaser_name?.trim() || null;
    const previous = ledger[item.id];
    const done = previous?.status === 'done';
    next[item.id] = {
      itemId: item.id,
      giftName: item.item_name || previous?.giftName || 'Registry gift',
      purchaserName: purchaser,
      quantityPurchased: purchased,
      quantityNeeded: needed,
      status: done ? 'done' : purchaser ? 'todo' : 'needs-purchaser',
      generatedAt: previous?.generatedAt ?? nowIso,
      completedAt: done ? (previous?.completedAt ?? nowIso) : null,
    };
  }
  return next;
}

export function toggleRegistryThankYouLedgerStatus(
  ledger: RegistryThankYouLedger,
  itemId: string,
  nowIso = new Date().toISOString(),
): RegistryThankYouLedger {
  const current = ledger[itemId];
  if (!current) return ledger;
  const nextStatus = current.status === 'done'
    ? (current.purchaserName ? 'todo' : 'needs-purchaser')
    : 'done';
  return {
    ...ledger,
    [itemId]: {
      ...current,
      status: nextStatus,
      completedAt: nextStatus === 'done' ? nowIso : null,
    },
  };
}

export function buildRegistryThankYouPlanWithLedger(items: RegistryItem[], ledger: RegistryThankYouLedger): RegistryThankYouPlan {
  const syncedLedger = syncRegistryThankYouLedger(items, ledger);
  const purchasedItems = items.filter((item) => item.purchase_status === 'purchased' || safeCount(item.quantity_purchased ?? 0) > 0);
  const namedPurchasers = purchasedItems.filter((item) => Boolean(item.purchaser_name?.trim()));
  const missingPurchasers = purchasedItems.length - namedPurchasers.length;
  const completedCount = Object.values(syncedLedger).filter((entry) => entry.status === 'done').length;
  const planItems = Object.values(syncedLedger).slice(0, 6).map((entry): RegistryThankYouPlanItem => {
    const purchaser = entry.purchaserName;
    const partiallyPurchased = entry.quantityPurchased > 0 && entry.quantityPurchased < entry.quantityNeeded;
    const detail = entry.status === 'done'
      ? `Thank-you marked sent${entry.completedAt ? ` on ${new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}.`
      : purchaser
        ? partiallyPurchased
          ? `${entry.quantityPurchased} of ${entry.quantityNeeded} marked purchased. Ready for thank-you follow-up.`
          : 'Ready for thank-you follow-up.'
        : partiallyPurchased
          ? `${entry.quantityPurchased} of ${entry.quantityNeeded} marked purchased. Add the purchaser before you send a thank-you.`
          : 'Add the purchaser before you send a thank-you.';
    return {
      id: entry.itemId,
      giftName: entry.giftName,
      purchaserLabel: purchaser ? `Purchased by ${purchaser}` : 'Purchaser not recorded yet',
      detail,
      status: entry.status === 'done' ? 'planned' : entry.status === 'todo' ? 'ready' : 'quiet',
      taskStatus: entry.status,
      completedAt: entry.completedAt,
    };
  });

  return {
    headline: purchasedItems.length > 0 ? 'Thank-you follow-up list' : 'Thank-you follow-up is quiet right now',
    summary: purchasedItems.length > 0
      ? completedCount > 0
        ? `${plural(completedCount, 'thank-you')} marked sent. ${plural(purchasedItems.length - completedCount, 'gift')} still need follow-up.`
        : `${plural(purchasedItems.length, 'purchased gift')} are in the thank-you list.`
      : 'No purchased gifts need thank-you follow-up right now.',
    purchasedCount: purchasedItems.length,
    namedPurchaserCount: namedPurchasers.length,
    missingPurchaserCount: missingPurchasers,
    completedCount,
    items: planItems,
  };
}

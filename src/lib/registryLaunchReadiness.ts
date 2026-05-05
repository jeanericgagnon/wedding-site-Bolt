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

export interface RegistryThankYouPlanItem {
  id: string;
  giftName: string;
  purchaserLabel: string;
  detail: string;
  status: RegistryThankYouPlanStatus;
}

export interface RegistryThankYouPlan {
  headline: string;
  summary: string;
  purchasedCount: number;
  namedPurchaserCount: number;
  missingPurchaserCount: number;
  items: RegistryThankYouPlanItem[];
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
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

export function buildRegistryLaunchReadiness(items: RegistryItem[]): RegistryLaunchReadiness {
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
  const thankYouFollowUps = purchasedItems.length;

  const itemsOut: RegistryLaunchReadinessItem[] = [
    {
      id: 'external-links',
      label: 'External gift links',
      count: productLinksMissing + unsafeProductLinks,
      detail: productItems.length === 0
        ? 'No product gifts are listed yet.'
        : productLinksMissing + unsafeProductLinks > 0
          ? `${plural(productLinksMissing + unsafeProductLinks, 'product gift')} need a safe public link before guests rely on them.`
          : `${plural(productLinksReady, 'product gift')} have safe public links.`,
      tone: productLinksMissing + unsafeProductLinks > 0 ? 'review' : 'ready',
    },
    {
      id: 'cash-funds',
      label: 'Cash and fund links',
      count: cashFundsNeedingPayment + unsafePaymentLinks,
      detail: cashFunds.length === 0
        ? 'No cash funds are listed, which is fine for a gift-only registry.'
        : cashFundsNeedingPayment + unsafePaymentLinks > 0
          ? `${plural(cashFundsNeedingPayment + unsafePaymentLinks, 'cash fund')} need a safe payment path or handle.`
          : `${plural(cashFundsReady, 'cash fund')} have a guest-facing payment path or handle.`,
      tone: cashFundsNeedingPayment + unsafePaymentLinks > 0 ? 'review' : 'ready',
    },
    {
      id: 'purchase-state',
      label: 'Purchased-state clarity',
      count: availableOrPartial.length,
      detail: purchasedItems.length > 0
        ? `${plural(purchasedItems.length, 'gift')} already marked purchased or partially purchased.`
        : 'No purchased gifts yet. Guest purchase state will appear once gifts are marked.',
      tone: 'ready',
    },
    {
      id: 'thank-you-follow-up',
      label: 'Thank-you follow-up',
      count: thankYouFollowUps,
      detail: thankYouFollowUps > 0
        ? `${plural(thankYouFollowUps, 'gift')} should flow into a thank-you follow-up list.`
        : 'Thank-you follow-up is quiet until gifts are marked purchased.',
      tone: thankYouFollowUps > 0 ? 'planned' : 'ready',
    },
    {
      id: 'hide-purchased',
      label: 'Guest view after purchase',
      count: hiddenPurchased,
      detail: hiddenPurchased > 0
        ? `${plural(hiddenPurchased, 'gift')} will hide after purchase so guests do not chase unavailable items.`
        : 'Purchased items stay visible unless you choose to hide them.',
      tone: 'ready',
    },
  ];

  const reviewCount = itemsOut.filter((item) => item.tone === 'review').reduce((sum, item) => sum + item.count, 0);
  const readyCount = itemsOut.filter((item) => item.tone === 'ready').length;
  const status: RegistryLaunchReadinessStatus = total === 0 ? 'empty' : reviewCount > 0 ? 'needs-review' : 'ready';

  return {
    status,
    headline: status === 'empty'
      ? 'Registry is empty right now.'
      : status === 'needs-review'
        ? 'Registry needs a quick link review.'
        : 'Registry links look guest-ready.',
    summary: status === 'empty'
      ? 'Add product gifts or funds when you want the registry section to appear useful to guests.'
      : reviewCount > 0
        ? `${plural(reviewCount, 'link or fund setup item')} should be checked before a broad guest share.`
        : 'Guest gift links and fund paths are ready from this local check.',
    reviewCount,
    readyCount,
    items: itemsOut,
  };
}

export function buildRegistryThankYouPlan(items: RegistryItem[]): RegistryThankYouPlan {
  const purchasedItems = items.filter((item) => item.purchase_status === 'purchased' || safeCount(item.quantity_purchased ?? 0) > 0);
  const namedPurchasers = purchasedItems.filter((item) => Boolean(item.purchaser_name?.trim()));
  const missingPurchasers = purchasedItems.length - namedPurchasers.length;
  const planItems = purchasedItems.slice(0, 6).map((item): RegistryThankYouPlanItem => {
    const purchased = safeCount(item.quantity_purchased ?? 0);
    const needed = Math.max(safeCount(item.quantity_needed ?? 1), 1);
    const purchaser = item.purchaser_name?.trim();
    return {
      id: item.id,
      giftName: item.item_name || 'Registry gift',
      purchaserLabel: purchaser ? `Purchased by ${purchaser}` : 'Purchaser not recorded yet',
      detail: purchased > 0 && purchased < needed
        ? `${purchased} of ${needed} marked purchased. Add this to thank-you review when the purchaser is confirmed.`
        : 'Ready for a thank-you follow-up once task creation is connected.',
      status: purchaser ? 'planned' : 'ready',
    };
  });

  return {
    headline: purchasedItems.length > 0 ? 'Thank-you follow-up preview' : 'Thank-you follow-up is quiet',
    summary: purchasedItems.length > 0
      ? `${plural(purchasedItems.length, 'purchased gift')} can be reviewed before thank-you tasks are connected.`
      : 'Purchased gifts will appear here before they become thank-you follow-up work.',
    purchasedCount: purchasedItems.length,
    namedPurchaserCount: namedPurchasers.length,
    missingPurchaserCount: missingPurchasers,
    items: planItems,
  };
}

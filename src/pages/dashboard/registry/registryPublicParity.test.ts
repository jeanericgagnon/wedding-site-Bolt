import { describe, expect, it } from 'vitest';

import { sanitizePublicRegistryItems } from '../../../sections/components/RegistrySection';
import { buildRegistryDashboardDerivedState } from './buildRegistryDashboardDerivedState';
import type { RegistryItem } from './registryTypes';

function makeItem(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'item-1',
    wedding_site_id: 'site-1',
    item_type: 'product',
    item_name: 'Dinner plates',
    price_label: '$80.00',
    price_amount: 80,
    store_name: 'Home Store',
    merchant: 'Home Store',
    item_url: 'https://example.com/dinner-plates',
    canonical_url: 'https://example.com/dinner-plates',
    image_url: null,
    description: null,
    notes: null,
    quantity_needed: 1,
    quantity_purchased: 0,
    purchaser_name: null,
    purchase_status: 'available',
    hide_when_purchased: false,
    sort_order: 0,
    priority: 'medium',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    ...overrides,
  };
}

function buildDerived(items: RegistryItem[]) {
  return buildRegistryDashboardDerivedState({
    autoRefreshEnabled: true,
    items,
    monthlyRefreshCap: 50,
    monthlyRefreshCount: 0,
    registryThankYouLedger: {},
    refreshEnabledUntil: null,
    refreshIncludePurchased: false,
    search: '',
    filter: 'all',
    showAlertsOnly: false,
    showImageIssuesOnly: false,
  });
}

describe('registry public parity', () => {
  it('keeps dashboard guest-visibility counts aligned with public product-gift visibility', () => {
    const items = [
      makeItem({
        id: 'available-visible',
        item_name: 'Cake stand',
        purchase_status: 'available',
        quantity_needed: 1,
        quantity_purchased: 0,
      }),
      makeItem({
        id: 'partial-visible',
        item_name: 'Wine glasses',
        purchase_status: 'partial',
        quantity_needed: 6,
        quantity_purchased: 2,
        purchaser_name: 'Jordan',
      }),
      makeItem({
        id: 'hidden-purchased',
        item_name: 'Serving bowls',
        purchase_status: 'purchased',
        quantity_needed: 1,
        quantity_purchased: 1,
        purchaser_name: 'Maya',
        hide_when_purchased: true,
      }),
      makeItem({
        id: 'blocked-title',
        item_name: 'Page Not Found',
        purchase_status: 'available',
      }),
    ];

    const derived = buildDerived(items);
    const guestReadyPublic = sanitizePublicRegistryItems(items);
    const guestVisiblePublic = guestReadyPublic.filter((item) => !item.hide_when_purchased || item.purchase_status !== 'purchased');

    expect(derived.guestVisibilityStats).toEqual({
      guestReadyItems: guestReadyPublic.length,
      guestVisibleItems: guestVisiblePublic.length,
      visibleAvailableItems: guestVisiblePublic.filter((item) => item.purchase_status === 'available').length,
      visibleClaimedItems: guestVisiblePublic.filter((item) => item.purchase_status !== 'available').length,
      hiddenPurchasedItems: guestReadyPublic.filter((item) => item.hide_when_purchased && item.purchase_status === 'purchased').length,
      blockedGuestItems: items.length - guestReadyPublic.length,
      guestReadyCoverageRate: Math.round((guestReadyPublic.length / items.length) * 100),
      guestVisibleCoverageRate: Math.round((guestVisiblePublic.length / items.length) * 100),
    });
    expect(guestVisiblePublic.map((item) => item.id)).toEqual(['available-visible', 'partial-visible', 'blocked-title']);
    expect(guestVisiblePublic.find((item) => item.id === 'partial-visible')).toEqual(
      expect.objectContaining({
        purchase_status: 'partial',
        quantity_needed: 6,
        quantity_purchased: 2,
        purchaser_name: 'Jordan',
      }),
    );
  });

  it('keeps dashboard fund and thank-you truth aligned with what public guests can actually use', () => {
    const items = [
      makeItem({
        id: 'fund-ready',
        item_type: 'cash_fund',
        item_name: 'Honeymoon fund',
        price_label: null,
        price_amount: null,
        item_url: null,
        canonical_url: null,
        purchase_status: 'partial',
        quantity_needed: 1,
        quantity_purchased: 1,
        purchaser_name: 'Alex',
        fund_goal_amount: 4000,
        fund_received_amount: 1000,
        fund_venmo_url: 'https://venmo.com/dayof',
      }),
      makeItem({
        id: 'fund-blocked',
        item_type: 'cash_fund',
        item_name: 'New home fund',
        price_label: null,
        price_amount: null,
        item_url: null,
        canonical_url: null,
        purchase_status: 'partial',
        quantity_needed: 1,
        quantity_purchased: 1,
        purchaser_name: null,
        fund_goal_amount: null,
        fund_received_amount: 250,
        fund_venmo_url: 'javascript:alert(1)',
        fund_paypal_url: null,
        fund_custom_url: null,
        fund_zelle_handle: '   ',
      }),
      makeItem({
        id: 'gift-hidden',
        item_name: 'Toaster',
        purchase_status: 'purchased',
        quantity_needed: 1,
        quantity_purchased: 1,
        purchaser_name: null,
        hide_when_purchased: true,
      }),
    ];

    const derived = buildDerived(items);
    const guestReadyPublic = sanitizePublicRegistryItems(items);
    const guestVisiblePublic = guestReadyPublic.filter((item) => !item.hide_when_purchased || item.purchase_status !== 'purchased');

    expect(derived.fundStats).toMatchObject({
      count: 2,
      readyToShare: 1,
      needsSetup: 1,
      readyWithProgress: 1,
      flexibleWithProgress: 1,
    });
    expect(derived.registryThankYouStats).toEqual({
      purchasedCount: 3,
      completedCount: 0,
      pendingCount: 3,
      readyToSendCount: 1,
      blockedByMissingPurchaserCount: 2,
      attributionCoverageRate: 33,
      completionRate: 0,
    });
    expect(derived.guestVisibilityStats).toEqual({
      guestReadyItems: guestReadyPublic.length,
      guestVisibleItems: guestVisiblePublic.length,
      visibleAvailableItems: guestVisiblePublic.filter((item) => item.purchase_status === 'available').length,
      visibleClaimedItems: guestVisiblePublic.filter((item) => item.purchase_status !== 'available').length,
      hiddenPurchasedItems: guestReadyPublic.filter((item) => item.hide_when_purchased && item.purchase_status === 'purchased').length,
      blockedGuestItems: items.length - guestReadyPublic.length,
      guestReadyCoverageRate: Math.round((guestReadyPublic.length / items.length) * 100),
      guestVisibleCoverageRate: Math.round((guestVisiblePublic.length / items.length) * 100),
    });
    expect(guestVisiblePublic.map((item) => item.id)).toEqual(['fund-ready', 'fund-blocked']);
    expect(guestVisiblePublic[0]).toEqual(
      expect.objectContaining({
        id: 'fund-ready',
        purchase_status: 'purchased',
        quantity_purchased: 1,
        fund_venmo_url: 'https://venmo.com/dayof',
      }),
    );
    expect(guestVisiblePublic.find((item) => item.id === 'fund-blocked')).toEqual(
      expect.objectContaining({
        fund_venmo_url: null,
        fund_paypal_url: null,
        fund_custom_url: null,
      }),
    );
  });
});

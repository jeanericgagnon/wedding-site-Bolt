import { describe, expect, it } from 'vitest';
import { buildRegistryLaunchReadiness, buildRegistryThankYouPlanWithLedger, normalizeRegistryThankYouLedger, syncRegistryThankYouLedger, toggleRegistryThankYouLedgerStatus } from './registryLaunchReadiness';
import type { RegistryItem } from '../pages/dashboard/registry/registryTypes';

function item(overrides: Partial<RegistryItem> = {}): RegistryItem {
  return {
    id: 'gift-1',
    wedding_site_id: 'site-1',
    item_type: 'product',
    item_name: 'Dinner plates',
    price_label: '$80',
    price_amount: 80,
    store_name: 'Store',
    merchant: 'Store',
    item_url: 'https://example.com/plates',
    canonical_url: null,
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('registryLaunchReadiness', () => {
  it('marks product links and cash-fund paths ready without claiming native commerce', () => {
    const readiness = buildRegistryLaunchReadiness([
      item(),
      item({
        id: 'fund-1',
        item_type: 'cash_fund',
        item_name: 'Honeymoon fund',
        item_url: null,
        fund_goal_amount: 4000,
        fund_received_amount: 250,
        fund_venmo_url: 'https://venmo.com/dayof',
      }),
    ]);

    expect(readiness.status).toBe('ready');
    expect(readiness.reviewCount).toBe(0);
    expect(readiness.summary).toContain('Guest gift links and fund paths are ready');
    expect(readiness.items.find((entry) => entry.id === 'external-links')?.detail).toContain('100% coverage');
    expect(readiness.items.find((entry) => entry.id === 'cash-funds')).toMatchObject({
      tone: 'ready',
      count: 0,
    });
    expect(readiness.items.find((entry) => entry.id === 'cash-funds')?.detail).toContain('100% coverage');
  });

  it('flags unsafe product and payment links before a guest share', () => {
    const readiness = buildRegistryLaunchReadiness([
      item({ item_url: 'javascript:alert(1)', canonical_url: null }),
      item({
        id: 'fund-1',
        item_type: 'cash_fund',
        item_name: 'Home fund',
        item_url: null,
        fund_custom_url: 'data:text/html,<script>alert(1)</script>',
      }),
    ]);

    expect(readiness.status).toBe('needs-review');
    expect(readiness.reviewCount).toBeGreaterThan(0);
    expect(readiness.items.find((entry) => entry.id === 'external-links')?.tone).toBe('review');
    expect(readiness.items.find((entry) => entry.id === 'external-links')?.detail).toContain('0% coverage');
    expect(readiness.items.find((entry) => entry.id === 'cash-funds')?.tone).toBe('review');
    expect(readiness.items.find((entry) => entry.id === 'cash-funds')?.detail).toContain('0% coverage');
  });

  it('keeps thank-you follow-up planned instead of pretending tasks already exist', () => {
    const readiness = buildRegistryLaunchReadiness([
      item({ purchase_status: 'purchased', quantity_purchased: 1, purchaser_name: 'Alex', hide_when_purchased: true }),
    ]);

    expect(readiness.items.find((entry) => entry.id === 'thank-you-follow-up')).toMatchObject({
      tone: 'ready',
      count: 1,
    });
    expect(readiness.items.find((entry) => entry.id === 'thank-you-follow-up')?.detail).toContain('100% purchaser attribution coverage');
    expect(readiness.items.find((entry) => entry.id === 'hide-purchased')?.detail).toContain('hide after purchase');
  });

  it('builds a persisted thank-you list from purchased gifts', () => {
    const plan = buildRegistryThankYouPlanWithLedger([
      item({ id: 'plates', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_purchased: 1, purchaser_name: 'Alex' }),
      item({ id: 'towels', item_name: 'Towels', purchase_status: 'partial', quantity_needed: 4, quantity_purchased: 2, purchaser_name: null }),
    ], {});

    expect(plan.headline).toBe('Thank-you follow-up list');
    expect(plan.purchasedCount).toBe(2);
    expect(plan.namedPurchaserCount).toBe(1);
    expect(plan.missingPurchaserCount).toBe(1);
    expect(plan.completedCount).toBe(0);
    expect(plan.items.find((entry) => entry.id === 'plates')).toMatchObject({
      purchaserLabel: 'Purchased by Alex',
      taskStatus: 'todo',
    });
    expect(plan.items.find((entry) => entry.id === 'towels')).toMatchObject({
      taskStatus: 'needs-purchaser',
    });
  });

  it('keeps the thank-you preview quiet before gifts are purchased', () => {
    const plan = buildRegistryThankYouPlanWithLedger([item()], {});

    expect(plan.headline).toBe('Thank-you follow-up is quiet');
    expect(plan.items).toEqual([]);
    expect(plan.summary).toContain('Purchased gifts will appear here');
  });

  it('normalizes and syncs persisted thank-you ledger entries', () => {
    const normalized = normalizeRegistryThankYouLedger({
      plates: {
        itemId: 'plates',
        giftName: 'Dinner plates',
        purchaserName: 'Alex',
        quantityPurchased: 1,
        quantityNeeded: 1,
        status: 'done',
        generatedAt: '2026-05-01T00:00:00.000Z',
        completedAt: '2026-05-02T00:00:00.000Z',
      },
      bad: 'nope',
    });

    const synced = syncRegistryThankYouLedger([
      item({ id: 'plates', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_purchased: 1, purchaser_name: 'Alex' }),
      item({ id: 'bowls', item_name: 'Bowls', purchase_status: 'partial', quantity_purchased: 1, quantity_needed: 2 }),
    ], normalized, '2026-05-03T00:00:00.000Z');

    expect(synced.plates.status).toBe('done');
    expect(synced.bowls.status).toBe('needs-purchaser');
    expect(Object.keys(synced)).toEqual(['plates', 'bowls']);
  });

  it('masks broken import titles before they reach thank-you follow-up surfaces', () => {
    const synced = syncRegistryThankYouLedger([
      item({ id: 'broken', item_name: 'Page Not Found', purchase_status: 'purchased', quantity_purchased: 1, purchaser_name: 'Alex' }),
    ], {}, '2026-05-03T00:00:00.000Z');

    const plan = buildRegistryThankYouPlanWithLedger([
      item({ id: 'broken', item_name: 'Page Not Found', purchase_status: 'purchased', quantity_purchased: 1, purchaser_name: 'Alex' }),
    ], synced);

    expect(synced.broken.giftName).toBe('Gift link needs review');
    expect(plan.items.find((entry) => entry.id === 'broken')).toMatchObject({
      giftName: 'Gift link needs review',
    });
  });

  it('toggles persisted thank-you sent state without losing purchaser truth', () => {
    const toggledDone = toggleRegistryThankYouLedgerStatus({
      plates: {
        itemId: 'plates',
        giftName: 'Dinner plates',
        purchaserName: 'Alex',
        quantityPurchased: 1,
        quantityNeeded: 1,
        status: 'todo',
        generatedAt: '2026-05-01T00:00:00.000Z',
        completedAt: null,
      },
    }, 'plates', '2026-05-04T00:00:00.000Z');

    expect(toggledDone.plates.status).toBe('done');
    expect(toggledDone.plates.completedAt).toBe('2026-05-04T00:00:00.000Z');

    const toggledBack = toggleRegistryThankYouLedgerStatus(toggledDone, 'plates', '2026-05-05T00:00:00.000Z');
    expect(toggledBack.plates.status).toBe('todo');
    expect(toggledBack.plates.completedAt).toBeNull();
  });
});

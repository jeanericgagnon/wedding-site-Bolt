import { describe, expect, it } from 'vitest';
import { buildRegistryLaunchReadiness, buildRegistryThankYouPlan } from './registryLaunchReadiness';
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
    expect(readiness.items.find((entry) => entry.id === 'cash-funds')).toMatchObject({
      tone: 'ready',
      count: 0,
    });
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
    expect(readiness.items.find((entry) => entry.id === 'cash-funds')?.tone).toBe('review');
  });

  it('keeps thank-you follow-up planned instead of pretending tasks already exist', () => {
    const readiness = buildRegistryLaunchReadiness([
      item({ purchase_status: 'purchased', quantity_purchased: 1, purchaser_name: 'Alex', hide_when_purchased: true }),
    ]);

    expect(readiness.items.find((entry) => entry.id === 'thank-you-follow-up')).toMatchObject({
      tone: 'planned',
      count: 1,
    });
    expect(readiness.items.find((entry) => entry.id === 'hide-purchased')?.detail).toContain('hide after purchase');
  });

  it('builds a thank-you preview from purchased gifts without claiming tasks already exist', () => {
    const plan = buildRegistryThankYouPlan([
      item({ id: 'plates', item_name: 'Dinner plates', purchase_status: 'purchased', quantity_purchased: 1, purchaser_name: 'Alex' }),
      item({ id: 'towels', item_name: 'Towels', purchase_status: 'partial', quantity_needed: 4, quantity_purchased: 2, purchaser_name: null }),
    ]);

    expect(plan.headline).toBe('Thank-you follow-up preview');
    expect(plan.purchasedCount).toBe(2);
    expect(plan.namedPurchaserCount).toBe(1);
    expect(plan.missingPurchaserCount).toBe(1);
    expect(plan.items.find((entry) => entry.id === 'plates')).toMatchObject({
      purchaserLabel: 'Purchased by Alex',
      status: 'planned',
    });
    expect(plan.items.find((entry) => entry.id === 'towels')?.detail).toContain('2 of 4 marked purchased');
  });

  it('keeps the thank-you preview quiet before gifts are purchased', () => {
    const plan = buildRegistryThankYouPlan([item()]);

    expect(plan.headline).toBe('Thank-you follow-up is quiet');
    expect(plan.items).toEqual([]);
    expect(plan.summary).toContain('Purchased gifts will appear here');
  });
});

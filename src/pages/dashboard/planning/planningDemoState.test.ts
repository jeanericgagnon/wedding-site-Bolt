import { beforeEach, describe, expect, it } from 'vitest';
import { readDemoPlanningState, writeDemoPlanningState, DEMO_PLANNING_STATE_STORAGE_KEY } from './planningDemoState';

describe('planningDemoState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default demo planning state when storage is empty', () => {
    const state = readDemoPlanningState();

    expect(state.totalBudget).toBe(30000);
    expect(state.budgetItems.length).toBeGreaterThan(0);
    expect(state.vendors.length).toBeGreaterThan(0);
    expect(state.vendorMeta).toEqual({});
  });

  it('persists budget, vendor, and vendor-meta edits for demo proof continuity', () => {
    const saved = writeDemoPlanningState({
      totalBudget: 41250,
      budgetItems: [
        {
          id: 'demo-budget-proof',
          wedding_site_id: 'demo-site-id',
          category: 'Florals',
          item_name: 'Proof florals',
          estimated_amount: 1800,
          actual_amount: 1200,
          paid_amount: 600,
          due_date: '2026-06-10',
          vendor_id: 'demo-vendor-proof',
          notes: 'Proof note',
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
      ],
      vendors: [
        {
          id: 'demo-vendor-proof',
          wedding_site_id: 'demo-site-id',
          vendor_type: 'Florist',
          name: 'Proof Florals',
          contact_name: 'Iris Bloom',
          email: 'iris@proof.demo',
          phone: '(555) 111-2222',
          website: 'https://proof.demo/florals',
          contract_total: 1800,
          amount_paid: 600,
          balance_due: 1200,
          next_payment_due: '2026-06-10',
          document_url: null,
          document_label: null,
          notes: 'Bring extra candles',
          internal_rating: 4,
          rating_status: 'Shortlist',
          rating_notes: 'Warm response time',
          created_at: '2026-05-14T00:00:00.000Z',
          updated_at: '2026-05-14T00:00:00.000Z',
        },
      ],
      vendorMeta: {
        'demo-vendor-proof': {
          nextFollowUp: '2026-05-20',
          reminderChannel: 'email',
          reminderLeadDays: 3,
        },
      },
    });

    expect(saved.totalBudget).toBe(41250);

    const restored = readDemoPlanningState();
    expect(restored.totalBudget).toBe(41250);
    expect(restored.budgetItems[0]?.item_name).toBe('Proof florals');
    expect(restored.vendors[0]?.name).toBe('Proof Florals');
    expect(restored.vendorMeta['demo-vendor-proof']).toMatchObject({
      nextFollowUp: '2026-05-20',
      reminderChannel: 'email',
      reminderLeadDays: 3,
    });
  });

  it('drops malformed storage and falls back to defaults', () => {
    window.localStorage.setItem(DEMO_PLANNING_STATE_STORAGE_KEY, JSON.stringify({ value: { budgetItems: 'bad' } }));

    const restored = readDemoPlanningState();
    expect(restored.totalBudget).toBe(30000);
    expect(restored.budgetItems.length).toBeGreaterThan(0);
    expect(restored.vendors.length).toBeGreaterThan(0);
  });
});

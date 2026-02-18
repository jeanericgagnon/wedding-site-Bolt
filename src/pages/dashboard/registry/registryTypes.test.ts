import { describe, it, expect } from 'vitest';
import { EMPTY_DRAFT, type RegistryItemDraft, type PurchaseStatus } from './registryTypes';

describe('EMPTY_DRAFT', () => {
  it('has empty item_name', () => {
    expect(EMPTY_DRAFT.item_name).toBe('');
  });

  it('has desired_quantity of 1', () => {
    expect(EMPTY_DRAFT.desired_quantity).toBe('1');
  });

  it('has hide_when_purchased false', () => {
    expect(EMPTY_DRAFT.hide_when_purchased).toBe(false);
  });

  it('has all string fields empty', () => {
    const strFields: (keyof RegistryItemDraft)[] = [
      'price_label',
      'price_amount',
      'merchant',
      'item_url',
      'image_url',
      'notes',
    ];
    for (const field of strFields) {
      expect(EMPTY_DRAFT[field]).toBe('');
    }
  });
});

describe('PurchaseStatus type values', () => {
  it('accepts available', () => {
    const s: PurchaseStatus = 'available';
    expect(s).toBe('available');
  });

  it('accepts partial', () => {
    const s: PurchaseStatus = 'partial';
    expect(s).toBe('partial');
  });

  it('accepts purchased', () => {
    const s: PurchaseStatus = 'purchased';
    expect(s).toBe('purchased');
  });
});

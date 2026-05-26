import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorsTab } from './VendorsTab';
import type { PlanningVendor } from './planningService';

const vendors: PlanningVendor[] = [
  {
    id: 'vendor-1',
    wedding_site_id: 'site-1',
    vendor_type: 'Photographer',
    name: 'North Light Studio',
    contact_name: 'Avery',
    email: 'hello@northlight.test',
    phone: '',
    website: 'https://northlight.test',
    contract_total: 6000,
    amount_paid: 2000,
    balance_due: 4000,
    next_payment_due: '2026-06-01',
    notes: 'Warm editorial style',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  },
];

describe('VendorsTab', () => {
  it('renders the vendor fit guide deck', () => {
    render(
      <VendorsTab
        vendors={vendors}
        onAdd={vi.fn(async () => undefined)}
        onUpdate={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText('Vendor fit guide')).toBeInTheDocument();
    expect(screen.getAllByText('North Light Studio').length).toBeGreaterThan(0);
  });
});

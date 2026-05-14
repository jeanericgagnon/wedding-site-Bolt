import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BudgetTab } from './BudgetTab';
import type { PlanningBudgetItem, PlanningVendor } from './planningService';

const budgetItems: PlanningBudgetItem[] = [
  {
    id: 'budget-1',
    wedding_site_id: 'site-1',
    category: 'Venue',
    item_name: 'Venue deposit',
    estimated_amount: 5000,
    actual_amount: 5000,
    paid_amount: 2500,
    due_date: '2026-06-15',
    vendor_id: 'vendor-1',
    notes: 'Second half due next month.',
    created_at: '2026-05-01T12:00:00.000Z',
    updated_at: '2026-05-01T12:00:00.000Z',
  },
];

const vendors: PlanningVendor[] = [
  {
    id: 'vendor-1',
    wedding_site_id: 'site-1',
    vendor_type: 'Venue',
    name: 'Rose Hall',
    contact_name: 'Jordan',
    email: 'rose@example.com',
    phone: '555-0100',
    website: 'https://rosehall.example.com',
    contract_total: 5000,
    amount_paid: 2500,
    balance_due: 2500,
    next_payment_due: '2026-06-15',
    document_url: 'https://docs.example.com/rose-hall',
    document_label: 'Venue contract',
    notes: 'Main ballroom',
    internal_rating: 5,
    rating_status: 'Booked',
    rating_notes: 'Strong fit',
    created_at: '2026-05-01T12:00:00.000Z',
    updated_at: '2026-05-01T12:00:00.000Z',
  },
];

describe('BudgetTab', () => {
  it('keeps ledger readback visible while turning edits off for read-only roles', () => {
    const { container } = render(
      <BudgetTab
        items={budgetItems}
        vendors={vendors}
        vendorMeta={{
          'vendor-1': {
            contractFiles: [{ id: 'file-1', kind: 'contract', label: 'Venue contract', url: 'https://docs.example.com/venue' }],
            paymentMilestones: [{ id: 'm1', label: 'Final balance', amount: 2500, dueDate: '2026-06-15', status: 'scheduled' }],
          },
        }}
        totalBudget={12000}
        onTotalBudgetChange={vi.fn().mockResolvedValue(undefined)}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        canEdit={false}
      />,
    );

    expect(screen.getByText('Owner and planner financial details')).toBeInTheDocument();
    expect(screen.getByText(/guest-facing surfaces do not expose these financial details/i)).toBeInTheDocument();
    expect(screen.getByText('Budget and vendor ledger')).toBeInTheDocument();
    expect(screen.getByText('Vendor balance reconciliation')).toBeInTheDocument();
    expect(screen.getByText(/Totals, files, and milestones are lined up/i)).toBeInTheDocument();
    expect(screen.getByText('Contact ready')).toBeInTheDocument();
    expect(screen.getByText('Due dates saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export ledger/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Add expense/i })).toBeDisabled();
    expect(screen.getByDisplayValue('12000')).toBeDisabled();
    expect(screen.getByText('Read only in this role')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Table/i }));

    const disabledButtons = Array.from(container.querySelectorAll('button')).filter((button) => button.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(2);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../../components/ui/Toast';
import { PaymentsTab } from './PaymentsTab';
import type { PlanningBudgetItem, PlanningVendor } from './planningService';

const { copyTextOrDownload } = vi.hoisted(() => ({
  copyTextOrDownload: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
}));

const items: PlanningBudgetItem[] = [
  {
    id: 'budget-1',
    wedding_site_id: 'site-1',
    category: 'Venue',
    item_name: 'Venue final payment',
    estimated_amount: 5000,
    actual_amount: 5000,
    paid_amount: 2500,
    due_date: '2026-06-15',
    vendor_id: 'vendor-1',
    notes: 'Final half due next month.',
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

describe('PaymentsTab', () => {
  beforeEach(() => {
    copyTextOrDownload.mockReset();
  });

  it('restores the paid action after a failed payment update', async () => {
    const user = userEvent.setup();
    const onUpdateBudgetItem = vi.fn().mockRejectedValueOnce(new Error('update failed'));

    render(
      <ToastProvider>
        <PaymentsTab
          items={items}
          vendors={vendors}
          vendorMeta={{}}
          onUpdateBudgetItem={onUpdateBudgetItem}
          onUpdateVendor={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    const paidButton = screen.getByRole('button', { name: /^paid$/i });
    await user.click(paidButton);

    expect(onUpdateBudgetItem).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /^paid$/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t mark that payment as paid right now\./i)).toBeInTheDocument();
  });

  it('restores the copy-summary action after a failed copy', async () => {
    const user = userEvent.setup();
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    render(
      <ToastProvider>
        <PaymentsTab
          items={items}
          vendors={vendors}
          vendorMeta={{}}
          onUpdateBudgetItem={vi.fn().mockResolvedValue(undefined)}
          onUpdateVendor={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /copy summary/i }));

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy summary/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy the payment summary right now\./i)).toBeInTheDocument();
  });

  it('shows a downloaded fallback label after the payment summary falls back from clipboard copy', async () => {
    const user = userEvent.setup();
    copyTextOrDownload.mockResolvedValueOnce('downloaded');

    render(
      <ToastProvider>
        <PaymentsTab
          items={items}
          vendors={vendors}
          vendorMeta={{}}
          onUpdateBudgetItem={vi.fn().mockResolvedValue(undefined)}
          onUpdateVendor={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /copy summary/i }));

    expect(await screen.findByRole('button', { name: /downloaded payment summary/i })).toBeInTheDocument();
  });

  it('ignores a stale payment summary copy after payment data changes', async () => {
    const user = userEvent.setup();
    let resolveCopy: (value: 'copied') => void = () => {};
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      resolveCopy = resolve;
    }));

    const { rerender } = render(
      <ToastProvider>
        <PaymentsTab
          items={items}
          vendors={vendors}
          vendorMeta={{}}
          onUpdateBudgetItem={vi.fn().mockResolvedValue(undefined)}
          onUpdateVendor={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /copy summary/i }));
    expect(screen.getByRole('button', { name: /copying/i })).toBeDisabled();

    rerender(
      <ToastProvider>
        <PaymentsTab
          items={[{ ...items[0], paid_amount: 5000 }]}
          vendors={vendors}
          vendorMeta={{}}
          onUpdateBudgetItem={vi.fn().mockResolvedValue(undefined)}
          onUpdateVendor={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /copy summary/i })).toBeEnabled());

    await act(async () => {
      resolveCopy('copied');
    });

    expect(screen.getByRole('button', { name: /copy summary/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied payment summary/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/payment summary copied\./i)).not.toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../components/ui/Toast';
import { BudgetTab } from './BudgetTab';
import type { PlanningBudgetItem, PlanningVendor } from './planningService';

const { downloadTextFile } = vi.hoisted(() => ({
  downloadTextFile: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}));

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

async function clickControl(element: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.click(element);
  });
}

async function selectControl(element: HTMLElement, value: string): Promise<void> {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
  });
}

async function setControlValue(element: HTMLElement, value: string): Promise<void> {
  await act(async () => {
    fireEvent.change(element, { target: { value: '' } });
    fireEvent.change(element, { target: { value } });
  });
}

async function advanceAutosave(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(750);
    await Promise.resolve();
  });
}

async function flushPendingUi(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('BudgetTab', () => {
  beforeEach(() => {
    downloadTextFile.mockReset();
  });

  it('keeps ledger readback visible while turning edits off for read-only roles', () => {
    const { container } = render(
      <ToastProvider>
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
        />
      </ToastProvider>,
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

    const disabledButtons = screen.getAllByRole('button').filter((button) => (button as HTMLButtonElement).disabled);
    expect(disabledButtons.length).toBeGreaterThan(2);
  });

  it('exports the budget ledger through the attached download helper', async () => {
    render(
      <ToastProvider>
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={{
            'vendor-1': {
              reminderChannel: 'email',
              reminderLeadDays: 14,
              reminderLastQueuedAt: '2026-05-10T12:00:00.000Z',
              contractFiles: [{ id: 'file-1', kind: 'contract', label: 'Venue contract', url: 'https://docs.example.com/venue' }],
              paymentMilestones: [{ id: 'm1', label: 'Final balance', amount: 2500, dueDate: '2026-06-15', status: 'scheduled' }],
            },
          }}
          totalBudget={12000}
          onTotalBudgetChange={vi.fn().mockResolvedValue(undefined)}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await clickControl(screen.getByRole('button', { name: /Export ledger/i }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.stringMatching(/^dayof-budget-vendor-ledger-\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringContaining('Rose Hall'),
      'text/csv;charset=utf-8',
    );
    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Final balance'),
      expect.any(String),
    );
  });

  it('restores the add-expense save button after a failed save', async () => {
    const onAdd = vi.fn().mockRejectedValueOnce(new Error('save failed'));

    render(
      <ToastProvider>
        <BudgetTab
          items={[]}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={vi.fn().mockResolvedValue(undefined)}
          onAdd={onAdd}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await clickControl(screen.getByRole('button', { name: /add expense/i }));
    await selectControl(screen.getByLabelText(/category/i), 'Venue');
    await setControlValue(screen.getByLabelText(/item name/i), 'Welcome dinner deposit');

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    await clickControl(saveButton);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /^save$/i })).toBeEnabled();
    expect(screen.getByLabelText(/item name/i)).toHaveValue('Welcome dinner deposit');
    expect(screen.getByText(/couldn’t save that budget item right now\./i)).toBeInTheDocument();
  });

  it('shows an error toast when budget goal autosave fails', async () => {
    vi.useFakeTimers();
    const onTotalBudgetChange = vi.fn().mockRejectedValueOnce(new Error('autosave failed'));

    render(
      <ToastProvider>
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={onTotalBudgetChange}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    const input = screen.getByDisplayValue('12000');
    await setControlValue(input, '13000');

    await advanceAutosave();

    expect(onTotalBudgetChange).toHaveBeenCalledWith(13000);
    expect(screen.getByText(/couldn’t save the budget goal right now\./i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('cancels stale budget autosave and open forms when edit access is removed', async () => {
    vi.useFakeTimers();
    const onTotalBudgetChange = vi.fn().mockResolvedValue(undefined);
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <ToastProvider>
        <BudgetTab
          items={[]}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={onTotalBudgetChange}
          onAdd={onAdd}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await clickControl(screen.getByRole('button', { name: /add expense/i }));
    expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    await setControlValue(screen.getByDisplayValue('12000'), '13000');

    rerender(
      <ToastProvider>
        <BudgetTab
          items={[]}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={onTotalBudgetChange}
          onAdd={onAdd}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          canEdit={false}
        />
      </ToastProvider>,
    );

    await advanceAutosave();

    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add expense/i })).toBeDisabled();
    expect(onTotalBudgetChange).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('clears stale saved state when a later budget autosave fails', async () => {
    vi.useFakeTimers();
    const onTotalBudgetChange = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('autosave failed'));

    render(
      <ToastProvider>
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={onTotalBudgetChange}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    const input = screen.getByDisplayValue('12000');

    await setControlValue(input, '12500');
    await advanceAutosave();
    expect(onTotalBudgetChange).toHaveBeenCalledWith(12500);

    expect(screen.getByText(/saved /i)).toBeInTheDocument();

    await setControlValue(input, '13000');
    expect(screen.queryByText(/saved /i)).not.toBeInTheDocument();

    await advanceAutosave();

    expect(onTotalBudgetChange).toHaveBeenCalledWith(13000);
    expect(screen.getByText(/couldn’t save the budget goal right now\./i)).toBeInTheDocument();
    expect(screen.queryByText(/saved /i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not show a stale saved state when an older autosave resolves after a newer edit', async () => {
    vi.useFakeTimers();
    let resolveFirstSave: () => void = () => {};
    const onTotalBudgetChange = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        resolveFirstSave = resolve;
      }))
      .mockResolvedValueOnce(undefined);

    render(
      <ToastProvider>
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={onTotalBudgetChange}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    const input = screen.getByDisplayValue('12000');

    await setControlValue(input, '12500');
    await advanceAutosave();
    expect(onTotalBudgetChange).toHaveBeenCalledWith(12500);

    await setControlValue(input, '13000');
    expect(screen.queryByText(/saved /i)).not.toBeInTheDocument();

    resolveFirstSave?.();
    await flushPendingUi();
    expect(screen.queryByText(/saved /i)).not.toBeInTheDocument();

    await advanceAutosave();
    expect(onTotalBudgetChange).toHaveBeenCalledWith(13000);
    expect(screen.getByText(/saved /i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('keeps showing saving while a newer budget autosave is still pending', async () => {
    vi.useFakeTimers();
    let resolveFirstSave: () => void = () => {};
    let resolveSecondSave: () => void = () => {};
    const onTotalBudgetChange = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        resolveFirstSave = resolve;
      }))
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        resolveSecondSave = resolve;
      }));

    render(
      <ToastProvider>
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={onTotalBudgetChange}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    const input = screen.getByDisplayValue('12000');

    await setControlValue(input, '12500');
    await advanceAutosave();
    expect(onTotalBudgetChange).toHaveBeenCalledWith(12500);

    await setControlValue(input, '13000');
    await advanceAutosave();
    expect(onTotalBudgetChange).toHaveBeenCalledWith(13000);

    resolveFirstSave?.();
    await flushPendingUi();

    expect(screen.getByText('Saving…')).toBeInTheDocument();

    resolveSecondSave?.();
    await flushPendingUi();
    expect(screen.getByText(/saved /i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not show a stale autosave error from an older failed request after a newer edit starts', async () => {
    vi.useFakeTimers();
    let rejectFirstSave: (reason?: unknown) => void = () => {};
    let resolveSecondSave: () => void = () => {};
    const onTotalBudgetChange = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((_, reject) => {
        rejectFirstSave = reject;
      }))
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        resolveSecondSave = resolve;
      }));

    render(
      <ToastProvider>
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={onTotalBudgetChange}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    const input = screen.getByDisplayValue('12000');

    await setControlValue(input, '12500');
    await advanceAutosave();
    expect(onTotalBudgetChange).toHaveBeenCalledWith(12500);

    await setControlValue(input, '13000');
    await advanceAutosave();
    expect(onTotalBudgetChange).toHaveBeenCalledWith(13000);

    rejectFirstSave?.(new Error('stale autosave failed'));
    await flushPendingUi();

    expect(screen.queryByText(/couldn’t save the budget goal right now\./i)).not.toBeInTheDocument();

    resolveSecondSave?.();
    await flushPendingUi();
    expect(screen.getByText(/saved /i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows a toast when deleting a budget item fails', async () => {
    const onDelete = vi.fn().mockRejectedValueOnce(new Error('delete failed'));

    render(
      <ToastProvider>
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={{}}
          totalBudget={12000}
          onTotalBudgetChange={vi.fn().mockResolvedValue(undefined)}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={onDelete}
        />
      </ToastProvider>,
    );

    await clickControl(screen.getByRole('button', { name: /delete budget item venue deposit/i }));

    expect(onDelete).toHaveBeenCalledWith('budget-1');
    expect(await screen.findByText(/couldn’t delete that budget item right now\./i)).toBeInTheDocument();
  });
});

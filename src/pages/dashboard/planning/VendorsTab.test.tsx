import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { ToastProvider } from '../../../components/ui/Toast';
import { VendorsTab } from './VendorsTab';
import type { PlanningVendor } from './planningService';
import type { VendorMetaMap } from './vendorMetaStorage';

const { copyTextOrDownload, downloadTextFile } = vi.hoisted(() => ({
  copyTextOrDownload: vi.fn(),
  downloadTextFile: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}));

const vendors: PlanningVendor[] = [
  {
    id: 'vendor-1',
    wedding_site_id: 'site-1',
    vendor_type: 'Photographer',
    name: 'Photo Studio',
    contact_name: 'Taylor Reed',
    email: 'photo@example.com',
    phone: '555-0101',
    website: 'https://photo.example.com',
    contract_total: 4000,
    amount_paid: 1500,
    balance_due: 2500,
    next_payment_due: '2026-06-01',
    document_url: 'https://docs.example.com/photo-contract',
    document_label: 'Photo contract',
    notes: 'Need final shot list',
    internal_rating: 4,
    rating_status: 'Booked',
    rating_notes: 'Responsive and calm',
    created_at: '2026-05-01T12:00:00.000Z',
    updated_at: '2026-05-01T12:00:00.000Z',
  },
];

const vendorMeta: VendorMetaMap = {
  'vendor-1': {
    lastContacted: '2026-05-10',
    nextFollowUp: '2026-05-18',
    reminderChannel: 'email',
    reminderLeadDays: 7,
    reminderLastQueuedAt: '2026-05-11T12:00:00.000Z',
    contractFiles: [
      { id: 'file-1', kind: 'contract', label: 'Signed contract', url: 'https://docs.example.com/contract' },
    ],
    paymentMilestones: [
      { id: 'milestone-1', label: 'Final balance', dueDate: '2026-05-30', amount: 2500, status: 'scheduled' },
    ],
  },
};

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

function renderWithProviders(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  );
}

describe('VendorsTab', () => {
  beforeEach(() => {
    copyTextOrDownload.mockReset();
    downloadTextFile.mockReset();
  });

  it('shows readback but disables vendor mutations for read-only roles', () => {
    const { container } = renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        canEdit={false}
      />,
    );

    expect(screen.getByText('Owner and planner financial details')).toBeInTheDocument();
    expect(screen.getByText(/guest-facing pages do not expose vendor financial details/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy brief/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Export/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Add vendor/i })).toBeDisabled();
    expect(screen.getByText('Read-only role: editing is turned off here.')).toBeInTheDocument();

    const vendorControls = screen.getByLabelText('Edit vendor Photo Studio').parentElement as HTMLElement;
    fireEvent.click(within(vendorControls).getAllByRole('button')[0]);

    expect(screen.getByText(/Saved reminder:/i)).toBeInTheDocument();
    expect(screen.getByText('Contract and invoice files')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Signed contract')).toBeDisabled();
    expect(screen.getByText('Payment milestones')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Final balance')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Mark as contacted/i })).toBeDisabled();
    expect(screen.getByDisplayValue('2026-05-18')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Mark reminder queued/i })).toBeDisabled();
  });

  it('restores the add form save button after a failed save', async () => {
    const onAdd = vi.fn().mockRejectedValueOnce(new Error('save failed'));

    renderWithProviders(
      <VendorsTab
        vendorMeta={{}}
        vendors={[]}
        onAdd={onAdd}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /add vendor/i }));
    await selectControl(screen.getByLabelText(/type/i), 'Photographer');
    await setControlValue(screen.getByLabelText(/business name/i), 'New Vendor');

    const saveButton = screen.getByRole('button', { name: /save vendor/i });
    await clickControl(saveButton);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /save vendor/i })).toBeEnabled();
    expect(screen.getByLabelText(/business name/i)).toHaveValue('New Vendor');
    expect(screen.getByText(/couldn’t save that vendor right now\./i)).toBeInTheDocument();
  });

  it('clears open vendor write forms when edit access is removed', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderWithProviders(
      <VendorsTab
        vendorMeta={{}}
        vendors={[]}
        onAdd={onAdd}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /add vendor/i }));
    expect(screen.getByRole('button', { name: /save vendor/i })).toBeEnabled();

    rerender(
      <MemoryRouter>
        <ToastProvider>
          <VendorsTab
            vendorMeta={{}}
            vendors={[]}
            onAdd={onAdd}
            onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
            onUpdate={vi.fn().mockResolvedValue(undefined)}
            onDelete={vi.fn().mockResolvedValue(undefined)}
            canEdit={false}
          />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /save vendor/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add vendor/i })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows a toast when vendor meta save fails', async () => {
    const onSaveVendorMeta = vi.fn().mockRejectedValueOnce(new Error('meta save failed'));

    renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={onSaveVendorMeta}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const vendorControls = screen.getByLabelText('Edit vendor Photo Studio').parentElement as HTMLElement;
    await clickControl(within(vendorControls).getAllByRole('button')[0]);
    await clickControl(screen.getByRole('button', { name: /mark as contacted/i }));

    expect(onSaveVendorMeta).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/couldn’t save vendor follow-up details right now\./i)).toBeInTheDocument();
  });

  it('shows a toast when vendor delete fails', async () => {
    const onDelete = vi.fn().mockRejectedValueOnce(new Error('delete failed'));

    renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={onDelete}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /delete vendor photo studio/i }));

    expect(onDelete).toHaveBeenCalledWith('vendor-1');
    expect(await screen.findByText(/couldn’t delete that vendor right now\./i)).toBeInTheDocument();
  });

  it('restores the vendor-brief copy action after a failed copy', async () => {
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /copy brief/i }));

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy brief/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy the vendor brief right now\./i)).toBeInTheDocument();
  });

  it('shows copied vendor-brief state after clipboard success', async () => {
    copyTextOrDownload.mockResolvedValueOnce('copied');

    renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /copy brief/i }));

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copied brief/i })).toBeEnabled();
  });

  it('shows downloaded vendor-brief state after clipboard fallback', async () => {
    copyTextOrDownload.mockResolvedValueOnce('downloaded');

    renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /copy brief/i }));

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /downloaded brief/i })).toBeEnabled();
  });

  it('exports vendors through the attached download helper', async () => {
    renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /^export$/i }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.stringMatching(/^dayof-vendors-\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringContaining('Photo Studio'),
      'text/csv;charset=utf-8',
    );
    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Final balance'),
      expect.any(String),
    );
  });

  it('ignores stale vendor-brief copy completion after vendor data changes', async () => {
    let resolveCopy: (value: 'copied') => void = () => {};
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      resolveCopy = resolve;
    }));

    const { rerender } = renderWithProviders(
      <VendorsTab
        vendorMeta={vendorMeta}
        vendors={vendors}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await clickControl(screen.getByRole('button', { name: /copy brief/i }));
    expect(screen.getByRole('button', { name: /copying brief/i })).toBeDisabled();

    rerender(
      <MemoryRouter>
        <ToastProvider>
          <VendorsTab
            vendorMeta={vendorMeta}
            vendors={[{ ...vendors[0], balance_due: 0 }]}
            onAdd={vi.fn().mockResolvedValue(undefined)}
            onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
            onUpdate={vi.fn().mockResolvedValue(undefined)}
            onDelete={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /copy brief/i })).toBeEnabled());

    await act(async () => {
      resolveCopy('copied');
    });

    expect(screen.getByRole('button', { name: /copy brief/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied brief/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/vendor brief copied\./i)).not.toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../../../components/ui/Toast';
import { VendorsTab } from './VendorsTab';
import type { PlanningVendor } from './planningService';
import type { VendorMetaMap } from './vendorMetaStorage';

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

describe('VendorsTab', () => {
  it('shows readback but disables vendor mutations for read-only roles', () => {
    const { container } = render(
      <ToastProvider>
        <VendorsTab
          vendorMeta={vendorMeta}
          vendors={vendors}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onSaveVendorMeta={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          canEdit={false}
        />
      </ToastProvider>,
    );

    expect(screen.getByText('Owner and planner financial details')).toBeInTheDocument();
    expect(screen.getByText(/guest-facing pages do not expose vendor financial details/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy brief/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Export/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Add vendor/i })).toBeDisabled();
    expect(screen.getByText('Read-only role: editing is turned off here.')).toBeInTheDocument();

    fireEvent.click(container.querySelector('.lucide-chevron-down')?.closest('button') as HTMLButtonElement);

    expect(screen.getByText(/Saved reminder:/i)).toBeInTheDocument();
    expect(screen.getByText('Contract and invoice files')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Signed contract')).toBeDisabled();
    expect(screen.getByText('Payment milestones')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Final balance')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Mark as contacted/i })).toBeDisabled();
    expect(screen.getByDisplayValue('2026-05-18')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Mark reminder queued/i })).toBeDisabled();
  });
});

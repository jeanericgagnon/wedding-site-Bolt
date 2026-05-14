import { describe, expect, it } from 'vitest';
import { buildVendorReminderLedgerSummary, formatVendorReminderChannel, formatVendorReminderLeadDays } from './vendorReminderLedger';

describe('vendorReminderLedger', () => {
  it('summarizes reminder-ready vendor follow-up state honestly', () => {
    const summary = buildVendorReminderLedgerSummary({
      vendors: [
        {
          id: 'vendor-1',
          wedding_site_id: 'site-1',
          vendor_type: 'Florist',
          name: 'Bloom',
          contact_name: '',
          email: '',
          phone: '',
          website: '',
          contract_total: 1200,
          amount_paid: 600,
          balance_due: 600,
          next_payment_due: '2026-05-20',
          notes: '',
          created_at: '',
          updated_at: '',
        },
        {
          id: 'vendor-2',
          wedding_site_id: 'site-1',
          vendor_type: 'DJ',
          name: 'Night Shift',
          contact_name: '',
          email: '',
          phone: '',
          website: '',
          contract_total: 1800,
          amount_paid: 0,
          balance_due: 1800,
          next_payment_due: '2026-05-23',
          notes: '',
          created_at: '',
          updated_at: '',
        },
      ],
      vendorMeta: {
        'vendor-1': {
          nextFollowUp: '2026-05-18',
          reminderChannel: 'email',
          reminderLeadDays: 3,
          reminderLastQueuedAt: '2026-05-10T12:00:00.000Z',
        },
      },
      compareDate: new Date('2026-05-18T00:00:00.000Z'),
    });

    expect(summary).toMatchObject({
      vendorCount: 2,
      reminderReadyCount: 1,
      followUpDueCount: 1,
      queuedCount: 1,
    });
    expect(summary.summary).toContain('1 of 2 vendor reminders');
  });

  it('formats reminder labels safely', () => {
    expect(formatVendorReminderChannel('email')).toBe('Email');
    expect(formatVendorReminderChannel('phone')).toBe('Phone');
    expect(formatVendorReminderChannel('none')).toBe('No reminder');
    expect(formatVendorReminderLeadDays(3)).toBe('3 days before');
    expect(formatVendorReminderLeadDays(1)).toBe('1 day before');
    expect(formatVendorReminderLeadDays(null)).toBe('Not set');
  });
});

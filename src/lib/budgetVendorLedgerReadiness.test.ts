import { describe, expect, it } from 'vitest';
import { budgetVendorLedgerToCsv, buildBudgetPaymentReview, buildBudgetVendorLedgerReadiness, buildBudgetVendorReconciliation } from './budgetVendorLedgerReadiness';

describe('budget vendor ledger readiness', () => {
  it('marks a complete ledger ready for planner handoff', () => {
    const readiness = buildBudgetVendorLedgerReadiness({
      totalBudget: 50000,
      today: new Date('2026-05-04T12:00:00Z'),
      vendors: [
        {
          id: 'vendor-1',
          name: 'Rose Hall',
          vendor_type: 'Venue',
          email: 'venue@example.com',
          contract_total: 12000,
          amount_paid: 6000,
          balance_due: 6000,
          next_payment_due: '2026-06-10',
          document_url: 'https://docs.example.com/venue',
        },
      ],
      budgetItems: [
        {
          id: 'budget-1',
          category: 'Venue',
          item_name: 'Venue balance',
          estimated_amount: 12000,
          actual_amount: 12000,
          paid_amount: 6000,
          due_date: '2026-06-10',
          vendor_id: 'vendor-1',
        },
      ],
    });

    expect(readiness.status).toBe('ready');
    expect(readiness.summary).toBe('Ready for a planner or payment check-in.');
    expect(readiness.openBalance).toBe(6000);
    expect(readiness.contactableVendorCount).toBe(1);
    expect(readiness.documentedVendorCount).toBe(1);
    expect(readiness.dueSoonCount).toBe(0);
  });

  it('flags missing contacts, documents, dates, and budget setup without leaking guest data', () => {
    const readiness = buildBudgetVendorLedgerReadiness({
      totalBudget: 0,
      today: new Date('2026-05-04T12:00:00Z'),
      vendors: [
        {
          id: 'vendor-1',
          name: 'Catering Co',
          vendor_type: 'Caterer',
          contract_total: 9000,
          amount_paid: 1000,
          balance_due: 8000,
          next_payment_due: '2026-05-10',
        },
      ],
      budgetItems: [
        {
          id: 'budget-1',
          category: 'Catering',
          item_name: 'Dinner',
          estimated_amount: 8000,
          actual_amount: 9000,
          paid_amount: 1000,
          due_date: '2026-05-10',
        },
      ],
    });

    expect(readiness.status).toBe('needs-review');
    expect(readiness.checklist.filter((item) => item.state === 'needs-action').map((item) => item.id)).toEqual([
      'budget-goal',
      'vendor-contacts',
      'contracts-docs',
      'payment-reminders',
    ]);
    expect(readiness.unlinkedBudgetItemCount).toBe(1);
  });

  it('exports a combined budget and vendor ledger csv', () => {
    const csv = budgetVendorLedgerToCsv({
      vendors: [
        {
          id: 'vendor-1',
          name: 'Photo Studio',
          vendor_type: 'Photographer',
          email: 'photo@example.com',
          phone: '555-0101',
          contract_total: 5000,
          amount_paid: 2500,
          balance_due: 2500,
          next_payment_due: '2026-05-20',
          document_url: 'https://docs.example.com/photo',
          notes: 'Needs final shot list',
          internal_rating: 5,
          rating_status: 'Booked',
          rating_notes: 'Strong fit',
        },
      ],
      budgetItems: [
        {
          id: 'budget-1',
          category: 'Photography',
          item_name: 'Photo deposit',
          estimated_amount: 5000,
          actual_amount: 5000,
          paid_amount: 2500,
          due_date: '2026-05-20',
          vendor_id: 'vendor-1',
          notes: 'Booked',
        },
      ],
      vendorMeta: {
        'vendor-1': {
          nextFollowUp: '2026-05-18',
          reminderChannel: 'email',
          reminderLeadDays: 7,
          reminderLastQueuedAt: '2026-05-11T12:00:00.000Z',
          contractFiles: [
            { id: 'file-1', kind: 'contract', label: 'Signed contract', url: 'https://docs.example.com/photo-contract' },
          ],
          paymentMilestones: [
            { id: 'm1', label: 'Final balance', dueDate: '2026-05-20', amount: 2500, status: 'scheduled' },
          ],
        },
      },
    });

    expect(csv).toContain('"Record Type","Name","Category or Type","Vendor"');
    expect(csv).toContain('"Reminder Channel","Follow Up","Reminder Lead Time","Reminder Last Queued"');
    expect(csv).toContain('"Internal Rating","Rating Status","Private Rating Notes","Notes"');
    expect(csv).toContain('"Budget item","Photo deposit","Photography","Photo Studio"');
    expect(csv).toContain('"Vendor","Photo Studio","Photographer","Photo Studio"');
    expect(csv).toContain('"photo@example.com / 555-0101"');
    expect(csv).toContain('"Email","2026-05-18","7 days before","2026-05-11T12:00:00.000Z"');
    expect(csv).toContain('"contract: Signed contract"');
    expect(csv).toContain('"Final balance (scheduled, 2026-05-20, $2,500)"');
    expect(csv).toContain('"5","Booked","Strong fit","Booked"');
  });

  it('builds a planner payment review without guest-facing financial exposure', () => {
    const review = buildBudgetPaymentReview({
      today: new Date('2026-05-04T12:00:00Z'),
      vendors: [
        {
          id: 'vendor-1',
          name: 'Rose Hall',
          vendor_type: 'Venue',
          email: 'venue@example.com',
          contract_total: 12000,
          amount_paid: 6000,
          balance_due: 6000,
          next_payment_due: '2026-05-03',
          document_url: 'https://docs.example.com/venue',
        },
        {
          id: 'vendor-2',
          name: 'Catering Co',
          vendor_type: 'Caterer',
          contract_total: 9000,
          amount_paid: 1000,
          balance_due: 8000,
          next_payment_due: '2026-05-10',
        },
      ],
      budgetItems: [
        {
          id: 'budget-1',
          category: 'Photography',
          item_name: 'Photo balance',
          estimated_amount: 5000,
          actual_amount: 5000,
          paid_amount: 2500,
          due_date: '2026-06-10',
          vendor_id: null,
        },
      ],
    });

    expect(review.status).toBe('needs-review');
    expect(review.openTotal).toBe(16500);
    expect(review.overdueCount).toBe(1);
    expect(review.dueSoonCount).toBe(1);
    expect(review.missingContactCount).toBe(2);
    expect(review.missingDocumentCount).toBe(2);
    expect(review.rows.map((row) => [row.name, row.status])).toEqual([
      ['Rose Hall', 'overdue'],
      ['Catering Co', 'due-soon'],
      ['Photo balance', 'open'],
    ]);
    expect(review.privacyNote).toContain('guest surfaces must not expose financial details');
  });

  it('keeps payment review ready when open balances have no near-term risk', () => {
    const review = buildBudgetPaymentReview({
      today: new Date('2026-05-04T12:00:00Z'),
      vendors: [
        {
          id: 'vendor-1',
          name: 'Photo Studio',
          vendor_type: 'Photographer',
          email: 'photo@example.com',
          contract_total: 5000,
          amount_paid: 2500,
          balance_due: 2500,
          next_payment_due: '2026-06-15',
          document_url: 'https://docs.example.com/photo',
        },
      ],
      budgetItems: [],
    });

    expect(review.status).toBe('ready');
    expect(review.summary).toBe('Open payments have contact details and no near-term due dates.');
    expect(review.rows).toHaveLength(1);
  });

  it('reconciles vendor totals, files, and milestones against linked budget rows', () => {
    const reconciliation = buildBudgetVendorReconciliation({
      vendors: [
        {
          id: 'vendor-1',
          name: 'Rose Hall',
          vendor_type: 'Venue',
          contract_total: 12000,
          amount_paid: 6000,
          balance_due: 6000,
        },
        {
          id: 'vendor-2',
          name: 'Bloom Floral',
          vendor_type: 'Florist',
          contract_total: 3000,
          amount_paid: 1000,
          balance_due: 2000,
        },
      ],
      budgetItems: [
        {
          id: 'budget-1',
          category: 'Venue',
          item_name: 'Venue balance',
          estimated_amount: 12000,
          actual_amount: 12000,
          paid_amount: 6000,
          vendor_id: 'vendor-1',
        },
        {
          id: 'budget-2',
          category: 'Florals',
          item_name: 'Florals',
          estimated_amount: 2500,
          actual_amount: 2500,
          paid_amount: 500,
          vendor_id: 'vendor-2',
        },
      ],
      vendorMeta: {
        'vendor-1': {
          contractFiles: [{ id: 'file-1', kind: 'contract', label: 'Signed contract', url: 'https://docs.example.com/venue' }],
          paymentMilestones: [{ id: 'm1', label: 'Final balance', dueDate: '2026-06-10', amount: 6000, status: 'scheduled' }],
        },
      },
    });

    expect(reconciliation.status).toBe('needs-review');
    expect(reconciliation.fileReadyCount).toBe(1);
    expect(reconciliation.milestoneReadyCount).toBe(1);
    expect(reconciliation.mismatchedCount).toBe(1);
    expect(reconciliation.rows[0]?.vendorName).toBe('Bloom Floral');
    expect(reconciliation.rows[0]?.issues).toContain('No contract or invoice files saved');
    expect(reconciliation.rows[0]?.issues.some((issue) => issue.includes('Contract differs from linked budget'))).toBe(true);
    expect(reconciliation.rows[0]?.issues.some((issue) => issue.includes('Paid totals differ by'))).toBe(true);
  });
});

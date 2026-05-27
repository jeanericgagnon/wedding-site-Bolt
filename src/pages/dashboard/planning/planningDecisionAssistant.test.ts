import { describe, expect, it } from 'vitest';

import {
  buildBudgetDecisionCard,
  buildPlanningOverviewDecisionCard,
  buildTasksDecisionCard,
  buildVendorsDecisionCard,
} from './planningDecisionAssistant';
import type { PlanningBudgetItem, PlanningTask, PlanningVendor } from './planningService';

const baseTask: PlanningTask = {
  id: 'task-1',
  wedding_site_id: 'site-1',
  title: 'Confirm rental counts',
  description: '',
  due_date: null,
  status: 'todo',
  priority: 'medium',
  owner_name: '',
  linked_event_id: null,
  linked_vendor_id: null,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const baseBudgetItem: PlanningBudgetItem = {
  id: 'budget-1',
  wedding_site_id: 'site-1',
  category: 'Venue',
  item_name: 'Venue final payment',
  estimated_amount: 4000,
  actual_amount: 3000,
  paid_amount: 2000,
  due_date: null,
  vendor_id: null,
  notes: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const baseVendor: PlanningVendor = {
  id: 'vendor-1',
  wedding_site_id: 'site-1',
  vendor_type: 'Venue',
  name: 'Garden Hall',
  contact_name: 'Morgan',
  email: 'team@gardenhall.com',
  phone: '555-111-2222',
  website: '',
  contract_total: 6000,
  amount_paid: 3000,
  balance_due: 3000,
  next_payment_due: null,
  notes: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('planningDecisionAssistant', () => {
  it('prioritizes overdue task cleanup in the overview model', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const model = buildPlanningOverviewDecisionCard({
      tasks: [{ ...baseTask, due_date: yesterday.toISOString().slice(0, 10), priority: 'high' }],
      budgetItems: [],
      vendors: [],
      seatingReadiness: { attending: 10, seated: 7, unassigned: 3 },
      itineraryEventCount: 2,
    });

    expect(model.title).toMatch(/Clear the overdue work first/i);
    expect(model.focusTitle).toMatch(/task board/i);
    expect(model.bestNextMove).toMatch(/overdue tasks|dates are honest/i);
    expect(model.decisionRule).toMatch(/fix that truth before you optimize/i);
    expect(model.primaryAction?.target).toBe('tasks');
    expect(model.secondaryAction?.target).toBe('seating');
  });

  it('surfaces category drift in the budget model before generic calm copy', () => {
    const model = buildBudgetDecisionCard([
      { ...baseBudgetItem, category: 'Venue', estimated_amount: 4000, actual_amount: 4700 },
      { ...baseBudgetItem, id: 'budget-2', category: 'Florals & Decor', estimated_amount: 1500, actual_amount: 1800 },
    ], 10000);

    expect(model.title).toMatch(/A few categories need a second pass/i);
    expect(model.focusTitle).toMatch(/wrong story/i);
    expect(model.bestNextMove).toMatch(/over-budget categories|widen the review/i);
    expect(model.decisionRule).toMatch(/fix those first/i);
    expect(model.detail).toMatch(/Venue/i);
    expect(model.detail).toMatch(/Florals/i);
  });

  it('pushes itinerary anchors first when the wedding is close and schedule truth is still missing', () => {
    const model = buildPlanningOverviewDecisionCard({
      tasks: [],
      budgetItems: [],
      vendors: [],
      seatingReadiness: { attending: 10, seated: 10, unassigned: 0 },
      daysUntilWedding: 10,
      itineraryEventCount: 0,
    });

    expect(model.title).toMatch(/schedule anchors/i);
    expect(model.focusTitle).toMatch(/schedule spine/i);
    expect(model.bestNextMove).toMatch(/ceremony, reception|preview the itinerary/i);
    expect(model.decisionRule).toMatch(/schedule anchors beat aesthetic polish/i);
    expect(model.primaryAction?.target).toBe('itinerary');
    expect(model.secondaryAction?.target).toBe('seating');
  });

  it('keeps the vendor model focused on missing contact truth when money is not urgent', () => {
    const model = buildVendorsDecisionCard([
      { ...baseVendor, id: 'vendor-1', balance_due: 0, email: '', phone: '' },
      { ...baseVendor, id: 'vendor-2', balance_due: 0, email: '', phone: '' },
    ]);

    expect(model.title).toMatch(/still need cleaner contact details/i);
    expect(model.focusTitle).toMatch(/reliable contact path/i);
    expect(model.bestNextMove).toMatch(/reliable contact path|notes, comparisons/i);
    expect(model.decisionRule).toMatch(/contact truth is missing/i);
    expect(model.badges[0]).toMatch(/2 missing direct contact/i);
  });

  it('keeps the tasks model focused on weekly high-priority work when nothing is overdue', () => {
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    const model = buildTasksDecisionCard([
      { ...baseTask, id: 'task-1', due_date: inThreeDays.toISOString().slice(0, 10), priority: 'high' },
      { ...baseTask, id: 'task-2', status: 'in_progress' },
    ]);

    expect(model.title).toMatch(/High-priority work needs a short weekly pass/i);
    expect(model.focusTitle).toMatch(/matter this week/i);
    expect(model.bestNextMove).toMatch(/owners and due dates/i);
    expect(model.decisionRule).toMatch(/tighten owners and dates/i);
    expect(model.badges[0]).toMatch(/1 high-priority due soon/i);
  });
});

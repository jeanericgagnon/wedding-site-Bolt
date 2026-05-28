import { act, render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlanningDashboardActions } from './usePlanningDashboardActions';
import type { PlanningBudgetItem, PlanningTask, PlanningVendor } from './planningService';
import type { VendorMetaMap } from './vendorMetaStorage';
import { PLANNING_TASK_ADD_RETRY_ERROR, PLANNING_VENDOR_META_SAVE_RETRY_ERROR } from './planningErrorCopy';

const createTask = vi.fn();
const createBudgetItem = vi.fn();
const updatePlanningVendorMeta = vi.fn();

vi.mock('./planningService', () => ({
  createTask: (...args: unknown[]) => createTask(...args),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  createBudgetItem: (...args: unknown[]) => createBudgetItem(...args),
  updateBudgetItem: vi.fn(),
  deleteBudgetItem: vi.fn(),
  createVendor: vi.fn(),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
  generateMilestoneTasks: vi.fn(() => []),
  updatePlanningTotalBudget: vi.fn(),
  updatePlanningVendorMeta: (...args: unknown[]) => updatePlanningVendorMeta(...args),
}));

const vendor: PlanningVendor = {
  id: 'vendor-1',
  wedding_site_id: 'site-1',
  vendor_type: 'Photographer',
  name: 'Photo Studio',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  contract_total: 4000,
  amount_paid: 1000,
  balance_due: 3000,
  next_payment_due: '2026-06-01',
  document_url: '',
  document_label: '',
  notes: '',
  created_at: '2026-05-01T12:00:00.000Z',
  updated_at: '2026-05-01T12:00:00.000Z',
};

type HookActions = ReturnType<typeof usePlanningDashboardActions>;

function renderActions(options: {
  initialVendorMeta?: VendorMetaMap;
  permissions?: Array<'vendors' | 'budget' | 'planning'>;
} = {}) {
  const toast = vi.fn();
  let latestActions: HookActions | null = null;
  let latestVendorMeta = options.initialVendorMeta ?? {};

  function Harness() {
    const [budgetItems, setBudgetItems] = React.useState<PlanningBudgetItem[]>([]);
    const [tasks, setTasks] = React.useState<PlanningTask[]>([]);
    const [vendors, setVendors] = React.useState<PlanningVendor[]>([]);
    const [totalBudget, setTotalBudget] = React.useState(0);
    const [vendorMeta, setVendorMeta] = React.useState<VendorMetaMap>(options.initialVendorMeta ?? {});
    void budgetItems;
    void tasks;
    void vendors;
    void totalBudget;
    latestVendorMeta = vendorMeta;
    latestActions = usePlanningDashboardActions({
      isDemoMode: false,
      planningPermissions: options.permissions ?? ['vendors', 'budget', 'planning'],
      planningRole: 'planner',
      setBudgetItems,
      setTasks,
      setTotalBudget,
      setVendorMeta,
      setVendors,
      siteId: 'site-1',
      toast,
      weddingDate: null,
    });
    return null;
  }

  render(<Harness />);
  if (!latestActions) throw new Error('Hook did not render');
  return {
    get actions() {
      if (!latestActions) throw new Error('Hook did not render');
      return latestActions;
    },
    get vendorMeta() {
      return latestVendorMeta;
    },
    toast,
  };
}

describe('usePlanningDashboardActions', () => {
  beforeEach(() => {
    createTask.mockReset();
    createBudgetItem.mockReset();
    updatePlanningVendorMeta.mockReset();
  });

  it('does not let the vendor follow-up create budget items without budget permission', async () => {
    const harness = renderActions({ permissions: ['vendors'] });

    await act(async () => {
      await harness.actions.addVendorToBudget(vendor);
    });

    expect(createBudgetItem).not.toHaveBeenCalled();
    expect(harness.toast).toHaveBeenCalledWith('Your collaborator role cannot add budget items.', 'info');
  });

  it('rolls back optimistic vendor reminder metadata when persistence fails', async () => {
    updatePlanningVendorMeta.mockRejectedValueOnce(new Error('offline'));
    const previousMeta: VendorMetaMap = {
      'vendor-1': {
        lastContacted: '2026-05-01',
        nextFollowUp: '2026-05-10',
        reminderChannel: 'email',
        reminderLeadDays: 7,
      },
    };
    const nextMeta: VendorMetaMap = {
      'vendor-1': {
        lastContacted: '2026-05-05',
        nextFollowUp: '2026-05-15',
        reminderChannel: 'phone',
        reminderLeadDays: 3,
      },
    };
    const harness = renderActions({ initialVendorMeta: previousMeta });

    await act(async () => {
      await harness.actions.handleSaveVendorMeta(nextMeta);
    });

    expect(updatePlanningVendorMeta).toHaveBeenCalledWith('site-1', nextMeta);
    expect(harness.vendorMeta).toEqual(previousMeta);
    expect(harness.toast).toHaveBeenCalledWith(PLANNING_VENDOR_META_SAVE_RETRY_ERROR, 'error');
  });

  it('uses shared planning-safe copy when adding a task fails', async () => {
    createTask.mockRejectedValueOnce(new Error('openai provider timeout token=abc'));
    const harness = renderActions();

    await act(async () => {
      await harness.actions.handleAddTask({ title: 'Confirm florist' });
    });

    expect(createTask).toHaveBeenCalledWith('site-1', { title: 'Confirm florist' });
    expect(harness.toast).toHaveBeenCalledWith(PLANNING_TASK_ADD_RETRY_ERROR, 'error');
  });
});

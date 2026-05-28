import { describe, expect, it } from 'vitest';

import {
  PLANNING_BUDGET_ADD_RETRY_ERROR,
  PLANNING_DATA_LOAD_RETRY_ERROR,
  PLANNING_MILESTONE_GENERATE_RETRY_ERROR,
  PLANNING_NAME_CHANGE_SAVE_RETRY_ERROR,
  PLANNING_TASK_ADD_RETRY_ERROR,
  PLANNING_TOTAL_BUDGET_UPDATE_RETRY_ERROR,
  PLANNING_VENDOR_BUDGET_ADD_RETRY_ERROR,
  PLANNING_VENDOR_META_SAVE_RETRY_ERROR,
  mapPlanningDashboardError,
} from './planningErrorCopy';

describe('planningErrorCopy', () => {
  it('masks noisy provider and backend errors behind calm planning copy', () => {
    expect(mapPlanningDashboardError(new Error('openai provider timeout token=abc'), PLANNING_TASK_ADD_RETRY_ERROR)).toBe(
      PLANNING_TASK_ADD_RETRY_ERROR,
    );
    expect(
      mapPlanningDashboardError(
        new Error('Supabase row-level security policy denied milestone insert'),
        PLANNING_MILESTONE_GENERATE_RETRY_ERROR,
      ),
    ).toBe(PLANNING_MILESTONE_GENERATE_RETRY_ERROR);
  });

  it('uses the fallback when no readable message is available', () => {
    expect(mapPlanningDashboardError(null, PLANNING_BUDGET_ADD_RETRY_ERROR)).toBe(PLANNING_BUDGET_ADD_RETRY_ERROR);
  });

  it('keeps planning recovery copy calm and customer-safe', () => {
    expect(PLANNING_DATA_LOAD_RETRY_ERROR).toBe('Could not load planning data right now. Please try again.');
    expect(PLANNING_TASK_ADD_RETRY_ERROR).toBe('Could not add that task right now. Please try again.');
    expect(PLANNING_BUDGET_ADD_RETRY_ERROR).toBe('Could not add that budget item right now. Please try again.');
    expect(PLANNING_MILESTONE_GENERATE_RETRY_ERROR).toBe('Could not generate milestones right now. Please try again.');
    expect(PLANNING_TOTAL_BUDGET_UPDATE_RETRY_ERROR).toBe('Could not update the total budget right now. Please try again.');
    expect(PLANNING_VENDOR_BUDGET_ADD_RETRY_ERROR).toBe('Could not add this vendor to budget right now. Please try again.');
    expect(PLANNING_VENDOR_META_SAVE_RETRY_ERROR).toBe('Could not save vendor reminder details right now. Please try again.');
    expect(PLANNING_NAME_CHANGE_SAVE_RETRY_ERROR).toBe('Could not save the name change planner right now.');
  });
});

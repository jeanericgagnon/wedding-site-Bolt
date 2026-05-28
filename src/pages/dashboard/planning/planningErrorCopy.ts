import { customerSafeErrorMessage } from '../../../lib/customerSafeError';

export const PLANNING_DATA_LOAD_RETRY_ERROR = 'Could not load planning data right now. Please try again.';
export const PLANNING_TASK_ADD_RETRY_ERROR = 'Could not add that task right now. Please try again.';
export const PLANNING_TASK_UPDATE_RETRY_ERROR = 'Could not update that task right now. Please try again.';
export const PLANNING_TASK_DELETE_RETRY_ERROR = 'Could not remove that task right now. Please try again.';
export const PLANNING_MILESTONE_GENERATE_RETRY_ERROR = 'Could not generate milestones right now. Please try again.';
export const PLANNING_BUDGET_ADD_RETRY_ERROR = 'Could not add that budget item right now. Please try again.';
export const PLANNING_BUDGET_UPDATE_RETRY_ERROR = 'Could not update that budget item right now. Please try again.';
export const PLANNING_BUDGET_DELETE_RETRY_ERROR = 'Could not remove that budget item right now. Please try again.';
export const PLANNING_VENDOR_BUDGET_ADD_RETRY_ERROR = 'Could not add this vendor to budget right now. Please try again.';
export const PLANNING_VENDOR_ADD_RETRY_ERROR = 'Could not add that vendor right now. Please try again.';
export const PLANNING_TOTAL_BUDGET_UPDATE_RETRY_ERROR = 'Could not update the total budget right now. Please try again.';
export const PLANNING_VENDOR_UPDATE_RETRY_ERROR = 'Could not update that vendor right now. Please try again.';
export const PLANNING_VENDOR_META_SAVE_RETRY_ERROR = 'Could not save vendor reminder details right now. Please try again.';
export const PLANNING_VENDOR_DELETE_RETRY_ERROR = 'Could not remove that vendor right now. Please try again.';
export const PLANNING_NAME_CHANGE_SAVE_RETRY_ERROR = 'Could not save the name change planner right now.';

export function mapPlanningDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}

import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';
import { getCoordinatorCommandSummaryTarget } from './coordinatorCommandSummaryTarget';

export const getCoordinatorStablePromptTarget = (priority: CoordinatorCommandSummaryLabel) => {
  return getCoordinatorCommandSummaryTarget(priority);
};

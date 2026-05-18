import type {
  CoordinatorIssueStatus,
  CoordinatorIssueType,
} from '../pages/dashboard/coordinator/coordinatorDashboardTypes';

export type CoordinatorIssueDraftState = {
  issueType: CoordinatorIssueType;
  status: CoordinatorIssueStatus;
  title: string;
  replacementName: string;
  replacementPartySize: string;
  tableId: string | null;
};

const SEATING_LINKED_ISSUE_TYPES: CoordinatorIssueType[] = [
  'seat-change',
  'substitute-attendee',
  'plus-one-swap',
];

const REPLACEMENT_ISSUE_TYPES: CoordinatorIssueType[] = [
  'substitute-attendee',
  'plus-one-swap',
];

export function normalizeCoordinatorIssueDraftForTypeChange(
  previous: CoordinatorIssueDraftState,
  nextIssueType: CoordinatorIssueType,
): Partial<CoordinatorIssueDraftState> {
  const next: Partial<CoordinatorIssueDraftState> = {
    issueType: nextIssueType,
  };

  if (!SEATING_LINKED_ISSUE_TYPES.includes(nextIssueType)) {
    next.tableId = null;
  }

  if (!REPLACEMENT_ISSUE_TYPES.includes(nextIssueType)) {
    next.replacementName = '';
    next.replacementPartySize = '1';
  }

  if (previous.issueType === 'seat-change' && nextIssueType !== 'seat-change' && previous.status === 'working') {
    next.status = 'open';
  }

  if (nextIssueType === 'seat-change' && previous.status === 'open') {
    next.status = 'working';
  }

  return next;
}

import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorIssueDraftForTypeChange } from './coordinatorIssueDraft';

describe('normalizeCoordinatorIssueDraftForTypeChange', () => {
  it('clears seat-change-only fields when switching to manager decision', () => {
    expect(normalizeCoordinatorIssueDraftForTypeChange({
      issueType: 'seat-change',
      status: 'working',
      title: 'Seat change for Maya',
      replacementName: 'Guest Swap',
      replacementPartySize: '3',
      tableId: 'table-1',
    }, 'manager-decision')).toMatchObject({
      issueType: 'manager-decision',
      status: 'open',
      replacementName: '',
      replacementPartySize: '1',
      tableId: null,
    });
  });

  it('preserves replacement fields for substitute issues', () => {
    expect(normalizeCoordinatorIssueDraftForTypeChange({
      issueType: 'manager-decision',
      status: 'open',
      title: 'Manager decision for Maya',
      replacementName: 'Taylor',
      replacementPartySize: '2',
      tableId: null,
    }, 'substitute-attendee')).toMatchObject({
      issueType: 'substitute-attendee',
    });
  });
});

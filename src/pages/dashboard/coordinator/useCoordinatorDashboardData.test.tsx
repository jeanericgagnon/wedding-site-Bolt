import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoordinatorBootstrapData } from './coordinatorService';

const {
  loadCoordinatorBootstrapDataMock,
  readStoredCoordinatorQnaItemsMock,
  writeStoredCoordinatorQnaItemsMock,
} = vi.hoisted(() => ({
  loadCoordinatorBootstrapDataMock: vi.fn(),
  readStoredCoordinatorQnaItemsMock: vi.fn(() => []),
  writeStoredCoordinatorQnaItemsMock: vi.fn(),
}));

vi.mock('../../../lib/plannerAccess', () => ({
  readPlannerAccessRole: vi.fn(() => null),
  writePlannerAccessRole: vi.fn(),
}));

vi.mock('./coordinatorService', () => ({
  loadCoordinatorBootstrapData: loadCoordinatorBootstrapDataMock,
}));

vi.mock('./coordinatorStorage', () => ({
  readStoredCoordinatorActiveWorkState: vi.fn(() => ({ activeQnaId: null })),
  readStoredCoordinatorAlertIntentState: vi.fn(() => ({ lastSuggestionKey: null })),
  readStoredCoordinatorAlertLog: vi.fn(() => []),
  readStoredCoordinatorCommandState: vi.fn(() => ({ source: null })),
  readStoredCoordinatorDraftState: vi.fn(() => ({ alertForm: {}, qnaDraftAnswers: {}, qnaInput: '' })),
  readStoredCoordinatorGuestWorkState: vi.fn(() => ({ activeGuestId: null, doorRoutesByGuestId: {} })),
  readStoredCoordinatorQnaItems: readStoredCoordinatorQnaItemsMock,
  readStoredCoordinatorSessionState: vi.fn(() => ({
    alertChannelFilter: 'all',
    alertTimingFilter: 'all',
    checkInFilter: 'arrivals',
    checkInQuery: '',
    checkInReviewOnly: false,
    panelFocus: null,
  })),
  readStoredCoordinatorTimelineState: vi.fn(() => ({})),
  readStoredCoordinatorTimelineWorkState: vi.fn(() => ({ activeTimelineEventId: null })),
  writeStoredCoordinatorActiveWorkState: vi.fn(),
  writeStoredCoordinatorAlertIntentState: vi.fn(),
  writeStoredCoordinatorAlertLog: vi.fn(),
  writeStoredCoordinatorCommandState: vi.fn(),
  writeStoredCoordinatorDraftState: vi.fn(),
  writeStoredCoordinatorGuestWorkState: vi.fn(),
  writeStoredCoordinatorQnaItems: writeStoredCoordinatorQnaItemsMock,
  writeStoredCoordinatorSessionState: vi.fn(),
  writeStoredCoordinatorTimelineState: vi.fn(),
  writeStoredCoordinatorTimelineWorkState: vi.fn(),
}));

import { useCoordinatorDashboardData } from './useCoordinatorDashboardData';

function createBootstrap(siteId: string, qnaItems: CoordinatorBootstrapData['qnaItems'] = []): CoordinatorBootstrapData {
  return {
    siteId,
    siteSlug: siteId,
    role: 'owner',
    permissions: null,
    guests: [],
    events: [],
    eventGuestIds: {},
    eventSeatingConfiguredIds: new Set(),
    eventSeatingEventIds: {},
    eventSeatingTables: {},
    eventHandoffs: [],
    issueLogs: [],
    qnaItems,
  };
}

describe('useCoordinatorDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not write stale coordinator Q&A state into a newly loaded site', async () => {
    const toast = vi.fn();
    const staleQna = [{ id: 'q-old', question: 'Old site question', status: 'new' as const }];
    loadCoordinatorBootstrapDataMock
      .mockResolvedValueOnce(createBootstrap('site-1', staleQna))
      .mockResolvedValueOnce(createBootstrap('site-2', []));

    const { result, rerender } = renderHook(
      ({ userId }) =>
        useCoordinatorDashboardData({
          isDemoMode: false,
          toast,
          userId,
        }),
      { initialProps: { userId: 'user-1' } },
    );

    await waitFor(() => expect(result.current.siteId).toBe('site-1'));
    expect(result.current.qnaItems).toEqual(staleQna);

    rerender({ userId: 'user-2' });

    await waitFor(() => expect(result.current.siteId).toBe('site-2'));
    await waitFor(() => expect(result.current.qnaItems).toEqual([]));

    expect(writeStoredCoordinatorQnaItemsMock).not.toHaveBeenCalledWith('site-2', staleQna);
  });
});

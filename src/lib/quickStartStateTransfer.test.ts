import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistQuickStartDraftSnapshot, QUICK_START_STORAGE_KEY, readQuickStartDraftSnapshot } from './quickStartStateTransfer';

describe('quickStartStateTransfer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists a navigation-state quick start draft into local storage using normalized shape', () => {
    const persisted = persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: { 'event-1-time': '6:00 PM' },
      showFollowUps: true,
      viewState: 'followups',
    });

    expect(persisted?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(JSON.parse(window.localStorage.getItem(QUICK_START_STORAGE_KEY) || '{}').showFollowUps).toBe(false);
    expect(readQuickStartDraftSnapshot()?.followUpAnswers['event-1-time']).toBe('6:00 PM');
  });

  it('survives malformed existing storage by normalizing on read', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify({ followUpAnswers: ['bad'] }));
    expect(readQuickStartDraftSnapshot()?.followUpAnswers).toEqual({});
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBe(JSON.stringify({
      initialSetupAnswers: {
        names: '',
        labelPreference: 'names-only',
        customLabelPartnerOne: '',
        customLabelPartnerTwo: '',
        whenWhere: '',
        venueNameOrTbd: '',
        style: '',
        guestFeel: '',
        weekendEventsRaw: '',
        ceremonyArrivalTime: '',
        guestCountBand: '',
        plusOnePolicy: '',
        childrenAllowed: '',
        rsvpDeadline: '',
        mealChoice: '',
        registryIntent: '',
        optionalStory: '',
      },
      currentIndex: 0,
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    }));
  });

  it('drops malformed existing storage completely when the payload is invalid json', () => {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, '{bad json');

    expect(readQuickStartDraftSnapshot()).toBeNull();
    expect(window.localStorage.getItem(QUICK_START_STORAGE_KEY)).toBeNull();
  });

  it('returns normalized draft even when local storage writes fail', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(persistQuickStartDraftSnapshot({ initialSetupAnswers: { names: 'Alex & Jordan' } })?.initialSetupAnswers.names).toBe('Alex & Jordan');

    setItemSpy.mockRestore();
  });
});

import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertSuggestionState } from './coordinatorAlertSuggestionState';

const liveSuggestion = {
  key: 'live:event-1',
  label: 'Update live event',
  subject: 'Ceremony is live',
  body: 'Ceremony is happening now.',
  audience: 'event:event-1',
};

describe('coordinatorAlertSuggestionState', () => {
  it('marks the current draft match even when it is also the board target', () => {
    expect(getCoordinatorAlertSuggestionState({
      suggestion: liveSuggestion,
      preferredSuggestion: liveSuggestion,
      subject: 'Ceremony is live',
      body: 'Ceremony is happening now.',
      audience: 'event:event-1',
    })).toEqual({
      isBoardTarget: true,
      isDraftMatch: true,
      badge: 'In draft',
    });
  });

  it('marks only the recommended board lane when the draft drifted', () => {
    expect(getCoordinatorAlertSuggestionState({
      suggestion: liveSuggestion,
      preferredSuggestion: liveSuggestion,
      subject: 'Ceremony delayed',
      body: 'We are starting late.',
      audience: 'all',
    })).toEqual({
      isBoardTarget: true,
      isDraftMatch: false,
      badge: 'Board target',
    });
  });

  it('stays neutral for unrelated suggestions', () => {
    expect(getCoordinatorAlertSuggestionState({
      suggestion: liveSuggestion,
      preferredSuggestion: null,
      subject: 'Custom',
      body: 'Custom',
      audience: 'all',
    })).toEqual({
      isBoardTarget: false,
      isDraftMatch: false,
      badge: null,
    });
  });
});

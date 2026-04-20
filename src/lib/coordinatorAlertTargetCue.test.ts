import { describe, expect, it } from 'vitest';
import { buildCoordinatorAlertTargetCue } from './coordinatorAlertTargetCue';

describe('coordinatorAlertTargetCue', () => {
  const preferredSuggestion = {
    key: 'live:event-1',
    label: 'Update live event',
    subject: 'Ceremony is live',
    body: 'Ceremony is happening now.',
    audience: 'event:event-1',
  };

  it('marks an aligned draft as matching the board target', () => {
    expect(buildCoordinatorAlertTargetCue({
      preferredSuggestion,
      subject: 'Ceremony is live',
      body: 'Ceremony is happening now.',
      audience: 'event:event-1',
    })).toEqual({
      title: 'Board target: Update live event',
      detail: 'This draft is aligned with the board’s recommended day-of alert lane.',
      aligned: true,
    });
  });

  it('marks a customized draft as adjusted away from the board target', () => {
    expect(buildCoordinatorAlertTargetCue({
      preferredSuggestion,
      subject: 'Ceremony delayed',
      body: 'We are starting a few minutes late.',
      audience: 'all',
    })).toEqual({
      title: 'Adjusted from Update live event',
      detail: 'The board suggested a different alert lane, but this draft has been customized for a different send.',
      aligned: false,
    });
  });

  it('falls back cleanly when no preferred lane exists', () => {
    expect(buildCoordinatorAlertTargetCue({
      preferredSuggestion: null,
      subject: 'Custom note',
      body: 'Hello there',
      audience: 'all',
    }).title).toBe('Custom alert target');
  });
});

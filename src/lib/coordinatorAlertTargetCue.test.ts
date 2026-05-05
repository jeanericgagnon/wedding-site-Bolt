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

  it('marks an aligned draft as matching the suggested update', () => {
    expect(buildCoordinatorAlertTargetCue({
      preferredSuggestion,
      subject: 'Ceremony is live',
      body: 'Ceremony is happening now.',
      audience: 'event:event-1',
    })).toEqual({
      title: 'Suggested update: Update live event',
      detail: 'This draft matches the recommended day-of update.',
      aligned: true,
    });
  });

  it('marks a customized draft as adjusted away from the suggested update', () => {
    expect(buildCoordinatorAlertTargetCue({
      preferredSuggestion,
      subject: 'Ceremony delayed',
      body: 'We are starting a few minutes late.',
      audience: 'all',
    })).toEqual({
      title: 'Adjusted from Update live event',
      detail: 'A different day-of update was suggested, but this draft has been customized.',
      aligned: false,
    });
  });

  it('falls back cleanly when no preferred lane exists', () => {
    expect(buildCoordinatorAlertTargetCue({
      preferredSuggestion: null,
      subject: 'Custom note',
      body: 'Hello there',
      audience: 'all',
    }).title).toBe('Custom update');
  });
});

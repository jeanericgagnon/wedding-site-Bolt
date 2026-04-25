import { describe, expect, it } from 'vitest';
import { createEmptyInitialSetupAnswers } from './initialSetupAnswers';
import { interpretInitialSetupAnswers } from './initialSetupInterpreter';
import { buildInitialSetupSnapshot } from './initialSetupSnapshot';

describe('initialSetupInterpreter', () => {
  it('drops impossible initial setup dates instead of carrying fake truth into interpreted outputs', () => {
    const answers = {
      ...createEmptyInitialSetupAnswers(),
      whenWhere: '2027-02-30 — Sayulita, Mexico',
      rsvpDeadline: '2027-02-31',
    };

    const interpreted = interpretInitialSetupAnswers(answers);

    expect(interpreted.weddingDate).toBe('');
    expect(interpreted.rsvpDeadline).toBe('');
    expect(interpreted.weddingLocation).toBe('Sayulita, Mexico');
  });

  it('keeps snapshot rsvp deadline aligned with the interpreted date boundary', () => {
    const snapshot = buildInitialSetupSnapshot({
      ...createEmptyInitialSetupAnswers(),
      whenWhere: '2027-02-30 — Sayulita, Mexico',
      rsvpDeadline: '2027-02-31',
    });

    expect(snapshot.rsvpDeadline).toBe('');
  });
});

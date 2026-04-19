import { describe, expect, it } from 'vitest';
import { createEmptyInitialSetupAnswers } from './initialSetupAnswers';
import { hasMeaningfulQuickStartAnswers, mergeQuickStartSeedIntoDraft } from './quickStartHydration';

describe('quickStartHydration', () => {
  it('detects whether a local quick start draft is meaningfully populated', () => {
    expect(hasMeaningfulQuickStartAnswers(createEmptyInitialSetupAnswers())).toBe(false);
    expect(hasMeaningfulQuickStartAnswers({ ...createEmptyInitialSetupAnswers(), names: 'Alex & Jordan' })).toBe(true);
  });

  it('fills only missing fields when seeding a local draft from server data', () => {
    const localDraft = {
      ...createEmptyInitialSetupAnswers(),
      names: 'Alex & Jordan',
      style: 'Editorial, warm',
    };

    const merged = mergeQuickStartSeedIntoDraft(localDraft, {
      names: 'Wrong overwrite',
      whenWhere: '2027-06-12 — San Diego',
      venueNameOrTbd: 'La Valencia',
    });

    expect(merged.names).toBe('Alex & Jordan');
    expect(merged.style).toBe('Editorial, warm');
    expect(merged.whenWhere).toBe('2027-06-12 — San Diego');
    expect(merged.venueNameOrTbd).toBe('La Valencia');
  });
});

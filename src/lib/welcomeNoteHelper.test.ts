import { describe, expect, it } from 'vitest';
import { buildWelcomeNoteDraft } from './welcomeNoteHelper';

describe('welcomeNoteHelper', () => {
  it('keeps welcome note names truthful when one persisted partner name is whitespace only', () => {
    expect(buildWelcomeNoteDraft({
      partner1Name: '   ',
      partner2Name: ' Alex ',
    })).toContain('Alex We are so happy');
  });

  it('falls back to "We" when both persisted partner names are blank', () => {
    expect(buildWelcomeNoteDraft({
      partner1Name: '   ',
      partner2Name: '',
    })).toContain('We are so happy');
  });
});

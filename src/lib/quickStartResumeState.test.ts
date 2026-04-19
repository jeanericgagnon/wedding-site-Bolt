import { describe, expect, it } from 'vitest';
import { resolveQuickStartResumeViewState } from './quickStartResumeState';

describe('quickStartResumeState', () => {
  it('never resumes into the transient thinking interstitial', () => {
    expect(resolveQuickStartResumeViewState({ showFollowUps: false, viewState: 'thinking' })).toBe('question');
  });

  it('resumes into follow-ups when follow-up mode was active', () => {
    expect(resolveQuickStartResumeViewState({ showFollowUps: true, viewState: 'question' })).toBe('followups');
  });

  it('keeps stable question state as-is', () => {
    expect(resolveQuickStartResumeViewState({ showFollowUps: false, viewState: 'question' })).toBe('question');
  });
});

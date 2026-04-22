import { describe, expect, it } from 'vitest';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';
import { resolveQuickStartResumeViewState } from './quickStartResumeState';

describe('quickStartResumeState', () => {
  it('never resumes into the transient thinking interstitial', () => {
    expect(resolveQuickStartResumeViewState({ showFollowUps: false, viewState: 'thinking', clarifyingState: null })).toBe('question');
  });

  it('resumes into follow-ups when unanswered follow-up mode was active', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.questions = [{
      id: 'q1',
      category: 'event_structure',
      question: 'When is dinner?',
      expectedAnswerType: 'short_text',
      targetFields: ['events.0.time'],
      affectedSections: ['schedule'],
      skippable: true,
      round: 1,
      status: 'pending',
      answer: '',
    }];

    expect(resolveQuickStartResumeViewState({ showFollowUps: true, viewState: 'question', clarifyingState: clarifying })).toBe('followups');
  });

  it('falls back to question view when follow-up mode was saved without unanswered questions', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.questions = [{
      id: 'q1',
      category: 'event_structure',
      question: 'When is dinner?',
      expectedAnswerType: 'short_text',
      targetFields: ['events.0.time'],
      affectedSections: ['schedule'],
      skippable: true,
      round: 1,
      status: 'answered',
      answer: '6:00 PM',
    }];

    expect(resolveQuickStartResumeViewState({ showFollowUps: true, viewState: 'followups', clarifyingState: clarifying })).toBe('question');
  });

  it('falls back to question view when restored follow-ups were only skipped', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.questions = [{
      id: 'q1',
      category: 'travel',
      question: 'How should guests get there?',
      expectedAnswerType: 'short_text',
      targetFields: ['travel.transport'],
      affectedSections: ['travel'],
      skippable: true,
      round: 1,
      status: 'skipped',
      answer: '',
    }];

    expect(resolveQuickStartResumeViewState({ showFollowUps: true, viewState: 'followups', clarifyingState: clarifying })).toBe('question');
  });

  it('keeps follow-up view when restored questions remain unresolved', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.questions = [{
      id: 'q1',
      category: 'travel',
      question: 'How should guests get there?',
      expectedAnswerType: 'short_text',
      targetFields: ['travel.transport'],
      affectedSections: ['travel'],
      skippable: true,
      round: 1,
      status: 'unresolved',
      answer: '',
    }];

    expect(resolveQuickStartResumeViewState({ showFollowUps: true, viewState: 'question', clarifyingState: clarifying })).toBe('followups');
  });

  it('keeps stable question state as-is', () => {
    expect(resolveQuickStartResumeViewState({ showFollowUps: false, viewState: 'question', clarifyingState: null })).toBe('question');
  });
});

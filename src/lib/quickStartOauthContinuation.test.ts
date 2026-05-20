import { beforeEach, describe, expect, it } from 'vitest';
import { createQuickStartDraftSnapshot, normalizeMeaningfulQuickStartDraftSnapshot, persistQuickStartDraftSnapshot, readQuickStartDraftSnapshot } from './quickStartStateTransfer';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';
import { buildQuickStartEntryPath } from './quickStartContinuation';

describe('quick start oauth continuation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can synchronously persist both draft state and return path before auth redirect', () => {
    persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: { 'event-1-time': '6:00 PM' },
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'event-1-time',
            category: 'event_structure',
            question: 'When is dinner?',
            expectedAnswerType: 'short_text',
            targetFields: ['events.0.time'],
            affectedSections: ['schedule'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });
    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(readQuickStartDraftSnapshot()?.followUpAnswers['event-1-time']).toBe('6:00 PM');
    expect(readSignupReturnPath()).toBe(buildQuickStartEntryPath());
  });


  it('keeps normalized follow-up resume state in carried oauth drafts', () => {
    const carriedDraft = createQuickStartDraftSnapshot({
      currentIndex: 4,
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: { transport: 'Need shuttle details' },
      showFollowUps: true,
      viewState: 'followups',
      clarifyingState: {
        clarifying: {
          mode: 'ask',
          questions: [{
            id: 'transport',
            category: 'travel',
            question: 'How should guests get there?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.transport'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'pending',
            answer: '',
          }],
          history: [],
        },
        draftOutputs: {},
      },
    });

    persistQuickStartDraftSnapshot(carriedDraft);
    writeSignupReturnPath(buildQuickStartEntryPath());

    expect(readQuickStartDraftSnapshot()?.currentIndex).toBe(14);
    expect(readQuickStartDraftSnapshot()?.showFollowUps).toBe(true);
    expect(readQuickStartDraftSnapshot()?.viewState).toBe('followups');
    expect(readSignupReturnPath()).toBe(buildQuickStartEntryPath());
  });

  it('returns null from meaningful draft normalization when oauth handoff payloads are empty', () => {
    expect(normalizeMeaningfulQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    })).toBeNull();
  });

});

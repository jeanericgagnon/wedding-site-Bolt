import { beforeEach, describe, expect, it } from 'vitest';
import { createQuickStartDraftSnapshot, normalizeMeaningfulQuickStartDraftSnapshot, persistQuickStartDraftSnapshot, readQuickStartDraftSnapshot } from './quickStartStateTransfer';

describe('login quick start state transfer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can persist a carried quick start draft before login/auth continuation', () => {
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

    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(readQuickStartDraftSnapshot()?.followUpAnswers['event-1-time']).toBe('6:00 PM');
  });


  it('normalizes carried quick start drafts before auth continuation handoff', () => {
    const carriedDraft = createQuickStartDraftSnapshot({
      currentIndex: Number.MAX_SAFE_INTEGER + 1,
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: { 'event-1-time': '6:00 PM' },
      showFollowUps: 'true' as never,
      viewState: 'followups',
      clarifyingState: { clarifying: [] },
    });

    expect(carriedDraft.currentIndex).toBe(0);
    expect(carriedDraft.showFollowUps).toBe(false);
    expect(carriedDraft.viewState).toBe('question');
    expect(carriedDraft.followUpAnswers).toEqual({});
  });

  it('drops malformed carried quick start answers before auth continuation', () => {
    persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: ['Alex & Jordan'], venueNameOrTbd: 'La Valencia' },
    });

    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.names).toBe('');
    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.venueNameOrTbd).toBe('La Valencia');
  });

  it('rewrites malformed carried quick start payloads to normalized storage before auth continuation', () => {
    persistQuickStartDraftSnapshot({
      followUpAnswers: { '': 'bad', 'event-1-time': '6:00 PM', lodging: '   ' },
    });

    expect(window.localStorage.getItem('dayoflove:quickstart-shell')).toContain('event-1-time');
    expect(window.localStorage.getItem('dayoflove:quickstart-shell')).not.toContain('lodging');
    expect(window.localStorage.getItem('dayoflove:quickstart-shell')).not.toContain('"":"bad"');
  });


  it('clears empty carried quick start payloads before auth continuation', () => {
    window.localStorage.setItem('dayoflove:quickstart-shell', 'stale');

    persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    });

    expect(window.localStorage.getItem('dayoflove:quickstart-shell')).toBeNull();
  });


  it('returns null when carried quick start payloads normalize to empty state', () => {
    const persisted = persistQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    });

    expect(persisted).toBeNull();
  });

  it('returns null from meaningful draft normalization when auth handoff payloads are empty', () => {
    expect(normalizeMeaningfulQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    })).toBeNull();
  });


  it('drops carried quick start drafts that only contain an index with no surviving answers', () => {
    expect(normalizeMeaningfulQuickStartDraftSnapshot({
      currentIndex: 5,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: null,
      viewState: 'question',
    })).toBeNull();
  });


  it('drops carried quick start drafts when skipped clarifying history is the only surviving state', () => {
    expect(normalizeMeaningfulQuickStartDraftSnapshot({
      currentIndex: 0,
      initialSetupAnswers: {},
      followUpAnswers: {},
      showFollowUps: false,
      clarifyingState: {
        clarifying: {
          mode: 'draft',
          questions: [],
          history: [{
            id: 'lodging',
            category: 'travel',
            question: 'Where should guests stay?',
            expectedAnswerType: 'short_text',
            targetFields: ['travel.lodging'],
            affectedSections: ['travel'],
            skippable: true,
            round: 1,
            status: 'skipped',
            answer: '',
          }],
        },
        draftOutputs: {},
      },
      viewState: 'question',
    })).toBeNull();
  });

});

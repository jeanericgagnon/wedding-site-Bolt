import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readDemoMealConfig,
  readDemoQuestions,
  readDemoStoredResponses,
  RSVP_DEMO_STORAGE_RETENTION_MS,
  writeDemoStoredResponses,
} from './rsvpDemoStorage';
import {
  DEFAULT_MEAL_CONFIG,
  DEMO_RSVP_MEAL_KEY,
  DEMO_RSVP_QUESTIONS_KEY,
  DEMO_RSVP_RESPONSES_KEY,
} from './rsvpTypes';

describe('RSVP demo storage', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads demo meal config defensively', () => {
    localStorage.setItem(DEMO_RSVP_MEAL_KEY, JSON.stringify({
      enabled: false,
      options: ['Chicken', '', 12, 'Vegan'],
    }));

    expect(readDemoMealConfig()).toEqual({
      enabled: false,
      options: ['Chicken', 'Vegan'],
    });

    localStorage.setItem(DEMO_RSVP_MEAL_KEY, JSON.stringify({ enabled: 'yes', options: [] }));
    expect(readDemoMealConfig()).toEqual(DEFAULT_MEAL_CONFIG);
  });

  it('normalizes demo questions and drops malformed rows', () => {
    localStorage.setItem(DEMO_RSVP_QUESTIONS_KEY, JSON.stringify([
      {
        id: 'q1',
        label: 'Song request',
        question_text: 'What should we play?',
        type: 'multi_choice',
        required: true,
        appliesTo: 'reception',
        options: ['Jazz', 123, 'Pop'],
      },
      { id: 'bad' },
      { label: 'Missing id' },
    ]));

    expect(readDemoQuestions()).toEqual([{
      id: 'q1',
      label: 'Song request',
      question_text: 'What should we play?',
      type: 'multi_choice',
      required: true,
      appliesTo: 'reception',
      options: ['Jazz', 'Pop'],
    }]);
  });

  it('falls back safely from invalid demo RSVP storage', () => {
    localStorage.setItem(DEMO_RSVP_MEAL_KEY, '{broken');
    localStorage.setItem(DEMO_RSVP_QUESTIONS_KEY, '{broken');
    localStorage.setItem(DEMO_RSVP_RESPONSES_KEY, JSON.stringify(['bad']));

    expect(readDemoMealConfig()).toEqual(DEFAULT_MEAL_CONFIG);
    expect(readDemoQuestions()).toEqual([]);
    expect(readDemoStoredResponses()).toEqual({});
  });

  it('writes and reads demo RSVP responses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    writeDemoStoredResponses({
      guest1: {
        id: 'rsvp1',
        attending: true,
        meal_choice: 'Chicken',
        plus_one_name: null,
        notes: null,
      },
    });

    expect(readDemoStoredResponses().guest1?.meal_choice).toBe('Chicken');
    expect(JSON.parse(localStorage.getItem(DEMO_RSVP_RESPONSES_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: {
        guest1: {
          id: 'rsvp1',
          meal_choice: 'Chicken',
        },
      },
    });
  });

  it('migrates active legacy demo RSVP storage into timestamped envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(DEMO_RSVP_QUESTIONS_KEY, JSON.stringify([{
      id: 'q1',
      label: 'Song request',
      type: 'single_choice',
      options: ['Jazz', 'Pop'],
    }]));
    localStorage.setItem(DEMO_RSVP_RESPONSES_KEY, JSON.stringify({
      guest1: {
        id: 'rsvp1',
        attending: true,
        meal_choice: '  Chicken  ',
        plus_one_name: '  Taylor  ',
        notes: 'x'.repeat(260),
        custom_answers: {
          q1: [' Jazz ', 42, 'Pop'],
        },
      },
    }));

    expect(readDemoQuestions()).toHaveLength(1);
    expect(readDemoStoredResponses().guest1).toMatchObject({
      meal_choice: 'Chicken',
      plus_one_name: 'Taylor',
      notes: 'x'.repeat(240),
      custom_answers: {
        q1: ['Jazz', 'Pop'],
      },
    });
    expect(JSON.parse(localStorage.getItem(DEMO_RSVP_QUESTIONS_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });
    expect(JSON.parse(localStorage.getItem(DEMO_RSVP_RESPONSES_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });
  });

  it('removes stale demo RSVP envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    const staleSavedAtISO = new Date(Date.now() - RSVP_DEMO_STORAGE_RETENTION_MS - 1).toISOString();
    localStorage.setItem(DEMO_RSVP_MEAL_KEY, JSON.stringify({
      savedAtISO: staleSavedAtISO,
      value: { enabled: false, options: ['Old'] },
    }));
    localStorage.setItem(DEMO_RSVP_QUESTIONS_KEY, JSON.stringify({
      savedAtISO: staleSavedAtISO,
      value: [{ id: 'old', label: 'Old' }],
    }));
    localStorage.setItem(DEMO_RSVP_RESPONSES_KEY, JSON.stringify({
      savedAtISO: staleSavedAtISO,
      value: {
        guest1: {
          id: 'rsvp1',
          attending: true,
          meal_choice: 'Old',
          plus_one_name: null,
          notes: null,
        },
      },
    }));

    expect(readDemoMealConfig()).toEqual(DEFAULT_MEAL_CONFIG);
    expect(readDemoQuestions()).toEqual([]);
    expect(readDemoStoredResponses()).toEqual({});
    expect(localStorage.getItem(DEMO_RSVP_MEAL_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_RSVP_QUESTIONS_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_RSVP_RESPONSES_KEY)).toBeNull();
  });
});

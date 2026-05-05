import { beforeEach, describe, expect, it } from 'vitest';
import {
  readDemoMealConfig,
  readDemoQuestions,
  readDemoStoredResponses,
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
    localStorage.clear();
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
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { readDemoRsvpSettings, writeDemoRsvpSettings } from './settingsDemoStorage';
import { LOCAL_RSVP_MEAL_KEY, LOCAL_RSVP_QUESTIONS_KEY } from './settingsDashboardTypes';

describe('settings demo storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads normalized RSVP questions and meal config from demo storage', () => {
    localStorage.setItem(LOCAL_RSVP_QUESTIONS_KEY, JSON.stringify([
      { id: 'q1', label: 'Anything we should know?', type: 'long_text', appliesTo: 'all', required: true, options: ['x', 2] },
      { id: 'bad' },
    ]));
    localStorage.setItem(LOCAL_RSVP_MEAL_KEY, JSON.stringify({ enabled: false, options: ['Chicken', '', 'Vegan'] }));

    expect(readDemoRsvpSettings()).toEqual({
      questions: [{
        id: 'q1',
        label: 'Anything we should know?',
        type: 'long_text',
        appliesTo: 'all',
        required: true,
        options: ['x'],
      }],
      mealEnabled: false,
      mealOptions: ['Chicken', 'Vegan'],
    });
  });

  it('returns partial settings when storage is empty or invalid', () => {
    expect(readDemoRsvpSettings()).toEqual({});

    localStorage.setItem(LOCAL_RSVP_QUESTIONS_KEY, '{broken');
    expect(readDemoRsvpSettings()).toEqual({});
  });

  it('writes demo RSVP settings defensively', () => {
    writeDemoRsvpSettings({
      questions: [{
        id: 'q1',
        label: 'Song',
        type: 'short_text',
        required: false,
        appliesTo: 'all',
        options: [],
      }],
      mealEnabled: true,
      mealOptions: ['Chicken', 'Vegan'],
    });

    expect(JSON.parse(localStorage.getItem(LOCAL_RSVP_QUESTIONS_KEY) ?? '[]')).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(LOCAL_RSVP_MEAL_KEY) ?? '{}')).toEqual({
      enabled: true,
      options: ['Chicken', 'Vegan'],
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readDemoRsvpSettings, SETTINGS_DEMO_RSVP_RETENTION_MS, writeDemoRsvpSettings } from './settingsDemoStorage';
import { LOCAL_RSVP_MEAL_KEY, LOCAL_RSVP_QUESTIONS_KEY } from './settingsDashboardTypes';

describe('settings demo storage helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
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

    expect(JSON.parse(localStorage.getItem(LOCAL_RSVP_QUESTIONS_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: [{
        id: 'q1',
        label: 'Song',
      }],
    });
    expect(JSON.parse(localStorage.getItem(LOCAL_RSVP_MEAL_KEY) ?? '{}')).toEqual({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: {
        enabled: true,
        options: ['Chicken', 'Vegan'],
      },
    });
  });

  it('migrates active legacy demo settings and removes stale envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(LOCAL_RSVP_QUESTIONS_KEY, JSON.stringify([
      { id: 'q1', label: 'Song', type: 'short_text', appliesTo: 'all', required: false, options: [] },
    ]));
    localStorage.setItem(LOCAL_RSVP_MEAL_KEY, JSON.stringify({ enabled: false, options: ['Chicken'] }));

    expect(readDemoRsvpSettings().questions).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(LOCAL_RSVP_QUESTIONS_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });

    localStorage.setItem(LOCAL_RSVP_MEAL_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - SETTINGS_DEMO_RSVP_RETENTION_MS - 1).toISOString(),
      value: { enabled: false, options: ['Old'] },
    }));

    expect(readDemoRsvpSettings()).toEqual({
      questions: [{
        id: 'q1',
        label: 'Song',
        type: 'short_text',
        appliesTo: 'all',
        required: false,
        options: [],
      }],
    });
    expect(localStorage.getItem(LOCAL_RSVP_MEAL_KEY)).toBeNull();
  });
});

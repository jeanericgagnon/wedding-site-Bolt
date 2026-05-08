import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GUEST_DASHBOARD_STORAGE_RETENTION_MS,
  readStoredCampaignLog,
  readStoredCampaignPreset,
  readStoredDemoRsvpConfig,
  readStoredFollowUpTasks,
  readStoredSavedSegments,
  writeStoredCampaignLog,
  writeStoredCampaignPreset,
  writeStoredDemoRsvpConfig,
  writeStoredFollowUpTasks,
  writeStoredSavedSegments,
  type RsvpCampaignLogEntry,
  type RsvpFollowUpTask,
  type RsvpSavedSegment,
} from './guestDashboardStorage';
import {
  DEMO_RSVP_CUSTOM_QUESTIONS_KEY,
  DEMO_RSVP_MEAL_CONFIG_KEY,
  RSVP_CAMPAIGN_LOG_KEY,
  RSVP_CAMPAIGN_PRESET_KEY,
  RSVP_FOLLOWUP_TASKS_KEY,
  RSVP_SAVED_SEGMENTS_KEY,
} from './guestDashboardTypes';

describe('guest dashboard storage helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists only known campaign presets', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    writeStoredCampaignPreset('missing-meal');
    expect(readStoredCampaignPreset()).toBe('missing-meal');
    expect(JSON.parse(localStorage.getItem(RSVP_CAMPAIGN_PRESET_KEY) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: 'missing-meal',
    });

    localStorage.setItem(RSVP_CAMPAIGN_PRESET_KEY, 'unknown-filter');
    expect(readStoredCampaignPreset()).toBeNull();
    expect(localStorage.getItem(RSVP_CAMPAIGN_PRESET_KEY)).toBeNull();
  });

  it('defensively reads invalid array storage as empty lists', () => {
    localStorage.setItem(RSVP_FOLLOWUP_TASKS_KEY, '{broken');
    localStorage.setItem(RSVP_SAVED_SEGMENTS_KEY, JSON.stringify({ bad: true }));
    localStorage.setItem(RSVP_CAMPAIGN_LOG_KEY, JSON.stringify(null));

    expect(readStoredFollowUpTasks()).toEqual([]);
    expect(readStoredSavedSegments()).toEqual([]);
    expect(readStoredCampaignLog()).toEqual([]);
  });

  it('migrates active legacy array storage into timestamped envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(RSVP_FOLLOWUP_TASKS_KEY, JSON.stringify([{
      id: 1,
      text: '  Confirm address  ',
      createdAt: '2026-05-01',
    }]));

    expect(readStoredFollowUpTasks()).toEqual([{
      id: 1,
      text: 'Confirm address',
      createdAt: '2026-05-01',
    }]);
    expect(JSON.parse(localStorage.getItem(RSVP_FOLLOWUP_TASKS_KEY) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
      value: [{
        id: 1,
        text: 'Confirm address',
        createdAt: '2026-05-01',
      }],
    });
  });

  it('removes stale guest dashboard storage envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    localStorage.setItem(RSVP_SAVED_SEGMENTS_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - GUEST_DASHBOARD_STORAGE_RETENTION_MS - 1).toISOString(),
      value: [{
        id: 1,
        label: 'VIPs',
        filter: 'vip',
        createdAt: '2026-04-01',
      }],
    }));

    expect(readStoredSavedSegments()).toEqual([]);
    expect(localStorage.getItem(RSVP_SAVED_SEGMENTS_KEY)).toBeNull();
  });

  it('caps stored follow-up tasks, saved segments, and campaign log entries', () => {
    const tasks: RsvpFollowUpTask[] = Array.from({ length: 14 }, (_, index) => ({
      id: index,
      text: `Task ${index}`,
      createdAt: `2026-05-${String(index + 1).padStart(2, '0')}`,
    }));
    const segments: RsvpSavedSegment[] = Array.from({ length: 14 }, (_, index) => ({
      id: index,
      label: `Segment ${index}`,
      filter: `filter-${index}`,
      createdAt: `2026-05-${String(index + 1).padStart(2, '0')}`,
    }));
    const logs: RsvpCampaignLogEntry[] = Array.from({ length: 14 }, (_, index) => ({
      id: index,
      segment: `Segment ${index}`,
      count: index,
      sentAt: `2026-05-${String(index + 1).padStart(2, '0')}`,
    }));

    writeStoredFollowUpTasks(tasks);
    writeStoredSavedSegments(segments);
    writeStoredCampaignLog(logs);

    expect(readStoredFollowUpTasks()).toHaveLength(12);
    expect(readStoredSavedSegments()).toHaveLength(12);
    expect(readStoredCampaignLog()).toHaveLength(12);
    expect(readStoredFollowUpTasks()[0]?.id).toBe(0);
    expect(readStoredSavedSegments().at(-1)?.id).toBe(11);
    expect(readStoredCampaignLog().at(-1)?.id).toBe(11);
  });

  it('bounds text fields before writing guest dashboard arrays', () => {
    writeStoredFollowUpTasks([{
      id: 1,
      text: 'x'.repeat(260),
      createdAt: '2026-05-01T00:00:00.000Z'.repeat(3),
    }]);
    writeStoredSavedSegments([{
      id: 2,
      label: 'Segment '.repeat(40),
      filter: 'pending '.repeat(20),
      createdAt: '2026-05-01T00:00:00.000Z'.repeat(3),
    }]);
    writeStoredCampaignLog([{
      id: 3,
      segment: 'VIP '.repeat(80),
      count: 1.7,
      sentAt: '2026-05-01T00:00:00.000Z'.repeat(3),
    }]);

    expect(readStoredFollowUpTasks()[0]?.text).toHaveLength(240);
    expect(readStoredFollowUpTasks()[0]?.createdAt).toHaveLength(40);
    expect(readStoredSavedSegments()[0]?.label.length).toBeLessThanOrEqual(120);
    expect(readStoredSavedSegments()[0]?.filter.length).toBeLessThanOrEqual(80);
    expect(readStoredCampaignLog()[0]?.segment.length).toBeLessThanOrEqual(120);
    expect(readStoredCampaignLog()[0]?.count).toBe(1);
    expect(readStoredCampaignLog()[0]?.sentAt).toHaveLength(40);
  });

  it('reads demo RSVP settings defensively', () => {
    localStorage.setItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY, JSON.stringify([
      {
        id: 'q1',
        label: 'Song request',
        type: 'multi_choice',
        required: true,
        appliesTo: 'reception',
        options: ['Jazz', 123, 'Pop'],
      },
      { id: 'bad' },
    ]));
    localStorage.setItem(DEMO_RSVP_MEAL_CONFIG_KEY, JSON.stringify({
      enabled: false,
      options: ['Chicken', '', 123, 'Vegan'],
    }));

    expect(readStoredDemoRsvpConfig()).toEqual({
      questions: [{
        id: 'q1',
        label: 'Song request',
        type: 'multi_choice',
        required: true,
        appliesTo: 'reception',
        options: ['Jazz', 'Pop'],
      }],
      mealEnabled: false,
      mealOptions: ['Chicken', 'Vegan'],
    });
  });

  it('writes normalized demo RSVP settings and falls back from invalid storage', () => {
    writeStoredDemoRsvpConfig({
      questions: [{
        id: 'q1',
        label: 'Notes',
        type: 'long_text',
        required: false,
        appliesTo: 'all',
        options: ['unused'],
      }],
      mealEnabled: true,
      mealOptions: ['Chicken', ''],
    });

    expect(readStoredDemoRsvpConfig().mealOptions).toEqual(['Chicken']);
    expect(readStoredDemoRsvpConfig().questions[0]?.type).toBe('long_text');

    localStorage.setItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY, '{broken');
    expect(readStoredDemoRsvpConfig()).toEqual({
      questions: [],
      mealEnabled: true,
      mealOptions: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
    });
  });

  it('wraps demo RSVP settings and expires stale envelopes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));
    writeStoredDemoRsvpConfig({
      questions: [{
        id: 'q1',
        label: 'Song request',
        type: 'single_choice',
        required: true,
        appliesTo: 'all',
        options: Array.from({ length: 20 }, (_, index) => `Option ${index}`),
      }],
      mealEnabled: false,
      mealOptions: [' Steak ', 'x'.repeat(140)],
    });

    expect(JSON.parse(localStorage.getItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T12:00:00.000Z',
    });
    expect(readStoredDemoRsvpConfig().questions[0]?.options).toHaveLength(12);
    expect(readStoredDemoRsvpConfig().mealOptions).toEqual(['Steak', 'x'.repeat(120)]);

    localStorage.setItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - GUEST_DASHBOARD_STORAGE_RETENTION_MS - 1).toISOString(),
      value: [{
        id: 'old',
        label: 'Old question',
      }],
    }));
    localStorage.setItem(DEMO_RSVP_MEAL_CONFIG_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - GUEST_DASHBOARD_STORAGE_RETENTION_MS - 1).toISOString(),
      value: { enabled: false, options: ['Old'] },
    }));

    expect(readStoredDemoRsvpConfig()).toEqual({
      questions: [],
      mealEnabled: true,
      mealOptions: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
    });
    expect(localStorage.getItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_RSVP_MEAL_CONFIG_KEY)).toBeNull();
  });
});

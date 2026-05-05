import { beforeEach, describe, expect, it } from 'vitest';
import {
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
    localStorage.clear();
  });

  it('persists only known campaign presets', () => {
    writeStoredCampaignPreset('missing-meal');
    expect(readStoredCampaignPreset()).toBe('missing-meal');

    localStorage.setItem(RSVP_CAMPAIGN_PRESET_KEY, 'unknown-filter');
    expect(readStoredCampaignPreset()).toBeNull();
  });

  it('defensively reads invalid array storage as empty lists', () => {
    localStorage.setItem(RSVP_FOLLOWUP_TASKS_KEY, '{broken');
    localStorage.setItem(RSVP_SAVED_SEGMENTS_KEY, JSON.stringify({ bad: true }));
    localStorage.setItem(RSVP_CAMPAIGN_LOG_KEY, JSON.stringify(null));

    expect(readStoredFollowUpTasks()).toEqual([]);
    expect(readStoredSavedSegments()).toEqual([]);
    expect(readStoredCampaignLog()).toEqual([]);
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
});

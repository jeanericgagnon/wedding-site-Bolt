import { describe, expect, it } from 'vitest';
import {
  buildTravelJourneySummary,
  getDayOfSignalStatusLabel,
  getHubStatusLabel,
  getTravelJourneyStatusLabel,
} from './eventHubLiveContentHelpers';

describe('eventHubLiveContentHelpers', () => {
  it('builds invite-scoped travel readiness summaries', () => {
    expect(
      buildTravelJourneySummary([
        { id: 'travel', label: 'Travel details', detail: 'Open the travel section.', status: 'ready' },
        { id: 'rsvp', label: 'Reply', detail: 'Confirm attendance from the same hub.', status: 'needs-info' },
      ]),
    ).toEqual({
      readyCount: 1,
      needsInfoCount: 1,
      readyLabels: ['Travel details'],
      needsInfoLabels: ['Reply'],
    });
  });

  it('keeps the guest-hub status labels aligned with the product readback', () => {
    expect(getTravelJourneyStatusLabel('ready')).toBe('Travel step ready');
    expect(getTravelJourneyStatusLabel('needs-info')).toBe('Travel step needs setup');
    expect(getDayOfSignalStatusLabel('ready')).toBe('Mode ready');
    expect(getDayOfSignalStatusLabel('needs-content')).toBe('Mode needs info');
    expect(getDayOfSignalStatusLabel('planned')).toBe('Mode planned');
    expect(getHubStatusLabel('ready')).toBe('Hub item ready');
    expect(getHubStatusLabel('needs-content')).toBe('Hub item needs info');
    expect(getHubStatusLabel('planned')).toBe('Hub item planned');
  });
});

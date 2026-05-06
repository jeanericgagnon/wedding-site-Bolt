import { describe, expect, it } from 'vitest';
import { buildOverviewDismissalsWeddingData, buildUserEditedSiteJson } from './overviewService';

describe('overviewService', () => {
  it('preserves existing wedding data while setting intelligence dismissals', () => {
    expect(buildOverviewDismissalsWeddingData(
      {
        couple: { name: 'Alex and Jordan' },
        meta: {
          existing: true,
          intelligenceDismissals: ['old'],
        },
      },
      ['next-a', 'next-b'],
    )).toEqual({
      couple: { name: 'Alex and Jordan' },
      meta: {
        existing: true,
        intelligenceDismissals: ['next-a', 'next-b'],
      },
    });
  });

  it('marks an existing builder field as user-edited without replacing sibling data', () => {
    expect(buildUserEditedSiteJson(
      {
        couple: {
          headline: { value: 'Welcome', source: 'generated' },
          subtitle: { value: 'Saturday' },
        },
      },
      'couple.headline',
      '2026-05-05T12:00:00.000Z',
    )).toEqual({
      couple: {
        headline: {
          value: 'Welcome',
          source: 'user-edited',
          updatedAt: '2026-05-05T12:00:00.000Z',
        },
        subtitle: { value: 'Saturday' },
      },
    });
  });

  it('leaves unknown builder fields unchanged', () => {
    expect(buildUserEditedSiteJson(
      {
        couple: {
          headline: 'Plain value',
        },
      },
      'couple.headline',
      '2026-05-05T12:00:00.000Z',
    )).toEqual({
      couple: {
        headline: 'Plain value',
      },
    });
  });
});

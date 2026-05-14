import { describe, expect, it } from 'vitest';

import { buildGuestPhotoDashboardDerivedState } from './buildGuestPhotoDashboardDerivedState';
import { DEFAULT_HUB_SETTINGS } from '../guestPhotoSharingUtils';

const baseArgs = {
  aiBucketCorrections: [],
  analysisByUploadId: new Map(),
  availableAiTags: new Map(),
  bucketById: new Map(),
  bucketDepthById: new Map(),
  bucketSearch: '',
  buckets: [],
  events: [],
  guestProspects: [],
  guestbookEntries: [],
  hubSettings: DEFAULT_HUB_SETTINGS,
  metadataByUploadId: new Map(),
  showFlaggedOnly: false,
  showHidden: false,
  siteSlug: 'alex-jordan-demo',
  slideshowFramesLength: 0,
  slideshowReadyBucketCount: 0,
  statusFilter: 'all' as const,
  tagFilter: 'all',
  uploadAnalyses: [],
  uploadMetadata: [],
  uploads: [],
};

describe('buildGuestPhotoDashboardDerivedState', () => {
  it('keeps the recap preview url clean for normal runtime links', () => {
    const state = buildGuestPhotoDashboardDerivedState(baseArgs);
    const url = new URL(state.guestRecapUrl);

    expect(url.pathname).toBe('/event/alex-jordan-demo/recap');
    expect(url.search).toBe('');
  });

  it('carries the QA recap flag into the owner preview link when local photo proof is enabled', () => {
    const state = buildGuestPhotoDashboardDerivedState({
      ...baseArgs,
      photoMemoryFlowQaEnabled: true,
    });
    const url = new URL(state.guestRecapUrl);

    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe('/event/alex-jordan-demo/recap');
    expect(url.searchParams.get('photoMemoryFlowQa')).toBe('1');
  });
});

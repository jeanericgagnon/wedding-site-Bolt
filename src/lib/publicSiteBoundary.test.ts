import { describe, expect, it } from 'vitest';

import { collectPublicLeakValuePaths, stripPublicInternalFieldsDeep } from './publicSiteBoundary';

describe('publicSiteBoundary', () => {
  it('strips nested internal-looking key variants, not just exact field names', () => {
    const sanitized = stripPublicInternalFieldsDeep({
      title: 'Welcome',
      guestAccessToken: 'abc123',
      providerPath: '/internal/provider',
      image: {
        signedBucketUrl: 'https://example.com/private',
        debugTraceId: 'trace-1',
      },
      notes: {
        internalErrorMessage: 'stack trace',
        commandLabel: 'publish-now',
      },
    }) as Record<string, unknown>;

    expect(sanitized.title).toBe('Welcome');
    expect(sanitized).not.toHaveProperty('guestAccessToken');
    expect(sanitized).not.toHaveProperty('providerPath');
    expect((sanitized.image as Record<string, unknown>)).not.toHaveProperty('signedBucketUrl');
    expect((sanitized.image as Record<string, unknown>)).not.toHaveProperty('debugTraceId');
    expect((sanitized.notes as Record<string, unknown>)).not.toHaveProperty('internalErrorMessage');
    expect((sanitized.notes as Record<string, unknown>)).not.toHaveProperty('commandLabel');
  });

  it('does not treat ordinary guest-facing copy fields as internal', () => {
    const sanitized = stripPublicInternalFieldsDeep({
      storyTitle: 'Our weekend',
      itineraryNote: 'Ceremony begins at four.',
      contactPhone: '555-123-4567',
    }) as Record<string, unknown>;

    expect(sanitized).toEqual({
      storyTitle: 'Our weekend',
      itineraryNote: 'Ceremony begins at four.',
      contactPhone: '555-123-4567',
    });
  });

  it('still reports leaked values that survive under non-internal keys', () => {
    expect(collectPublicLeakValuePaths({
      helpfulLabel: 'Uses internal provider fallback',
      imageUrl: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/foo.jpg?token=abc',
    })).toEqual(['root.helpfulLabel', 'root.imageUrl']);
  });
});

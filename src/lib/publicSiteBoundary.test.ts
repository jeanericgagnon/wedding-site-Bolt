import { describe, expect, it } from 'vitest';
import { collectPublicLeakValuePaths, stripPublicInternalFieldsDeep } from './publicSiteBoundary';

describe('publicSiteBoundary', () => {
  it('strips clearly internal fields from nested public payloads without disturbing safe public config', () => {
    const sanitized = stripPublicInternalFieldsDeep({
      themeTokens: { accent: '#c084fc' },
      hero: {
        imageUrl: 'https://example.com/hero.jpg',
        provider: 'openai',
        debugInfo: 'internal trace',
      },
      pages: [
        {
          title: 'Home',
          inviteToken: 'abc123',
          sections: [
            {
              title: 'Story',
              bucket: 'site-media',
              internalNotes: 'keep private',
            },
          ],
        },
      ],
    });

    expect(sanitized).toEqual({
      themeTokens: { accent: '#c084fc' },
      hero: {
        imageUrl: 'https://example.com/hero.jpg',
      },
      pages: [
        {
          title: 'Home',
          sections: [
            {
              title: 'Story',
            },
          ],
        },
      ],
    });
  });

  it('flags signed media urls and internal-looking value strings in public payload scans', () => {
    const leakPaths = collectPublicLeakValuePaths({
      media: {
        heroImageUrl: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/foo.jpg?token=abc',
      },
      note: 'Provider failed after command retry',
      title: 'Welcome weekend',
    });

    expect(leakPaths).toEqual(['root.media.heroImageUrl', 'root.note']);
  });
});

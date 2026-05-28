import { describe, expect, it } from 'vitest';
import { getIsPublishedFromSiteRow, getPublicBuilderProject, getPublicBuilderV2Document, getPublicWeddingData } from './publicSiteProject';
import { collectPublicLeakValuePaths } from './publicSiteBoundary';

const draftProject = {
  id: 'draft',
  weddingId: 'w1',
  templateId: 'modern-luxe',
  themeId: 'romantic',
  pages: [{ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, sections: [{ id: 's1', type: 'hero', variant: 'default', enabled: true, orderIndex: 0, settings: { headline: 'Draft headline' }, styleOverrides: {}, bindings: {} }], meta: { isHome: true, isHidden: false } }],
  draftVersion: 2,
  publishedVersion: null,
  publishStatus: 'draft',
  lastPublishedAt: null,
  meta: { createdAtISO: '2026-04-19T00:00:00.000Z', updatedAtISO: '2026-04-19T01:30:00.000Z' },
};

const publishedProject = {
  ...draftProject,
  id: 'published',
  pages: [{ ...draftProject.pages[0], sections: [{ ...draftProject.pages[0].sections[0], settings: { headline: 'Published headline' } }] }],
  publishStatus: 'published',
};

const liveWeddingData = {
  version: '1',
  couple: { partner1Name: 'Draft', partner2Name: 'Names', displayName: 'Draft Names' },
  event: {},
  venues: [],
  schedule: [],
  rsvp: { enabled: true },
  travel: {},
  registry: { links: [] },
  faq: [],
  theme: {},
  media: { gallery: [], heroImageUrl: 'https://example.com/draft-hero.jpg' },
  meta: { createdAtISO: '2026-04-19T00:00:00.000Z', updatedAtISO: '2026-04-19T01:30:00.000Z' },
};

const publishedWeddingData = {
  ...liveWeddingData,
  couple: { partner1Name: 'Published', partner2Name: 'Names', displayName: 'Published Names' },
  media: { gallery: [], heroImageUrl: 'https://example.com/published-hero.jpg' },
};

describe('publicSiteProject', () => {
  it('prefers published_json for guest-facing render when site is published', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: publishedProject,
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.headline).toBe('Published headline');
  });

  it('falls back to site_json when no published snapshot exists', () => {
    const row = {
      is_published: false,
      site_json: draftProject,
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(false);
    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.headline).toBe('Draft headline');
  });

  it('adapts builder v2 site_json into a public builder project for runtime rendering', () => {
    const row = {
      is_published: false,
      site_json: {
        version: 'v2',
        updatedAtISO: '2026-05-27T22:00:00.000Z',
        pages: [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            isHome: true,
            hidden: false,
            sections: [
              {
                id: 'hero-v2',
                type: 'hero',
                variant: 'default',
                enabled: true,
                title: 'Alex & Jordan',
                subtitle: 'September 14, 2027',
                blocks: [
                  { id: 'title-1', type: 'title', data: { text: 'Alex & Jordan' } },
                  { id: 'text-1', type: 'text', data: { text: 'September 14, 2027' } },
                ],
              },
            ],
          },
        ],
      },
    };

    const project = getPublicBuilderProject(row);
    expect(project?.pages[0].meta).toEqual({ isHome: true, isHidden: false });
    expect(project?.pages[0].sections[0].settings.headline).toBe('Alex & Jordan');
    expect(project?.pages[0].sections[0].settings.subheadline).toBe('September 14, 2027');
  });

  it('returns a public builder v2 document when the stored site_json is already v2', () => {
    const row = {
      is_published: false,
      site_json: {
        version: 'v2',
        updatedAtISO: '2026-05-27T22:00:00.000Z',
        pages: [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            isHome: true,
            hidden: false,
            sections: [],
          },
        ],
      },
    };

    expect(getPublicBuilderV2Document(row)?.pages?.[0]?.slug).toBe('home');
  });

  it('rejects malformed public builder v2 documents instead of treating them as guest-safe', () => {
    const row = {
      is_published: false,
      site_json: {
        version: 'v2',
        updatedAtISO: '2026-05-27T22:00:00.000Z',
        pages: [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            isHome: true,
            hidden: false,
            sections: [],
          },
          {
            id: 'story',
            title: 'Story',
            slug: 'home',
            isHome: false,
            hidden: false,
            sections: [],
          },
        ],
      },
    };

    expect(getPublicBuilderV2Document(row)).toBeNull();
  });

  it('strips internal boundary fields from public builder projects', () => {
    const row = {
      is_published: true,
      published_json: {
        ...publishedProject,
        pages: [{
          ...publishedProject.pages[0],
          sections: [{
            ...publishedProject.pages[0].sections[0],
            settings: {
              headline: 'Published headline',
              heroImage: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/foo.jpg?token=abc',
              provider: 'openai',
              bucket: 'site-media',
              command: 'publish-now',
              debugInfo: 'trace-id-1',
            },
            meta: {
              inviteToken: 'private-link-token',
              internalNotes: 'keep this off the guest site',
            },
          }],
        }],
      },
    };

    const project = getPublicBuilderProject(row);
    expect(project?.pages[0].sections[0].settings.headline).toBe('Published headline');
    expect(project?.pages[0].sections[0].settings.heroImage).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/site-media/foo.jpg',
    );
    expect(project?.pages[0].sections[0].settings).not.toHaveProperty('provider');
    expect(project?.pages[0].sections[0].settings).not.toHaveProperty('bucket');
    expect(project?.pages[0].sections[0].settings).not.toHaveProperty('command');
    expect(project?.pages[0].sections[0].settings).not.toHaveProperty('debugInfo');
    expect(project?.pages[0].sections[0].meta).not.toHaveProperty('inviteToken');
    expect(project?.pages[0].sections[0].meta).not.toHaveProperty('internalNotes');
    expect(collectPublicLeakValuePaths(project)).toEqual([]);
  });

  it('strips internal boundary fields from public builder v2 documents', () => {
    const row = {
      is_published: true,
      published_json: {
        version: 'v2',
        updatedAtISO: '2026-05-27T22:30:00.000Z',
        pages: [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            isHome: true,
            hidden: false,
            sections: [
              {
                id: 'hero-1',
                type: 'hero',
                variant: 'default',
                enabled: true,
                title: 'Published',
                subtitle: 'Weekend',
                provider: 'openai',
                bucket: 'site-media',
                blocks: [
                  {
                    id: 'photo-1',
                    type: 'photo',
                    data: {
                      imageUrl: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/bar.jpg?token=abc',
                      debugInfo: 'trace-id-2',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const document = getPublicBuilderV2Document(row) as unknown as Record<string, unknown>;
    const section = ((document.pages as Array<Record<string, unknown>>)[0].sections as Array<Record<string, unknown>>)[0];
    const blockData = ((((section.blocks as Array<Record<string, unknown>>)[0]).data) as Record<string, unknown>);

    expect(section).not.toHaveProperty('provider');
    expect(section).not.toHaveProperty('bucket');
    expect(blockData.imageUrl).toBe('https://xyz.supabase.co/storage/v1/object/public/site-media/bar.jpg');
    expect(blockData).not.toHaveProperty('debugInfo');
    expect(collectPublicLeakValuePaths(document)).toEqual([]);
  });

  it('recognizes published state from published_json metadata even without is_published', () => {
    const row = {
      site_json: draftProject,
      published_json: publishedProject,
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
  });

  it('prefers published builder v2 snapshots over draft builder projects for guest-facing render', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: {
        version: 'v2',
        updatedAtISO: '2026-05-27T22:30:00.000Z',
        pages: [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            isHome: true,
            hidden: false,
            sections: [
              {
                id: 's1',
                type: 'hero',
                variant: 'default',
                enabled: true,
                title: 'Published V2 headline',
                subtitle: 'Published V2 subheadline',
                blocks: [
                  { id: 'title-1', type: 'title', data: { text: 'Published V2 headline' } },
                  { id: 'text-1', type: 'text', data: { text: 'Published V2 subheadline' } },
                ],
              },
            ],
          },
        ],
      },
    };

    const project = getPublicBuilderProject(row);
    expect(project?.pages[0].sections[0].settings.headline).toBe('Published V2 headline');
    expect(project?.pages[0].sections[0].settings.subheadline).toBe('Published V2 subheadline');
    expect(project?.templateId).toBe('modern-luxe');
    expect(project?.themeId).toBe('romantic');
  });

  it('prefers published builder v2 snapshots for direct public v2 runtime loading', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: {
        version: 'v2',
        updatedAtISO: '2026-05-27T22:30:00.000Z',
        pages: [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            isHome: true,
            hidden: false,
            sections: [],
          },
          {
            id: 'weekend',
            title: 'Weekend',
            slug: 'weekend',
            isHome: false,
            hidden: false,
            sections: [],
          },
        ],
      },
    };

    expect(getPublicBuilderV2Document(row)?.pages?.[1]?.slug).toBe('weekend');
  });

  it('falls back to the draft builder project when the published v2 snapshot is malformed', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: {
        version: 'v2',
        updatedAtISO: '2026-05-27T22:30:00.000Z',
        pages: [
          {
            id: 'home',
            title: 'Home',
            slug: 'home',
            isHome: true,
            hidden: true,
            sections: [],
          },
        ],
      },
    };

    const project = getPublicBuilderProject(row);
    expect(project?.pages[0].sections[0].settings.headline).toBe('Draft headline');
    expect(getPublicBuilderV2Document(row)).toBeNull();
  });

  it('prefers published wedding data snapshot for guest-facing content', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: publishedWeddingData,
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
    expect(getPublicWeddingData(row)?.media.heroImageUrl).toBe('https://example.com/published-hero.jpg');
  });

  it('falls back to live wedding_data when no published snapshot exists', () => {
    const row = {
      is_published: false,
      site_json: draftProject,
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Draft Names');
  });

  it('falls back to stringified live wedding_data when no published snapshot exists', () => {
    const row = {
      is_published: false,
      site_json: JSON.stringify(draftProject),
      wedding_data: JSON.stringify(liveWeddingData),
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Draft Names');
  });

  it('rebuilds a truthful public couple displayName from partner names when the snapshot is blank', () => {
    const row = {
      is_published: false,
      site_json: draftProject,
      wedding_data: {
        ...liveWeddingData,
        couple: {
          partner1Name: 'Alex',
          partner2Name: 'Jordan',
          displayName: '',
        },
      },
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Alex & Jordan');
  });

  it('keeps a single public partner name truthful when the other name is missing', () => {
    const row = {
      is_published: false,
      site_json: draftProject,
      wedding_data: {
        ...liveWeddingData,
        couple: {
          partner1Name: 'Alex',
          partner2Name: '',
          displayName: '',
        },
      },
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Alex');
  });

  it('trims whitespace-only public partner names when rebuilding a blank snapshot displayName', () => {
    const row = {
      is_published: false,
      site_json: draftProject,
      wedding_data: {
        ...liveWeddingData,
        couple: {
          partner1Name: '   ',
          partner2Name: ' Alex ',
          displayName: '',
        },
      },
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Alex');
  });

  it('prefers site_json weddingDataSnapshot over stale wedding_data when unpublished', () => {
    const row = {
      is_published: false,
      site_json: {
        ...draftProject,
        weddingDataSnapshot: publishedWeddingData,
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
  });

  it('rewrites signed media urls for public builder project parity', () => {
    const row = {
      is_published: true,
      published_json: {
        ...publishedProject,
        pages: [{
          ...publishedProject.pages[0],
          sections: [{
            ...publishedProject.pages[0].sections[0],
            settings: {
              heroImage: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/foo.jpg?token=abc',
            },
          }],
        }],
      },
    };

    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.heroImage).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/site-media/foo.jpg',
    );
  });

  it('rewrites signed media urls for public wedding data parity', () => {
    const row = {
      is_published: true,
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: {
          ...publishedWeddingData,
          media: {
            gallery: [],
            heroImageUrl: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/bar.jpg?token=abc',
          },
        },
      },
    };

    expect(getPublicWeddingData(row)?.media.heroImageUrl).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/site-media/bar.jpg',
    );
  });

  it('recognizes published state from stringified published_json metadata', () => {
    const row = {
      site_json: JSON.stringify(draftProject),
      published_json: JSON.stringify(publishedProject),
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.headline).toBe('Published headline');
  });

  it('recognizes published state from site_json flag even when is_published is false', () => {
    const row = {
      is_published: false,
      site_json: {
        ...draftProject,
        publishStatus: 'published',
      },
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
  });

  it('recognizes published state from stringified site_json metadata when no published snapshot exists', () => {
    const row = {
      site_json: JSON.stringify({
        ...draftProject,
        publishStatus: 'published',
        publishedVersion: 3,
      }),
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
  });

  it('recognizes published state from stringified site_json lastPublishedAt metadata when version is missing', () => {
    const row = {
      site_json: JSON.stringify({
        ...draftProject,
        lastPublishedAt: '2026-04-20T12:00:00.000Z',
      }),
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
  });

  it('does not treat blank stringified lastPublishedAt metadata as published', () => {
    const row = {
      site_json: JSON.stringify({
        ...draftProject,
        lastPublishedAt: '',
      }),
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(false);
  });

  it('does not treat whitespace stringified lastPublishedAt metadata as published', () => {
    const row = {
      site_json: JSON.stringify({
        ...draftProject,
        lastPublishedAt: '   ',
      }),
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(false);
  });

  it('does not treat whitespace published_json lastPublishedAt metadata as published', () => {
    const row = {
      site_json: draftProject,
      published_json: {
        ...publishedProject,
        publishStatus: 'draft',
        publishedVersion: null,
        lastPublishedAt: '   ',
      },
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(false);
  });

  it('extracts published wedding data snapshot from stringified site rows', () => {
    const row = {
      is_published: true,
      site_json: JSON.stringify(draftProject),
      published_json: JSON.stringify({
        ...publishedProject,
        weddingDataSnapshot: JSON.stringify({
          ...publishedWeddingData,
          media: {
            gallery: [],
            heroImageUrl: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/stringified.jpg?token=abc',
          },
        }),
      }),
      wedding_data: JSON.stringify(liveWeddingData),
    };

    const data = getPublicWeddingData(row);
    expect(data?.couple.displayName).toBe('Published Names');
    expect(data?.media.heroImageUrl).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/site-media/stringified.jpg',
    );
  });

  it('falls back to site_json builder pages when published_json is partial', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: {
        publishStatus: 'published',
        weddingDataSnapshot: publishedWeddingData,
      },
    };

    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.headline).toBe('Draft headline');
  });

  it('falls back to site_json builder pages when stringified published_json is partial', () => {
    const row = {
      is_published: true,
      site_json: JSON.stringify(draftProject),
      published_json: JSON.stringify({
        publishStatus: 'published',
        weddingDataSnapshot: publishedWeddingData,
      }),
    };

    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.headline).toBe('Draft headline');
  });

  it('merges partial published sections with site_json to preserve published truth', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        pages: [{
          ...draftProject.pages[0],
          sections: [{
            ...draftProject.pages[0].sections[0],
            settings: {
              headline: 'Draft headline',
              subheadline: 'Draft subheadline',
              ctaLabel: 'Draft CTA',
            },
            styleOverrides: {
              backgroundColor: '#f5f1eb',
            },
          }],
        }],
      },
      published_json: {
        ...publishedProject,
        pages: [{
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          sections: [{
            id: 's1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            orderIndex: 0,
            settings: {
              headline: 'Published headline',
            },
          }],
          meta: { isHome: true, isHidden: false },
        }],
      },
    };

    const project = getPublicBuilderProject(row);
    expect(project?.pages[0].sections).toHaveLength(1);
    expect(project?.pages[0].sections[0].settings.headline).toBe('Published headline');
    expect(project?.pages[0].sections[0].settings.subheadline).toBe('Draft subheadline');
    expect(project?.pages[0].sections[0].settings.ctaLabel).toBe('Draft CTA');
    expect(project?.pages[0].sections[0].styleOverrides.backgroundColor).toBe('#f5f1eb');
  });

  it('does not append draft-only sections when published snapshot omits them', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        pages: [{
          ...draftProject.pages[0],
          sections: [
            draftProject.pages[0].sections[0],
            {
              id: 'draft-only',
              type: 'story',
              variant: 'default',
              enabled: true,
              orderIndex: 1,
              settings: { title: 'Unpublished story' },
              styleOverrides: {},
              bindings: {},
              meta: { createdAtISO: '2026-04-19T00:00:00.000Z', updatedAtISO: '2026-04-19T00:00:00.000Z' },
              locked: false,
            },
          ],
        }],
      },
      published_json: publishedProject,
    };

    const project = getPublicBuilderProject(row);
    expect(project?.pages[0].sections.map((section) => section.id)).toEqual(['s1']);
  });

  it('falls back to site_json wedding snapshot when published_json omits it', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        weddingDataSnapshot: publishedWeddingData,
      },
      published_json: {
        ...publishedProject,
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
  });

  it('falls back to stringified site_json wedding snapshot when stringified published_json omits it', () => {
    const row = {
      is_published: true,
      site_json: JSON.stringify({
        ...draftProject,
        weddingDataSnapshot: JSON.stringify(publishedWeddingData),
      }),
      published_json: JSON.stringify({
        ...publishedProject,
      }),
      wedding_data: JSON.stringify(liveWeddingData),
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
  });

  it('falls back to stringified site_json wedding snapshot when published_json is partial', () => {
    const row = {
      is_published: true,
      site_json: JSON.stringify({
        ...draftProject,
        weddingDataSnapshot: JSON.stringify(publishedWeddingData),
      }),
      published_json: JSON.stringify({
        publishStatus: 'published',
      }),
      wedding_data: JSON.stringify(liveWeddingData),
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
  });

  it('falls back to site_json wedding snapshot when published_json snapshot is blank', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        weddingDataSnapshot: publishedWeddingData,
      },
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: '',
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
  });

  it('falls back to site_json wedding snapshot when published_json snapshot is an empty object', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        weddingDataSnapshot: publishedWeddingData,
      },
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: {},
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
  });

  it('falls back to live wedding_data when earlier published candidates are thin placeholders', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        weddingDataSnapshot: {},
      },
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: { version: '1', couple: {}, media: { gallery: [] } },
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Draft Names');
  });

  it('falls back to live wedding_data when published snapshots are invalid', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        weddingDataSnapshot: '',
      },
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: 'not-json',
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Draft Names');
  });

  it('does not throw when live wedding_data is an empty object', () => {
    const row = {
      is_published: true,
      site_json: {
        ...draftProject,
        weddingDataSnapshot: '',
      },
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: 'not-json',
      },
      wedding_data: {},
    };

    expect(getPublicWeddingData(row)).toEqual({});
  });

  it('strips internal boundary fields from public wedding data snapshots', () => {
    const row = {
      is_published: true,
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: {
          ...publishedWeddingData,
          media: {
            gallery: [],
            heroImageUrl: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/bar.jpg?token=abc',
          },
          provider: 'openai',
          debugInfo: 'trace-id-3',
          internalNotes: 'private ops note',
          accessToken: 'session-secret',
        },
      },
    };

    const data = getPublicWeddingData(row) as unknown as Record<string, unknown>;

    expect((data.media as Record<string, unknown>).heroImageUrl).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/site-media/bar.jpg',
    );
    expect(data).not.toHaveProperty('provider');
    expect(data).not.toHaveProperty('debugInfo');
    expect(data).not.toHaveProperty('internalNotes');
    expect(data).not.toHaveProperty('accessToken');
    expect(collectPublicLeakValuePaths(data)).toEqual([]);
  });
});

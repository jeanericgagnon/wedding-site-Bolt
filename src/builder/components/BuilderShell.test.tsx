import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getBuilderPageCreatedNotice, getPublishGuidance } from './BuilderShell';

describe('getPublishGuidance', () => {
  it('guides unsaved publish blockers back to saving first', () => {
    expect(
      getPublishGuidance({
        kind: 'unsaved-changes',
        message: 'Save your latest draft changes before sharing with guests.',
      }),
    ).toEqual({
      notice: 'Save your latest draft changes, then try publish again.',
      error: 'Save your latest draft changes before sharing with guests.',
    });
  });

  it('keeps existing venue blocker guidance stable', () => {
    expect(
      getPublishGuidance({
        kind: 'missing-venue',
        message: 'Add at least one venue before sharing with guests.',
      }),
    ).toEqual({
      notice: 'Add at least one venue before sharing with guests.',
      error: 'Add at least one venue before sharing with guests.',
    });
  });
});

describe('builder page notice link copying', () => {
  it('uses the shared copy/download fallback instead of silent raw clipboard writes', () => {
    const source = readFileSync(join(process.cwd(), 'src/builder/components/BuilderShell.tsx'), 'utf8');

    expect(source).toContain("import { copyTextOrDownload } from '../../lib/copyText';");
    expect(source).toContain('const copyPageNoticeLink = async () => {');
    expect(source).toContain("const result = await copyTextOrDownload(url, 'dayof-builder-page-link.txt');");
    expect(source).toContain("dispatch(builderActions.setError('Couldn’t copy that page link right now.'));");
    expect(source).toContain("'Downloaded link'");
    expect(source).not.toContain('navigator.clipboard?.writeText');
  });
});

describe('getBuilderPageCreatedNotice', () => {
  it('describes dedicated pages and includes the public path when available', () => {
    expect(
      getBuilderPageCreatedNotice(
        {
          id: 'travel-page',
          title: 'Travel',
          slug: 'travel',
          orderIndex: 1,
          sections: [{
            id: 'travel-section',
            type: 'travel',
            variant: 'default',
            orderIndex: 0,
            enabled: true,
            locked: false,
            settings: {},
            styleOverrides: {},
            bindings: {},
            meta: { createdAtISO: '2026-01-01T00:00:00.000Z', updatedAtISO: '2026-01-01T00:00:00.000Z' },
          }],
          meta: { isHome: false, isHidden: false },
        },
        'maya-leo',
      ),
    ).toEqual({
      pageId: 'travel-page',
      message: 'Moved Travel into a dedicated page.',
      path: '/site/maya-leo/travel',
    });
  });

  it('falls back cleanly when a new blank page has no public slug yet', () => {
    expect(
      getBuilderPageCreatedNotice({
        id: 'details-page',
        title: 'Details',
        slug: 'details',
        orderIndex: 1,
        sections: [],
        meta: { isHome: false, isHidden: false },
      }),
    ).toEqual({
      pageId: 'details-page',
      message: 'Created Details.',
      path: null,
    });
  });

  it('unwraps builder value page titles in page-created notices', () => {
    expect(
      getBuilderPageCreatedNotice({
        id: 'travel-page',
        title: { value: 'Guest Travel', source: 'user-edited' } as unknown as string,
        slug: { value: 'Guest Travel', source: 'user-edited' } as unknown as string,
        orderIndex: 1,
        sections: [{
          id: 'travel-section',
          type: 'travel',
          variant: 'default',
          orderIndex: 0,
          enabled: true,
          locked: false,
          settings: {},
          styleOverrides: {},
          bindings: {},
          meta: { createdAtISO: '2026-01-01T00:00:00.000Z', updatedAtISO: '2026-01-01T00:00:00.000Z' },
        }],
        meta: { isHome: false, isHidden: false },
      }, 'maya-leo'),
    ).toEqual({
      pageId: 'travel-page',
      message: 'Moved Guest Travel into a dedicated page.',
      path: '/site/maya-leo/guest-travel',
    });
  });
});

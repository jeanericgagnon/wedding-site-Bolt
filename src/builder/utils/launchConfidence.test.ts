import { describe, expect, it } from 'vitest';
import { buildLaunchConfidence } from './launchConfidence';
import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';

const baseProject: BuilderProject = {
  id: 'proj_1',
  weddingId: 'wed_1',
  templateId: 'modern-luxe',
  themeId: 'romantic',
  pages: [
    {
      id: 'page_home',
      title: 'Home',
      slug: 'home',
      orderIndex: 0,
      sections: [
        {
          id: 'section_hero',
          type: 'hero',
          variant: 'default',
          displayName: 'Hero',
          enabled: true,
          locked: false,
          orderIndex: 0,
          settings: {},
          bindings: {},
          styleOverrides: {},
          meta: {
            createdAtISO: '2026-05-01T00:00:00.000Z',
            updatedAtISO: '2026-05-20T00:00:00.000Z',
          },
        },
      ],
      meta: { isHome: true, isHidden: false },
    },
  ],
  draftVersion: 3,
  publishedVersion: null,
  publishStatus: 'draft',
  lastPublishedAt: null,
  meta: {
    createdAtISO: '2026-05-01T00:00:00.000Z',
    updatedAtISO: '2026-05-20T00:00:00.000Z',
  },
};

const baseWeddingData: WeddingDataV1 = {
  couple: {
    partner1Name: 'Avery',
    partner2Name: 'Jordan',
  },
  event: {
    weddingDateISO: '2026-09-14',
  },
  venues: [
    {
      id: 'venue_1',
      name: 'The Terrace',
      address: '123 Garden Way',
    },
  ],
  rsvp: {
    enabled: true,
  },
  schedule: [
    {
      id: 'event_1',
      label: 'Ceremony',
      startTimeISO: '2026-09-14T16:00:00.000Z',
    },
  ],
} as WeddingDataV1;

describe('buildLaunchConfidence', () => {
  it('surfaces blockers when the draft still misses launch basics', () => {
    const confidence = buildLaunchConfidence(baseProject, {
      ...baseWeddingData,
      rsvp: { enabled: false },
    } as WeddingDataV1);

    expect(confidence.tone).toBe('warning');
    expect(confidence.primaryAction).toMatchObject({ kind: 'fix', target: 'publish-blockers' });
    expect(confidence.summary).toContain('RSVP');
    expect(confidence.decisionRule).toMatch(/fix the blocker|guest-facing basics/i);
    expect(confidence.watchout).toMatch(/design progress|blocker/i);
    expect(confidence.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
  });

  it('encourages a save-and-publish pass when unsaved changes are the only blocker', () => {
    const confidence = buildLaunchConfidence(baseProject, baseWeddingData, { isDirty: true });

    expect(confidence.label).toContain('Almost ready to share');
    expect(confidence.primaryAction).toMatchObject({ kind: 'publish' });
    expect(confidence.decisionRule).toMatch(/save state|synchronize/i);
    expect(confidence.watchout).toMatch(/save state|stale/i);
  });

  it('treats a structurally sound draft as ready for launch', () => {
    const confidence = buildLaunchConfidence(baseProject, baseWeddingData, { isDirty: false });

    expect(confidence.tone).toBe('ready');
    expect(confidence.label).toBe('Ready for a real final review');
    expect(confidence.primaryAction).toMatchObject({ kind: 'publish' });
    expect(confidence.decisionRule).toMatch(/honest preview|polish lap/i);
    expect(confidence.sequence[1]?.detail).toMatch(/mobile|preview/i);
  });

  it('keeps the launch-confidence lane free of go-live phrasing', () => {
    const confidence = buildLaunchConfidence(baseProject, {
      ...baseWeddingData,
      rsvp: { enabled: false },
    } as WeddingDataV1);

    expect(confidence.summary.toLowerCase()).not.toContain('go live');
    expect(confidence.next.toLowerCase()).not.toContain('go live');
    expect(confidence.current.toLowerCase()).not.toContain('go live');
  });

  it('keeps launch confidence in warning mode when the itinerary has no real anchor events yet', () => {
    const confidence = buildLaunchConfidence(baseProject, {
      ...baseWeddingData,
      schedule: [],
    } as WeddingDataV1, { isDirty: false });

    expect(confidence.tone).toBe('warning');
    expect(confidence.primaryAction).toMatchObject({ kind: 'fix', target: 'itinerary' });
    expect(confidence.summary).toMatch(/itinerary event|timeline/i);
    expect(confidence.decisionRule).toMatch(/schedule anchor|premature/i);
    expect(confidence.watchout).toMatch(/schedule|weekend/i);
  });

  it('switches to polish framing once the site is already live', () => {
    const confidence = buildLaunchConfidence({
      ...baseProject,
      publishStatus: 'published',
      publishedVersion: 4,
      lastPublishedAt: '2026-05-22T00:00:00.000Z',
    }, baseWeddingData);

    expect(confidence.label).toContain('Live');
    expect(confidence.primaryAction).toMatchObject({ kind: 'preview' });
    expect(confidence.decisionRule).toMatch(/restraint beats motion|guest clarity|confidence/i);
    expect(confidence.watchout).toMatch(/constant-update|live/i);
  });
});

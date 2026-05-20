import { beforeEach, describe, expect, it, vi } from 'vitest';

const { maybeSingle, eq, select, from, rpc } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  return { maybeSingle, eq, select, from, rpc };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from,
    rpc,
  },
}));

vi.mock('../adapters/layoutAdapter', () => ({
  fromExistingLayoutToBuilderProject: vi.fn(),
  fromBuilderProjectToExistingLayout: vi.fn(),
}));

vi.mock('../serializers/projectSerializer', () => ({
  serializeBuilderProject: vi.fn((project) => project),
}));

vi.mock('./versionHistory', () => ({
  getBuilderRevision: vi.fn(),
  listBuilderRevisions: vi.fn(),
  recordBuilderRevision: vi.fn(),
}));

import { builderProjectService } from './builderProjectService';
import { serializeBuilderProject } from '../serializers/projectSerializer';
import { fromExistingLayoutToBuilderProject } from '../adapters/layoutAdapter';
import { createEmptyBuilderProject } from '../../types/builder/project';

describe('builderProjectService.loadWeddingData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a single available partner name truthful when row display data is rebuilt', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        couple_name_1: 'Alex',
        couple_name_2: '',
      },
      error: null,
    });

    const result = await builderProjectService.loadWeddingData('site-1');

    expect(result.couple.displayName).toBe('Alex');
    expect(result.couple.partner1Name).toBe('Alex');
    expect(result.couple.partner2Name).toBe('');
  });

  it('trims row name fields before joining them into displayName truth', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        couple_name_1: '  Alex  ',
        couple_name_2: '  Jordan  ',
      },
      error: null,
    });

    const result = await builderProjectService.loadWeddingData('site-2');

    expect(result.couple.displayName).toBe('Alex & Jordan');
  });

  it('skips invalid row wedding dates instead of crashing builder load', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        couple_name_1: 'Alex',
        couple_name_2: 'Jordan',
        wedding_date: 'not-a-date',
      },
      error: null,
    });

    await expect(builderProjectService.loadWeddingData('site-3')).resolves.toMatchObject({
      event: {
        weddingDateISO: undefined,
      },
    });
  });

  it('uses canonical row identity over stale saved wedding data placeholders', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        couple_name_1: 'Maya',
        couple_name_2: 'Leo',
        wedding_date: '2026-10-03',
        venue_name: 'The Conservatory',
        wedding_location: 'Austin, TX',
        wedding_data: {
          version: '1',
          couple: {
            partner1Name: '',
            partner2Name: '',
            displayName: 'The couple',
          },
          event: {},
          venues: [],
          schedule: [],
          rsvp: { enabled: true },
          travel: {},
          registry: { links: [] },
          faq: [],
          theme: {},
          media: { gallery: [] },
          meta: {
            createdAtISO: '2026-01-01T00:00:00.000Z',
            updatedAtISO: '2026-01-01T00:00:00.000Z',
          },
        },
      },
      error: null,
    });

    const result = await builderProjectService.loadWeddingData('site-4');

    expect(result.couple).toMatchObject({
      partner1Name: 'Maya',
      partner2Name: 'Leo',
      displayName: 'Maya & Leo',
    });
    expect(result.event.weddingDateISO).toBe('2026-10-03T00:00:00.000Z');
    expect(result.venues[0]).toMatchObject({
      name: 'The Conservatory',
      address: 'Austin, TX',
    });
  });

  it('keeps saved wedding data when canonical row fields are still empty', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        wedding_data: {
          version: '1',
          couple: {
            partner1Name: 'Priya',
            partner2Name: 'Sam',
            displayName: 'Priya & Sam',
          },
          event: {
            weddingDateISO: '2026-09-12T00:00:00.000Z',
          },
          venues: [{ id: 'primary', name: 'Garden House' }],
          schedule: [],
          rsvp: { enabled: true },
          travel: {},
          registry: { links: [] },
          faq: [],
          theme: {},
          media: { gallery: [] },
          meta: {
            createdAtISO: '2026-01-01T00:00:00.000Z',
            updatedAtISO: '2026-01-01T00:00:00.000Z',
          },
        },
      },
      error: null,
    });

    const result = await builderProjectService.loadWeddingData('site-5');

    expect(result.couple.displayName).toBe('Priya & Sam');
    expect(result.event.weddingDateISO).toBe('2026-09-12T00:00:00.000Z');
    expect(result.venues[0].name).toBe('Garden House');
  });

  it('normalizes loaded site_json projects without touching timestamps', async () => {
    const project = {
      ...createEmptyBuilderProject('old-site', 'modern'),
      id: 'project-1',
      meta: {
        createdAtISO: '2026-01-01T00:00:00.000Z',
        updatedAtISO: '2026-01-02T00:00:00.000Z',
      },
      pages: [{
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 0,
        sections: [],
        meta: { isHome: true, isHidden: false },
      }],
    };
    maybeSingle.mockResolvedValue({
      data: {
        site_json: project,
      },
      error: null,
    });

    await builderProjectService.loadProject('site-1');

    expect(serializeBuilderProject).toHaveBeenCalledWith(
      { ...project, weddingId: 'site-1' },
      { touchTimestamps: false },
    );
  });

  it('normalizes converted legacy layout projects without touching timestamps', async () => {
    const project = {
      ...createEmptyBuilderProject('site-2', 'classic'),
      id: 'project-2',
      meta: {
        createdAtISO: '2026-01-01T00:00:00.000Z',
        updatedAtISO: '2026-01-02T00:00:00.000Z',
      },
      pages: [{
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 0,
        sections: [],
        meta: { isHome: true, isHidden: false },
      }],
    };
    vi.mocked(fromExistingLayoutToBuilderProject).mockReturnValue(project);
    maybeSingle.mockResolvedValue({
      data: {
        layout_config: {
          version: '1',
          pages: [{ id: 'home', sections: [] }],
        },
      },
      error: null,
    });

    await builderProjectService.loadProject('site-2');

    expect(serializeBuilderProject).toHaveBeenCalledWith(project, { touchTimestamps: false });
  });

  it('publishes builder projects through the dedicated publish RPC', async () => {
    maybeSingle
      .mockResolvedValueOnce({
        data: {
          site_json: {
            publishedVersion: 2,
          },
          wedding_data: {
            version: '1',
          },
        },
        error: null,
      });
    rpc.mockResolvedValueOnce({ error: null });

    await expect(builderProjectService.publishProject('project-1', 'site-1')).resolves.toMatchObject({
      version: 3,
    });

    expect(rpc).toHaveBeenCalledWith('builder_project_publish', expect.objectContaining({
      p_wedding_site_id: 'site-1',
    }));
  });
});

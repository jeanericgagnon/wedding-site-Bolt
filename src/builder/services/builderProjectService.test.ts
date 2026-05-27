import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';

const { maybeSingle, updateEq, update, from, fromExistingLayoutToBuilderProject, fromBuilderProjectToExistingLayout, recordBuilderRevision } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const updateEq = vi.fn();
  const update = vi.fn(() => ({ eq: updateEq }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, update }));
  const fromExistingLayoutToBuilderProject = vi.fn();
  const fromBuilderProjectToExistingLayout = vi.fn();
  const recordBuilderRevision = vi.fn();
  return { maybeSingle, updateEq, update, from, fromExistingLayoutToBuilderProject, fromBuilderProjectToExistingLayout, recordBuilderRevision };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from,
  },
}));

vi.mock('../adapters/layoutAdapter', () => ({
  fromExistingLayoutToBuilderProject,
  fromBuilderProjectToExistingLayout,
}));

vi.mock('../serializers/projectSerializer', () => ({
  serializeBuilderProject: vi.fn((project) => project),
}));

vi.mock('./versionHistory', () => ({
  getBuilderRevision: vi.fn(),
  listBuilderRevisions: vi.fn(),
  recordBuilderRevision,
}));

import { builderProjectService } from './builderProjectService';

describe('builderProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEq.mockResolvedValue({ error: null });
    fromBuilderProjectToExistingLayout.mockReturnValue({ version: '1', pages: [] });
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

  it('normalizes persisted publish truth when loading a builder project', async () => {
    const storedProject = createEmptyBuilderProject('site-4', 'modern-luxe');
    storedProject.publishStatus = 'draft';
    storedProject.publishedVersion = null;
    storedProject.lastPublishedAt = null;
    storedProject.draftVersion = 0 as never;

    maybeSingle.mockResolvedValue({
      data: {
        id: 'site-4',
        published_at: '2026-05-26T12:00:00.000Z',
        site_json: storedProject,
      },
      error: null,
    });

    const project = await builderProjectService.loadProject('site-4');

    expect(project).toMatchObject({
      weddingId: 'site-4',
      draftVersion: 1,
      publishStatus: 'published',
      lastPublishedAt: '2026-05-26T12:00:00.000Z',
    });
  });

  it('increments draft version on save and records the persisted snapshot', async () => {
    const project = createEmptyBuilderProject('site-5', 'modern-luxe');
    project.draftVersion = 3;

    const saved = await builderProjectService.saveDraft(project);
    const firstPayload = (update.mock.calls as unknown as Array<[Record<string, unknown>]>).at(0)?.[0];

    expect(saved.draftVersion).toBe(4);
    expect(saved.meta.updatedAtISO).toMatch(/T/);
    expect(update).toHaveBeenCalled();
    expect(firstPayload).toMatchObject({
      site_json: expect.objectContaining({
        draftVersion: 4,
      }),
    });
    expect(recordBuilderRevision).toHaveBeenCalledWith(expect.objectContaining({
      action: 'save',
      project: expect.objectContaining({
        draftVersion: 4,
      }),
    }));
  });

  it('keeps live publish truth intact when saving a published draft update', async () => {
    const project = createEmptyBuilderProject('site-6', 'modern-luxe');
    project.draftVersion = 7;
    project.publishedVersion = 2;
    project.publishStatus = 'published';
    project.lastPublishedAt = '2026-05-20T10:00:00.000Z';

    const saved = await builderProjectService.saveDraft(project);

    expect(saved).toMatchObject({
      draftVersion: 8,
      publishedVersion: 2,
      publishStatus: 'published',
      lastPublishedAt: '2026-05-20T10:00:00.000Z',
    });
  });
});

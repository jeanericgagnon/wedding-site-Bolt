import { beforeEach, describe, expect, it, vi } from 'vitest';

const { maybeSingle, eq, select, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { maybeSingle, eq, select, from };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from,
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
});

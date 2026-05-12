import { beforeEach, describe, expect, it, vi } from 'vitest';
import { siteRepository } from './siteRepository';

const { fromMock, rpcMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    rpc: rpcMock,
  },
}));

describe('siteRepository', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it('routes section writes through section RPCs', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: {
          id: 'section-1',
          site_id: 'site-1',
          type: 'hero',
          variant: 'default',
          data: {},
          order: 0,
          visible: true,
          schema_version: 1,
          style_overrides: {},
          bindings: {},
          created_at: 'now',
          updated_at: 'now',
        },
        error: null,
      })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({
        data: {
          id: 'section-2',
          site_id: 'site-1',
          type: 'story',
          variant: 'default',
          data: {},
          order: 1,
          visible: true,
          schema_version: 1,
          style_overrides: {},
          bindings: {},
          created_at: 'now',
          updated_at: 'now',
        },
        error: null,
      })
      .mockResolvedValueOnce({ error: null });

    await expect(siteRepository.upsertSection({
      id: 'section-1',
      site_id: 'site-1',
      type: 'hero',
      variant: 'default',
      data: {},
      order: 0,
      visible: true,
      schema_version: 1,
      style_overrides: {},
      bindings: {},
      created_at: 'now',
      updated_at: 'now',
    })).resolves.toMatchObject({ id: 'section-1' });

    await expect(siteRepository.updateSectionData('section-1', { headline: 'Hi' })).resolves.toBeUndefined();
    await expect(siteRepository.updateSectionVisibility('section-1', false)).resolves.toBeUndefined();
    await expect(siteRepository.updateSectionVariant('section-1', 'editorial')).resolves.toBeUndefined();
    await expect(siteRepository.reorderSections('site-1', [{ id: 'section-1', order: 2 }])).resolves.toBeUndefined();
    await expect(siteRepository.deleteSection('section-1')).resolves.toBeUndefined();
    await expect(siteRepository.addSection('site-1', {
      id: 'section-2',
      site_id: 'site-1',
      type: 'story',
      variant: 'default',
      data: {},
      order: 1,
      visible: true,
      schema_version: 1,
      style_overrides: {},
      bindings: {},
    })).resolves.toMatchObject({ id: 'section-2' });
    await expect(siteRepository.syncBuilderSections('site-1', [])).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('section_write', expect.objectContaining({ p_section_id: 'section-1' }));
    expect(rpcMock).toHaveBeenCalledWith('section_reorder_many', {
      p_site_id: 'site-1',
      p_items: [{ id: 'section-1', order: 2 }],
    });
    expect(rpcMock).toHaveBeenCalledWith('section_delete_one', {
      p_section_id: 'section-1',
    });
    expect(rpcMock).toHaveBeenCalledWith('section_delete_by_site', {
      p_site_id: 'site-1',
    });
  });
});

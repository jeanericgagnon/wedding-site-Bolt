import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { createEmptyWeddingData } from '../../types/weddingData';
import { getBuilderRevision, listBuilderRevisions, recordBuilderRevision } from './versionHistory';

describe('versionHistory', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records and lists revisions in reverse chronological order', () => {
    const weddingId = `w_${Date.now()}_a`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');

    const r1 = recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester' });
    const r2 = recordBuilderRevision({ weddingId, project, action: 'publish', actor: 'tester' });

    const listed = listBuilderRevisions(weddingId);
    expect(listed.length).toBeGreaterThanOrEqual(2);
    expect(listed[0].id).toBe(r2.id);
    expect(listed[1].id).toBe(r1.id);
  });

  it('retrieves a specific revision snapshot', () => {
    const weddingId = `w_${Date.now()}_b`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';

    const rev = recordBuilderRevision({ weddingId, project, weddingData: data, action: 'save', actor: 'tester' });
    const fetched = getBuilderRevision(weddingId, rev.id);

    expect(fetched?.id).toBe(rev.id);
    expect(fetched?.weddingData?.couple.partner1Name).toBe('Alex');
  });

  it('returns cloned revisions so callers cannot mutate stored history', () => {
    const weddingId = `w_${Date.now()}_c`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const rev = recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester' });

    const fetched = getBuilderRevision(weddingId, rev.id);
    if (!fetched) throw new Error('expected revision');
    fetched.project.pages[0].title = 'Mutated title';

    expect(getBuilderRevision(weddingId, rev.id)?.project.pages[0].title).not.toBe('Mutated title');
  });
});

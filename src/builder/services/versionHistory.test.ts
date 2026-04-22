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

  it('caps listed builder revisions at the five newest entries', () => {
    const weddingId = `w_${Date.now()}_d`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');

    for (let index = 0; index < 7; index += 1) {
      recordBuilderRevision({ weddingId, project, action: 'save', actor: `tester-${index}` });
    }

    const listed = listBuilderRevisions(weddingId);
    expect(listed).toHaveLength(5);
  });

  it('keeps the newest builder revision when storage is capped', () => {
    const weddingId = `w_${Date.now()}_e`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');

    let newestId = '';
    for (let index = 0; index < 12; index += 1) {
      const revision = recordBuilderRevision({ weddingId, project, action: 'save', actor: `tester-${index}` });
      newestId = revision.id;
    }

    expect(listBuilderRevisions(weddingId)[0]?.id).toBe(newestId);
  });

  it('returns null when a builder revision id does not exist', () => {
    const weddingId = `w_${Date.now()}_f`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester' });

    expect(getBuilderRevision(weddingId, 'missing-revision')).toBeNull();
  });
});

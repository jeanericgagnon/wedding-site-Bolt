import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { createEmptyWeddingData } from '../../types/weddingData';
import { BUILDER_REVISION_RETENTION_MS, getBuilderRevision, listBuilderRevisions, recordBuilderRevision } from './versionHistory';

describe('versionHistory', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
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

  it('returns an empty revision list when nothing has been recorded yet', () => {
    const weddingId = `w_${Date.now()}_g`;

    expect(listBuilderRevisions(weddingId)).toEqual([]);
    expect(listBuilderRevisions(weddingId)).not.toBe(listBuilderRevisions(weddingId));
  });

  it('returns null when asking for a revision from an empty history', () => {
    const weddingId = `w_${Date.now()}_h`;

    expect(getBuilderRevision(weddingId, 'missing-revision')).toBeNull();
  });

  it('keeps revision wedding data snapshots isolated from caller mutation after record', () => {
    const weddingId = `w_${Date.now()}_i`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';

    const revision = recordBuilderRevision({ weddingId, project, weddingData: data, action: 'save', actor: 'tester' });
    data.couple.partner1Name = 'Jordan';

    expect(getBuilderRevision(weddingId, revision.id)?.weddingData?.couple.partner1Name).toBe('Alex');
  });

  it('keeps revision project snapshots isolated from caller mutation after record', () => {
    const weddingId = `w_${Date.now()}_j`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    project.pages[0].title = 'Original title';

    const revision = recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester' });
    project.pages[0].title = 'Mutated title';

    expect(getBuilderRevision(weddingId, revision.id)?.project.pages[0].title).toBe('Original title');
  });

  it('returns cloned revision lists so callers cannot mutate subsequent reads', () => {
    const weddingId = `w_${Date.now()}_k`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester' });

    const listed = listBuilderRevisions(weddingId);
    listed[0].project.pages[0].title = 'Mutated title';

    expect(listBuilderRevisions(weddingId)[0]?.project.pages[0].title).not.toBe('Mutated title');
  });

  it('returns cloned empty revision lists on repeated reads', () => {
    const weddingId = `w_${Date.now()}_l`;

    expect(listBuilderRevisions(weddingId)).toEqual([]);
    expect(listBuilderRevisions(weddingId)).not.toBe(listBuilderRevisions(weddingId));
  });

  it('returns null for a missing revision even after multiple records exist', () => {
    const weddingId = `w_${Date.now()}_m`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester-1' });
    recordBuilderRevision({ weddingId, project, action: 'publish', actor: 'tester-2' });

    expect(getBuilderRevision(weddingId, 'still-missing')).toBeNull();
  });

  it('keeps newest revision first after a publish follows a save', () => {
    const weddingId = `w_${Date.now()}_n`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const saved = recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester-1' });
    const published = recordBuilderRevision({ weddingId, project, action: 'publish', actor: 'tester-2' });

    expect(listBuilderRevisions(weddingId).map((revision) => revision.id).slice(0, 2)).toEqual([
      published.id,
      saved.id,
    ]);
  });

  it('returns the newest revision from getBuilderRevision after multiple records', () => {
    const weddingId = `w_${Date.now()}_o`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester-1' });
    const newest = recordBuilderRevision({ weddingId, project, action: 'publish', actor: 'tester-2' });

    expect(getBuilderRevision(weddingId, newest.id)?.id).toBe(newest.id);
  });

  it('keeps older builder revision lookups available after newer records are added', () => {
    const weddingId = `w_${Date.now()}_p`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const older = recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester-1' });
    recordBuilderRevision({ weddingId, project, action: 'publish', actor: 'tester-2' });

    expect(getBuilderRevision(weddingId, older.id)?.id).toBe(older.id);
  });

  it('retains exactly five builder revisions after overflow trimming', () => {
    const weddingId = `w_${Date.now()}_q`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');

    for (let index = 0; index < 8; index += 1) {
      recordBuilderRevision({ weddingId, project, action: 'save', actor: `tester-${index}` });
    }

    expect(listBuilderRevisions(weddingId)).toHaveLength(5);
    expect(listBuilderRevisions(weddingId).every((revision) => revision.weddingId === weddingId)).toBe(true);
    expect(listBuilderRevisions(weddingId)[0]?.action).toBe('save');
  });

  it('keeps direct lookup access to older builder revisions after overflow trimming', () => {
    const weddingId = `w_${Date.now()}_r`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const oldest = recordBuilderRevision({ weddingId, project, action: 'save', actor: 'tester-0' });

    for (let index = 1; index < 8; index += 1) {
      recordBuilderRevision({ weddingId, project, action: 'save', actor: `tester-${index}` });
    }

    expect(getBuilderRevision(weddingId, oldest.id)?.id).toBe(oldest.id);
    expect(listBuilderRevisions(weddingId).map((revision) => revision.id)).not.toContain(oldest.id);
  });

  it('stores builder revisions in a timestamped bounded envelope', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:10:00.000Z'));
    const weddingId = `w_${Date.now()}_envelope`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');

    recordBuilderRevision({ weddingId, project, action: 'save', actor: '  tester  ' });

    const stored = JSON.parse(window.localStorage.getItem(`builder:revisions:${weddingId}`) || '{}');
    expect(stored).toMatchObject({
      savedAtISO: '2026-05-06T21:10:00.000Z',
      revisions: [{
        weddingId,
        action: 'save',
        actor: 'tester',
        createdAtISO: '2026-05-06T21:10:00.000Z',
      }],
    });
  });

  it('migrates active legacy builder revision arrays on read', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:11:00.000Z'));
    const weddingId = `w_${Date.now()}_legacy`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const legacy = [{
      id: 'legacy-rev',
      weddingId,
      action: 'publish',
      actor: 'tester',
      createdAtISO: '2026-05-06T21:10:00.000Z',
      project,
    }];
    window.localStorage.setItem(`builder:revisions:${weddingId}`, JSON.stringify(legacy));

    expect(listBuilderRevisions(weddingId).map((revision) => revision.id)).toEqual(['legacy-rev']);
    expect(JSON.parse(window.localStorage.getItem(`builder:revisions:${weddingId}`) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T21:11:00.000Z',
      revisions: legacy,
    });
  });

  it('drops revisions that do not belong to the requested wedding key', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:12:00.000Z'));
    const weddingId = 'site-a';
    const otherWeddingId = 'site-b';
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const otherProject = createEmptyBuilderProject(otherWeddingId, 'modern-luxe');
    window.localStorage.setItem(`builder:revisions:${weddingId}`, JSON.stringify({
      savedAtISO: '2026-05-06T21:10:00.000Z',
      revisions: [
        {
          id: 'belongs-here',
          weddingId,
          action: 'save',
          actor: 'tester',
          createdAtISO: '2026-05-06T21:10:00.000Z',
          project,
        },
        {
          id: 'wrong-site',
          weddingId: otherWeddingId,
          action: 'publish',
          actor: 'tester',
          createdAtISO: '2026-05-06T21:11:00.000Z',
          project: otherProject,
        },
      ],
    }));

    expect(listBuilderRevisions(weddingId).map((revision) => revision.id)).toEqual(['belongs-here']);
    expect(JSON.parse(window.localStorage.getItem(`builder:revisions:${weddingId}`) || '{}')).toMatchObject({
      revisions: [{
        id: 'belongs-here',
        weddingId,
      }],
    });
  });

  it('drops stale or malformed builder revision storage', () => {
    const weddingId = `w_${Date.now()}_stale`;
    const project = createEmptyBuilderProject(weddingId, 'modern-luxe');
    const staleDate = new Date(Date.now() - BUILDER_REVISION_RETENTION_MS - 1000).toISOString();
    window.localStorage.setItem(`builder:revisions:${weddingId}`, JSON.stringify({
      savedAtISO: new Date().toISOString(),
      revisions: [{
        id: 'stale-rev',
        weddingId,
        action: 'save',
        actor: 'tester',
        createdAtISO: staleDate,
        project,
      }],
    }));

    expect(listBuilderRevisions(weddingId)).toEqual([]);
    expect(window.localStorage.getItem(`builder:revisions:${weddingId}`)).toBeNull();

    window.localStorage.setItem(`builder:revisions:${weddingId}`, '{broken');
    expect(listBuilderRevisions(weddingId)).toEqual([]);
    expect(window.localStorage.getItem(`builder:revisions:${weddingId}`)).toBeNull();
  });
});

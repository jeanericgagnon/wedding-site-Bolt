import { describe, expect, it } from 'vitest';

import { createEmptyBuilderProject } from '../../types/builder/project';
import { buildBuilderDraftContinuityModel } from './builderDraftContinuity';
import type { BuilderRevision } from '../services/versionHistory';

function createRevision(overrides?: Partial<BuilderRevision>): BuilderRevision {
  const project = createEmptyBuilderProject('w1', 'modern-luxe');
  return {
    id: 'rev-1',
    weddingId: 'w1',
    action: 'save',
    actor: 'builder',
    createdAtISO: '2026-05-27T12:00:00.000Z',
    project,
    ...overrides,
  };
}

describe('buildBuilderDraftContinuityModel', () => {
  it('treats dirty drafts as save-first states', () => {
    const model = buildBuilderDraftContinuityModel({
      revisions: [createRevision()],
      isDirty: true,
      isSaving: false,
      isPublishing: false,
      publishedVersion: null,
    });

    expect(model.badge).toBe('Unsaved draft');
    expect(model.primaryAction).toEqual({ kind: 'save', label: 'Save this checkpoint' });
  });

  it('offers restore guidance when older stable checkpoints exist', () => {
    const model = buildBuilderDraftContinuityModel({
      revisions: [
        createRevision({ id: 'rev-new', action: 'save' }),
        createRevision({ id: 'rev-old', action: 'publish' }),
      ],
      isDirty: false,
      isSaving: false,
      isPublishing: false,
      publishedVersion: 4,
    });

    expect(model.primaryAction).toEqual({
      kind: 'restore',
      label: 'Review restore options',
      revisionId: 'rev-old',
    });
    expect(model.events[1]?.canRestore).toBe(true);
  });

  it('keeps publishing sessions in a wait state', () => {
    const model = buildBuilderDraftContinuityModel({
      revisions: [createRevision()],
      isDirty: false,
      isSaving: false,
      isPublishing: true,
      publishedVersion: 2,
    });

    expect(model.badge).toBe('Publishing now');
    expect(model.primaryAction).toEqual({ kind: 'none', label: 'Publishing…' });
  });
});

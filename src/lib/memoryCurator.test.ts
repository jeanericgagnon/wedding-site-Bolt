import { describe, expect, it } from 'vitest';
import { createEmptyPhotoBuckets } from './aiPhotoBuckets';
import {
  buildPhotoBucketStatusMap,
  buildPhotoMemoryCuratorModel,
  buildVaultMemoryCuratorModel,
} from './memoryCurator';

describe('memoryCurator', () => {
  it('marks photo buckets as ready once they hit their goal', () => {
    const buckets = createEmptyPhotoBuckets();
    buckets['main-couple'] = [
      { id: 'hero', url: '/hero.jpg', bucket: 'main-couple', label: 'Hero' },
    ];
    buckets['couple-gallery'] = [
      { id: 'cg-1', url: '/1.jpg', bucket: 'couple-gallery' },
      { id: 'cg-2', url: '/2.jpg', bucket: 'couple-gallery' },
      { id: 'cg-3', url: '/3.jpg', bucket: 'couple-gallery' },
      { id: 'cg-4', url: '/4.jpg', bucket: 'couple-gallery' },
    ];

    const statusMap = buildPhotoBucketStatusMap(buckets);

    expect(statusMap['main-couple'].label).toBe('Hero ready');
    expect(statusMap['couple-gallery'].label).toBe('Ready to place');
    expect(statusMap['weekend-vibe'].label).toBe('Empty');
  });

  it('nudges the photo flow toward a first signature upload when needed', () => {
    const model = buildPhotoMemoryCuratorModel({
      photoBuckets: createEmptyPhotoBuckets(),
      albums: [],
      uploads: [],
      isArchiveLike: false,
    });

    expect(model.title).toContain('Start with the one photo guests should remember first');
    expect(model.readinessLabel).toBe('Needs a signature anchor');
    expect(model.focusTitle).toBe('Lock the couple anchor first');
    expect(model.bestNextMove).toContain('Main photo of you two');
    expect(model.decisionRule).toMatch(/guest-facing|signature couple photo/i);
    expect(model.watchout).toMatch(/guest-facing memory lanes|what story they are helping preserve/i);
    expect(model.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(model.sequence[0]?.title).toMatch(/hero photo|anchor/i);
    expect(model.qualitySignals[0]).toContain('Hero photo');
    expect(model.nextMoves[0]).toContain('Main photo of you two');
  });

  it('frames unopened guest albums as a photo sharing path instead of an upload path', () => {
    const buckets = createEmptyPhotoBuckets();
    buckets['main-couple'] = [
      { id: 'hero', url: '/hero.jpg', bucket: 'main-couple', label: 'Hero' },
    ];
    buckets['couple-gallery'] = [
      { id: 'cg-1', url: '/1.jpg', bucket: 'couple-gallery' },
      { id: 'cg-2', url: '/2.jpg', bucket: 'couple-gallery' },
      { id: 'cg-3', url: '/3.jpg', bucket: 'couple-gallery' },
      { id: 'cg-4', url: '/4.jpg', bucket: 'couple-gallery' },
    ];

    const model = buildPhotoMemoryCuratorModel({
      photoBuckets: buckets,
      albums: [{ id: 'album-1', title: 'Cocktail Hour', is_active: false }],
      uploads: [],
      isArchiveLike: false,
    });

    expect(model.title).toContain('photo sharing path is not live yet');
    expect(model.decisionRule).toMatch(/photo sharing path/i);
    expect(model.sequence[0]?.title).toMatch(/photo sharing lane/i);
    expect(model.nextMoves[2]).toContain('photo sharing path');
  });

  it('nudges the vault toward recap generation once enough entries exist', () => {
    const model = buildVaultMemoryCuratorModel({
      configs: [{ id: 'vault-1', duration_years: 1, is_enabled: true }],
      entries: [
        { vault_config_id: 'vault-1', title: 'First note', author_name: 'You', attachment_name: null },
        { vault_config_id: 'vault-1', title: 'Photo note', author_name: 'You', attachment_name: 'dance-floor.jpg', media_type: 'photo' },
        { vault_config_id: 'vault-1', title: 'Guest memory', author_name: 'Mia', attachment_name: null },
      ],
      isArchiveLike: true,
      driveConnectedHealthy: true,
    });

    expect(model.title).toContain('first recap');
    expect(model.readinessLabel).toBe('Recap-ready');
    expect(model.focusTitle).toBe('Synthesize while the archive is still compact');
    expect(model.bestNextMove).toContain('Generate the first AI recap');
    expect(model.decisionRule).toMatch(/synthesis beats adding raw volume/i);
    expect(model.watchout).toMatch(/collecting without synthesizing|gain meaning/i);
    expect(model.sequence[1]?.detail).toMatch(/compact|revisit-worthy|story/i);
    expect(model.curationNote).toMatch(/synthesis|more valuable/i);
    expect(model.nextMoves[0]).toContain('Generate the first AI recap');
  });
});

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
    expect(model.nextMoves[0]).toContain('Main photo of you two');
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
    expect(model.nextMoves[0]).toContain('Generate the first AI recap');
  });
});

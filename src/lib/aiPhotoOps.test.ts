import { describe, expect, it, vi } from 'vitest';
import { buildAiPhotoOpsPlan, type AiPhotoBucketInput, type AiPhotoUploadInput } from './aiPhotoOps';

vi.mock('./openai', () => ({
  isOpenAiConfigured: () => false,
  runOpenAiStructuredPrompt: vi.fn(),
}));

const buckets: AiPhotoBucketInput[] = [
  {
    id: 'ceremony',
    name: 'Ceremony',
    slug: 'ceremony',
    uploadCount: 0,
    isActive: true,
  },
  {
    id: 'aisle',
    name: 'Walking Down Aisle',
    slug: 'walking-down-aisle',
    parentBucketId: 'ceremony',
    hierarchyLabel: 'Ceremony > Walking Down Aisle',
    uploadCount: 0,
    isActive: true,
  },
  {
    id: 'cocktail',
    name: 'Cocktail Hour',
    slug: 'cocktail-hour',
    uploadCount: 0,
    isActive: true,
  },
  {
    id: 'dance',
    name: 'Dance Floor',
    slug: 'dance-floor',
    parentBucketId: 'reception',
    hierarchyLabel: 'Reception > Dance Floor',
    uploadCount: 0,
    isActive: true,
  },
  {
    id: 'speeches',
    name: 'Speeches',
    slug: 'speeches',
    parentBucketId: 'reception',
    hierarchyLabel: 'Reception > Speeches',
    uploadCount: 0,
    isActive: true,
  },
];

const upload = (input: Partial<AiPhotoUploadInput> & Pick<AiPhotoUploadInput, 'id' | 'filename'>): AiPhotoUploadInput => ({
  currentBucketId: 'ceremony',
  currentBucketName: 'Ceremony',
  guestName: null,
  note: null,
  mimeType: 'image/jpeg',
  uploadedAt: '2026-06-20T20:00:00.000Z',
  ...input,
});

describe('aiPhotoOps fallback planner', () => {
  it('prefers specific child buckets for aisle moments', async () => {
    const plan = await buildAiPhotoOpsPlan({
      buckets,
      uploads: [upload({ id: 'u1', filename: 'bride-walking-down-aisle.jpg', guestName: 'Mia' })],
    });

    expect(plan.source).toBe('fallback');
    expect(plan.bucketSuggestions[0]).toMatchObject({
      targetBucketId: 'aisle',
      detectedMoment: 'walking down the aisle',
    });
    expect(plan.bucketSuggestions[0].tags).toEqual(expect.arrayContaining(['ceremony', 'aisle']));
    expect(plan.bucketSuggestions[0].suggestedCaption).toContain('walking down the aisle');
  });

  it('recognizes cocktail hour from notes and creates filterable tags', async () => {
    const plan = await buildAiPhotoOpsPlan({
      buckets,
      uploads: [upload({ id: 'u2', filename: 'IMG_1442.jpeg', note: 'Friends mingling by the cocktail bar' })],
    });

    expect(plan.bucketSuggestions[0]).toMatchObject({
      targetBucketId: 'cocktail',
      detectedMoment: 'cocktail hour',
    });
    expect(plan.bucketSuggestions[0].tags).toEqual(expect.arrayContaining(['cocktail hour', 'guests']));
  });

  it('scores emotional dance floor moments above generic uploads for recaps', async () => {
    const plan = await buildAiPhotoOpsPlan({
      buckets,
      uploads: [
        upload({ id: 'generic', filename: 'table-number-12.jpg', currentBucketId: 'ceremony', currentBucketName: 'Ceremony' }),
        upload({ id: 'dance', filename: 'couple-laughing-first-dance.jpg', currentBucketId: 'ceremony', currentBucketName: 'Ceremony' }),
      ],
    });

    expect(plan.bucketSuggestions.find((item) => item.uploadId === 'dance')?.targetBucketId).toBe('dance');
    expect(plan.slideshow.frames[0].uploadId).toBe('dance');
    expect(plan.slideshow.frames[0].tags).toEqual(expect.arrayContaining(['first dance', 'dance floor', 'couple', 'joyful']));
  });

  it('keeps unknown photos in their current bucket with a lower confidence', async () => {
    const plan = await buildAiPhotoOpsPlan({
      buckets,
      uploads: [upload({ id: 'u4', filename: 'random-phone-upload.jpg', currentBucketId: 'speeches', currentBucketName: 'Reception > Speeches' })],
    });

    expect(plan.bucketSuggestions[0].targetBucketId).toBe('speeches');
    expect(plan.bucketSuggestions[0].confidence).toBeLessThan(0.7);
  });

  it('marks likely duplicate uploads and pushes them lower in slideshow priority', async () => {
    const plan = await buildAiPhotoOpsPlan({
      buckets,
      uploads: [
        upload({ id: 'original', filename: 'first-dance.jpg', takenAt: '2026-06-20T21:15:12.000Z' }),
        upload({ id: 'duplicate', filename: 'first-dance (1).jpg', takenAt: '2026-06-20T21:15:35.000Z' }),
      ],
    });

    const original = plan.bucketSuggestions.find((item) => item.uploadId === 'original');
    const duplicate = plan.bucketSuggestions.find((item) => item.uploadId === 'duplicate');

    expect(duplicate).toMatchObject({
      possibleDuplicateOf: 'original',
    });
    expect(duplicate?.tags).toEqual(expect.arrayContaining(['possible duplicate']));
    expect((duplicate?.slideshowPriority ?? 0)).toBeLessThan(original?.slideshowPriority ?? 0);
  });
});

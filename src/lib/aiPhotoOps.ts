import { z } from 'zod';
import { isOpenAiConfigured, runOpenAiStructuredPrompt } from './openai';

export interface AiPhotoBucketInput {
  id: string;
  name: string;
  slug: string;
  parentBucketId?: string | null;
  hierarchyLabel?: string | null;
  uploadCount: number;
  isActive: boolean;
}

export interface AiPhotoUploadInput {
  id: string;
  currentBucketId: string;
  currentBucketName: string;
  filename: string;
  guestName: string | null;
  note: string | null;
  mimeType: string | null;
  uploadedAt: string;
  takenAt?: string | null;
}

export interface AiPhotoOpsPlan {
  generatedAt: string;
  source: 'openai' | 'fallback';
  summary: string;
  bucketSuggestions: Array<{
    uploadId: string;
    currentBucketId: string;
    targetBucketId: string;
    targetBucketName: string;
    confidence: number;
    reason: string;
    suggestedCaption: string;
    slideshowPriority: number;
    detectedMoment?: string;
    tags?: string[];
    possibleDuplicateOf?: string;
  }>;
  slideshow: {
    title: string;
    mood: string;
    frames: Array<{
      uploadId: string;
      caption: string;
      bucketName: string;
      priority: number;
      tags?: string[];
    }>;
  };
}

const aiPhotoOpsSchema = z.object({
  summary: z.string(),
  bucketSuggestions: z.array(z.object({
    uploadId: z.string(),
    targetBucketId: z.string(),
    targetBucketName: z.string(),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
    suggestedCaption: z.string(),
    slideshowPriority: z.number().min(0).max(100),
  })),
  slideshow: z.object({
    title: z.string(),
    mood: z.string(),
    frames: z.array(z.object({
      uploadId: z.string(),
      caption: z.string(),
      bucketName: z.string(),
      priority: z.number().min(0).max(100),
    })),
  }),
});

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase();

const titleCase = (value: string) => value
  .split(/[\s-_]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const normalizeDuplicateFilename = (filename: string) => filename
  .toLowerCase()
  .replace(/\.[a-z0-9]{2,5}$/i, '')
  .replace(/\s*\(\d+\)$/i, '')
  .replace(/[-_\s]+copy$/i, '')
  .replace(/[^a-z0-9]+/g, '');

const normalizeDuplicateTimestamp = (value: string | null | undefined) => {
  const time = Date.parse(value ?? '');
  if (Number.isNaN(time)) return '';
  return String(Math.floor(time / 60_000));
};

function buildPossibleDuplicateMap(uploads: AiPhotoUploadInput[]) {
  const firstByKey = new Map<string, string>();
  const duplicateOf = new Map<string, string>();

  for (const upload of uploads) {
    const filenameKey = normalizeDuplicateFilename(upload.filename);
    if (!filenameKey || filenameKey.length < 4) continue;
    const timeKey = normalizeDuplicateTimestamp(upload.takenAt ?? upload.uploadedAt);
    const guestKey = normalize(upload.guestName).replace(/[^a-z0-9]+/g, '');
    const key = [filenameKey, timeKey, guestKey].filter(Boolean).join(':');
    const firstUploadId = firstByKey.get(key);
    if (firstUploadId) {
      duplicateOf.set(upload.id, firstUploadId);
    } else {
      firstByKey.set(key, upload.id);
    }
  }

  return duplicateOf;
}

const MOMENT_MATCHERS: Array<{
  moment: string;
  tags: string[];
  bucketTerms: string[];
  searchTerms: string[];
  confidence: number;
  reason: string;
  priorityBoost: number;
}> = [
  {
    moment: 'walking down the aisle',
    tags: ['ceremony', 'aisle', 'processional'],
    bucketTerms: ['aisle', 'processional', 'ceremony'],
    searchTerms: ['aisle', 'processional', 'walk down', 'walking down', 'entrance', 'bride entrance'],
    confidence: 0.88,
    reason: 'Filename, note, or bucket suggests an aisle or processional moment.',
    priorityBoost: 12,
  },
  {
    moment: 'vows',
    tags: ['ceremony', 'vows', 'altar'],
    bucketTerms: ['vow', 'altar', 'ceremony'],
    searchTerms: ['vow', 'vows', 'altar', 'officiant', 'ceremony'],
    confidence: 0.84,
    reason: 'Filename, note, or bucket suggests a ceremony or vows moment.',
    priorityBoost: 10,
  },
  {
    moment: 'cocktail hour',
    tags: ['cocktail hour', 'guests', 'weekend'],
    bucketTerms: ['cocktail', 'welcome', 'hour'],
    searchTerms: ['cocktail', 'cocktails', 'drinks', 'bar', 'mingling', 'welcome hour'],
    confidence: 0.82,
    reason: 'Filename, note, or bucket suggests cocktail hour guest coverage.',
    priorityBoost: 6,
  },
  {
    moment: 'first dance',
    tags: ['reception', 'first dance', 'dance floor'],
    bucketTerms: ['first dance', 'dance', 'reception'],
    searchTerms: ['first dance', 'dance floor', 'dancing', 'dj', 'party'],
    confidence: 0.84,
    reason: 'Filename, note, or bucket suggests a dance floor moment.',
    priorityBoost: 14,
  },
  {
    moment: 'speeches',
    tags: ['reception', 'speeches', 'toasts'],
    bucketTerms: ['speech', 'toast', 'reception'],
    searchTerms: ['speech', 'speeches', 'toast', 'toasts', 'mic', 'microphone'],
    confidence: 0.82,
    reason: 'Filename, note, or bucket suggests speeches or toasts.',
    priorityBoost: 8,
  },
  {
    moment: 'cake cutting',
    tags: ['reception', 'cake', 'tradition'],
    bucketTerms: ['cake', 'reception'],
    searchTerms: ['cake', 'cake cutting', 'dessert'],
    confidence: 0.82,
    reason: 'Filename, note, or bucket suggests the cake cutting.',
    priorityBoost: 7,
  },
  {
    moment: 'sendoff',
    tags: ['sendoff', 'exit', 'celebration'],
    bucketTerms: ['sendoff', 'exit', 'sparkler'],
    searchTerms: ['sendoff', 'send off', 'exit', 'sparkler', 'sparklers', 'farewell'],
    confidence: 0.84,
    reason: 'Filename, note, or bucket suggests a sendoff or exit moment.',
    priorityBoost: 12,
  },
  {
    moment: 'getting ready',
    tags: ['getting ready', 'details', 'before ceremony'],
    bucketTerms: ['getting ready', 'prep', 'ready'],
    searchTerms: ['getting ready', 'prep', 'makeup', 'hair', 'dress', 'suit', 'before ceremony'],
    confidence: 0.8,
    reason: 'Filename, note, or bucket suggests getting-ready coverage.',
    priorityBoost: 5,
  },
  {
    moment: 'details',
    tags: ['details', 'decor', 'flat lay'],
    bucketTerms: ['detail', 'decor', 'rings'],
    searchTerms: ['details', 'detail', 'rings', 'flowers', 'bouquet', 'invitation', 'decor', 'flat lay'],
    confidence: 0.76,
    reason: 'Filename, note, or bucket suggests wedding details.',
    priorityBoost: 3,
  },
  {
    moment: 'family portraits',
    tags: ['family', 'portraits', 'formal'],
    bucketTerms: ['family', 'portrait', 'formal'],
    searchTerms: ['family', 'parents', 'mom', 'dad', 'sibling', 'grand', 'portrait', 'formal'],
    confidence: 0.78,
    reason: 'Filename, note, or bucket suggests family coverage.',
    priorityBoost: 4,
  },
  {
    moment: 'friends and guests',
    tags: ['friends', 'guests', 'group'],
    bucketTerms: ['friends', 'guests', 'group'],
    searchTerms: ['friend', 'friends', 'guest', 'guests', 'table', 'crew', 'group'],
    confidence: 0.72,
    reason: 'Filename, note, or bucket suggests friends or guest coverage.',
    priorityBoost: 2,
  },
  {
    moment: 'rehearsal or brunch',
    tags: ['weekend', 'rehearsal', 'brunch'],
    bucketTerms: ['rehearsal', 'brunch', 'welcome'],
    searchTerms: ['rehearsal', 'brunch', 'welcome party', 'welcome dinner'],
    confidence: 0.76,
    reason: 'Filename, note, or bucket suggests a wedding-weekend event.',
    priorityBoost: 4,
  },
];

const findBucket = (buckets: AiPhotoBucketInput[], terms: string[]): AiPhotoBucketInput | null => {
  const activeBuckets = buckets.filter((bucket) => bucket.isActive);
  const scored = activeBuckets
    .map((bucket) => {
      const haystack = `${bucket.name} ${bucket.slug} ${bucket.hierarchyLabel ?? ''}`.toLowerCase();
      const exactScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 2 : 0), 0);
      const childBoost = bucket.parentBucketId ? 1 : 0;
      return { bucket, score: exactScore + childBoost };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.bucket ?? activeBuckets[0] ?? buckets[0] ?? null;
};

const detectMoment = (upload: AiPhotoUploadInput, buckets: AiPhotoBucketInput[]) => {
  const text = `${normalize(upload.filename)} ${normalize(upload.note)} ${normalize(upload.guestName)}`;
  const bucketText = buckets
    .map((bucket) => `${bucket.name} ${bucket.slug} ${bucket.hierarchyLabel ?? ''}`)
    .join(' ')
    .toLowerCase();

  const directMatch = MOMENT_MATCHERS.find((matcher) => matcher.searchTerms.some((term) => text.includes(term)));
  if (directMatch) return directMatch;

  return MOMENT_MATCHERS.find((matcher) => matcher.bucketTerms.some((term) => bucketText.includes(term) && text.includes(term))) ?? null;
};

const deriveTags = (upload: AiPhotoUploadInput, bucketName: string, moment: ReturnType<typeof detectMoment>) => {
  const text = `${normalize(upload.filename)} ${normalize(upload.note)} ${normalize(upload.guestName)} ${normalize(bucketName)}`;
  const tags = [...(moment?.tags ?? [])];

  if (text.includes('black and white') || text.includes('bw') || text.includes('b&w')) tags.push('black and white');
  if (text.includes('video') || upload.mimeType?.startsWith('video/')) tags.push('video');
  if (text.includes('bride') || text.includes('groom') || text.includes('couple')) tags.push('couple');
  if (text.includes('laugh') || text.includes('smile')) tags.push('joyful');
  if (text.includes('kid') || text.includes('child')) tags.push('kids');
  if (text.includes('outdoor') || text.includes('garden') || text.includes('beach')) tags.push('outdoor');

  return unique(tags).slice(0, 8);
};

const inferBucket = (
  upload: AiPhotoUploadInput,
  buckets: AiPhotoBucketInput[]
): { bucket: AiPhotoBucketInput | null; confidence: number; reason: string; moment: string; priorityBoost: number } => {
  const moment = detectMoment(upload, buckets);

  if (moment) {
    return {
      bucket: findBucket(buckets, moment.bucketTerms),
      confidence: moment.confidence,
      reason: moment.reason,
      moment: moment.moment,
      priorityBoost: moment.priorityBoost,
    };
  }

  const currentBucket = buckets.find((bucket) => bucket.id === upload.currentBucketId);
  if (currentBucket) {
    const currentBucketText = `${normalize(currentBucket.name)} ${normalize(currentBucket.hierarchyLabel)}`;
    const parentishName = currentBucketText.split('>').pop()?.trim();
    return {
      bucket: currentBucket,
      confidence: 0.6,
      reason: 'No strong metadata signal, so the current bucket is the safest placement.',
      moment: parentishName ? titleCase(parentishName) : 'guest upload',
      priorityBoost: 0,
    };
  }

  return {
    bucket: buckets[0] ?? null,
    confidence: 0.52,
    reason: 'No strong metadata signal, so the first active bucket is the safest placement.',
    moment: 'guest upload',
    priorityBoost: 0,
  };
};

const scoreSlideshowPriority = (
  upload: AiPhotoUploadInput,
  confidence: number,
  priorityBoost: number,
  tags: string[]
) => {
  const text = `${normalize(upload.filename)} ${normalize(upload.note)} ${normalize(upload.guestName)}`;
  let score = Math.round(confidence * 72) + priorityBoost;
  if (tags.includes('couple')) score += 9;
  if (tags.includes('joyful')) score += 7;
  if (tags.includes('first dance') || tags.includes('sendoff')) score += 7;
  if (tags.includes('black and white')) score += 3;
  if (text.includes('blurry') || text.includes('duplicate') || text.includes('screenshot')) score -= 18;
  if (tags.includes('possible duplicate')) score -= 22;
  if (upload.mimeType?.startsWith('video/')) score -= 8;

  const takenTime = Date.parse(upload.takenAt ?? upload.uploadedAt);
  if (!Number.isNaN(takenTime)) {
    const hour = new Date(takenTime).getHours();
    if (hour >= 17 && hour <= 23) score += 2;
  }

  return Math.max(5, Math.min(100, score));
};

const makeCaption = (upload: AiPhotoUploadInput, bucketName: string, detectedMoment?: string) => {
  const guest = upload.guestName?.trim() || 'A guest';
  const note = upload.note?.trim();
  if (note) return `${guest}: ${note}`;
  if (detectedMoment && detectedMoment !== 'guest upload') {
    return `${guest} captured ${detectedMoment}.`;
  }
  return `${guest} captured a ${bucketName.toLowerCase()} moment.`;
};

function buildFallbackPhotoOpsPlan(uploads: AiPhotoUploadInput[], buckets: AiPhotoBucketInput[]): AiPhotoOpsPlan {
  const possibleDuplicateOf = buildPossibleDuplicateMap(uploads);
  const bucketSuggestions = uploads.slice(0, 80).map((upload) => {
    const inferred = inferBucket(upload, buckets);
    const targetBucket = inferred.bucket ?? { id: upload.currentBucketId, name: upload.currentBucketName };
    const tags = deriveTags(upload, targetBucket.name, detectMoment(upload, buckets));
    const duplicateOriginal = possibleDuplicateOf.get(upload.id);
    if (duplicateOriginal) tags.push('possible duplicate');
    const caption = makeCaption(upload, targetBucket.name, inferred.moment);
    const slideshowPriority = scoreSlideshowPriority(upload, inferred.confidence, inferred.priorityBoost, tags);
    return {
      uploadId: upload.id,
      currentBucketId: upload.currentBucketId,
      targetBucketId: targetBucket.id,
      targetBucketName: targetBucket.name,
      confidence: inferred.confidence,
      reason: inferred.reason,
      suggestedCaption: caption,
      slideshowPriority,
      detectedMoment: inferred.moment,
      tags: unique(tags).slice(0, 8),
      ...(duplicateOriginal ? { possibleDuplicateOf: duplicateOriginal } : {}),
    };
  });

  const frames = [...bucketSuggestions]
    .sort((a, b) => b.slideshowPriority - a.slideshowPriority)
    .slice(0, 24)
    .map((suggestion) => ({
      uploadId: suggestion.uploadId,
      caption: suggestion.suggestedCaption,
      bucketName: suggestion.targetBucketName,
      priority: suggestion.slideshowPriority,
      tags: suggestion.tags,
    }));

  return {
    generatedAt: new Date().toISOString(),
    source: 'fallback',
    summary: 'Created an organization plan from saved photo details, guest notes, and wedding-moment patterns.',
    bucketSuggestions,
    slideshow: {
      title: 'Wedding Weekend Highlights',
      mood: 'Clean, warm, and easy to review before publishing.',
      frames,
    },
  };
}

const normalizePlan = (
  raw: z.infer<typeof aiPhotoOpsSchema>,
  uploads: AiPhotoUploadInput[],
  buckets: AiPhotoBucketInput[],
  source: AiPhotoOpsPlan['source']
): AiPhotoOpsPlan => {
  const uploadById = new Map(uploads.map((upload) => [upload.id, upload]));
  const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
  const activeFallbackBucket = buckets.find((bucket) => bucket.isActive) ?? buckets[0] ?? null;

  const bucketSuggestions = raw.bucketSuggestions
    .filter((suggestion) => uploadById.has(suggestion.uploadId))
    .map((suggestion) => {
      const upload = uploadById.get(suggestion.uploadId)!;
      const targetBucket = bucketById.get(suggestion.targetBucketId) ?? activeFallbackBucket;
      const detected = detectMoment(upload, buckets);
      const targetBucketName = targetBucket?.name ?? upload.currentBucketName;
      const tags = deriveTags(upload, targetBucketName, detected);
      return {
        uploadId: suggestion.uploadId,
        currentBucketId: upload.currentBucketId,
        targetBucketId: targetBucket?.id ?? upload.currentBucketId,
        targetBucketName,
        confidence: Math.max(0, Math.min(1, suggestion.confidence)),
        reason: suggestion.reason || 'This looks like the best fit for the album.',
        suggestedCaption: suggestion.suggestedCaption || makeCaption(upload, targetBucketName, detected?.moment),
        slideshowPriority: Math.max(0, Math.min(100, Math.round(suggestion.slideshowPriority))),
        detectedMoment: detected?.moment,
        tags,
      };
    });

  const suggestionByUploadId = new Map(bucketSuggestions.map((suggestion) => [suggestion.uploadId, suggestion]));
  const frames = raw.slideshow.frames
    .filter((frame) => suggestionByUploadId.has(frame.uploadId))
    .slice(0, 24)
    .map((frame) => {
      const suggestion = suggestionByUploadId.get(frame.uploadId)!;
      return {
        uploadId: frame.uploadId,
        caption: frame.caption || suggestion.suggestedCaption,
        bucketName: frame.bucketName || suggestion.targetBucketName,
        priority: Math.max(0, Math.min(100, Math.round(frame.priority))),
        tags: suggestion.tags,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    source,
    summary: raw.summary || 'Created an organization and slideshow plan for review.',
    bucketSuggestions,
    slideshow: {
      title: raw.slideshow.title || 'Wedding Weekend Highlights',
      mood: raw.slideshow.mood || 'Warm, polished, and guest-friendly.',
      frames,
    },
  };
};

export async function buildAiPhotoOpsPlan(input: {
  uploads: AiPhotoUploadInput[];
  buckets: AiPhotoBucketInput[];
  coupleLabel?: string;
}): Promise<AiPhotoOpsPlan> {
  const uploads = input.uploads.filter((upload) => Boolean(upload.id)).slice(0, 80);
  const buckets = input.buckets.filter((bucket) => Boolean(bucket.id));

  if (uploads.length === 0 || buckets.length === 0 || !isOpenAiConfigured()) {
    return buildFallbackPhotoOpsPlan(uploads, buckets);
  }

  try {
    const result = await runOpenAiStructuredPrompt({
      schemaName: 'DayOfPhotoOpsPlan',
      schema: aiPhotoOpsSchema,
      system:
        'You organize wedding guest photo metadata into intuitive event buckets and build tasteful slideshow captions. Use only the provided bucket IDs. Do not invent IDs. Prefer high confidence only when filename, note, guest name, or current bucket makes the placement clear.',
      user: JSON.stringify({
        couple: input.coupleLabel ?? 'the couple',
        buckets: buckets.map((bucket) => ({
          id: bucket.id,
          name: bucket.name,
          slug: bucket.slug,
          parentBucketId: bucket.parentBucketId ?? null,
          hierarchyLabel: bucket.hierarchyLabel ?? bucket.name,
          isActive: bucket.isActive,
          uploadCount: bucket.uploadCount,
        })),
        uploads: uploads.map((upload) => ({
          id: upload.id,
          currentBucketId: upload.currentBucketId,
          currentBucketName: upload.currentBucketName,
          filename: upload.filename,
          guestName: upload.guestName,
          note: upload.note,
          mimeType: upload.mimeType,
          uploadedAt: upload.uploadedAt,
          takenAt: upload.takenAt ?? null,
        })),
        requirements: [
          'Return a suggestion for every upload.',
          'Only use targetBucketId values from the supplied buckets.',
          'If a child bucket is more specific than its parent, prefer the child bucket.',
          'Write captions that are short, warm, and appropriate for a wedding slideshow.',
          'Pick up to 24 strongest frames for the slideshow.',
        ],
      }),
    });

    return normalizePlan(result, uploads, buckets, 'openai');
  } catch {
    return buildFallbackPhotoOpsPlan(uploads, buckets);
  }
}

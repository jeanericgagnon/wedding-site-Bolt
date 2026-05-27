import type { CanonicalPhotoBuckets, PhotoBucketKind } from './aiPhotoBuckets';

export interface PhotoAlbumSnapshot {
  id: string;
  name: string;
  is_active: boolean;
}

export interface PhotoUploadSnapshot {
  photo_bucket_id: string;
  is_hidden: boolean;
  is_flagged: boolean;
}

export interface VaultConfigSnapshot {
  id: string;
  duration_years: number;
  is_enabled: boolean;
}

export interface VaultEntrySnapshot {
  vault_config_id: string | null;
  title: string;
  author_name: string;
  attachment_name: string | null;
  media_type?: 'text' | 'photo' | 'video' | 'voice' | null;
}

export interface MemoryCuratorModel {
  eyebrow: string;
  readinessLabel: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  decisionRule: string;
  curationNote: string;
  badges: string[];
  qualitySignals: string[];
  nextMoves: string[];
}

export interface PhotoBucketStatus {
  tone: 'empty' | 'growing' | 'ready';
  label: string;
  detail: string;
}

const BUCKET_GOALS: Record<PhotoBucketKind, number> = {
  'main-couple': 1,
  'couple-gallery': 4,
  'weekend-vibe': 3,
  'friends-family': 3,
  extras: 2,
};

const countVisiblePhotoUploads = (
  uploads: PhotoUploadSnapshot[],
  albumId: string,
) => uploads.filter((upload) => upload.photo_bucket_id === albumId && !upload.is_hidden).length;

const isGuestVaultAuthor = (authorName: string) => {
  const normalized = authorName.trim().toLowerCase();
  return normalized.length > 0 && normalized !== 'you' && normalized !== 'dayof ai recap';
};

export const buildPhotoBucketStatusMap = (
  buckets: CanonicalPhotoBuckets,
): Record<PhotoBucketKind, PhotoBucketStatus> => {
  return (Object.keys(BUCKET_GOALS) as PhotoBucketKind[]).reduce((acc, bucketKey) => {
    const count = buckets[bucketKey]?.length ?? 0;
    const goal = BUCKET_GOALS[bucketKey];

    if (count === 0) {
      acc[bucketKey] = {
        tone: 'empty',
        label: 'Empty',
        detail: 'Nothing here yet.',
      };
      return acc;
    }

    if (count < goal) {
      acc[bucketKey] = {
        tone: 'growing',
        label: `Need ${goal - count} more`,
        detail: `${count}/${goal} photos toward a stronger draft.`,
      };
      return acc;
    }

    acc[bucketKey] = {
      tone: 'ready',
      label: bucketKey === 'main-couple' ? 'Hero ready' : 'Ready to place',
      detail: `${count} photos ready for the draft.`,
    };
    return acc;
  }, {} as Record<PhotoBucketKind, PhotoBucketStatus>);
};

export const buildPhotoMemoryCuratorModel = (args: {
  photoBuckets: CanonicalPhotoBuckets;
  albums: PhotoAlbumSnapshot[];
  uploads: PhotoUploadSnapshot[];
  isArchiveLike: boolean;
}): MemoryCuratorModel => {
  const { photoBuckets, albums, uploads, isArchiveLike } = args;
  const bucketStatus = buildPhotoBucketStatusMap(photoBuckets);
  const activeAlbums = albums.filter((album) => album.is_active);
  const totalVisibleUploads = uploads.filter((upload) => !upload.is_hidden).length;
  const flaggedUploads = uploads.filter((upload) => upload.is_flagged && !upload.is_hidden).length;
  const readyAlbums = activeAlbums.filter((album) => countVisiblePhotoUploads(uploads, album.id) >= 3);
  const signatureReadyCount = (['main-couple', 'couple-gallery'] as PhotoBucketKind[]).filter(
    (bucketKey) => bucketStatus[bucketKey].tone === 'ready',
  ).length;
  const atmosphereReadyCount = (['weekend-vibe', 'friends-family', 'extras'] as PhotoBucketKind[]).filter(
    (bucketKey) => bucketStatus[bucketKey].tone === 'ready',
  ).length;

  if ((photoBuckets['main-couple']?.length ?? 0) === 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Needs a signature anchor',
      title: 'Start with the one photo guests should remember first',
      detail: 'The system still needs a signature couple photo before it can make the hero feel intentional. Everything else gets easier once that anchor is in place.',
      focusTitle: 'Lock the couple anchor first',
      focusDetail: 'Until the hero photo feels unmistakable, every other memory choice is still provisional.',
      decisionRule: 'Do not widen guest-facing collection before the signature couple photo feels settled.',
      curationNote: 'This is still collection mode. Do not widen the guest upload story until the couple anchor feels unmistakable.',
      badges: [
        `${signatureReadyCount}/2 signature buckets ready`,
        `${activeAlbums.length} live upload bucket${activeAlbums.length === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Hero photo still missing',
        'Guest upload lanes can stay simple for now',
      ],
      nextMoves: [
        'Upload one favorite couple portrait into Main photo of you two.',
        'Add a few more couple photos so the story section has real depth.',
        'Leave guest upload buckets simple until the couple photos feel settled.',
      ],
    };
  }

  if (activeAlbums.length === 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Private curation is ready',
      title: 'Your photos are ready for guests, but the upload path is not live yet',
      detail: 'The private bucket board has enough direction now. The next step is turning that into one or two clear guest upload moments instead of a long list of options.',
      focusTitle: 'Open one guest lane on purpose',
      focusDetail: 'The private story is strong enough now that one clear upload moment will help more than adding lots of options.',
      decisionRule: 'Launch the clearest guest upload path first, then add more only when the first one proves useful.',
      curationNote: 'The visual story is strong enough to open one clear upload lane without overwhelming guests.',
      badges: [
        `${signatureReadyCount}/2 signature buckets ready`,
        `${atmosphereReadyCount}/3 atmosphere buckets started`,
      ],
      qualitySignals: [
        'Couple anchors are in place',
        'No guest-facing upload lane is live yet',
      ],
      nextMoves: [
        'Create the first live bucket for the one moment you care about most.',
        'Only add more guest buckets when the first one has a clear purpose.',
        'Keep the upload path obvious: one link, one QR, one expectation.',
      ],
    };
  }

  if (totalVisibleUploads > 0 && readyAlbums.length === 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Story loop forming',
      title: 'You are a few uploads away from a real story loop',
      detail: 'Guests are sending photos, but no active bucket has enough visible uploads to feel slideshow-ready yet. A little curation now will give the memory flow some shape.',
      focusTitle: 'Finish one strong bucket first',
      focusDetail: 'A single complete bucket creates more trust than several half-formed ones.',
      decisionRule: 'Push one bucket to “worth revisiting” before you spread attention across every upload lane.',
      curationNote: 'You have signal now. The job is turning that signal into one complete, trustworthy memory lane first.',
      badges: [
        `${totalVisibleUploads} visible upload${totalVisibleUploads === 1 ? '' : 's'}`,
        `${flaggedUploads} flagged for review`,
      ],
      qualitySignals: [
        'Guest uploads are arriving',
        'No bucket is slideshow-ready yet',
      ],
      nextMoves: [
        'Push one live bucket to at least three strong visible uploads.',
        'Hide or review the flagged uploads before you export anything.',
        'Once one bucket feels solid, preview the slideshow before adding more complexity.',
      ],
    };
  }

  if (isArchiveLike && totalVisibleUploads > 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Archive mode is ready',
      title: 'Collection is working. Now turn it into something worth keeping.',
      detail: 'The wedding is behind you and the upload flow has enough signal now. This is the moment to preserve the strongest moments in the vault instead of collecting forever.',
      focusTitle: 'Shift from collection to preservation',
      focusDetail: 'The archive is strongest when it starts favoring memorable clusters over endless intake.',
      decisionRule: 'Once enough strong uploads exist, preserving the best moments beats collecting every remaining one.',
      curationNote: 'The best next upgrade is permanence: recap, archive, and stop treating every new upload as equally important.',
      badges: [
        `${readyAlbums.length} slideshow-ready bucket${readyAlbums.length === 1 ? '' : 's'}`,
        `${totalVisibleUploads} visible upload${totalVisibleUploads === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Enough uploads exist to curate a recap',
        'Archive-worthy moments are already visible',
      ],
      nextMoves: [
        'Use the strongest bucket to shape a first slideshow or recap draft.',
        'Move the moments that matter most into the Archive Vaults.',
        'Keep collecting only if the next bucket adds a genuinely different memory angle.',
      ],
    };
  }

  return {
    eyebrow: 'Memory curator',
    readinessLabel: 'Curation-ready',
    title: 'The memory flow is balanced enough to start curating, not just collecting',
    detail: 'You have the couple anchors, live guest paths, and enough uploads to make this feel intentional. The next wins are about taste and continuity, not more buckets.',
    focusTitle: 'Curate depth, not volume',
    focusDetail: 'The system is healthy enough that restraint will usually improve it more than expansion.',
    decisionRule: 'When the memory flow feels balanced, choose continuity and taste over opening new lanes.',
    curationNote: 'This is the sweet spot where fewer, better buckets will usually create a stronger memory system than opening more lanes.',
    badges: [
      `${readyAlbums.length} slideshow-ready bucket${readyAlbums.length === 1 ? '' : 's'}`,
      `${signatureReadyCount}/2 signature buckets ready`,
    ],
    qualitySignals: [
      'Couple anchors are steady',
      'Guest paths are open and useful',
    ],
    nextMoves: [
      'Preview the slideshow while the best moments are still easy to spot.',
      'Keep one or two guest buckets active instead of opening everything at once.',
      'When a bucket feels complete, decide whether it belongs in the vault next.',
    ],
  };
};

export const buildVaultMemoryCuratorModel = (args: {
  configs: VaultConfigSnapshot[];
  entries: VaultEntrySnapshot[];
  isArchiveLike: boolean;
  driveConnectedHealthy: boolean;
}): MemoryCuratorModel => {
  const { configs, entries, isArchiveLike, driveConnectedHealthy } = args;
  const enabledVaults = configs.filter((config) => config.is_enabled);
  const guestEntries = entries.filter((entry) => isGuestVaultAuthor(entry.author_name));
  const recapEntries = entries.filter((entry) => (entry.title || '').toLowerCase().includes('ai recap'));
  const photoEntries = entries.filter((entry) => {
    const media = (entry.media_type || '').toLowerCase();
    const file = (entry.attachment_name || '').toLowerCase();
    return media === 'photo' || /\.(jpg|jpeg|png|webp|heic)$/i.test(file);
  });

  if (!driveConnectedHealthy) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Storage attention needed',
      title: 'Reconnect Drive before this becomes your long-term memory home',
      detail: 'The vault only feels trustworthy when storage is healthy. Fix that first so every note, photo, and recap lands somewhere dependable.',
      focusTitle: 'Restore trust before sentiment',
      focusDetail: 'The emotional value of the vault only works when the storage path is dependable.',
      decisionRule: 'When storage trust is broken, repair storage before adding or sharing more memories.',
      curationNote: 'Trust comes before sentiment here. Reconnect storage before you ask anyone to rely on the vault long term.',
      badges: [
        `${enabledVaults.length} enabled vault${enabledVaults.length === 1 ? '' : 's'}`,
        `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}`,
      ],
      qualitySignals: [
        'Vault structure exists',
        'Storage health is currently blocking trust',
      ],
      nextMoves: [
        'Reconnect Google Drive so future entries land cleanly.',
        'Then add or refresh the vault entry you care about most.',
      ],
    };
  }

  if (entries.length === 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Needs a first memory',
      title: 'Write the first note before the wedding starts to blur',
      detail: 'The best first vault entry is not a perfect one. It is the note you write while the feeling is still fresh enough to be honest.',
      focusTitle: 'Land the first honest entry',
      focusDetail: 'The first real note teaches the vault what kind of archive this will become.',
      decisionRule: 'A real first note is more valuable than waiting for the perfect future memory artifact.',
      curationNote: 'One meaningful first entry will teach the system more than a batch of filler notes.',
      badges: [
        `${enabledVaults.length} enabled vault${enabledVaults.length === 1 ? '' : 's'}`,
        `${configs.length} vault milestone${configs.length === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Archive lane is enabled',
        'Meaningful content has not landed yet',
      ],
      nextMoves: [
        'Add one short note for your first anniversary.',
        'Keep the first vault personal before you open anything to guests.',
        'Once one note exists, decide which future milestone deserves the next one.',
      ],
    };
  }

  if (isArchiveLike && guestEntries.length === 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Invite trusted voices',
      title: 'The archive exists. Now invite a few meaningful voices into it.',
      detail: 'Right now the vault reads like a private notebook. That is good, but it gets more powerful once one or two people who matter most add their side of the story.',
      focusTitle: 'Add a few meaningful outside voices',
      focusDetail: 'Selective participation will deepen the archive without turning it into noise.',
      decisionRule: 'Invite the people whose memories change the story, not everyone who happens to be available.',
      curationNote: 'Selective participation usually produces a better archive than opening every lane to everyone.',
      badges: [
        `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}`,
        `${recapEntries.length} recap${recapEntries.length === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Private memory base exists',
        'Guest voices have not landed yet',
      ],
      nextMoves: [
        'Share a single vault with the people whose memories you most want back.',
        'Keep the guest path selective instead of blasting every vault everywhere.',
        'After guest entries start landing, decide whether the recap should refresh.',
      ],
    };
  }

  if (entries.length >= 3 && recapEntries.length === 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Recap-ready',
      title: 'You have enough material for a first recap',
      detail: 'The vault is carrying a real story now. A recap will help you turn scattered notes and photos into something you can revisit later without digging through everything.',
      focusTitle: 'Synthesize while the archive is still compact',
      focusDetail: 'This is the moment where one recap can give the collection shape before it becomes harder to hold in your head.',
      decisionRule: 'Once the vault has enough material, synthesis beats adding raw volume for a while.',
      curationNote: 'This is the point where synthesis becomes more valuable than collecting even more raw material.',
      badges: [
        `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}`,
        `${photoEntries.length} photo entr${photoEntries.length === 1 ? 'y' : 'ies'}`,
      ],
      qualitySignals: [
        'Enough material exists to tell a story',
        'Photo-backed entries can support a recap',
      ],
      nextMoves: [
        'Generate the first AI recap while the collection is still compact.',
        'Use photo-first mode if the visual memories are stronger than the written ones.',
        'Refresh the recap later instead of trying to make it perfect in one pass.',
      ],
    };
  }

  return {
    eyebrow: 'Memory curator',
    readinessLabel: 'Vault is healthy',
    title: 'The vault is preserving a real shared story now',
    detail: 'You have enough notes, media, and structure for this to feel like a living archive instead of a hidden feature. The next job is gentle maintenance, not reinvention.',
    focusTitle: 'Keep the archive editorial',
    focusDetail: 'The system is healthy now, so future value comes from taste and rhythm instead of more volume.',
    decisionRule: 'Use the vault to mature the best memories, not to store every possible artifact forever.',
    curationNote: 'The vault is ready for editorial taste now: keep what deepens the story, not just what adds more volume.',
    badges: [
      `${guestEntries.length} guest entr${guestEntries.length === 1 ? 'y' : 'ies'}`,
      `${recapEntries.length} recap${recapEntries.length === 1 ? '' : 's'} ready`,
    ],
    qualitySignals: [
      'Guest memories are present',
      'Recaps can keep pace with the archive',
    ],
    nextMoves: [
      'Refresh the recap after each meaningful new cluster of entries.',
      'Keep only the vaults that match real anniversaries you want to celebrate.',
      'Use the vault as the place memories mature, not the place everything gets dumped.',
    ],
  };
};

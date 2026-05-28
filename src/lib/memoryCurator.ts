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
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  curationNote: string;
  badges: string[];
  qualitySignals: string[];
  sequence: Array<{
    id: 'anchor' | 'shape' | 'preserve';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
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

function buildMemorySequence(
  current: { title: string; detail: string },
  next: { title: string; detail: string },
  then: { title: string; detail: string },
) {
  return [
    {
      id: 'anchor' as const,
      status: 'current' as const,
      title: current.title,
      detail: current.detail,
    },
    {
      id: 'shape' as const,
      status: 'next' as const,
      title: next.title,
      detail: next.detail,
    },
    {
      id: 'preserve' as const,
      status: 'then' as const,
      title: then.title,
      detail: then.detail,
    },
  ];
}

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
      bestNextMove: 'Upload one favorite couple portrait into Main photo of you two.',
      decisionRule: 'Do not widen guest-facing collection before the signature couple photo feels settled.',
      watchout: 'If you open guest-facing memory lanes before the couple anchor feels unmistakable, every later upload asks guests to guess what story they are helping preserve.',
      curationNote: 'This is still collection mode. Do not widen the guest photo sharing story until the couple anchor feels unmistakable.',
      badges: [
        `${signatureReadyCount}/2 signature buckets ready`,
        `${activeAlbums.length} live upload bucket${activeAlbums.length === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Hero photo still missing',
        'Guest photo sharing lanes can stay simple for now',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Settle the hero photo first',
          detail: 'Give the memory system one unmistakable couple anchor before you ask any other lane to carry emotional weight.',
        },
        {
          title: 'Deepen the couple story next',
          detail: 'Once the hero is right, add just enough companion photos that the rest of the site feels intentional instead of provisional.',
        },
        {
          title: 'Open guest-facing memory lanes after the anchor holds',
          detail: 'Let guest photo sharing stay simple until the couple story is strong enough to guide the rest of the memory flow.',
        },
      ),
      nextMoves: [
        'Upload one favorite couple portrait into Main photo of you two.',
        'Add a few more couple photos so the story section has real depth.',
        'Leave guest photo sharing buckets simple until the couple photos feel settled.',
      ],
    };
  }

  if (activeAlbums.length === 0) {
    return {
      eyebrow: 'Memory curator',
      readinessLabel: 'Private curation is ready',
      title: 'Your photos are ready for guests, but the photo sharing path is not live yet',
      detail: 'The private bucket board has enough direction now. The next step is turning that into one or two clear guest photo sharing moments instead of a long list of options.',
      focusTitle: 'Open one guest lane on purpose',
      focusDetail: 'The private story is strong enough now that one clear photo sharing moment will help more than adding lots of options.',
      bestNextMove: 'Create the first live bucket for the one moment you care about most.',
      decisionRule: 'Launch the clearest guest photo sharing path first, then add more only when the first one proves useful.',
      watchout: 'The easy mistake here is opening several buckets at once and teaching guests that every moment matters equally, which usually makes none of them feel memorable.',
      curationNote: 'The visual story is strong enough to open one clear photo sharing lane without overwhelming guests.',
      badges: [
        `${signatureReadyCount}/2 signature buckets ready`,
        `${atmosphereReadyCount}/3 atmosphere buckets started`,
      ],
      qualitySignals: [
        'Couple anchors are in place',
        'No guest-facing photo sharing lane is live yet',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Open one photo sharing lane on purpose',
          detail: 'Choose the clearest guest memory moment instead of launching several half-defined photo sharing paths at once.',
        },
        {
          title: 'Check whether that lane teaches the right behavior',
          detail: 'Once the first bucket is live, use it to learn what guests actually contribute before adding more choices.',
        },
        {
          title: 'Expand only after the first lane proves useful',
          detail: 'Let future guest paths grow from a working photo sharing habit instead of from optimism alone.',
        },
      ),
      nextMoves: [
        'Create the first live bucket for the one moment you care about most.',
        'Only add more guest buckets when the first one has a clear purpose.',
        'Keep the photo sharing path obvious: one link, one QR, one expectation.',
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
      bestNextMove: 'Push one live bucket to at least three strong visible uploads.',
      decisionRule: 'Push one bucket to “worth revisiting” before you spread attention across every photo sharing lane.',
      watchout: 'If you spread early uploads across every bucket at once, the whole memory system can look busier without any lane becoming worth revisiting.',
      curationNote: 'You have signal now. The job is turning that signal into one complete, trustworthy memory lane first.',
      badges: [
        `${totalVisibleUploads} visible upload${totalVisibleUploads === 1 ? '' : 's'}`,
        `${flaggedUploads} flagged for review`,
      ],
      qualitySignals: [
        'Guest uploads are arriving',
        'No bucket is slideshow-ready yet',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Finish one strong bucket first',
          detail: 'Use the incoming uploads to push one memory lane over the line before you spread attention across all of them.',
        },
        {
          title: 'Check the review queue while the bucket takes shape',
          detail: 'Hide or review the rough uploads so the first complete lane feels trustworthy once it is ready to revisit.',
        },
        {
          title: 'Preview the story after one lane feels real',
          detail: 'Let a single complete bucket teach you what the slideshow or recap should become before you widen the system.',
        },
      ),
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
      detail: 'The wedding is behind you and the photo sharing path has enough signal now. This is the moment to preserve the strongest moments in the vault instead of collecting forever.',
      focusTitle: 'Shift from collection to preservation',
      focusDetail: 'The archive is strongest when it starts favoring memorable clusters over endless intake.',
      bestNextMove: 'Use the strongest bucket to shape a first slideshow or recap draft.',
      decisionRule: 'Once enough strong uploads exist, preserving the best moments beats collecting every remaining one.',
      watchout: 'If archive mode keeps treating every new upload like equal priority, the strongest memories disappear into volume instead of becoming the keepsakes people revisit.',
      curationNote: 'The best next upgrade is permanence: recap, archive, and stop treating every new upload as equally important.',
      badges: [
        `${readyAlbums.length} slideshow-ready bucket${readyAlbums.length === 1 ? '' : 's'}`,
        `${totalVisibleUploads} visible upload${totalVisibleUploads === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Enough uploads exist to curate a recap',
        'Archive-worthy moments are already visible',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Choose the strongest bucket as the anchor',
          detail: 'Start from the lane that already carries the clearest emotional story instead of trying to preserve everything at once.',
        },
        {
          title: 'Shape that bucket into a recap or slideshow',
          detail: 'Use the compact, strongest cluster first so the archive begins with something worth revisiting.',
        },
        {
          title: 'Move permanence ahead of endless intake',
          detail: 'Once the strongest moments are preserved, let new collection happen only if it truly adds another angle to the story.',
        },
      ),
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
    bestNextMove: 'Preview the slideshow while the best moments are still easy to spot.',
    decisionRule: 'When the memory flow feels balanced, choose continuity and taste over opening new lanes.',
    watchout: 'Balanced memory systems usually get weaker through enthusiasm, not neglect. Too many new lanes can make a curated story feel accidental again.',
    curationNote: 'This is the sweet spot where fewer, better buckets will usually create a stronger memory system than opening more lanes.',
    badges: [
      `${readyAlbums.length} slideshow-ready bucket${readyAlbums.length === 1 ? '' : 's'}`,
      `${signatureReadyCount}/2 signature buckets ready`,
    ],
    qualitySignals: [
      'Couple anchors are steady',
      'Guest paths are open and useful',
    ],
    sequence: buildMemorySequence(
      {
        title: 'Use the healthiest memory lanes as the anchor',
        detail: 'The system is balanced enough now that restraint and taste matter more than opening new collection paths.',
      },
      {
        title: 'Check the strongest moments while they are still easy to spot',
        detail: 'Preview the slideshow or recap now, while the good clusters are still obvious and the archive is not overgrown.',
      },
      {
        title: 'Preserve continuity instead of expanding volume',
        detail: 'Once the story feels healthy, keep it editorial and avoid turning every new moment into another lane.',
      },
    ),
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
      bestNextMove: 'Reconnect Google Drive so future entries land cleanly.',
      decisionRule: 'When storage trust is broken, repair storage before adding or sharing more memories.',
      watchout: 'If people add or share meaningful vault entries before storage trust is back, the archive starts training everyone not to rely on the place meant to preserve it.',
      curationNote: 'Trust comes before sentiment here. Reconnect storage before you ask anyone to rely on the vault long term.',
      badges: [
        `${enabledVaults.length} enabled vault${enabledVaults.length === 1 ? '' : 's'}`,
        `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}`,
      ],
      qualitySignals: [
        'Vault structure exists',
        'Storage health is currently blocking trust',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Reconnect the storage path first',
          detail: 'Restore the dependable place where future notes, photos, and recaps are supposed to land before you deepen the archive.',
        },
        {
          title: 'Check one important entry after storage is back',
          detail: 'Once the storage trust is restored, verify the single memory artifact you care about most lands cleanly.',
        },
        {
          title: 'Reopen sharing only after trust returns',
          detail: 'Let the vault become a long-term memory home again before you ask anyone else to rely on it.',
        },
      ),
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
      bestNextMove: 'Add one short note for your first anniversary.',
      decisionRule: 'A real first note is more valuable than waiting for the perfect future memory artifact.',
      watchout: 'If you wait for a grander future artifact, the archive quietly becomes a place for imagined memories instead of preserved real ones.',
      curationNote: 'One meaningful first entry will teach the system more than a batch of filler notes.',
      badges: [
        `${enabledVaults.length} enabled vault${enabledVaults.length === 1 ? '' : 's'}`,
        `${configs.length} vault milestone${configs.length === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Archive lane is enabled',
        'Meaningful content has not landed yet',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Write the first honest note',
          detail: 'Use the freshness of the feeling as the real asset here instead of waiting for a more elaborate future memory artifact.',
        },
        {
          title: 'Check what kind of archive that first note suggests',
          detail: 'Once one real entry exists, decide what the next milestone should feel like before you add filler.',
        },
        {
          title: 'Let the archive deepen slowly from real moments',
          detail: 'Build the vault from meaningful anniversaries and voice, not from the pressure to populate every slot quickly.',
        },
      ),
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
      bestNextMove: 'Share a single vault with the people whose memories you most want back.',
      decisionRule: 'Invite the people whose memories change the story, not everyone who happens to be available.',
      watchout: 'A vault that opens too broadly too early can turn emotionally specific memories into polite noise that nobody wants to revisit later.',
      curationNote: 'Selective participation usually produces a better archive than opening every lane to everyone.',
      badges: [
        `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}`,
        `${recapEntries.length} recap${recapEntries.length === 1 ? '' : 's'}`,
      ],
      qualitySignals: [
        'Private memory base exists',
        'Guest voices have not landed yet',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Invite the few voices that matter most',
          detail: 'Use this pass to deepen the archive with meaningful outside memories instead of turning the vault into a public comment wall.',
        },
        {
          title: 'Check how those entries change the story',
          detail: 'Once guest memories begin landing, use them to decide whether the archive feels broader or just noisier.',
        },
        {
          title: 'Preserve selectivity as the archive grows',
          detail: 'Let future guest participation stay curated so the vault keeps emotional weight instead of becoming a dump.',
        },
      ),
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
      bestNextMove: 'Generate the first AI recap while the collection is still compact.',
      decisionRule: 'Once the vault has enough material, synthesis beats adding raw volume for a while.',
      watchout: 'If you keep collecting without synthesizing, the archive may gain volume faster than it gains meaning, which makes revisiting it feel heavier instead of richer.',
      curationNote: 'This is the point where synthesis becomes more valuable than collecting even more raw material.',
      badges: [
        `${entries.length} saved entr${entries.length === 1 ? 'y' : 'ies'}`,
        `${photoEntries.length} photo entr${photoEntries.length === 1 ? 'y' : 'ies'}`,
      ],
      qualitySignals: [
        'Enough material exists to tell a story',
        'Photo-backed entries can support a recap',
      ],
      sequence: buildMemorySequence(
        {
          title: 'Capture the collection at recap scale',
          detail: 'The vault has enough signal now that synthesis will teach you more than another round of raw intake.',
        },
        {
          title: 'Check the first recap while the archive is still compact',
          detail: 'Use the current cluster to shape one revisit-worthy summary before the story gets harder to hold in your head.',
        },
        {
          title: 'Preserve rhythm over endless volume',
          detail: 'Once the first recap exists, let future updates arrive in meaningful clusters instead of constant expansion.',
        },
      ),
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
    bestNextMove: 'Refresh the recap after each meaningful new cluster of entries.',
    decisionRule: 'Use the vault to mature the best memories, not to store every possible artifact forever.',
    watchout: 'Healthy archives usually weaken through accumulation. If everything stays forever without editorial judgment, the memories that matter most lose definition.',
    curationNote: 'The vault is ready for editorial taste now: keep what deepens the story, not just what adds more volume.',
    badges: [
      `${guestEntries.length} guest entr${guestEntries.length === 1 ? 'y' : 'ies'}`,
      `${recapEntries.length} recap${recapEntries.length === 1 ? '' : 's'} ready`,
    ],
    qualitySignals: [
      'Guest memories are present',
      'Recaps can keep pace with the archive',
    ],
    sequence: buildMemorySequence(
      {
        title: 'Keep the healthiest memories as the anchor',
        detail: 'Use the existing guest voices and recaps as the stable center of the archive instead of reopening everything equally.',
      },
      {
        title: 'Check each new cluster for editorial value',
        detail: 'When fresh notes or photos arrive, decide whether they deepen the story before you widen the archive again.',
      },
      {
        title: 'Preserve taste and rhythm over more volume',
        detail: 'Let the vault mature through careful recap refreshes and milestone choices rather than endless accumulation.',
      },
    ),
    nextMoves: [
      'Refresh the recap after each meaningful new cluster of entries.',
      'Keep only the vaults that match real anniversaries you want to celebrate.',
      'Use the vault as the place memories mature, not the place everything gets dumped.',
    ],
  };
};

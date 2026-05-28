import type { BuilderRevision } from '../services/versionHistory';

export interface BuilderDraftContinuityEvent {
  id: string;
  title: string;
  detail: string;
  badge: string;
  restoreLabel: string;
  canRestore: boolean;
}

export interface BuilderDraftContinuityModel {
  badge: string;
  heading: string;
  summary: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  primaryAction: { kind: 'save' | 'publish' | 'restore' | 'none'; label: string; revisionId?: string };
  events: BuilderDraftContinuityEvent[];
}

function getRevisionTitle(revision: BuilderRevision): string {
  const draftVersion = revision.project.draftVersion;
  if (revision.action === 'publish') {
    return typeof revision.project.publishedVersion === 'number'
      ? `Published checkpoint v${revision.project.publishedVersion}`
      : 'Published checkpoint';
  }
  if (revision.action === 'rollback') {
    return draftVersion ? `Restored draft v${draftVersion}` : 'Restored checkpoint';
  }
  return draftVersion ? `Saved draft v${draftVersion}` : 'Saved checkpoint';
}

function getRevisionBadge(revision: BuilderRevision): string {
  if (revision.action === 'publish') return 'Published';
  if (revision.action === 'rollback') return 'Restored';
  return 'Saved';
}

function getRevisionDetail(revision: BuilderRevision): string {
  const pageCount = revision.project.pages.length;
  const pageLabel = `${pageCount} page${pageCount === 1 ? '' : 's'}`;
  const draftVersion = revision.project.draftVersion;
  const version = revision.project.publishedVersion;

  if (revision.action === 'publish') {
    return version
      ? `${pageLabel} · shared version ${version}${draftVersion ? ` from draft v${draftVersion}` : ''}`
      : `${pageLabel} · sent to the shared site`;
  }

  if (revision.action === 'rollback') {
    return `${pageLabel} · restored from a prior local checkpoint${draftVersion ? ` to draft v${draftVersion}` : ''}`;
  }

  return `${pageLabel} · ${draftVersion ? `local draft v${draftVersion}` : 'local draft snapshot'}`;
}

export function buildBuilderDraftContinuityModel({
  revisions,
  isDirty,
  isSaving,
  isPublishing,
  publishedVersion,
}: {
  revisions: BuilderRevision[];
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  publishedVersion: number | null;
}): BuilderDraftContinuityModel {
  const latestPublishedRevision = revisions.find((revision) => revision.action === 'publish') ?? null;
  const firstRestoreCandidate = revisions.slice(1).find((revision) => revision.action === 'save' || revision.action === 'publish') ?? null;

  const events = revisions.slice(0, 4).map((revision, index) => ({
    id: revision.id,
    title: getRevisionTitle(revision),
    detail: getRevisionDetail(revision),
    badge: getRevisionBadge(revision),
    restoreLabel: index === 0 ? 'Current checkpoint' : revision.action === 'publish' ? 'Restore this share-ready checkpoint' : 'Restore this draft checkpoint',
    canRestore: index > 0,
  }));

  if (isPublishing) {
    return {
      badge: 'Publishing now',
      heading: 'The Builder is sending this draft to the shared site.',
      summary: 'Freeze the draft long enough to let publish truth settle before you second-guess anything.',
      focusTitle: 'Hold the editor steady while the shared-site update finishes.',
      focusDetail: 'Publishing is the moment when draft truth and guest truth converge, so the safest move is patience.',
      bestNextMove: 'Wait for the shared-site update to finish, then confirm the new checkpoint appears in local history.',
      decisionRule: 'During publish, avoid new edits until the result is clear.',
      watchout: 'Changing the draft mid-publish makes it harder to trust which version actually got shared.',
      currentStep: 'Let the publish finish.',
      nextStep: 'Confirm the shared checkpoint and local history agree.',
      thenStep: 'Resume editing only if the next improvement is real.',
      primaryAction: { kind: 'none', label: 'Publishing…' },
      events,
    };
  }

  if (isSaving) {
    return {
      badge: 'Saving now',
      heading: 'The Builder is locking in the latest draft checkpoint.',
      summary: 'Treat this as draft stabilization time, not a moment to pile on more motion.',
      focusTitle: 'Let the save settle before making the next decision.',
      focusDetail: 'A clear checkpoint makes preview, restore, and launch choices much more trustworthy.',
      bestNextMove: 'Wait for the save to finish, then use the fresh checkpoint as your new baseline.',
      decisionRule: 'When the draft is synchronizing, clarity beats speed.',
      watchout: 'Starting another edit spiral before the save finishes weakens your draft history.',
      currentStep: 'Finish saving the draft.',
      nextStep: 'Use the new checkpoint as the truth source.',
      thenStep: 'Either publish, restore, or continue from that stable base.',
      primaryAction: { kind: 'none', label: 'Saving…' },
      events,
    };
  }

  if (isDirty) {
    return {
      badge: 'Unsaved draft',
      heading: 'You have draft edits that are ahead of the last local checkpoint.',
      summary: 'The Builder is holding newer work than your saved history right now.',
      focusTitle: 'Decide whether this new work is worth preserving before it blurs the recovery path.',
      focusDetail: 'Unsaved changes are fine while you are actively shaping a page, but they are a weak handoff state.',
      bestNextMove: 'Save this draft if the work is intentional, or restore a steadier checkpoint if this edit lap went sideways.',
      decisionRule: 'When the draft is ahead of history, either preserve the new truth or consciously step back to a known-good version.',
      watchout: 'Lingering in a dirty state makes launch, restore, and review all less trustworthy.',
      currentStep: 'Decide whether the current draft deserves to become the next checkpoint.',
      nextStep: 'Save it if yes, or restore the last strong checkpoint if no.',
      thenStep: 'Resume editing from a stable base instead of carrying fuzzy draft state forward.',
      primaryAction: { kind: 'save', label: 'Save this checkpoint' },
      events,
    };
  }

  if (firstRestoreCandidate) {
    return {
      badge: latestPublishedRevision ? 'Recovery ready' : 'Local history ready',
      heading: latestPublishedRevision
        ? 'You have both a stable draft baseline and a share-ready checkpoint in reach.'
        : 'You have stable local checkpoints you can safely return to.',
      summary: latestPublishedRevision
        ? 'The Builder can move forward from a clean base or roll back to a known-good version without guesswork.'
        : 'Local draft history is strong enough that experimentation no longer has to feel risky.',
      focusTitle: 'Use checkpoint history as an editing tool, not just as background safety.',
      focusDetail: latestPublishedRevision
        ? 'When a new idea goes soft, you now have a visible path back to something already strong.'
        : 'Deliberate restore options make it easier to edit boldly without losing the thread.',
      bestNextMove: latestPublishedRevision
        ? 'Keep editing from the current draft unless the share-ready checkpoint is clearly the better version to return to.'
        : 'Keep working from this steady draft, knowing the previous checkpoint is there if you need to rewind.',
      decisionRule: 'Restore only when a prior checkpoint is genuinely cleaner than the current direction, not just because doubt showed up.',
      watchout: 'Checkpoint history should reduce thrash, not tempt you into bouncing between versions without a reason.',
      currentStep: 'Treat the latest checkpoint as your working baseline.',
      nextStep: 'Restore only if a prior version is clearly stronger.',
      thenStep: publishedVersion
        ? 'Once the draft is better than the shared version, publish the next clean update.'
        : 'Once the draft is clearly stronger, move toward publish with confidence.',
      primaryAction: { kind: 'restore', label: 'Review restore options', revisionId: firstRestoreCandidate.id },
      events,
    };
  }

  return {
    badge: 'Baseline set',
    heading: 'This Builder session has a clean draft baseline.',
    summary: 'You are starting from a stable state, even if deeper local checkpoint history has not built up yet.',
    focusTitle: 'Create the next meaningful checkpoint once the current move is real.',
    focusDetail: 'One clean save is better than a cloud of tiny uncertain changes.',
    bestNextMove: publishedVersion ? 'Keep editing until the next update clearly improves the shared version guests can already see.' : 'Shape one real improvement, then save it as the next checkpoint.',
    decisionRule: 'Checkpoint history gets valuable once each save represents a deliberate step forward.',
    watchout: 'Do not save every tiny wobble just to feel active.',
    currentStep: 'Work from this clean baseline.',
    nextStep: 'Save the next meaningful improvement.',
    thenStep: 'Use restore only after the history has something worth returning to.',
    primaryAction: publishedVersion ? { kind: 'publish', label: 'Keep improving the next shared update' } : { kind: 'none', label: 'No restore needed yet' },
    events,
  };
}

import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';
import { getPublishIssue, type PublishIssue } from './publishReadiness';

export interface LaunchConfidenceAction {
  kind: 'fix' | 'preview' | 'publish';
  label: string;
}

export interface LaunchConfidenceModel {
  label: string;
  tone: 'steady' | 'warning' | 'ready';
  summary: string;
  current: string;
  next: string;
  primaryAction: LaunchConfidenceAction;
}

function isProjectPublished(project: BuilderProject) {
  return project.publishStatus === 'published' || typeof project.publishedVersion === 'number' || Boolean(project.lastPublishedAt);
}

function getIssueNext(issue: PublishIssue['kind']) {
  switch (issue) {
    case 'no-pages':
    case 'no-enabled-sections':
      return 'Open a starting layout and turn on the first real guest-facing section.';
    case 'missing-couple-names':
      return 'Set the couple names exactly how guests should see them.';
    case 'missing-event-date':
      return 'Add the wedding date so timing and RSVP copy stop feeling provisional.';
    case 'missing-venue':
      return 'Add at least one venue so guests know where the day actually lives.';
    case 'rsvp-disabled':
      return 'Turn RSVP back on or remove guest prompts that promise replies.';
    case 'unsaved-changes':
      return 'Save the latest changes so launch confidence matches the current draft.';
    default:
      return 'Tighten the guest-facing essentials before trying to go live.';
  }
}

export function buildLaunchConfidence(
  project: BuilderProject,
  weddingData?: WeddingDataV1 | null,
  options?: { isDirty?: boolean },
): LaunchConfidenceModel {
  const issue = getPublishIssue(project, weddingData, options);

  if (issue) {
    return {
      label: issue.kind === 'unsaved-changes' ? 'Almost launch-ready' : 'Launch needs one more pass',
      tone: 'warning',
      summary: issue.message,
      current: issue.kind === 'unsaved-changes'
        ? 'The structure is close, but the latest edit still needs to be saved before launch truth is real.'
        : 'The guest-facing basics are not fully trustworthy yet, so publishing now would make the site feel thinner than it should.',
      next: getIssueNext(issue.kind),
      primaryAction: {
        kind: issue.kind === 'unsaved-changes' ? 'publish' : 'fix',
        label: issue.kind === 'unsaved-changes' ? 'Save and publish' : 'Fix launch blockers',
      },
    };
  }

  if (isProjectPublished(project)) {
    return {
      label: 'Live and steady',
      tone: 'ready',
      summary: typeof project.publishedVersion === 'number'
        ? `Version ${project.publishedVersion} is already live, so this is now a polish decision instead of a launch panic.`
        : 'The guest-facing site is already live, so this is now about making the next update feel intentional.',
      current: 'Guests can already rely on the live site without waiting for another structural fix.',
      next: 'Preview your changes once, then publish only if this draft meaningfully improves clarity or polish.',
      primaryAction: {
        kind: 'preview',
        label: 'Preview before updating',
      },
    };
  }

  return {
    label: 'Ready for a real launch pass',
    tone: 'ready',
    summary: 'The draft has the essentials in place, so the best remaining move is one preview pass and a calm publish.',
    current: 'The structure, names, date, venue, and RSVP path are all present enough to support guests well.',
    next: 'Preview the guest-facing flow once on mobile, then publish from this draft instead of over-polishing in edit mode.',
    primaryAction: {
      kind: 'publish',
      label: 'Publish with confidence',
    },
  };
}

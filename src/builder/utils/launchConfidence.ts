import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';
import { getPublishIssue, type PublishIssue } from './publishReadiness';

export interface LaunchConfidenceAction {
  kind: 'fix' | 'preview' | 'publish';
  label: string;
  target?: 'publish-blockers' | 'itinerary';
}

export interface LaunchConfidenceSequenceItem {
  status: 'current' | 'next' | 'then';
  label: string;
  detail: string;
}

export interface LaunchConfidenceModel {
  label: string;
  tone: 'steady' | 'warning' | 'ready';
  summary: string;
  current: string;
  next: string;
  decisionRule: string;
  watchout: string;
  sequence: LaunchConfidenceSequenceItem[];
  primaryAction: LaunchConfidenceAction;
}

function buildLaunchSequence(current: string, next: string, then: string): LaunchConfidenceSequenceItem[] {
  return [
    { status: 'current', label: 'Current', detail: current },
    { status: 'next', label: 'Next', detail: next },
    { status: 'then', label: 'Then', detail: then },
  ];
}

function isProjectPublished(project: BuilderProject) {
  return project.publishStatus === 'published' || typeof project.publishedVersion === 'number' || Boolean(project.lastPublishedAt);
}

function getScheduleEventCount(weddingData?: WeddingDataV1 | null) {
  return Array.isArray(weddingData?.schedule) ? weddingData.schedule.filter(Boolean).length : 0;
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
      return 'Tighten the guest-facing essentials before sharing with guests.';
  }
}

export function buildLaunchConfidence(
  project: BuilderProject,
  weddingData?: WeddingDataV1 | null,
  options?: { isDirty?: boolean },
): LaunchConfidenceModel {
  const issue = getPublishIssue(project, weddingData, options);
  const scheduleEventCount = getScheduleEventCount(weddingData);

  if (issue) {
    return {
      label: issue.kind === 'unsaved-changes' ? 'Almost ready to share' : 'Sharing needs one more pass',
      tone: 'warning',
      summary: issue.message,
      current: issue.kind === 'unsaved-changes'
        ? 'The structure is close, but the latest edit still needs to be saved before launch truth is real.'
        : 'The guest-facing basics are not fully trustworthy yet, so publishing now would make the site feel thinner than it should.',
      next: getIssueNext(issue.kind),
      decisionRule: issue.kind === 'unsaved-changes'
        ? 'When save state is the only blocker, synchronize the draft before you make any new publish decision.'
        : 'When guest-facing basics are still thin, fix the blocker before you spend energy on polish or momentum theater.',
      watchout: issue.kind === 'unsaved-changes'
        ? 'Do not keep polishing a draft whose launch truth is already stale. When save state is the blocker, more editing usually creates more uncertainty, not more readiness.'
        : 'The easiest mistake here is treating visible design progress like launch progress. If the guest-facing basics are still thin, publish pressure should stay pointed at the blocker itself.',
      sequence: buildLaunchSequence(
        issue.kind === 'unsaved-changes'
          ? 'Save the latest draft so launch confidence matches the work you are actually looking at.'
          : 'Repair the missing guest-facing basic that is still keeping launch truth thin.',
        getIssueNext(issue.kind),
        issue.kind === 'unsaved-changes'
          ? 'Then preview once and publish from a synchronized draft instead of reopening a new polish loop.'
          : 'Then preview the guest path once the blocker is fixed before you decide whether any extra polish is still worth it.',
      ),
      primaryAction: {
        kind: issue.kind === 'unsaved-changes' ? 'publish' : 'fix',
        label: issue.kind === 'unsaved-changes' ? 'Save and publish' : 'Fix share blockers',
        target: issue.kind === 'unsaved-changes' ? undefined : 'publish-blockers',
      },
    };
  }

  if (!isProjectPublished(project) && scheduleEventCount === 0) {
    return {
      label: 'Launch needs one more pass',
      tone: 'warning',
      summary: 'The site has the structural basics, but guests still need at least one real itinerary event before the launch feels trustworthy.',
      current: 'Names, date, venue, and RSVP can all be present while the weekend still feels vague to a guest who is trying to picture the day.',
      next: 'Add the first real schedule event so the public timeline has an anchor before you publish.',
      decisionRule: 'If guests still cannot picture the weekend from one concrete schedule anchor, launch is still premature even when the basics look complete.',
      watchout: 'A site can look launchable from the editor while still feeling empty to a guest. If the schedule has no real anchor, the launch asks messaging and memory to compensate for a weekend that was never clearly introduced.',
      sequence: buildLaunchSequence(
        'Treat the missing itinerary anchor as the real launch blocker, not as optional polish.',
        'Add the first guest-facing schedule event so the timeline can carry at least one concrete promise.',
        'Then preview the public flow again and publish only once the weekend feels pictureable instead of abstract.',
      ),
      primaryAction: {
        kind: 'fix',
        label: 'Add itinerary anchors',
        target: 'itinerary',
      },
    };
  }

  if (isProjectPublished(project)) {
    return {
      label: 'Live and steady',
      tone: 'ready',
      summary: typeof project.publishedVersion === 'number'
        ? `Version ${project.publishedVersion} is already shared, so this is now a polish decision instead of a launch panic.`
        : 'The guest-facing site is already shared, so this is now about making the next update feel intentional.',
      current: 'Guests can already rely on the shared site without waiting for another structural fix.',
      next: 'Preview your changes once, then publish only if this draft meaningfully improves clarity or polish.',
      decisionRule: 'Once the site is already trustworthy for guests, restraint beats motion unless the change clearly improves guest clarity or confidence.',
      watchout: 'Do not turn a shared, trustworthy site into a constant-update habit. Once the public path is steady, extra edits should earn their way in instead of shipping just because they exist.',
      sequence: buildLaunchSequence(
        'Start from the assumption that the shared site is already doing its job for guests.',
        'Preview the draft once and decide whether the change clearly improves guest clarity or confidence.',
        'Then publish deliberately or leave the shared version alone if this update is only marginally better.',
      ),
      primaryAction: {
        kind: 'preview',
        label: 'Preview before updating',
      },
    };
  }

  return {
    label: 'Ready for a real final review',
    tone: 'ready',
    summary: 'The draft has the essentials in place, so the best remaining move is one preview pass and a calm publish.',
    current: 'The structure, names, date, venue, and RSVP path are all present enough to support guests well.',
    next: 'Preview the guest-facing flow once on mobile, then publish from this draft instead of over-polishing in edit mode.',
    decisionRule: 'When the essentials are already trustworthy, one honest preview beats reopening the editor for another speculative polish lap.',
    watchout: 'The main risk now is nervous extra editing. Once the draft is structurally sound, another round of tinkering can create more churn than confidence.',
    sequence: buildLaunchSequence(
      'Hold the draft steady now that the essential guest-facing structure is already in place.',
      'Preview the mobile guest flow once and confirm that the basics feel easy to trust.',
      'Then publish from this draft instead of reopening a longer polish loop just because there is still time.',
    ),
    primaryAction: {
      kind: 'publish',
      label: 'Publish with confidence',
    },
  };
}

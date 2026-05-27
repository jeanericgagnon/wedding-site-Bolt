import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';
import { buildPublishReadiness, getPublishIssue, type PublishIssue } from '../utils/publishReadiness';

export type BuilderLaunchPrepAction =
  | { kind: 'add-page'; label: string }
  | { kind: 'add-section'; label: string }
  | { kind: 'save-draft'; label: string }
  | { kind: 'fix-blockers'; label: string }
  | { kind: 'publish'; label: string };

export interface BuilderLaunchPrepChecklistItem {
  id: string;
  label: string;
  done: boolean;
  detail: string;
  action: BuilderLaunchPrepAction | null;
}

export interface BuilderLaunchPrepSummary {
  issue: PublishIssue | null;
  checklistItems: BuilderLaunchPrepChecklistItem[];
  headline: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  blockerHints: string[];
  primaryAction: BuilderLaunchPrepAction;
}

interface BuilderLaunchPrepSummaryInput {
  project: BuilderProject;
  weddingData?: WeddingDataV1 | null;
  isDirty: boolean;
  activePageId?: string | null;
  isPublished: boolean;
}

function getHintsForIssue(issue: PublishIssue | null): string[] {
  if (!issue) {
    return ['Use the launch check to confirm the draft, then publish from a stable state.'];
  }

  switch (issue.kind) {
    case 'no-pages':
      return [
        'Add a first page or apply a starting design before you think about launch.',
        'Once a page exists, give it one real guest-facing section so the site stops being structurally blank.',
      ];
    case 'no-enabled-sections':
      return [
        'Select a section and turn it on so guests have something real to read.',
        'If the current page is still blank, add a hero or another anchor section before you try again.',
      ];
    case 'missing-couple-names':
      return [
        'Open couple details and set both names exactly how guests should see them.',
        'Treat this as trust copy, not metadata. The names are part of the first read.',
      ];
    case 'missing-event-date':
      return [
        'Open event details and add the wedding date before going live.',
        'A guest should not have to infer timing from context or other pages.',
      ];
    case 'missing-venue':
      return [
        'Add at least one venue name or address before launch.',
        'Guests should know where the day lives without needing a workaround message.',
      ];
    case 'rsvp-disabled':
      return [
        'Turn RSVP on before launch or remove RSVP calls to action that over-promise.',
        'Guest trust drops fast when the invitation path and the site behavior disagree.',
      ];
    case 'unsaved-changes':
      return [
        'Save the current draft so preview, checklist, and launch truth all point at the same state.',
        'Then reopen the launch check only if something still feels unresolved.',
      ];
    default:
      return ['Use Fix next to move through the last blockers before the guest-facing launch.'];
  }
}

function getActionForIssue(issue: PublishIssue | null): BuilderLaunchPrepAction {
  if (!issue) return { kind: 'publish', label: 'Publish with confidence' };
  switch (issue.kind) {
    case 'no-pages':
      return { kind: 'add-page', label: 'Add first page' };
    case 'no-enabled-sections':
      return { kind: 'add-section', label: 'Add or show a section' };
    case 'unsaved-changes':
      return { kind: 'save-draft', label: 'Save draft first' };
    default:
      return { kind: 'fix-blockers', label: 'Fix launch blockers' };
  }
}

function withActions(
  items: ReturnType<typeof buildPublishReadiness>,
  issue: PublishIssue | null,
): BuilderLaunchPrepChecklistItem[] {
  return items.map((item) => {
    if (item.done) {
      return { ...item, action: null };
    }

    switch (item.id) {
      case 'page':
        return { ...item, action: { kind: 'add-page', label: 'Add first page' } };
      case 'sections':
      case 'current-page':
        return { ...item, action: { kind: 'add-section', label: 'Add first section' } };
      case 'saved':
        return { ...item, action: { kind: 'save-draft', label: 'Save now' } };
      default:
        return { ...item, action: issue ? { kind: 'fix-blockers', label: 'Fix next' } : null };
    }
  });
}

export function getBuilderLaunchPrepSummary({
  project,
  weddingData,
  isDirty,
  activePageId,
  isPublished,
}: BuilderLaunchPrepSummaryInput): BuilderLaunchPrepSummary {
  const issue = getPublishIssue(project, weddingData, { isDirty });
  const checklistItems = withActions(
    buildPublishReadiness(project, weddingData, { isDirty, activePageId }),
    issue,
  );

  if (!issue) {
    return {
      issue,
      checklistItems,
      headline: isPublished ? 'The live site is steady enough for a deliberate update.' : 'The draft is ready for a calm publish pass.',
      focusTitle: 'Use the launch check as confirmation, not as permission to reopen a nervous polish loop.',
      focusDetail: isPublished
        ? 'Guests already have a trustworthy live site, so update only if this draft clearly improves clarity or confidence.'
        : 'The essentials are in place, so the right next move is to verify the guest read once and publish from a stable draft.',
      bestNextMove: isPublished
        ? 'Preview once, then publish only if the update clearly improves the guest path.'
        : 'Run one honest guest-facing pass, then publish from this synchronized draft.',
      decisionRule: isPublished
        ? 'Once the site is already live, restraint beats motion unless the improvement is obvious.'
        : 'When the checklist is clean, trust the draft enough to publish instead of polishing in circles.',
      watchout: isPublished
        ? 'Do not ship updates just because they exist. Live changes should earn their way in.'
        : 'The main risk now is reopening the editor for low-value tweaks after launch truth is already solid.',
      currentStep: 'Treat the draft as launch-ready unless the guest read reveals a real trust gap.',
      nextStep: 'Preview once and make sure the page still feels clear on a phone-sized read.',
      thenStep: isPublished
        ? 'Publish the update only if it materially improves the live experience.'
        : 'Publish from this draft instead of reopening a speculative edit lap.',
      blockerHints: getHintsForIssue(issue),
      primaryAction: getActionForIssue(issue),
    };
  }

  return {
    issue,
    checklistItems,
    headline: 'Launch still needs one more deliberate pass.',
    focusTitle: issue.kind === 'unsaved-changes'
      ? 'Stabilize the draft before you make any new launch decision.'
      : 'Fix the real guest-facing blocker before you spend energy on polish.',
    focusDetail: issue.kind === 'unsaved-changes'
      ? 'Preview and launch confidence are both less trustworthy while the draft is still moving.'
      : 'The right next move is the blocker itself, not a wider search for visual improvements.',
    bestNextMove: issue.kind === 'unsaved-changes'
      ? 'Save the draft now, then re-check launch readiness from the synchronized state.'
      : issue.message,
    decisionRule: issue.kind === 'unsaved-changes'
      ? 'When save state is the only blocker, synchronize before you rethink anything else.'
      : 'When a guest-facing basic is still missing, fix that exact gap before you call the draft launchable.',
    watchout: issue.kind === 'unsaved-changes'
      ? 'More edits from a dirty draft usually create more uncertainty, not more launch confidence.'
      : 'Visible design progress can hide the fact that the launch basics are still thin.',
    currentStep: issue.kind === 'unsaved-changes'
      ? 'Hold the draft steady long enough to save it.'
      : 'Treat the blocker like the real source of launch risk.',
    nextStep: issue.kind === 'unsaved-changes'
      ? 'Save now so checklist and preview truth line up again.'
      : 'Fix the blocker directly instead of branching into side work.',
    thenStep: issue.kind === 'unsaved-changes'
      ? 'Re-open the launch check only after the draft is synchronized.'
      : 'Preview again once the blocker is repaired, then decide whether anything else still matters.',
    blockerHints: getHintsForIssue(issue),
    primaryAction: getActionForIssue(issue),
  };
}

import type { FlowStatus } from '../../lib/flowLabels';

export type BuilderPreviewPrimaryActionKind =
  | 'switch-to-edit'
  | 'save-draft'
  | 'fix-blockers'
  | 'publish'
  | 'switch-viewport';

export interface BuilderPreviewReviewInput {
  activePageTitle: string;
  sectionCount: number;
  previewViewport: 'desktop' | 'tablet' | 'mobile';
  hasHardPublishBlocker: boolean;
  canAutoSaveBeforePublish: boolean;
  isDirty: boolean;
  isPublished: boolean;
}

export interface BuilderPreviewReviewSummary {
  badge: string;
  heading: string;
  summary: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  sequence: Array<{
    status: FlowStatus;
    label: string;
    detail: string;
  }>;
  primaryAction: {
    kind: BuilderPreviewPrimaryActionKind;
    label: string;
    viewport?: 'desktop' | 'tablet' | 'mobile';
  };
}

function buildSequence(current: string, next: string, then: string): BuilderPreviewReviewSummary['sequence'] {
  return [
    { status: 'current', label: 'Current', detail: current },
    { status: 'next', label: 'Next', detail: next },
    { status: 'then', label: 'Then', detail: then },
  ];
}

export function getBuilderPreviewReviewSummary({
  activePageTitle,
  sectionCount,
  previewViewport,
  hasHardPublishBlocker,
  canAutoSaveBeforePublish,
  isDirty,
  isPublished,
}: BuilderPreviewReviewInput): BuilderPreviewReviewSummary {
  const pageLabel = activePageTitle || 'this page';

  if (sectionCount === 0) {
    return {
      badge: 'Preview is incomplete',
      heading: `${pageLabel} still has nothing real to show a guest`,
      summary: 'Preview is doing its job here by making the gap obvious. This page needs structure before a guest can trust it.',
      focusTitle: 'Return to edit mode and add the first anchor section.',
      focusDetail: 'The best next move is structural, not visual. Give the page one real section that answers the main guest question.',
      bestNextMove: 'Exit preview, add the first anchor section, and come back only after the page has something meaningful to read.',
      decisionRule: 'When preview shows an empty page, structure comes before any other Builder decision.',
      watchout: 'Do not keep evaluating an empty preview like it is almost launchable. Empty pages hide risk by looking clean.',
      sequence: buildSequence(
        `Use preview as proof that ${pageLabel} is still structurally blank.`,
        'Go back to edit mode and add the section that gives the page a job.',
        'Return to preview only once the page has a first real read.',
      ),
      primaryAction: {
        kind: 'switch-to-edit',
        label: 'Back to edit mode',
      },
    };
  }

  if (hasHardPublishBlocker) {
    return {
      badge: 'Preview before launch',
      heading: 'Use this preview pass to understand the blocker in guest terms',
      summary: 'The draft still has a launch blocker. Preview helps you feel the guest impact before you jump back into repair mode.',
      focusTitle: 'Spot the trust gap the blocker is creating for a guest.',
      focusDetail: 'This is the right moment to notice what still feels missing, vague, or unsupported from the guest side.',
      bestNextMove: 'Read the page once as a guest, then go fix the blocker directly instead of reopening broad polish work.',
      decisionRule: 'When launch is blocked, use preview to sharpen the repair target instead of treating preview as a finish line.',
      watchout: 'The risk here is confusing a nice-looking page with a trustworthy launch. If the blocker is real, fix it before you admire the draft.',
      sequence: buildSequence(
        'Read the page like a guest and notice where trust still thins out.',
        'Return to edit mode and fix the actual launch blocker.',
        'Preview again only after the blocker is repaired.',
      ),
      primaryAction: {
        kind: 'fix-blockers',
        label: 'Fix share blockers',
      },
    };
  }

  if (canAutoSaveBeforePublish || isDirty) {
    return {
      badge: 'Preview from a moving draft',
      heading: 'Save once so preview truth and launch truth stay aligned',
      summary: 'The guest read is helpful, but the draft is still moving. Stabilize it before you turn this into a publish decision.',
      focusTitle: 'Use what you learned in preview, then lock the draft.',
      focusDetail: 'Once the page feels coherent enough to judge, saving is what turns a good read into a trustworthy launch decision.',
      bestNextMove: 'Save the draft now, then decide whether to keep previewing or publish from the synchronized state.',
      decisionRule: 'When preview helped but the draft is still dirty, save before you make any launch call.',
      watchout: 'Do not treat preview from a stale draft like final launch proof. Unsaved edits quietly make every next decision less trustworthy.',
      sequence: buildSequence(
        'Finish this preview pass with one clear judgment about the page.',
        'Save the draft so preview and publish are speaking about the same state.',
        'Then either preview once more or publish calmly from the synchronized draft.',
      ),
      primaryAction: {
        kind: 'save-draft',
        label: 'Save this draft',
      },
    };
  }

  if (previewViewport !== 'mobile') {
    return {
      badge: 'Desktop first pass',
      heading: 'Use mobile as the final guest rehearsal before you share the site',
      summary: 'This preview is useful, but the last honest launch read still belongs on a phone-sized viewport.',
      focusTitle: 'Move the preview to mobile before you decide the page is ready.',
      focusDetail: 'Guests are most likely to feel friction on a phone, especially around spacing, order, and call-to-action clarity.',
      bestNextMove: 'Switch to mobile preview and do one last guest read there before you publish or update the shared site.',
      decisionRule: 'Desktop can confirm structure, but mobile is the final trust check.',
      watchout: 'A page that feels composed on desktop can still feel cramped, vague, or strangely ordered on a phone.',
      sequence: buildSequence(
        `Use ${previewViewport} preview to confirm the broad structure first.`,
        'Switch to mobile and read the page once like a guest on the go.',
        'Then publish only if the phone-sized read still feels calm and trustworthy.',
      ),
      primaryAction: {
        kind: 'switch-viewport',
        label: 'Switch to mobile',
        viewport: 'mobile',
      },
    };
  }

  return {
    badge: isPublished ? 'Shared update rehearsal' : 'Final guest rehearsal',
      heading: isPublished
        ? 'This mobile pass should tell you whether the next shared update earns its way in'
        : 'This mobile pass should be your last honest check before guests see the site',
    summary: isPublished
      ? 'The site is already shared, so preview is now about deciding whether this draft meaningfully improves the guest experience.'
      : 'The essentials are in place, so mobile preview is now the best final truth source before launch.',
    focusTitle: 'Judge the page by guest clarity, not by how much editing time you already spent.',
      focusDetail: isPublished
        ? 'Only push another shared-site update if the guest-facing read is materially clearer or calmer than what is already public.'
        : 'If the phone-sized read feels easy to trust, the next move is to publish from this draft instead of reopening a longer review loop.',
    bestNextMove: isPublished
      ? 'Compare this mobile read to the standard of your shared site, then publish only if the improvement is obvious.'
      : 'Finish this mobile preview pass and publish from this draft if nothing important is weakening guest trust.',
    decisionRule: isPublished
      ? 'When the shared site is already trustworthy, update only when the new draft clearly improves clarity or confidence.'
      : 'When mobile preview feels trustworthy, launch momentum should move toward publish, not another nervous edit lap.',
      watchout: isPublished
        ? 'Do not publish just because the draft exists. Shared-site updates should earn their way in by improving the guest path.'
        : 'The risk now is reopening the editor for low-value polish after preview already showed the page is steady enough to share.',
    sequence: buildSequence(
      'Read the page once on mobile as if you have never seen the editor.',
      isPublished
        ? 'Decide whether this draft is meaningfully better than what guests already have.'
        : 'Notice whether anything still weakens trust, pacing, or clarity.',
      isPublished
        ? 'Then publish the update only if it clearly earns the interruption.'
        : 'Then publish from this draft instead of letting one more review lap create churn.',
    ),
    primaryAction: {
      kind: 'publish',
      label: isPublished ? 'Publish this update' : 'Publish from preview',
    },
  };
}

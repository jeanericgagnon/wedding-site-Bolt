import type { TemplateSupportManifest } from '../builder/constants/templateSupportManifest';

export interface TemplateExperienceBrief {
  title: string;
  detail: string;
  confidenceLabel: string;
  confidenceDetail: string;
  bestNextStep: string;
  launchUse: string;
  bestFor: string;
  watchouts: string[];
  callouts: string[];
  launchSequence: Array<{
    id: 'fit' | 'preview' | 'publish';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
}

export function buildTemplateExperienceBrief(args: {
  name: string;
  recommended: boolean;
  selected: boolean;
  supportManifest: TemplateSupportManifest | null;
  compareCount: number;
}): TemplateExperienceBrief {
  const { name, recommended, selected, supportManifest, compareCount } = args;
  const previewStatus = supportManifest?.previewStatus ?? 'planned';
  const sectionsIncluded = supportManifest?.sectionsIncluded ?? 0;
  const modulesIncluded = supportManifest?.modulesIncluded ?? 0;

  if (selected) {
    return {
      title: `${name} is already carrying your setup`,
      detail: 'This design is already the one your setup draft is shaping around, so the next best move is refining it rather than restarting from scratch.',
      confidenceLabel: 'Selected',
      confidenceDetail: 'Your setup draft, first-pass content, and launch guidance are already leaning on this design.',
      bestNextStep: 'Keep this direction and focus on making the guest-facing sections feel real before swapping designs.',
      launchUse: 'Best when you want to keep momentum and make the current draft feel more trustworthy instead of starting over.',
      bestFor: 'Couples who already like the direction and want calmer progress instead of another restart.',
      watchouts: [],
      callouts: [
        `${sectionsIncluded} starter sections already mapped`,
        `${modulesIncluded} modules included in the first pass`,
      ],
      launchSequence: [
        {
          id: 'fit',
          status: 'current',
          title: 'Keep the fit steady',
          detail: 'This design is already the one your draft trusts, so protect that momentum first.',
        },
        {
          id: 'preview',
          status: 'next',
          title: 'Preview the guest-facing story',
          detail: 'Make sure travel, RSVP, and essentials read clearly before chasing extra polish.',
        },
        {
          id: 'publish',
          status: 'then',
          title: 'Publish once the essentials feel real',
          detail: 'Use launch confidence after the clarity pass so publishing feels calm instead of rushed.',
        },
      ],
    };
  }

  if (recommended) {
    return {
      title: `${name} is your strongest current fit`,
      detail: 'This design lines up best with the setup draft you have already started, so it should need less cleanup after the first draft loads.',
      confidenceLabel: previewStatus === 'verified' ? 'High confidence' : 'Good fit',
      confidenceDetail: previewStatus === 'verified'
        ? 'Its structure, starter sections, and builder behavior already line up well enough to trust as a first draft.'
        : 'The fit is strong, but it still wants one honest preview pass before you treat it as the lowest-risk launch path.',
      bestNextStep: previewStatus === 'verified'
        ? 'Use this as your starting point and spend the next pass on content clarity, not design churn.'
        : 'This fit is strong, but preview it once before you fully commit so the structure feels right.',
      launchUse: previewStatus === 'verified'
        ? 'Best when you want the lowest-friction path from setup to a guest-ready first draft.'
        : 'Best when the fit looks strong but you still want one structure check before committing.',
      bestFor: previewStatus === 'verified'
        ? 'Couples who want the easiest path from setup answers to a guest-ready first publish.'
        : 'Couples who have a strong favorite but still want one structure-confidence pass before committing.',
      watchouts: supportManifest?.templateExistsInBuilder
        ? []
        : ['Builder support for this design still needs a closer look before you treat it as the easiest launch path.'],
      callouts: [
        previewStatus === 'verified' ? 'Builder preview support is already verified.' : 'Support is still growing, but the recommendation fit is strong.',
        `${sectionsIncluded} starter sections · ${modulesIncluded} modules`,
      ],
      launchSequence: [
        {
          id: 'fit',
          status: 'current',
          title: 'Start from the strongest fit',
          detail: 'This recommendation should create the least structural cleanup after setup.',
        },
        {
          id: 'preview',
          status: 'next',
          title: previewStatus === 'verified' ? 'Preview for confidence, not doubt' : 'Do one structure check',
          detail: previewStatus === 'verified'
            ? 'Use one preview pass to confirm the guest story, then keep moving.'
            : 'Confirm that the section flow still feels right before you commit the draft.',
        },
        {
          id: 'publish',
          status: 'then',
          title: 'Polish content before design churn',
          detail: 'Once the fit is confirmed, spend the next pass on clarity, tone, and trust surfaces.',
        },
      ],
    };
  }

  return {
    title: compareCount > 0 ? `${name} is worth comparing on structure, not just style` : `${name} is viable if the visual direction feels right`,
    detail: compareCount > 0
      ? 'Use compare mode to see whether the section order and module shape actually match how you want the wedding weekend to read.'
      : 'This can still work well, but it is less likely to feel pre-aligned with the setup draft than the recommended options.',
    confidenceLabel: previewStatus === 'verified' ? 'Ready to preview' : 'Needs a closer look',
    confidenceDetail: previewStatus === 'verified'
      ? 'The builder support is solid enough to test honestly, but you still want to confirm the guest story before you commit.'
      : 'Treat this as promising, not proven. The style may be right even if the first-draft structure still needs more cleanup.',
    bestNextStep: compareCount > 0
      ? 'Use compare mode, then choose the option that needs the least structural cleanup after setup.'
      : 'Open the full detail view and make sure the section flow matches how you want guests to read the weekend.',
    launchUse: compareCount > 0
      ? 'Best when you are choosing between two visual directions and want the one that creates less cleanup later.'
      : 'Best when the style feels promising and you want to confirm the structure before it becomes your first draft.',
    bestFor: compareCount > 0
      ? 'Couples deciding between two strong moods who want the calmer operational path, not just the prettier card.'
      : 'Couples who already love the look and want one honest structure check before they commit.',
    watchouts: supportManifest?.templateExistsInBuilder
      ? []
      : ['This design may still need extra builder cleanup compared with the stronger recommended options.'],
    callouts: [
      `${sectionsIncluded} starter sections · ${modulesIncluded} modules`,
      supportManifest?.templateExistsInBuilder ? 'Builder pack is already mapped.' : 'Builder pack mapping still needs a closer look.',
    ],
    launchSequence: [
      {
        id: 'fit',
        status: 'current',
        title: compareCount > 0 ? 'Compare the structure honestly' : 'Treat the fit as provisional',
        detail: compareCount > 0
          ? 'Use compare mode to decide whether the guest story or section order needs less cleanup.'
          : 'This direction can still work, but it needs one closer look before it becomes the default draft.',
      },
      {
        id: 'preview',
        status: 'next',
        title: 'Preview the weekend flow',
        detail: 'Check whether the page order matches how you want guests to understand the event.',
      },
      {
        id: 'publish',
        status: 'then',
        title: 'Commit only after the structure settles',
        detail: 'Choose the option that reduces rework later, not just the one with the strongest mood first.',
      },
    ],
  };
}

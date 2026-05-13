export interface NameChangeOverviewCardModel {
  badgeLabel: string;
  headline: string;
  statusLabel: string;
  helperCopy: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  tertiaryHref: string;
  tertiaryLabel: string;
  plannerHref: string;
  plannerLabel: string;
  optionalNextStep: string;
}

export function buildNameChangeOverviewCardModel(input: {
  hasWorkspace: boolean;
  workflowStatus: 'draft' | 'ready' | 'in_progress' | 'complete' | null;
  hasExecutionActivity: boolean;
}): NameChangeOverviewCardModel {
  const base = '/dashboard/planning?tab=nameChange';

  if (!input.hasWorkspace) {
    return {
      badgeLabel: 'Ready when you are',
      headline: 'Start whenever you want, then come back whenever you need',
      statusLabel: 'Start free assistant',
      helperCopy: 'Keep the free assistant handy after the wedding so the California-guided state steps, the federal identity chain, and the downstream account updates stay easy to find whenever you want to resume.',
      primaryHref: `${base}#case-setup`,
      primaryLabel: 'Start case setup',
      secondaryHref: `${base}#name-change-roadmap`,
      secondaryLabel: 'See roadmap first',
      tertiaryHref: `${base}#name-change-roadmap`,
      tertiaryLabel: 'Browse full assistant',
      plannerHref: `${base}#name-change-roadmap`,
      plannerLabel: 'Open roadmap',
      optionalNextStep: 'Open case setup once, save the basics, and leave the rest for later if you are not ready to do the whole chain now.',
    };
  }

  if (input.workflowStatus === 'complete') {
    return {
      badgeLabel: 'Post-wedding',
      headline: 'Everything is saved. Reopen only when you need proof.',
      statusLabel: 'Status vault complete',
      helperCopy: 'Your status vault already has the California-guided state lane, the federal identity chain, and the downstream follow-through mapped, so you can reopen it anytime to confirm what landed and what still needs follow-through.',
      primaryHref: `${base}#target-status-tracking`,
      primaryLabel: 'Review status vault',
      secondaryHref: `${base}#name-change-roadmap`,
      secondaryLabel: 'Open full assistant',
      tertiaryHref: `${base}#case-setup`,
      tertiaryLabel: 'Edit saved details',
      plannerHref: `${base}#target-status-tracking`,
      plannerLabel: 'Open status vault',
      optionalNextStep: 'Nothing pushy here — just reopen the vault whenever you want a clean proof trail for the long-tail account cleanup.',
    };
  }

  if (input.hasExecutionActivity || input.workflowStatus === 'in_progress') {
    return {
      badgeLabel: 'Post-wedding',
      headline: 'Soft next steps, not a checklist you have to clear',
      statusLabel: 'Resume where you left off',
      helperCopy: 'You already started the name-change flow, so dayof brings you back to the saved California-guided state lane, federal identity chain, and downstream status view instead of making you hunt for your place again.',
      primaryHref: `${base}#target-status-tracking`,
      primaryLabel: 'Resume status vault',
      secondaryHref: `${base}#name-change-roadmap`,
      secondaryLabel: 'Open full assistant',
      tertiaryHref: `${base}#case-setup`,
      tertiaryLabel: 'Edit saved details',
      plannerHref: `${base}#target-status-tracking`,
      plannerLabel: 'Open status vault',
      optionalNextStep: 'Pick back up in the vault if you want progress and proof. If details changed, case setup is still one click away.',
    };
  }

  return {
    badgeLabel: 'Post-wedding',
    headline: 'Start whenever you want, then come back whenever you need',
    statusLabel: 'Roadmap saved',
    helperCopy: 'The roadmap is already there, including the California-guided state lane, the federal identity chain, and the downstream account follow-through, so you can come back without rebuilding the plan.',
    primaryHref: `${base}#name-change-roadmap`,
    primaryLabel: 'See roadmap first',
    secondaryHref: `${base}#case-setup`,
    secondaryLabel: 'Update case setup',
    tertiaryHref: `${base}#name-change-roadmap`,
    tertiaryLabel: 'Browse full assistant',
    plannerHref: `${base}#name-change-roadmap`,
    plannerLabel: 'Open roadmap',
    optionalNextStep: 'Skim the roadmap first if you just want the sequence. Jump into case setup only when you want to tighten the saved details.',
  };
}

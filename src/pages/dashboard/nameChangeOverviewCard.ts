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
      helperCopy: 'Keep the free assistant handy after the wedding so certificate, SSA, DMV, passport, payroll, tax, and downstream account updates stay easy to find whenever you want to resume.',
      primaryHref: `${base}#case-setup`,
      primaryLabel: 'Start case setup',
      secondaryHref: base,
      secondaryLabel: 'See roadmap first',
      tertiaryHref: `${base}#name-change-roadmap`,
      tertiaryLabel: 'Browse full assistant',
      plannerHref: `${base}#name-change-roadmap`,
      plannerLabel: 'Open name change planner',
      optionalNextStep: 'Open case setup once, save the basics, and leave the rest for later if you are not ready to do the whole chain now.',
    };
  }

  if (input.workflowStatus === 'complete') {
    return {
      badgeLabel: 'Post-wedding',
      headline: 'Everything is saved. Reopen only when you need proof.',
      statusLabel: 'Status vault complete',
      helperCopy: 'Your status vault already has the chain mapped, so you can reopen it anytime to confirm what landed and what still needs follow-through.',
      primaryHref: `${base}#target-status-tracking`,
      primaryLabel: 'Review status vault',
      secondaryHref: `${base}#name-change-roadmap`,
      secondaryLabel: 'See roadmap again',
      tertiaryHref: `${base}#name-change-roadmap`,
      tertiaryLabel: 'Open full assistant',
      plannerHref: `${base}#target-status-tracking`,
      plannerLabel: 'Open name change planner',
      optionalNextStep: 'Nothing pushy here — just reopen the vault whenever you want a clean proof trail for the long-tail account cleanup.',
    };
  }

  if (input.hasExecutionActivity || input.workflowStatus === 'in_progress') {
    return {
      badgeLabel: 'Post-wedding',
      headline: 'Soft next steps, not a checklist you have to clear',
      statusLabel: 'Resume where you left off',
      helperCopy: 'You already started the name-change flow, so the dashboard should bring you back to the status vault instead of making you hunt for your place again.',
      primaryHref: `${base}#target-status-tracking`,
      primaryLabel: 'Resume status vault',
      secondaryHref: `${base}#case-setup`,
      secondaryLabel: 'Update case setup',
      tertiaryHref: `${base}#name-change-roadmap`,
      tertiaryLabel: 'Open full assistant',
      plannerHref: `${base}#target-status-tracking`,
      plannerLabel: 'Open name change planner',
      optionalNextStep: 'Pick back up in the vault if you want progress and proof. If details changed, case setup is still one click away.',
    };
  }

  return {
    badgeLabel: 'Post-wedding',
    headline: 'Start whenever you want, then come back whenever you need',
    statusLabel: 'Roadmap saved',
    helperCopy: 'The roadmap is already there, even if you have not started checking steps off yet, so you can come back without rebuilding the plan.',
    primaryHref: `${base}#name-change-roadmap`,
    primaryLabel: 'See roadmap first',
    secondaryHref: `${base}#case-setup`,
    secondaryLabel: 'Update case setup',
    tertiaryHref: `${base}#name-change-roadmap`,
    tertiaryLabel: 'Browse full assistant',
    plannerHref: `${base}#name-change-roadmap`,
    plannerLabel: 'Open name change planner',
    optionalNextStep: 'Skim the roadmap first if you just want the sequence. Jump into case setup only when you want to tighten the saved details.',
  };
}

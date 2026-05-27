export interface NameChangeOverviewCardModel {
  badgeLabel: string;
  headline: string;
  statusLabel: string;
  helperCopy: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  sequence: Array<{
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
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
      focusTitle: 'Save the lane now so the future paperwork feels lighter',
      focusDetail: 'You do not need to do the whole chain today. The helpful move is opening the assistant once so the roadmap and saved case details are there when you want them.',
      bestNextMove: 'Open case setup once, save the basics, and let the roadmap hold the rest until the paperwork pressure becomes real.',
      decisionRule: 'Early setup beats future reconstruction: save the lane before you need the paperwork pressure to be real.',
      sequence: [
        {
          status: 'current',
          title: 'Save the lane once',
          detail: 'Open case setup and save the basics so the assistant can hold the chain for you later.',
        },
        {
          status: 'next',
          title: 'Use the roadmap to orient',
          detail: 'Skim the roadmap when you want the federal and downstream sequence without committing to the whole project.',
        },
        {
          status: 'then',
          title: 'Return only when paperwork pressure becomes real',
          detail: 'Come back to status tracking or case details when the certificate, SSA, DMV, or account updates actually matter.',
        },
      ],
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
      helperCopy: 'Your status vault already has the chain mapped, so you can reopen it anytime to confirm what landed and what still needs follow-through.',
      focusTitle: 'Treat the vault as proof storage, not a fresh project',
      focusDetail: 'The hard part is already organized. The value now is reopening the proof trail only when a late account, payroll system, or document check needs it.',
      bestNextMove: 'Open the status vault when you need proof, confirm the one late account or document question, then leave the rest of the chain at rest.',
      decisionRule: 'Once the chain is complete, only reopen for proof or cleanup that truly needs a documented answer.',
      sequence: [
        {
          status: 'current',
          title: 'Reopen the proof trail',
          detail: 'Start in the status vault so the saved receipts and downstream outcomes do the remembering for you.',
        },
        {
          status: 'next',
          title: 'Resolve the one late account or document question',
          detail: 'Handle the stray payroll, banking, passport, or record check that actually still needs attention.',
        },
        {
          status: 'then',
          title: 'Let the rest of the chain stay at rest',
          detail: 'Close the lane again once the proof question is answered instead of turning completion back into a project.',
        },
      ],
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
      helperCopy: 'You already started the name-change flow, so the dashboard should bring you back to the status vault instead of making you hunt for your place again.',
      focusTitle: 'Resume from proof, not from memory',
      focusDetail: 'The best next move is reopening the status vault where the chain already knows what changed, what is waiting, and what still needs proof.',
      bestNextMove: 'Resume in the status vault first, then only jump back to case setup if saved details actually changed.',
      decisionRule: 'If execution already started, pick back up from the saved proof trail instead of restarting the roadmap from scratch.',
      sequence: [
        {
          status: 'current',
          title: 'Resume in the status vault',
          detail: 'Let the saved milestones, proof, and reminder state tell you where the chain actually paused.',
        },
        {
          status: 'next',
          title: 'Repair details only if reality changed',
          detail: 'Open case setup only when names, addresses, dates, or document assumptions are now wrong.',
        },
        {
          status: 'then',
          title: 'Return to the roadmap only for broader sequencing',
          detail: 'Use the roadmap after the vault if you need to re-see the bigger dependency picture, not before.',
        },
      ],
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
    helperCopy: 'The roadmap is already there, even if you have not started checking steps off yet, so you can come back without rebuilding the plan.',
    focusTitle: 'Use the roadmap to orient, not to pressure yourself',
    focusDetail: 'This is the low-pressure state: the sequence is saved, the lane is real, and you can enter through the roadmap or case details whenever you are ready.',
    bestNextMove: 'Skim the roadmap first to reorient yourself, then open case setup only when you actually want to tighten the saved details.',
    decisionRule: 'When no execution has started yet, sequence clarity beats urgency.',
    sequence: [
      {
        status: 'current',
        title: 'Reorient in the roadmap',
        detail: 'Use the saved roadmap to remember the federal and downstream order without rebuilding the plan.',
      },
      {
        status: 'next',
        title: 'Tighten case setup only if you want better defaults',
        detail: 'Refine names, addresses, and document assumptions when you want the assistant to feel more tailored later.',
      },
      {
        status: 'then',
        title: 'Start execution when the paperwork window is real',
        detail: 'Move into status tracking only once the certificate, SSA, DMV, or related follow-through actually begins.',
      },
    ],
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

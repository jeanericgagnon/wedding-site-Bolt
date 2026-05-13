import type { NameChangeCaseInput, NameChangePlan, NameChangeReminderInput } from './types';

export type NameChangePlannerSupportLevel = 'guided' | 'expanded' | 'general';

export type NameChangeStatePlaybook = {
  id: string;
  matchedStateLabel: string;
  supportLevel: NameChangePlannerSupportLevel;
  supportLabel: string;
  summary: string;
  officeLabel: string;
  officeDetail: string;
  countyDetail: string;
  proofPacketDetail: string;
  downstreamDetail: string;
  partnerDetail: string;
  checklist: string[];
};

export type NameChangePlannerExport = {
  key: 'action-packet' | 'downstream-rollout' | 'status-ledger' | 'dual-partner-rollout';
  label: string;
  fileName: string;
  summary: string;
  text: string;
};

type StatePlaybookDefinition = Omit<NameChangeStatePlaybook, 'matchedStateLabel'> & {
  aliases: string[];
};

const STATE_PLAYBOOKS: StatePlaybookDefinition[] = [
  {
    id: 'california',
    aliases: ['california', 'ca'],
    supportLevel: 'guided',
    supportLabel: 'California-guided lane',
    summary: 'California remains the deepest guided resident-ID lane, so SSA, DMV, voter, payroll, tax, and downstream follow-through can stay on one cleaner identity chain.',
    officeLabel: 'California DMV + county certificate grounding',
    officeDetail: 'Keep the county clerk or recorder reference grounded before pushing SSA, then move the California DMV lane as soon as SSA is underway.',
    countyDetail: 'Use the exact issuing county, certificate reference, and clerk or recorder path so replacement certificates, DMV proof, and downstream packets all point to the same legal document.',
    proofPacketDetail: 'Carry the certified certificate, current photo ID, and any SSA receipt or confirmation that the downstream institution is willing to accept.',
    downstreamDetail: 'Banks, insurance, payroll, travel profiles, title or registration, and lifestyle accounts should all wait on the same California ID chain instead of improvising separate proof rules.',
    partnerDetail: 'If both partners are changing names, split SSA, DMV, and downstream confirmations by partner instead of marking the couple as one shared California-complete status.',
    checklist: [
      'Ground the county clerk or recorder reference before SSA starts.',
      'Queue the California DMV move as soon as SSA is genuinely in motion.',
      'Reuse the same certificate number and surname formatting everywhere downstream.',
    ],
  },
  {
    id: 'nevada',
    aliases: ['nevada', 'nv'],
    supportLevel: 'expanded',
    supportLabel: 'Expanded Nevada guidance',
    summary: 'Nevada marriages are common destination-wedding cases, so the planner should keep the certificate retrieval path and California follow-through from drifting apart.',
    officeLabel: 'Nevada county clerk certificate retrieval',
    officeDetail: 'Pin down the exact Nevada county clerk path, certificate number, and replacement timeline before leaning on the certificate for SSA or DMV proof.',
    countyDetail: 'Nevada county grounding matters because destination-wedding certificates often need a cleaner replacement or mailing plan before the rest of the chain can move with confidence.',
    proofPacketDetail: 'Keep the Nevada certified certificate, current photo ID, and the first accepted SSA or DMV proof together so downstream institutions do not question the marriage-jurisdiction mismatch.',
    downstreamDetail: 'Travel, hospitality, TSA, title or registration, and auto-policy follow-through should stay aligned with the same Nevada-certificate plus California-ID proof packet.',
    partnerDetail: 'Dual-partner Nevada cases should track which partner has the Nevada certificate copy, who cleared SSA first, and whose California or home-state ID proof is ready for rollover.',
    checklist: [
      'Confirm the exact Nevada county clerk replacement path first.',
      'Carry the Nevada certificate details into the SSA and state-ID packet notes.',
      'Keep travel and title updates tied to the same accepted proof set.',
    ],
  },
  {
    id: 'new-york',
    aliases: ['new york', 'ny', 'new york state'],
    supportLevel: 'expanded',
    supportLabel: 'Expanded New York guidance',
    summary: 'New York certificate handling and downstream proof requests can be picky, so the planner should keep document references unusually clean before the state-ID and banking lanes move.',
    officeLabel: 'New York local clerk or registrar certificate chain',
    officeDetail: 'Confirm the exact issuing clerk or registrar reference, because replacement timing and certificate copies often matter before downstream proof packets feel dependable.',
    countyDetail: 'Treat the city or county clerk reference as a first-class detail so later DMV, banking, and insurance packets do not have to guess which marriage record they are relying on.',
    proofPacketDetail: 'Carry the certified New York record, current photo ID, and the latest federal or state identity confirmation that the institution will actually accept.',
    downstreamDetail: 'Financial and insurance rollouts should stay bundled with the same New York certificate reference, especially when institutions ask for current ID plus a recent government touchpoint.',
    partnerDetail: 'Dual-partner New York cases should split proof packets, updated-ID timing, and downstream confirmation notes so one partner does not silently block the other.',
    checklist: [
      'Save the exact issuing clerk or registrar reference.',
      'Keep the New York certificate and the current photo-ID chain together.',
      'Track partner-specific proof timing if both names are changing.',
    ],
  },
  {
    id: 'texas',
    aliases: ['texas', 'tx'],
    supportLevel: 'expanded',
    supportLabel: 'Expanded Texas guidance',
    summary: 'Texas cases often create a bigger spread between certificate retrieval, DMV sequencing, and downstream account proof expectations, so the planner should keep that handoff explicit.',
    officeLabel: 'Texas county certificate reference plus home-state ID chain',
    officeDetail: 'Capture the issuing county clerk reference early, then treat the resident-ID lane as a separate proof hop that downstream institutions will often ask about.',
    countyDetail: 'The county record is the durable anchor for certified-proof replacement, especially when the wedding jurisdiction and the current resident-ID jurisdiction are not the same.',
    proofPacketDetail: 'Keep the Texas certified certificate, current photo ID, and the first accepted updated-ID evidence together before broad account rollout starts.',
    downstreamDetail: 'Payroll, tax, insurance, and title or registration updates should not fork into separate document rules once the Texas proof packet is accepted upstream.',
    partnerDetail: 'If both partners are changing names, split Texas certificate handling and home-state ID follow-through so each partner can move on their own timeline.',
    checklist: [
      'Save the Texas county clerk and certificate reference before SSA or DMV work starts.',
      'Treat resident-ID proof as a separate hop that needs its own status.',
      'Keep payroll, tax, and title follow-through on the same accepted proof packet.',
    ],
  },
  {
    id: 'florida',
    aliases: ['florida', 'fl'],
    supportLevel: 'expanded',
    supportLabel: 'Expanded Florida guidance',
    summary: 'Florida certificate and travel-heavy follow-through can create lots of edge cases, so the planner should keep marriage proof, resident ID, and travel identity moving as one packet.',
    officeLabel: 'Florida county clerk certificate path',
    officeDetail: 'Ground the issuing county clerk and certified-copy path before relying on the marriage certificate for SSA, state ID, travel, or financial updates.',
    countyDetail: 'Florida destination or resort-area ceremonies especially benefit from a clearly saved county reference so replacement or mailing delays do not derail the rest of the chain.',
    proofPacketDetail: 'Carry the Florida certified certificate, current photo ID, and the most recent accepted government touchpoint for travel-facing and financial institutions.',
    downstreamDetail: 'Travel profiles, hospitality accounts, TSA, banks, and insurance updates should stay attached to the same Florida certificate plus updated-ID proof set.',
    partnerDetail: 'Dual-partner Florida cases should explicitly track who has a travel deadline, whose ID path is farther along, and whose downstream institutions can move now.',
    checklist: [
      'Ground the Florida county clerk path early.',
      'Keep travel-facing updates tied to the same accepted proof packet.',
      'Break apart partner timelines if one person has sooner travel or ID pressure.',
    ],
  },
  {
    id: 'washington',
    aliases: ['washington', 'wa', 'washington state'],
    supportLevel: 'expanded',
    supportLabel: 'Expanded Washington guidance',
    summary: 'Washington proof packets benefit from clean county grounding and a clear handoff into resident-ID, travel, and financial follow-through.',
    officeLabel: 'Washington county auditor or recorder certificate path',
    officeDetail: 'Lock down the issuing county reference and replacement path so the certified record does not become the weak point in the rest of the identity chain.',
    countyDetail: 'Washington county detail matters because certificate sourcing, mailing, and replacement timing often become the first real blocker before the rest of the workflow can move smoothly.',
    proofPacketDetail: 'Carry the Washington certified record, current photo ID, and the first accepted updated-ID proof that downstream teams are actually willing to use.',
    downstreamDetail: 'Insurance, financial, payroll, and travel rollouts should all point back to the same Washington certificate and updated-ID packet.',
    partnerDetail: 'Dual-partner Washington cases should split updated-ID timing, downstream bank or insurance confirmations, and travel-proof deadlines so the workflow stays clean.',
    checklist: [
      'Ground the county auditor or recorder details first.',
      'Reuse the same certificate and ID packet across downstream lanes.',
      'Track separate partner follow-through once updated-ID timing diverges.',
    ],
  },
];

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
}

function formatExecutionStatusLabel(value: string | null | undefined) {
  return (value ?? 'todo').replace(/_/gu, ' ');
}

function formatSupportLabel(level: NameChangePlannerSupportLevel) {
  if (level === 'guided') return 'Guided';
  if (level === 'expanded') return 'Expanded';
  return 'General';
}

export function resolveNameChangeStatePlaybook(
  draft: Pick<NameChangeCaseInput, 'launch_state' | 'marriage_state'>,
): NameChangeStatePlaybook {
  const normalizedMarriageState = normalize(draft.marriage_state);
  const matched = STATE_PLAYBOOKS.find((playbook) => playbook.aliases.includes(normalizedMarriageState));
  if (matched) {
    return {
      ...matched,
      matchedStateLabel: toTitleCase(draft.marriage_state ?? matched.id),
    };
  }

  if (normalizedMarriageState.length > 0) {
    const matchedStateLabel = toTitleCase(draft.marriage_state ?? 'Current jurisdiction');
    return {
      id: 'generic',
      matchedStateLabel,
      supportLevel: 'general',
      supportLabel: 'General jurisdiction guidance',
      summary: `${matchedStateLabel} is not one of the deepest prebuilt playbooks yet, so the planner keeps the resident-ID chain honest while asking you to ground the exact county or issuing-office path before broad rollout starts.`,
      officeLabel: `${matchedStateLabel} issuing office`,
      officeDetail: `Confirm the exact ${matchedStateLabel} issuing office, replacement path, and certified-copy timing before assuming downstream institutions will accept the certificate without follow-up.`,
      countyDetail: `Save the exact ${matchedStateLabel} county, city, or clerk reference so certificate replacement, DMV proof, passport timing, and downstream packets do not rely on memory.`,
      proofPacketDetail: `Carry the certified ${matchedStateLabel} proof, the current photo ID, and the first accepted SSA, DMV, or passport confirmation that each downstream institution is actually willing to use.`,
      downstreamDetail: `Keep payroll, financial, insurance, travel, and lifestyle updates attached to the same ${matchedStateLabel} proof packet instead of letting each lane invent its own document story.`,
      partnerDetail: `If both partners are changing names, split the ${matchedStateLabel} proof notes, updated-ID timing, and downstream confirmations per partner so one status does not hide the other.`,
      checklist: [
        `Ground the ${matchedStateLabel} issuing office before the resident-ID chain moves.`,
        'Carry the same certified proof and updated-ID story across every downstream lane.',
        'Split partner-specific proof timing if both names are changing.',
      ],
    };
  }

  const defaultPlaybook = STATE_PLAYBOOKS.find((playbook) => playbook.id === draft.launch_state) ?? STATE_PLAYBOOKS[0];
  return {
    ...defaultPlaybook,
    matchedStateLabel: toTitleCase(defaultPlaybook.id),
  };
}

function buildCaseHeader(draft: NameChangeCaseInput) {
  const currentName = [draft.current_first_name, draft.current_middle_name, draft.current_last_name].filter(Boolean).join(' ');
  const targetName = [draft.target_first_name, draft.target_middle_name, draft.target_last_name].filter(Boolean).join(' ');
  return [
    `Current name: ${currentName}`,
    `Target name: ${targetName}`,
    `Legal basis: ${draft.legal_basis}`,
    `Marriage jurisdiction: ${draft.marriage_state || 'Not saved yet'}`,
    `County or issuing county: ${draft.county_residence || 'Not saved yet'}`,
    `Urgency: ${draft.urgency_level}`,
  ];
}

export function buildNameChangePlannerExports(args: {
  draft: NameChangeCaseInput;
  plan: NameChangePlan;
  reminders: NameChangeReminderInput[];
  statePlaybook?: NameChangeStatePlaybook;
}): NameChangePlannerExport[] {
  const { draft, plan, reminders } = args;
  const statePlaybook = args.statePlaybook ?? resolveNameChangeStatePlaybook(draft);
  const openReminders = reminders.filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled');
  const institutionCategories = plan.summary.institutionCategoryCoverage ?? [];
  const actionItems = (plan.summary.accountUpdateTemplates ?? []).slice(0, 5);
  const milestoneItems = (plan.summary.milestoneChecklist ?? []).slice(0, 6);
  const executionSteps = plan.steps.filter((step) => step.phase !== 'eligibility');
  const dualPartnerTracks = plan.summary.dualPartnerProofTracks ?? [];
  const caseHeader = buildCaseHeader(draft);
  const supportLabel = formatSupportLabel(statePlaybook.supportLevel);

  const actionPacket = [
    'Day of Love name-change action packet',
    '',
    ...caseHeader,
    '',
    `State playbook: ${statePlaybook.matchedStateLabel} (${supportLabel})`,
    statePlaybook.summary,
    `Office path: ${statePlaybook.officeLabel}`,
    statePlaybook.officeDetail,
    `County detail: ${statePlaybook.countyDetail}`,
    `Proof packet: ${statePlaybook.proofPacketDetail}`,
    `Downstream note: ${statePlaybook.downstreamDetail}`,
    `Partner note: ${statePlaybook.partnerDetail}`,
    '',
    'Next actions:',
    ...actionItems.map((template) => `- ${template.audience}: ${template.readinessLabel}. ${template.requestSummary}`),
    '',
    'Milestones:',
    ...milestoneItems.map((milestone) => `- ${milestone.label}: ${formatExecutionStatusLabel(milestone.status)}`),
    '',
    'Reminder follow-through:',
    ...(openReminders.length > 0
      ? openReminders.slice(0, 6).map((reminder) => `- ${reminder.label}: ${reminder.reason}`)
      : ['- No open reminders right now.']),
  ].join('\n');

  const downstreamRollout = [
    'Day of Love downstream identity rollout packet',
    '',
    ...caseHeader,
    '',
    'Institution coverage:',
    ...institutionCategories.map((category) => `- ${category.label}: ${formatExecutionStatusLabel(category.status)}. ${category.targetCount} targets queued. ${category.summary}`),
    '',
    'Template follow-through:',
    ...(plan.summary.accountUpdateTemplates ?? []).map((template) => `- ${template.audience}: ${template.readinessLabel}. Proof to have handy: ${template.proofDocuments.join(' · ') || 'none saved yet'}`),
    '',
    `Resident-ID note: ${statePlaybook.downstreamDetail}`,
  ].join('\n');

  const statusLedger = [
    'Day of Love name-change status ledger',
    '',
    ...caseHeader,
    '',
    'Execution ledger:',
    ...executionSteps.map((step) => `- ${step.title}: planner ${formatExecutionStatusLabel(step.status)} · execution ${formatExecutionStatusLabel(step.executionStatus)}${step.executionNote ? ` · note: ${step.executionNote}` : ''}`),
    '',
    'Coverage lanes:',
    ...institutionCategories.map((category) => `- ${category.label}: ${formatExecutionStatusLabel(category.status)} · ${category.targetCount} targets`),
    '',
    `Overall next best action: ${plan.summary.nextBestAction}`,
  ].join('\n');

  const exports: NameChangePlannerExport[] = [
    {
      key: 'action-packet',
      label: 'Action packet',
      fileName: 'dayof-name-change-action-packet.txt',
      summary: 'Carry the current case, state playbook, next asks, and reminders into a real-world work session.',
      text: actionPacket,
    },
    {
      key: 'downstream-rollout',
      label: 'Downstream rollout',
      fileName: 'dayof-name-change-downstream-rollout.txt',
      summary: 'See institution coverage, proof expectations, and template follow-through in one place.',
      text: downstreamRollout,
    },
    {
      key: 'status-ledger',
      label: 'Status ledger',
      fileName: 'dayof-name-change-status-ledger.txt',
      summary: 'Hand off the execution ledger without losing what is ready, blocked, or already moving.',
      text: statusLedger,
    },
  ];

  if (Boolean(draft.structured_intake.bothPartnersChangeName) || dualPartnerTracks.length > 0) {
    exports.push({
      key: 'dual-partner-rollout',
      label: 'Dual-partner rollout',
      fileName: 'dayof-name-change-dual-partner-rollout.txt',
      summary: 'Split partner-specific proof, ID, and downstream rollout checkpoints cleanly.',
      text: [
        'Day of Love dual-partner name-change rollout',
        '',
        ...caseHeader,
        '',
        `Partner note: ${statePlaybook.partnerDetail}`,
        '',
        'Partner-specific tracks:',
        ...dualPartnerTracks.map((track) => `- ${track.label}: ${formatExecutionStatusLabel(track.status)} · proof ${track.requiredProof.join(' · ')}`),
        '',
        'Shared rule:',
        'Keep SSA, updated-ID, and downstream confirmations separated per partner so one person can keep moving even when the other partner is waiting on a different proof hop.',
      ].join('\n'),
    });
  }

  return exports;
}

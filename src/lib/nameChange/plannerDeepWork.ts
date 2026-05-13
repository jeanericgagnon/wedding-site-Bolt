import { NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import type { NameChangeCaseInput, NameChangePlan, NameChangeReminderInput } from './types';

type AccountUpdateTemplate = NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number];

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

export type NameChangePlannerInstitutionPacket = {
  key: string;
  label: string;
  summary: string;
  readiness: 'ready' | 'blocked' | 'upcoming' | 'in_progress' | 'complete';
  proofDocuments: string[];
  institutionLabels: string[];
  dependsOnStepIds: string[];
  completionCheck: string;
  fileName: string;
  text: string;
};

export type NameChangePlannerExport = {
  key:
    | 'action-packet'
    | 'downstream-rollout'
    | 'status-ledger'
    | 'proof-gap-packet'
    | 'institution-handoff-brief'
    | 'dual-partner-rollout';
  label: string;
  fileName: string;
  summary: string;
  text: string;
};

type StatePlaybookDefinition = Omit<NameChangeStatePlaybook, 'matchedStateLabel'> & {
  aliases: string[];
  displayLabel: string;
};

type StatePlaybookSeed = {
  id: string;
  label: string;
  abbreviation: string;
  aliases?: string[];
};

type InstitutionPacketConfig = {
  key: string;
  label: string;
  summary: string;
  sequencingNote: string;
  completionCheck: string;
  templateIds: string[];
  institutionKeys: string[];
};

const CUSTOM_STATE_PLAYBOOKS: StatePlaybookDefinition[] = [
  {
    id: 'california',
    displayLabel: 'California',
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
    displayLabel: 'Nevada',
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
    displayLabel: 'New York',
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
    displayLabel: 'Texas',
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
    displayLabel: 'Florida',
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
    displayLabel: 'Washington',
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

const ALL_STATE_PLAYBOOK_SEEDS: StatePlaybookSeed[] = [
  { id: 'alabama', label: 'Alabama', abbreviation: 'AL' },
  { id: 'alaska', label: 'Alaska', abbreviation: 'AK' },
  { id: 'arizona', label: 'Arizona', abbreviation: 'AZ' },
  { id: 'arkansas', label: 'Arkansas', abbreviation: 'AR' },
  { id: 'california', label: 'California', abbreviation: 'CA' },
  { id: 'colorado', label: 'Colorado', abbreviation: 'CO' },
  { id: 'connecticut', label: 'Connecticut', abbreviation: 'CT' },
  { id: 'delaware', label: 'Delaware', abbreviation: 'DE' },
  { id: 'district-of-columbia', label: 'District of Columbia', abbreviation: 'DC', aliases: ['district of columbia', 'dc', 'washington dc', 'washington d.c.'] },
  { id: 'florida', label: 'Florida', abbreviation: 'FL' },
  { id: 'georgia', label: 'Georgia', abbreviation: 'GA' },
  { id: 'hawaii', label: 'Hawaii', abbreviation: 'HI' },
  { id: 'idaho', label: 'Idaho', abbreviation: 'ID' },
  { id: 'illinois', label: 'Illinois', abbreviation: 'IL' },
  { id: 'indiana', label: 'Indiana', abbreviation: 'IN' },
  { id: 'iowa', label: 'Iowa', abbreviation: 'IA' },
  { id: 'kansas', label: 'Kansas', abbreviation: 'KS' },
  { id: 'kentucky', label: 'Kentucky', abbreviation: 'KY' },
  { id: 'louisiana', label: 'Louisiana', abbreviation: 'LA' },
  { id: 'maine', label: 'Maine', abbreviation: 'ME' },
  { id: 'maryland', label: 'Maryland', abbreviation: 'MD' },
  { id: 'massachusetts', label: 'Massachusetts', abbreviation: 'MA' },
  { id: 'michigan', label: 'Michigan', abbreviation: 'MI' },
  { id: 'minnesota', label: 'Minnesota', abbreviation: 'MN' },
  { id: 'mississippi', label: 'Mississippi', abbreviation: 'MS' },
  { id: 'missouri', label: 'Missouri', abbreviation: 'MO' },
  { id: 'montana', label: 'Montana', abbreviation: 'MT' },
  { id: 'nebraska', label: 'Nebraska', abbreviation: 'NE' },
  { id: 'nevada', label: 'Nevada', abbreviation: 'NV' },
  { id: 'new-hampshire', label: 'New Hampshire', abbreviation: 'NH' },
  { id: 'new-jersey', label: 'New Jersey', abbreviation: 'NJ' },
  { id: 'new-mexico', label: 'New Mexico', abbreviation: 'NM' },
  { id: 'new-york', label: 'New York', abbreviation: 'NY' },
  { id: 'north-carolina', label: 'North Carolina', abbreviation: 'NC' },
  { id: 'north-dakota', label: 'North Dakota', abbreviation: 'ND' },
  { id: 'ohio', label: 'Ohio', abbreviation: 'OH' },
  { id: 'oklahoma', label: 'Oklahoma', abbreviation: 'OK' },
  { id: 'oregon', label: 'Oregon', abbreviation: 'OR' },
  { id: 'pennsylvania', label: 'Pennsylvania', abbreviation: 'PA' },
  { id: 'rhode-island', label: 'Rhode Island', abbreviation: 'RI' },
  { id: 'south-carolina', label: 'South Carolina', abbreviation: 'SC' },
  { id: 'south-dakota', label: 'South Dakota', abbreviation: 'SD' },
  { id: 'tennessee', label: 'Tennessee', abbreviation: 'TN' },
  { id: 'texas', label: 'Texas', abbreviation: 'TX' },
  { id: 'utah', label: 'Utah', abbreviation: 'UT' },
  { id: 'vermont', label: 'Vermont', abbreviation: 'VT' },
  { id: 'virginia', label: 'Virginia', abbreviation: 'VA' },
  { id: 'washington', label: 'Washington', abbreviation: 'WA' },
  { id: 'west-virginia', label: 'West Virginia', abbreviation: 'WV' },
  { id: 'wisconsin', label: 'Wisconsin', abbreviation: 'WI' },
  { id: 'wyoming', label: 'Wyoming', abbreviation: 'WY' },
];

const INSTITUTION_PACKET_CONFIGS: InstitutionPacketConfig[] = [
  {
    key: 'government-records-packet',
    label: 'Government and tax packet',
    summary: 'Carry one clean proof packet through SSA-adjacent tax, county, and immigration-facing records.',
    sequencingNote: 'This packet should follow the legal-proof and SSA chain before you assume tax, county, or immigration records are safe to update.',
    completionCheck: 'Done means tax, county, and government-facing records all point at the same legal name and no agency is still waiting on a different proof hop.',
    templateIds: ['template-tax'],
    institutionKeys: ['uscis-immigration-records', 'irs-records', 'state-tax-agency', 'county-recorder-property'],
  },
  {
    key: 'banking-credit-packet',
    label: 'Banking and credit packet',
    summary: 'Keep banks, cards, loans, property records, and credit monitoring on one current-ID proof chain.',
    sequencingNote: 'This packet should wait for the photo-ID hop so cards, statements, mortgage/property records, and lender checks do not split across names.',
    completionCheck: 'Done means cards, statements, loan portals, mortgage/property records, and any credit-monitoring follow-through all show the same final legal name.',
    templateIds: ['template-bank'],
    institutionKeys: ['banks', 'investments-loans', 'student-loans-financial-aid', 'mortgage-property-records', 'credit-bureaus'],
  },
  {
    key: 'work-benefits-packet',
    label: 'Work and benefits packet',
    summary: 'Bundle payroll, retirement, disability, leave, and board-facing work records into one execution packet.',
    sequencingNote: 'This packet should follow SSA and then the current-ID lane so payroll, benefits, and licensing boards are all working from the same proof story.',
    completionCheck: 'Done means payroll, benefits, retirement, disability, leave, and any professional license records all show the final legal name without one system lagging behind the others.',
    templateIds: ['template-payroll', 'template-licenses'],
    institutionKeys: ['irs-employer', 'retirement-benefits', 'disability-insurance', 'workers-comp-leave', 'professional-licenses'],
  },
  {
    key: 'coverage-care-packet',
    label: 'Coverage and care packet',
    summary: 'Keep insurance cards, claims systems, and medical portals aligned before the next visit or claim.',
    sequencingNote: 'This packet should move once the legal-proof chain and updated-ID evidence are stable enough for carrier verification.',
    completionCheck: 'Done means cards, billing, claims, dependents, beneficiary settings, and patient-portal records all reflect the same final legal name.',
    templateIds: ['template-insurance'],
    institutionKeys: ['insurance', 'medical-records'],
  },
  {
    key: 'home-digital-packet',
    label: 'Home and digital packet',
    summary: 'Carry the same identity packet through utilities, phone, housing, alumni, and primary digital identity cleanup.',
    sequencingNote: 'This packet usually follows the current-ID hop so verification, billing, recovery, and contact details all update from the same proof set.',
    completionCheck: 'Done means utility, phone, housing, alumni, profile, display-name, and recovery records all match the final legal name everywhere they still matter.',
    templateIds: ['template-digital-identity'],
    institutionKeys: ['utilities-housing', 'phone-digital-identity', 'subscriptions-social', 'school-alumni-records', 'courtesy-social-sync'],
  },
  {
    key: 'travel-mobility-packet',
    label: 'Travel and mobility packet',
    summary: 'Keep passport-adjacent travel profiles, title records, registration, and auto-policy updates on one travel-safe chain.',
    sequencingNote: 'This packet should follow the passport or travel-safe ID timing so bookings, TSA, title, and auto-policy records do not get stranded between names.',
    completionCheck: 'Done means traveler profiles, loyalty programs, registration/title files, auto policies, and live bookings all match the same final travel identity.',
    templateIds: ['template-travel'],
    institutionKeys: ['tsa-precheck', 'travel-hospitality', 'dmv-registration-title', 'frequent-flyer-hotel-rail'],
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

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => (value ?? '').trim()).filter(Boolean))];
}

function buildExpandedStatePlaybook(seed: StatePlaybookSeed): StatePlaybookDefinition {
  const aliases = uniqueStrings([
    seed.id.replace(/-/gu, ' '),
    seed.label,
    seed.abbreviation,
    ...(seed.aliases ?? []),
  ]).map((value) => normalize(value));
  const stateLabel = seed.label;

  return {
    id: seed.id,
    displayLabel: stateLabel,
    aliases,
    supportLevel: 'expanded',
    supportLabel: `Expanded ${stateLabel} guidance`,
    summary: `${stateLabel} now has an explicit operational playbook so certificate retrieval, resident-ID sequencing, and downstream packet prep can stay on one honest chain instead of falling back to a generic note.`,
    officeLabel: `${stateLabel} issuing-county and resident-ID handoff`,
    officeDetail: `Ground the exact ${stateLabel} issuing county, clerk, recorder, vital-records, or court path before assuming the resident-ID and downstream account lanes can safely reuse the certificate without extra follow-up.`,
    countyDetail: `Save the exact ${stateLabel} county, office, certificate reference, and replacement path so DMV, passport, payroll, banking, and insurance packets all point back to the same legal record.`,
    proofPacketDetail: `Carry the certified ${stateLabel} proof, the current photo ID, and the latest accepted SSA, DMV, or passport confirmation that downstream institutions are actually willing to accept.`,
    downstreamDetail: `Keep payroll, banking, insurance, travel, title or registration, and personal-account updates tied to the same ${stateLabel} proof packet so each lane does not invent its own document story.`,
    partnerDetail: `If both partners are changing names, split ${stateLabel} proof timing, updated-ID readiness, and downstream confirmations per partner so one status never hides the other.`,
    checklist: [
      `Ground the exact ${stateLabel} issuing county and replacement path before broad rollout starts.`,
      `Carry the same ${stateLabel} certificate reference into SSA, resident-ID, and downstream packet notes.`,
      'Keep partner-specific proof timing separate if both names are changing.',
    ],
  };
}

const CUSTOM_STATE_PLAYBOOK_IDS = new Set(CUSTOM_STATE_PLAYBOOKS.map((playbook) => playbook.id));

const STATE_PLAYBOOKS: StatePlaybookDefinition[] = [
  ...CUSTOM_STATE_PLAYBOOKS,
  ...ALL_STATE_PLAYBOOK_SEEDS
    .filter((seed) => !CUSTOM_STATE_PLAYBOOK_IDS.has(seed.id))
    .map((seed) => buildExpandedStatePlaybook(seed)),
];

export function resolveNameChangeStatePlaybook(
  draft: Pick<NameChangeCaseInput, 'launch_state' | 'marriage_state'>,
): NameChangeStatePlaybook {
  const normalizedMarriageState = normalize(draft.marriage_state);
  const matched = STATE_PLAYBOOKS.find((playbook) => playbook.aliases.includes(normalizedMarriageState));
  if (matched) {
    return {
      ...matched,
      matchedStateLabel: matched.displayLabel,
    };
  }

  if (normalizedMarriageState.length > 0) {
    const matchedStateLabel = toTitleCase(draft.marriage_state ?? 'Current jurisdiction');
    return {
      id: 'generic',
      matchedStateLabel,
      supportLevel: 'general',
      supportLabel: 'General jurisdiction guidance',
      summary: `${matchedStateLabel} is not one of the recognized state or D.C. playbooks yet, so the planner keeps the resident-ID chain honest while asking you to ground the exact county or issuing-office path before broad rollout starts.`,
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
    matchedStateLabel: defaultPlaybook.displayLabel,
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

function resolvePacketReadiness(values: Array<NameChangePlannerInstitutionPacket['readiness'] | AccountUpdateTemplate['readiness']>) {
  if (values.length === 0) return 'upcoming' as const;
  if (values.every((value) => value === 'complete')) return 'complete' as const;
  if (values.some((value) => value === 'in_progress')) return 'in_progress' as const;
  if (values.some((value) => value === 'ready')) return 'ready' as const;
  if (values.some((value) => value === 'blocked')) return 'blocked' as const;
  return 'upcoming' as const;
}

export function buildNameChangeInstitutionPackets(args: {
  draft: NameChangeCaseInput;
  plan: NameChangePlan;
  statePlaybook?: NameChangeStatePlaybook;
}): NameChangePlannerInstitutionPacket[] {
  const { draft, plan } = args;
  const statePlaybook = args.statePlaybook ?? resolveNameChangeStatePlaybook(draft);
  const templatesById = new Map((plan.summary.accountUpdateTemplates ?? []).map((template) => [template.id, template]));
  const caseHeader = buildCaseHeader(draft);

  return INSTITUTION_PACKET_CONFIGS.map((config) => {
    const templates = config.templateIds
      .map((templateId) => templatesById.get(templateId))
      .filter((template): template is AccountUpdateTemplate => Boolean(template));
    if (templates.length === 0) return null;

    const institutionLabels = config.institutionKeys
      .filter((institutionKey) => plan.steps.some((step) => step.id === `institution-${institutionKey}`))
      .map((institutionKey) => NAME_CHANGE_INSTITUTION_LIBRARY.find((institution) => institution.key === institutionKey)?.label ?? institutionKey)
      .filter(Boolean);
    const proofDocuments = uniqueStrings(templates.flatMap((template) => template.proofDocuments));
    const dependsOnStepIds = uniqueStrings(templates.flatMap((template) => template.dependsOnStepIds));
    const readiness = resolvePacketReadiness(templates.map((template) => template.readiness));
    const text = [
      `Day of Love ${config.label.toLowerCase()}`,
      '',
      ...caseHeader,
      '',
      `State note: ${statePlaybook.downstreamDetail}`,
      `Cluster sequencing: ${config.sequencingNote}`,
      '',
      'Included institutions:',
      ...(institutionLabels.length > 0
        ? institutionLabels.map((label) => `- ${label}`)
        : ['- No matching institutions are active in this case yet.']),
      '',
      'Template posture:',
      ...templates.map((template) => `- ${template.audience}: ${template.readinessLabel}`),
      '',
      'Proof to have ready:',
      ...(proofDocuments.length > 0
        ? proofDocuments.map((document) => `- ${document}`)
        : ['- No proof packet saved yet.']),
      '',
      `Completion check: ${config.completionCheck}`,
    ].join('\n');

    return {
      key: config.key,
      label: config.label,
      summary: config.summary,
      readiness,
      proofDocuments,
      institutionLabels,
      dependsOnStepIds,
      completionCheck: config.completionCheck,
      fileName: `dayof-name-change-${config.key}.txt`,
      text,
    };
  }).filter((packet): packet is NameChangePlannerInstitutionPacket => Boolean(packet));
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
  const institutionPackets = buildNameChangeInstitutionPackets({ draft, plan, statePlaybook });
  const warningEdgeCases = (plan.summary.edgeCaseGuidance ?? []).filter((item) => item.severity === 'warning');
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

  const proofGapPacket = [
    'Day of Love proof gap packet',
    '',
    ...caseHeader,
    '',
    'Missing inputs and proof gaps:',
    ...(plan.summary.missingInputs.length > 0
      ? plan.summary.missingInputs.map((item) => `- ${item}`)
      : ['- No missing inputs are saved right now.']),
    '',
    'Worth checking:',
    ...(warningEdgeCases.length > 0
      ? warningEdgeCases.map((item) => `- ${item.label}: ${item.detail}`)
      : ['- No warning-level edge cases are open right now.']),
    '',
    'Open reminders:',
    ...(openReminders.length > 0
      ? openReminders.map((reminder) => `- ${reminder.label}: ${reminder.reason}`)
      : ['- No open reminders are waiting right now.']),
  ].join('\n');

  const institutionHandoffBrief = [
    'Day of Love institution handoff brief',
    '',
    ...caseHeader,
    '',
    'Institution packets:',
    ...institutionPackets.map((packet) => `- ${packet.label}: ${formatExecutionStatusLabel(packet.readiness)} · ${packet.summary}`),
    '',
    'Completion checks:',
    ...institutionPackets.map((packet) => `- ${packet.label}: ${packet.completionCheck}`),
    '',
    `Resident-ID note: ${statePlaybook.downstreamDetail}`,
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
    {
      key: 'proof-gap-packet',
      label: 'Proof gap packet',
      fileName: 'dayof-name-change-proof-gap-packet.txt',
      summary: 'Carry the missing-input list, warning edge cases, and reminder pressure into a repair session.',
      text: proofGapPacket,
    },
    {
      key: 'institution-handoff-brief',
      label: 'Institution handoff brief',
      fileName: 'dayof-name-change-institution-handoff-brief.txt',
      summary: 'Summarize the cluster packets, completion checks, and resident-ID note for a real-world handoff.',
      text: institutionHandoffBrief,
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

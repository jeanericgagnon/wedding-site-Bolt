export type RsvpAccessModeId = 'private_link' | 'name_lookup' | 'unique_code' | 'password' | 'open';
export type SupportedRsvpAccessModeId = 'private_link' | 'name_lookup';

export interface PersistedRsvpAccessSelection {
  primaryMode: SupportedRsvpAccessModeId;
  allowNameLookupBackup: boolean;
}

export interface RsvpAccessModePlanInput {
  guestCount: number;
  inviteTokenCount: number;
  householdCount?: number;
  eventCount?: number;
  emailCount?: number;
  phoneCount?: number;
}

export interface RsvpAccessModePlan {
  id: RsvpAccessModeId;
  label: string;
  detail: string;
  tradeoff: string;
  status: 'recommended' | 'ready' | 'needs-setup' | 'future';
  selected?: boolean;
}

export type RsvpQuestionTemplateKey = 'dietary' | 'song' | 'shuttle' | 'lodging' | 'childcare' | 'plus_one_note' | 'event_attendance';

export interface RsvpQuestionTemplate {
  key: RsvpQuestionTemplateKey;
  label: string;
  type: 'short_text' | 'long_text' | 'single_choice' | 'multi_choice';
  required: boolean;
  appliesTo: 'all' | 'ceremony' | 'reception';
  options?: string[];
}

export interface RsvpQuestionLike {
  label: string;
  type?: RsvpQuestionTemplate['type'];
  options?: string[];
}

export interface RsvpQuestionTemplateCoverageItem {
  key: RsvpQuestionTemplateKey;
  label: string;
  added: boolean;
}

export interface RsvpSetupChecklistItem {
  id: 'private_links' | 'name_lookup_backup' | 'household_scope' | 'verification_inputs' | 'question_templates' | 'meal_choices' | 'future_access_modes';
  label: string;
  detail: string;
  status: 'ready' | 'needs-setup' | 'planned';
}

export interface RsvpRecoveryVerificationReadiness {
  detail: string;
  blockers: string[];
  status: 'ready' | 'needs-setup';
  supportLabel: string;
}

export interface RsvpSetupChecklistInput extends RsvpAccessModePlanInput {
  questions?: RsvpQuestionLike[];
  mealEnabled?: boolean;
  mealOptionCount?: number;
}

function computeRsvpAccessReadiness(input: RsvpAccessModePlanInput) {
  const guestCount = Math.max(input.guestCount, 0);
  const inviteTokenCount = Math.max(input.inviteTokenCount, 0);
  const householdCount = Math.max(input.householdCount ?? 0, 0);
  const eventCount = Math.max(input.eventCount ?? 0, 0);
  const emailCount = Math.max(input.emailCount ?? 0, 0);
  const phoneCount = Math.max(input.phoneCount ?? 0, 0);
  const tokenCoverage = guestCount > 0 ? inviteTokenCount / guestCount : 0;
  const hasGuestList = guestCount > 0;
  const privateLinksReady = hasGuestList && tokenCoverage >= 0.8;

  return {
    emailCount,
    eventCount,
    guestCount,
    hasGuestList,
    householdCount,
    inviteTokenCount,
    phoneCount,
    privateLinksReady,
    tokenCoverage,
  };
}

function formatHouseholdScopeDetail(householdCount: number, eventCount: number): string {
  if (householdCount <= 0) {
    return eventCount > 1
      ? `Guest-specific event choices are ready, but import or group households before testing shared invite recovery across ${eventCount} events.`
      : 'Import or group households before you rely on shared invite recovery.';
  }

  if (eventCount > 1) {
    return `${householdCount} household${householdCount === 1 ? '' : 's'} can be proven against ${eventCount} event invitations, so shared RSVP recovery stays scoped instead of spilling across the whole weekend.`;
  }

  return `${householdCount} household${householdCount === 1 ? '' : 's'} are grouped well enough for shared RSVP recovery and plus-one scope checks.`;
}

function buildFutureAccessModeBlockerDetail(input: {
  guestCount: number;
  householdCount: number;
  eventCount: number;
  emailCount: number;
  phoneCount: number;
}) {
  const blockers = [
    'replacement-link recovery when a code or password is lost',
    'bad-code and bad-password lockouts before guests can brute-force the page',
    input.emailCount > 0 || input.phoneCount > 0
      ? 'phone or email verification that still preserves private-link recovery as the safer default'
      : 'saved phone or email contact data before verification can replace less private name-only recovery',
  ];

  if (input.householdCount > 0) {
    blockers.push('household-safe verification so one guest cannot open the wrong shared invite');
  }

  if (input.eventCount > 1) {
    blockers.push('event-aware scoping so one recovery path does not unlock the whole wedding weekend');
  }

  if (input.guestCount > 0) {
    blockers.push('customer-safe fallback instructions for wrong code, wrong password, and unsupported open RSVP attempts');
  }

  return blockers.join(', ') + '.';
}

export function buildRsvpRecoveryVerificationReadiness(
  input: RsvpAccessModePlanInput,
  selection = deriveDefaultRsvpAccessSelection(input),
): RsvpRecoveryVerificationReadiness {
  const readiness = computeRsvpAccessReadiness(input);
  const contactReady = readiness.emailCount > 0 || readiness.phoneCount > 0;
  const supportParts: string[] = [];

  if (readiness.emailCount > 0) {
    supportParts.push(`${readiness.emailCount} guest email${readiness.emailCount === 1 ? '' : 's'}`);
  }
  if (readiness.phoneCount > 0) {
    supportParts.push(`${readiness.phoneCount} phone number${readiness.phoneCount === 1 ? '' : 's'}`);
  }

  const supportLabel = supportParts.length > 0 ? supportParts.join(' and ') : 'no saved guest phone or email contacts';
  const blockers: string[] = [];

  if (!contactReady) blockers.push('save at least one guest email or phone number before adding a verification step');
  if (readiness.householdCount <= 0) blockers.push('group guests into households before relying on shared recovery rules');
  if (readiness.eventCount > 1) blockers.push('keep any future verification challenge scoped to the right event instead of the full weekend');

  if (readiness.guestCount === 0) {
    return {
      detail: 'Add guests with saved email or phone details before planning verification-backed RSVP recovery.',
      blockers: ['import guests before testing recovery verification'],
      status: 'needs-setup',
      supportLabel,
    };
  }

  if (!contactReady) {
    return {
      detail: 'Phone or email verification stays blocked until guests have saved contact details that can back a safer recovery step than name-only lookup.',
      blockers,
      status: 'needs-setup',
      supportLabel,
    };
  }

  const preservePrivateLinks = selection.primaryMode === 'private_link'
    ? 'This keeps private guest links as the primary RSVP path while giving misplaced-invite recovery a safer verification step.'
    : 'This lets you tighten name lookup with a verification step before treating it as a launch-ready recovery path.';
  const householdScopeNote = readiness.householdCount > 0
    ? `Household scope is already grounded across ${readiness.householdCount} household${readiness.householdCount === 1 ? '' : 's'}.`
    : 'Household grouping still needs to be added before shared recovery can stay scoped safely.';

  return {
    detail: `${supportLabel[0].toUpperCase()}${supportLabel.slice(1)} are saved. ${preservePrivateLinks} ${householdScopeNote}`,
    blockers,
    status: blockers.length === 0 ? 'ready' : 'needs-setup',
    supportLabel,
  };
}

function toSupportedRsvpAccessModeId(value: unknown): SupportedRsvpAccessModeId | null {
  return value === 'private_link' || value === 'name_lookup' ? value : null;
}

export function deriveDefaultRsvpAccessSelection(input: RsvpAccessModePlanInput): PersistedRsvpAccessSelection {
  const readiness = computeRsvpAccessReadiness(input);

  return {
    primaryMode: readiness.privateLinksReady ? 'private_link' : 'name_lookup',
    allowNameLookupBackup: readiness.hasGuestList,
  };
}

export function normalizePersistedRsvpAccessSelection(
  value: unknown,
  fallback: PersistedRsvpAccessSelection,
): PersistedRsvpAccessSelection {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const primaryMode = toSupportedRsvpAccessModeId(
    record.primaryMode
    ?? record.primary_mode
    ?? record.currentMode
    ?? record.current_mode,
  );
  const allowNameLookupBackup = typeof record.allowNameLookupBackup === 'boolean'
    ? record.allowNameLookupBackup
    : typeof record.allow_name_lookup_backup === 'boolean'
      ? record.allow_name_lookup_backup
      : fallback.allowNameLookupBackup;

  return {
    primaryMode: primaryMode ?? fallback.primaryMode,
    allowNameLookupBackup,
  };
}

export function serializePersistedRsvpAccessSelection(selection: PersistedRsvpAccessSelection) {
  return {
    primary_mode: selection.primaryMode,
    allow_name_lookup_backup: selection.allowNameLookupBackup,
  };
}

export const RSVP_QUESTION_TEMPLATES: RsvpQuestionTemplate[] = [
  {
    key: 'dietary',
    label: 'Any allergies or dietary notes we should know?',
    type: 'long_text',
    required: false,
    appliesTo: 'reception',
  },
  {
    key: 'song',
    label: 'What song would get you on the dance floor?',
    type: 'short_text',
    required: false,
    appliesTo: 'reception',
  },
  {
    key: 'shuttle',
    label: 'Will you use the wedding shuttle?',
    type: 'single_choice',
    required: false,
    appliesTo: 'all',
    options: ['Yes', 'No', 'Not sure yet'],
  },
  {
    key: 'lodging',
    label: 'Where are you staying for the weekend?',
    type: 'short_text',
    required: false,
    appliesTo: 'all',
  },
  {
    key: 'childcare',
    label: 'Do you need childcare information?',
    type: 'single_choice',
    required: false,
    appliesTo: 'all',
    options: ['Yes', 'No'],
  },
  {
    key: 'plus_one_note',
    label: 'Tell us anything helpful about your plus-one.',
    type: 'long_text',
    required: false,
    appliesTo: 'all',
  },
  {
    key: 'event_attendance',
    label: 'Which wedding weekend events do you plan to attend?',
    type: 'multi_choice',
    required: false,
    appliesTo: 'all',
    options: ['Welcome party', 'Ceremony', 'Reception', 'Farewell brunch'],
  },
];

export function buildRsvpAccessModePlan(
  input: RsvpAccessModePlanInput,
  selection = deriveDefaultRsvpAccessSelection(input),
): RsvpAccessModePlan[] {
  const { emailCount, eventCount, guestCount, hasGuestList, householdCount, inviteTokenCount, phoneCount, privateLinksReady } = computeRsvpAccessReadiness(input);

  return [
    {
      id: 'private_link',
      label: 'Private guest links',
      detail: privateLinksReady
        ? householdCount > 0
          ? `${inviteTokenCount} of ${guestCount} guests already have private RSVP links, with ${householdCount} household${householdCount === 1 ? '' : 's'} ready for guest-specific recovery.`
          : `${inviteTokenCount} of ${guestCount} guests already have private RSVP links.`
        : hasGuestList
          ? `${Math.max(guestCount - inviteTokenCount, 0)} guests still need private links before this is fully ready.`
          : 'Add or import guests before using private RSVP links.',
      tradeoff: 'Best for households, private events, plus-one limits, and guest-specific RSVP readback.',
      status: privateLinksReady ? 'recommended' : 'needs-setup',
      selected: selection.primaryMode === 'private_link',
    },
    {
      id: 'name_lookup',
      label: 'Name lookup',
      detail: hasGuestList
        ? householdCount > 0
          ? `Guests can find their invitation by name or email when they lose their private link, with ${householdCount} household${householdCount === 1 ? '' : 's'} still requiring careful match review.`
          : 'Guests can find their invitation by name or email when they do not have their private link handy.'
        : 'Needs a guest list before lookup is useful.',
      tradeoff: 'Helpful backup mode, but names can collide and should be paired with careful household review.',
      status: hasGuestList && !privateLinksReady ? 'recommended' : hasGuestList ? 'ready' : 'needs-setup',
      selected: selection.primaryMode === 'name_lookup',
    },
    {
      id: 'unique_code',
      label: 'Unique code',
      detail: `A future code can behave like a short recovery key for misplaced invites, but it still needs ${buildFutureAccessModeBlockerDetail({
        guestCount,
        householdCount,
        eventCount,
        emailCount,
        phoneCount,
      })}`,
      tradeoff: 'Useful for paper invites, but it needs code generation and recovery rules before launch.',
      status: 'future',
    },
    {
      id: 'password',
      label: 'Shared password',
      detail: `A shared password can protect a simple wedding RSVP page, but it still needs ${buildFutureAccessModeBlockerDetail({
        guestCount,
        householdCount,
        eventCount,
        emailCount,
        phoneCount,
      })}`,
      tradeoff: 'Easy to explain, but weaker for private events, meal limits, households, and plus-one rules.',
      status: 'future',
    },
    {
      id: 'open',
      label: 'Open RSVP',
      detail: guestCount === 0
        ? 'Anyone with the public page can submit an RSVP, so only use this when you truly want an open guest list.'
        : `Anyone with the public page could submit an RSVP, so it stays blocked until wrong-guest, wrong-event, capacity, and verification fallout are fully proven for ${guestCount} guest${guestCount === 1 ? '' : 's'}.`,
      tradeoff: 'Lowest friction, but it is risky for private events, capacity, catering, and guest-list accuracy.',
      status: guestCount === 0 ? 'ready' : 'future',
    },
  ];
}

export function createRsvpQuestionFromTemplate(template: RsvpQuestionTemplate, id: string) {
  return {
    id,
    label: template.label,
    type: template.type,
    required: template.required,
    appliesTo: template.appliesTo,
    options: template.options ? [...template.options] : [],
  };
}

function normalizeQuestionLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildRsvpQuestionTemplateCoverage(questions: RsvpQuestionLike[] = []): RsvpQuestionTemplateCoverageItem[] {
  const addedLabels = new Set(questions.map((question) => normalizeQuestionLabel(question.label)));

  return RSVP_QUESTION_TEMPLATES.map((template) => ({
    key: template.key,
    label: template.label,
    added: addedLabels.has(normalizeQuestionLabel(template.label)),
  }));
}

export function buildRsvpSetupChecklist(
  input: RsvpSetupChecklistInput,
  selection = deriveDefaultRsvpAccessSelection(input),
): RsvpSetupChecklistItem[] {
  const readiness = computeRsvpAccessReadiness(input);
  const eventCount = readiness.eventCount;
  const guestCount = readiness.guestCount;
  const householdCount = readiness.householdCount;
  const inviteTokenCount = readiness.inviteTokenCount;
  const tokenCoverage = readiness.tokenCoverage;
  const templateCoverage = buildRsvpQuestionTemplateCoverage(input.questions);
  const addedTemplateCount = templateCoverage.filter((template) => template.added).length;
  const mealEnabled = input.mealEnabled ?? false;
  const mealOptionCount = Math.max(input.mealOptionCount ?? 0, 0);
  const verificationReadiness = buildRsvpRecoveryVerificationReadiness(input, selection);

  return [
    {
      id: 'private_links',
      label: 'Private guest links',
      detail: guestCount === 0
        ? 'Add guests before private RSVP links can be proven.'
        : tokenCoverage >= 0.8
          ? selection.primaryMode === 'private_link'
            ? `${inviteTokenCount} of ${guestCount} guests have private RSVP links, and they are the active RSVP path.`
            : `${inviteTokenCount} of ${guestCount} guests have private RSVP links ready if you want to switch back to them.`
          : `${Math.max(guestCount - inviteTokenCount, 0)} guests still need private links before launch.`
      ,
      status: guestCount > 0 && tokenCoverage >= 0.8 ? 'ready' : 'needs-setup',
    },
    {
      id: 'name_lookup_backup',
      label: 'Name lookup backup',
      detail: guestCount === 0
        ? 'Needs at least one guest before lookup can be useful.'
        : selection.primaryMode === 'name_lookup'
          ? 'Name lookup is the active RSVP path right now.'
          : selection.allowNameLookupBackup
            ? 'Guest lookup can back up private links for misplaced invitations.'
            : 'Turn on name lookup backup before launch if you want guests to recover misplaced invite links.',
      status: guestCount > 0 && (selection.primaryMode === 'name_lookup' || selection.allowNameLookupBackup) ? 'ready' : 'needs-setup',
    },
    {
      id: 'household_scope',
      label: 'Household access proof',
      detail: formatHouseholdScopeDetail(householdCount, eventCount),
      status: guestCount > 0 && householdCount > 0 ? 'ready' : 'needs-setup',
    },
    {
      id: 'verification_inputs',
      label: 'Phone or email recovery inputs',
      detail: verificationReadiness.detail,
      status: verificationReadiness.status,
    },
    {
      id: 'question_templates',
      label: 'Question templates',
      detail: addedTemplateCount > 0
        ? `${addedTemplateCount} of ${RSVP_QUESTION_TEMPLATES.length} reusable templates are in this RSVP setup.`
        : 'Reusable question templates are optional. Add them when you want faster setup for meals, travel, songs, childcare, plus-ones, or events.',
      status: addedTemplateCount > 0 ? 'ready' : 'planned',
    },
    {
      id: 'meal_choices',
      label: 'Meal choices',
      detail: mealEnabled
        ? `${mealOptionCount} meal options will appear on the RSVP form.`
        : 'Meal collection is off for this RSVP form unless you need catering choices.',
      status: mealEnabled ? (mealOptionCount >= 2 ? 'ready' : 'needs-setup') : 'planned',
    },
    {
      id: 'future_access_modes',
      label: 'Code, password, and open RSVP',
      detail: `These stay planned until ${buildFutureAccessModeBlockerDetail({
        guestCount,
        householdCount,
        eventCount,
        emailCount: readiness.emailCount,
        phoneCount: readiness.phoneCount,
      })}`,
      status: 'planned',
    },
  ];
}

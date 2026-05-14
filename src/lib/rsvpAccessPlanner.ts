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
  id: 'private_links' | 'name_lookup_backup' | 'question_templates' | 'meal_choices' | 'future_access_modes';
  label: string;
  detail: string;
  status: 'ready' | 'needs-setup' | 'planned';
}

export interface RsvpSetupChecklistInput extends RsvpAccessModePlanInput {
  questions?: RsvpQuestionLike[];
  mealEnabled?: boolean;
  mealOptionCount?: number;
}

function computeRsvpAccessReadiness(input: RsvpAccessModePlanInput) {
  const guestCount = Math.max(input.guestCount, 0);
  const inviteTokenCount = Math.max(input.inviteTokenCount, 0);
  const tokenCoverage = guestCount > 0 ? inviteTokenCount / guestCount : 0;
  const hasGuestList = guestCount > 0;
  const privateLinksReady = hasGuestList && tokenCoverage >= 0.8;

  return {
    guestCount,
    hasGuestList,
    inviteTokenCount,
    privateLinksReady,
    tokenCoverage,
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
  const { guestCount, inviteTokenCount, hasGuestList, privateLinksReady } = computeRsvpAccessReadiness(input);

  return [
    {
      id: 'private_link',
      label: 'Private guest links',
      detail: privateLinksReady
        ? `${inviteTokenCount} of ${guestCount} guests already have private RSVP links.`
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
        ? 'Guests can find their invitation by name or email when they do not have their private link handy.'
        : 'Needs a guest list before lookup is useful.',
      tradeoff: 'Helpful backup mode, but names can collide and should be paired with careful household review.',
      status: hasGuestList && !privateLinksReady ? 'recommended' : hasGuestList ? 'ready' : 'needs-setup',
      selected: selection.primaryMode === 'name_lookup',
    },
    {
      id: 'unique_code',
      label: 'Unique code',
      detail: 'A future code can behave like a short password for guests who lose the original invite.',
      tradeoff: 'Useful for paper invites, but it needs code generation and recovery rules before launch.',
      status: 'future',
    },
    {
      id: 'password',
      label: 'Shared password',
      detail: 'A shared password can protect a simple wedding RSVP page.',
      tradeoff: 'Easy to explain, but weaker for private events, meal limits, households, and plus-one rules.',
      status: 'future',
    },
    {
      id: 'open',
      label: 'Open RSVP',
      detail: 'Anyone with the public page can submit an RSVP.',
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
  const guestCount = readiness.guestCount;
  const inviteTokenCount = readiness.inviteTokenCount;
  const tokenCoverage = readiness.tokenCoverage;
  const templateCoverage = buildRsvpQuestionTemplateCoverage(input.questions);
  const addedTemplateCount = templateCoverage.filter((template) => template.added).length;
  const mealEnabled = input.mealEnabled ?? false;
  const mealOptionCount = Math.max(input.mealOptionCount ?? 0, 0);

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
      id: 'question_templates',
      label: 'Question templates',
      detail: addedTemplateCount > 0
        ? `${addedTemplateCount} of ${RSVP_QUESTION_TEMPLATES.length} reusable templates are in this RSVP setup.`
        : 'Add reusable questions for meals, travel, songs, childcare, plus-ones, or events as needed.',
      status: addedTemplateCount > 0 ? 'ready' : 'needs-setup',
    },
    {
      id: 'meal_choices',
      label: 'Meal choices',
      detail: mealEnabled
        ? `${mealOptionCount} meal options will appear on the RSVP form.`
        : 'Meal collection is off for this RSVP form.',
      status: mealEnabled && mealOptionCount >= 2 ? 'ready' : 'needs-setup',
    },
    {
      id: 'future_access_modes',
      label: 'Code, password, and open RSVP',
      detail: 'These stay planned until recovery, privacy, capacity, and bad-code behavior are fully proven.',
      status: 'planned',
    },
  ];
}

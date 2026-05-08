import type { ExistingRSVP } from './rsvpTypes';

type RsvpSubmitFormData = {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  meal_choice: string;
  plus_one_name: string;
  children_count: number;
  notes: string;
};

type BuildRsvpSubmitPayloadArgs = {
  applyToHousehold: boolean;
  buildNormalizedExistingRsvp: (
    formData: RsvpSubmitFormData,
    customAnswers: Record<string, string | string[]>,
    id: string,
    guestIds?: string[],
  ) => ExistingRSVP;
  customAnswers: Record<string, string | string[]>;
  dedupeGuestIds: (guestIds: string[]) => string[];
  existingRsvpId?: string | null;
  formData: RsvpSubmitFormData;
  guestId: string;
  normalizeCustomAnswers: (answers: Record<string, string | string[]>) => Record<string, string | string[]>;
  selectedHouseholdGuestIds: string[];
};

export function buildRsvpSubmitPayload({
  applyToHousehold,
  buildNormalizedExistingRsvp,
  customAnswers,
  dedupeGuestIds,
  existingRsvpId,
  formData,
  guestId,
  normalizeCustomAnswers,
  selectedHouseholdGuestIds,
}: BuildRsvpSubmitPayloadArgs) {
  const targetGuestIds = applyToHousehold
    ? dedupeGuestIds([guestId, ...selectedHouseholdGuestIds])
    : [guestId];

  const notes = (formData.notes || '').trim();
  const mealChoice = (formData.meal_choice || '').trim();
  const plusOneName = (formData.plus_one_name || '').trim();
  const childrenCount = formData.attending ? Math.max(0, Number(formData.children_count ?? 0)) : 0;
  const normalizedCustomAnswers = normalizeCustomAnswers(customAnswers);

  return {
    childrenCount,
    mealChoice,
    normalizedCustomAnswers,
    normalizedExistingRsvp: buildNormalizedExistingRsvp(
      formData,
      customAnswers,
      existingRsvpId ?? 'submitted-rsvp',
      targetGuestIds,
    ),
    notes,
    plusOneName,
    plusOneCount: plusOneName ? 1 : 0,
    targetGuestIds,
  };
}

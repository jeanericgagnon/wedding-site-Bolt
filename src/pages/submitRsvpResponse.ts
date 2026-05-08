import { callValidateRsvpToken } from './rsvpFunctionService';

type SubmitRsvpResponseArgs = {
  applyToHousehold: boolean;
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  childrenCount: number;
  customAnswers: Record<string, string | string[]>;
  guestId: string;
  mealChoice: string | null;
  notes: string | null;
  plusOneCount: number;
  plusOneName: string | null;
  rsvpSession: string | null;
  targetGuestIds: string[];
};

export async function submitRsvpResponse({
  applyToHousehold,
  attending,
  attendCeremony,
  attendReception,
  childrenCount,
  customAnswers,
  guestId,
  mealChoice,
  notes,
  plusOneCount,
  plusOneName,
  rsvpSession,
  targetGuestIds,
}: SubmitRsvpResponseArgs) {
  const { data, error } = await callValidateRsvpToken({
    action: 'submit',
    guestId,
    rsvpSession,
    attending,
    attendCeremony,
    attendReception,
    mealChoice,
    plusOneName,
    plusOneCount,
    childrenCount,
    notes,
    customAnswers,
    applyToHousehold,
    targetGuestIds,
  });

  const submitSucceeded = !!(
    data
    && typeof data === 'object'
    && 'success' in data
    && (data as { success?: boolean }).success
  );

  return {
    error,
    submitSucceeded,
  };
}

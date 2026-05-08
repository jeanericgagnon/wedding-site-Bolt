type RsvpSubmitFormData = {
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
};

type RsvpSubmitGuest = {
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
};

type ValidateRsvpSubmitReadinessArgs = {
  applyToHousehold: boolean;
  deadlinePassed: boolean;
  existingRsvpPresent: boolean;
  formData: RsvpSubmitFormData;
  guest: RsvpSubmitGuest | null;
  householdGuestCount: number;
  rsvpSessionToken: string | null;
  selectedHouseholdGuestCount: number;
};

export function validateRsvpSubmitReadiness({
  applyToHousehold,
  deadlinePassed,
  existingRsvpPresent,
  formData,
  guest,
  householdGuestCount,
  rsvpSessionToken,
  selectedHouseholdGuestCount,
}: ValidateRsvpSubmitReadinessArgs): string | null {
  if (!guest) return 'missing-guest';

  if (deadlinePassed && !existingRsvpPresent) {
    return 'The RSVP deadline has passed. Please contact the couple directly if you still need to respond.';
  }

  if (!rsvpSessionToken) {
    return 'Please use the RSVP button from your invitation email so we can open the right response.';
  }

  if (
    formData.attending
    && guest.invited_to_ceremony
    && guest.invited_to_reception
    && !formData.attendCeremony
    && !formData.attendReception
  ) {
    return 'Please choose at least one event from your invitation, or mark not attending.';
  }

  if (applyToHousehold && householdGuestCount > 0 && selectedHouseholdGuestCount === 0) {
    return 'Pick at least one household guest to share this RSVP with, or turn inheritance off.';
  }

  return null;
}

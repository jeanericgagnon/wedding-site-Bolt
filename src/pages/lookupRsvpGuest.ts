type LookupRsvpGuestArgs = {
  callValidateRsvpToken: (args: { action: 'lookup'; searchValue: string } | { action: 'lookup_guest'; guestId: string; rsvpSession: string | null }) => Promise<{ data?: unknown; error?: string }>;
  demoLookup: (value: string) => unknown;
  guestId?: string;
  rsvpSessionToken?: string | null;
  searchValue?: string;
  useDemoRsvp: boolean;
};

export async function lookupRsvpGuest({
  callValidateRsvpToken,
  demoLookup,
  guestId,
  rsvpSessionToken = null,
  searchValue,
  useDemoRsvp,
}: LookupRsvpGuestArgs): Promise<{ data?: unknown; error?: string }> {
  if (useDemoRsvp) {
    return {
      data: demoLookup(guestId ?? searchValue?.trim() ?? ''),
    };
  }

  if (guestId) {
    return callValidateRsvpToken({
      action: 'lookup_guest',
      guestId,
      rsvpSession: rsvpSessionToken,
    });
  }

  return callValidateRsvpToken({
    action: 'lookup',
    searchValue: searchValue?.trim() ?? '',
  });
}

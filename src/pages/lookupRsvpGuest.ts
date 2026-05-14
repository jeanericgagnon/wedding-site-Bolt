type LookupRsvpGuestArgs = {
  callValidateRsvpToken: (args:
    | { action: 'lookup'; searchValue: string; language?: string | null }
    | { action: 'lookup_guest'; guestId: string; rsvpSession: string | null; language?: string | null }
  ) => Promise<{ data?: unknown; error?: string }>;
  demoLookup: (value: string) => unknown;
  guestId?: string;
  language?: string | null;
  rsvpSessionToken?: string | null;
  searchValue?: string;
  useDemoRsvp: boolean;
};

export async function lookupRsvpGuest({
  callValidateRsvpToken,
  demoLookup,
  guestId,
  language = null,
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
      language,
      rsvpSession: rsvpSessionToken,
    });
  }

  return callValidateRsvpToken({
    action: 'lookup',
    language,
    searchValue: searchValue?.trim() ?? '',
  });
}

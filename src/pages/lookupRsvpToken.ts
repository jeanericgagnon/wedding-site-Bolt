type DemoLookup = (searchValue: string) => unknown;
type LookupTransport = (body: object) => Promise<{ data?: unknown; error?: string; status?: number }>;

export async function lookupRsvpToken({
  callValidateRsvpToken,
  demoLookup,
  language = null,
  token,
  useDemoRsvp,
}: {
  callValidateRsvpToken: LookupTransport;
  demoLookup: DemoLookup;
  language?: string | null;
  token: string;
  useDemoRsvp: boolean;
}): Promise<{ data?: unknown; error?: string; status?: number }> {
  if (useDemoRsvp) {
    return {
      data: demoLookup(token) as unknown,
      error: undefined,
    };
  }

  return callValidateRsvpToken({ action: 'lookup', language, searchValue: token });
}

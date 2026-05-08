type DemoLookup = (searchValue: string) => unknown;
type LookupTransport = (body: object) => Promise<{ data?: unknown; error?: string; status?: number }>;

export async function lookupRsvpToken({
  callValidateRsvpToken,
  demoLookup,
  token,
  useDemoRsvp,
}: {
  callValidateRsvpToken: LookupTransport;
  demoLookup: DemoLookup;
  token: string;
  useDemoRsvp: boolean;
}): Promise<{ data?: unknown; error?: string; status?: number }> {
  if (useDemoRsvp) {
    return {
      data: demoLookup(token) as unknown,
      error: undefined,
    };
  }

  return callValidateRsvpToken({ action: 'lookup', searchValue: token });
}

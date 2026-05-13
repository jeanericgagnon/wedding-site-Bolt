export const getPublicInviteTokenStorageKey = (slug: string) => `dayof_invite_token_${slug}`;
export const getGuestInviteTokenStorageKey = (slug: string) => `dayof_guest_invite_token_${slug}`;

export const getPublicPasswordSessionStorageKey = (slug: string) => `dayof_pw_session_${slug}`;

export function getUrlWithoutPublicAccessToken(href: string, origin = window.location.origin): string {
  try {
    const url = new URL(href, origin);
    url.searchParams.delete('token');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

export function getInviteTokenFromSearch(searchParams: URLSearchParams): string | null {
  const token = searchParams.get('token')?.trim();
  return token || null;
}

export function getGuestInviteTokenFromSearch(searchParams: URLSearchParams): string | null {
  const token = searchParams.get('invite_token')?.trim() ?? searchParams.get('guestInviteToken')?.trim();
  return token || null;
}

export function readStoredPublicInviteToken(slug: string): string | null {
  return sessionStorage.getItem(getPublicInviteTokenStorageKey(slug));
}

export function readStoredGuestInviteToken(slug: string): string | null {
  return sessionStorage.getItem(getGuestInviteTokenStorageKey(slug));
}

export function readStoredPublicPasswordSession(slug: string): string | null {
  return sessionStorage.getItem(getPublicPasswordSessionStorageKey(slug));
}

export function writeStoredPublicPasswordSession(slug: string, value: string): void {
  sessionStorage.setItem(getPublicPasswordSessionStorageKey(slug), value);
}

export function clearStoredPublicInviteToken(slug: string): void {
  sessionStorage.removeItem(getPublicInviteTokenStorageKey(slug));
}

export function clearStoredGuestInviteToken(slug: string): void {
  sessionStorage.removeItem(getGuestInviteTokenStorageKey(slug));
}

export function clearStoredPublicPasswordSession(slug: string): void {
  sessionStorage.removeItem(getPublicPasswordSessionStorageKey(slug));
}

export function capturePublicInviteTokenFromSearch(slug: string, searchParams: URLSearchParams): string | null {
  const token = getInviteTokenFromSearch(searchParams);
  if (!token || !slug) return token;

  sessionStorage.setItem(getPublicInviteTokenStorageKey(slug), token);

  if (typeof window !== 'undefined') {
    window.history.replaceState(window.history.state, '', getUrlWithoutPublicAccessToken(window.location.href));
  }

  return token;
}

export function captureGuestInviteTokenFromSearch(slug: string, searchParams: URLSearchParams): string | null {
  const token = getGuestInviteTokenFromSearch(searchParams);
  if (!token || !slug) return token;

  sessionStorage.setItem(getGuestInviteTokenStorageKey(slug), token);

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite_token');
    url.searchParams.delete('guestInviteToken');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  return token;
}

export function buildPublicAccessArtifacts(slug: string, searchParams: URLSearchParams) {
  return {
    inviteToken: getInviteTokenFromSearch(searchParams) ?? readStoredPublicInviteToken(slug),
    passwordSession: readStoredPublicPasswordSession(slug),
  };
}

export function buildGuestIdentityArtifacts(slug: string, searchParams: URLSearchParams) {
  return {
    guestInviteToken: getGuestInviteTokenFromSearch(searchParams) ?? readStoredGuestInviteToken(slug),
  };
}

import { customerSafeErrorMessage } from '../lib/customerSafeError';
import {
  buildGuestIdentityArtifacts,
  buildPublicAccessArtifacts,
} from '../lib/publicAccessArtifacts';

const normalizeSiteRef = (value?: string) => (value ?? '').trim().toLowerCase();

export const buildGuestHubAccessPayload = (slug: string, searchParams: URLSearchParams) =>
  buildPublicAccessArtifacts(slug, searchParams);

export const buildGuestHubIdentityPayload = (slug: string, searchParams: URLSearchParams) =>
  buildGuestIdentityArtifacts(slug, searchParams);

export const buildGuestHubAccessHeaders = (slug: string, searchParams: URLSearchParams) => {
  const access = buildGuestHubAccessPayload(slug, searchParams);
  const identity = buildGuestHubIdentityPayload(slug, searchParams);
  return {
    ...(access.inviteToken ? { 'x-dayof-invite-token': access.inviteToken } : {}),
    ...(access.passwordSession ? { 'x-dayof-password-session': access.passwordSession } : {}),
    ...(identity.guestInviteToken ? { 'x-dayof-guest-invite-token': identity.guestInviteToken } : {}),
  };
};

export const friendlyGuestHubError = (err: unknown, fallback: string) => {
  return customerSafeErrorMessage(err, fallback, {
    allow: [/^Add an email or phone first\.$/i],
  });
};

export const safeGuestHubFunctionError = (value: unknown, fallback: string) => {
  return friendlyGuestHubError(typeof value === 'string' ? value : '', fallback);
};

export const formatEventHubCoupleLabel = (
  slug: string,
  coupleName1?: string | null,
  coupleName2?: string | null
) => {
  const names = [coupleName1, coupleName2]
    .map((name) => name?.trim())
    .filter(Boolean) as string[];
  if (names.length > 0) return names.join(' & ');

  const words = slug
    .replace(/[_+]+/g, '-')
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
  const andIndex = words.findIndex((part) => part.toLowerCase() === 'and');
  const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  if (andIndex > 0 && andIndex < words.length - 1) {
    const left = words.slice(0, andIndex).map(titleCase).join(' ');
    const right = words.slice(andIndex + 1).map(titleCase).join(' ');
    return `${left} & ${right}`;
  }

  return words.map(titleCase).join(' ') || slug;
};

export const shouldOpenHubDetailsByDefault = (params: URLSearchParams) => {
  return params.get('mobileSmoke') === '1' || params.get('hubDetails') === '1';
};

export { normalizeSiteRef };

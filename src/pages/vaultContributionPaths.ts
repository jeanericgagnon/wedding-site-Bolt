import { readInviteTokenFromParams } from '../lib/inviteTokenParams';

function toSearchString(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildVaultCarryforwardParams(currentParams: URLSearchParams): URLSearchParams {
  const nextParams = new URLSearchParams();
  const inviteToken = readInviteTokenFromParams(currentParams);
  const previewGuest = currentParams.get('previewGuest')?.trim() ?? '';

  if (inviteToken) {
    nextParams.set('invite_token', inviteToken);
  }

  if (previewGuest) {
    nextParams.set('previewGuest', previewGuest);
    nextParams.set('previewSurface', 'vault');
  }

  return nextParams;
}

export function buildVaultHubPath(siteSlug: string, currentParams: URLSearchParams): string {
  return `/vault/${siteSlug}${toSearchString(buildVaultCarryforwardParams(currentParams))}`;
}

export function buildVaultYearPath(siteSlug: string, vaultYear: number, currentParams: URLSearchParams): string {
  return `/vault/${siteSlug}/${vaultYear}${toSearchString(buildVaultCarryforwardParams(currentParams))}`;
}

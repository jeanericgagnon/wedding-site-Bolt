export type SitePrivacyMode = 'public' | 'password_protected' | 'invite_only';
export type SiteVisibilityState = 'draft' | 'private_preview_password' | 'private_preview_link' | 'live';

export interface SiteVisibilityInput {
  isPublished?: boolean | null;
  privacyMode?: string | null;
  hideFromSearch?: boolean | null;
}

export interface SiteVisibilityDescriptor {
  state: SiteVisibilityState;
  label: string;
  shortLabel: string;
  explainer: string;
  searchLabel: string;
  isLive: boolean;
  isPrivatePreview: boolean;
}

export const SITE_VISIBILITY_COPY = {
  draftBadge: 'Draft mode',
  draftExplainer: 'Draft mode keeps the site private while you finish setup.',
  publishedExplainer: 'Once published, your chosen visibility settings control how guests can access it.',
} as const;

export function getSiteVisibilityState(input: SiteVisibilityInput): SiteVisibilityDescriptor {
  const isPublished = input.isPublished === true;
  const privacyMode = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only'
    ? input.privacyMode
    : 'public';
  const hideFromSearch = input.hideFromSearch === true;

  if (!isPublished) {
    return {
      state: 'draft',
      label: 'Draft only — visible only to you',
      shortLabel: 'Draft only',
      explainer: 'Draft means only you can see the site while editing.',
      searchLabel: hideFromSearch ? 'Hidden from search' : 'Draft only',
      isLive: false,
      isPrivatePreview: false,
    };
  }

  if (privacyMode === 'password_protected') {
    return {
      state: 'private_preview_password',
      label: 'Shared with password protection',
      shortLabel: 'Protected shared site',
      explainer: 'The site is shared, but guests need the password to open it.',
      searchLabel: hideFromSearch ? 'Hidden from search' : 'Search visibility on',
      isLive: true,
      isPrivatePreview: true,
    };
  }

  if (privacyMode === 'invite_only') {
    return {
      state: 'private_preview_link',
      label: 'Shared with invite-only access',
      shortLabel: 'Invite-only shared site',
      explainer: 'The site is shared, but only guests with the link can open it.',
      searchLabel: hideFromSearch ? 'Hidden from search' : 'Search visibility on',
      isLive: true,
      isPrivatePreview: true,
    };
  }

  return {
    state: 'live',
    label: 'Shared and visible to guests',
    shortLabel: 'Shared',
    explainer: 'The site is shared for guests at your DayOf URL.',
    searchLabel: hideFromSearch ? 'Hidden from search' : 'Search visibility on',
    isLive: true,
    isPrivatePreview: false,
  };
}


export function getVisibilityModeOptions() {
  return [
    { value: 'public' as const, label: 'Public shared site', description: 'Anyone with the link can view your site once it is shared.' },
    { value: 'password_protected' as const, label: 'Password-protected shared site', description: 'Guests must enter a password before viewing the shared site.' },
    { value: 'invite_only' as const, label: 'Invite-only shared site', description: 'Only guests with the link can open the shared site.' },
  ];
}

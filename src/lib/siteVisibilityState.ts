export type SitePrivacyMode = 'public' | 'password_protected' | 'invite_only' | 'hidden';
export type SiteVisibilityState = 'draft' | 'private_preview_password' | 'private_preview_link' | 'live';

export interface SiteVisibilityInput {
  isPublished?: boolean | null;
  privacyMode?: string | null;
  hideFromSearch?: boolean | null;
  isGuestFacingReady?: boolean | null;
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
  const privacyMode = input.privacyMode === 'password_protected' || input.privacyMode === 'invite_only' || input.privacyMode === 'hidden'
    ? input.privacyMode
    : 'public';
  const hideFromSearch = input.hideFromSearch === true;
  const isGuestFacingReady = input.isGuestFacingReady !== false;

  if (!isPublished) {
    return {
      state: 'draft',
      label: 'Draft only — visible only to you',
      shortLabel: 'Draft only',
      explainer: 'Draft means only you can see the site while editing.',
      searchLabel: hideFromSearch ? 'Hidden from search' : 'Not live yet',
      isLive: false,
      isPrivatePreview: false,
    };
  }

  if (privacyMode === 'password_protected') {
    return {
      state: 'private_preview_password',
      label: 'Live with password protection',
      shortLabel: 'Protected live site',
      explainer: 'The site is live, but guests need the password to open it.',
      searchLabel: hideFromSearch ? 'Hidden from search' : 'Search visibility on',
      isLive: true,
      isPrivatePreview: true,
    };
  }

  if (privacyMode === 'invite_only') {
    return {
      state: 'private_preview_link',
      label: 'Live with invite-only access',
      shortLabel: 'Invite-only live site',
      explainer: 'The site is live, but only guests with the link can open it.',
      searchLabel: hideFromSearch ? 'Hidden from search' : 'Search visibility on',
      isLive: true,
      isPrivatePreview: true,
    };
  }

  if (privacyMode === 'hidden') {
    return {
      state: 'draft',
      label: 'Hidden from guests — visible only to you',
      shortLabel: 'Hidden',
      explainer: 'This site stays hidden from guests until you change visibility and publish again.',
      searchLabel: 'Hidden from guests',
      isLive: false,
      isPrivatePreview: false,
    };
  }

  if (!isGuestFacingReady) {
    return {
      state: 'draft',
      label: 'Published, but not ready for guests yet',
      shortLabel: 'Needs content',
      explainer: 'Guests would still land on the coming-soon screen until more site content is published.',
      searchLabel: hideFromSearch ? 'Hidden from search' : 'Not guest-ready',
      isLive: false,
      isPrivatePreview: false,
    };
  }

  return {
    state: 'live',
    label: 'Live and visible to guests',
    shortLabel: 'Live',
    explainer: 'The site is live for guests at your dayof URL.',
    searchLabel: hideFromSearch ? 'Hidden from search' : 'Search visibility on',
    isLive: true,
    isPrivatePreview: false,
  };
}


export function getVisibilityModeOptions() {
  return [
    { value: 'public' as const, label: 'Public live site', description: 'Anyone with the link can view your site once it is live.' },
    { value: 'password_protected' as const, label: 'Password-protected live site', description: 'Guests must enter a password before viewing the live site.' },
    { value: 'invite_only' as const, label: 'Invite-only live site', description: 'Only guests with the link can open the live site.' },
  ];
}

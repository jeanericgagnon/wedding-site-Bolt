import { FIRST_SESSION_WORKSPACE_ROUTES, getFirstSessionSignupState } from '../../lib/firstSessionWorkspaceRoutes';

export type FeaturePageId = 'guests' | 'rsvp' | 'messaging' | 'travel' | 'registry' | 'seating';

type FeatureCtaConfig = {
  signedInPrimaryLabel: string;
  signedInPrimaryHref: string;
};

type FeaturePageCta = {
  label: string;
  to: string;
  state?: ReturnType<typeof getFirstSessionSignupState>;
};

const FEATURE_CTA_CONFIG: Record<FeaturePageId, FeatureCtaConfig> = {
  guests: {
    signedInPrimaryLabel: 'Open guest list',
    signedInPrimaryHref: FIRST_SESSION_WORKSPACE_ROUTES.guests,
  },
  rsvp: {
    signedInPrimaryLabel: 'Open RSVP board',
    signedInPrimaryHref: FIRST_SESSION_WORKSPACE_ROUTES.rsvpBoard,
  },
  messaging: {
    signedInPrimaryLabel: 'Open messages',
    signedInPrimaryHref: FIRST_SESSION_WORKSPACE_ROUTES.messages,
  },
  travel: {
    signedInPrimaryLabel: 'Open itinerary',
    signedInPrimaryHref: FIRST_SESSION_WORKSPACE_ROUTES.itinerary,
  },
  registry: {
    signedInPrimaryLabel: 'Open registry',
    signedInPrimaryHref: FIRST_SESSION_WORKSPACE_ROUTES.registry,
  },
  seating: {
    signedInPrimaryLabel: 'Open seating',
    signedInPrimaryHref: FIRST_SESSION_WORKSPACE_ROUTES.seating,
  },
};

export function getFeaturePageHeroCtas(feature: FeaturePageId, isSignedIn: boolean): { primary: FeaturePageCta; secondary: FeaturePageCta } {
  if (!isSignedIn) {
    return {
      primary: {
        label: 'Start your website',
        to: '/signup',
        state: getFirstSessionSignupState(),
      },
      secondary: {
        label: 'See how Dayof works',
        to: '/product',
      },
    };
  }

  return {
    primary: {
      label: FEATURE_CTA_CONFIG[feature].signedInPrimaryLabel,
      to: FEATURE_CTA_CONFIG[feature].signedInPrimaryHref,
    },
    secondary: {
      label: 'Open dashboard',
      to: FIRST_SESSION_WORKSPACE_ROUTES.overview,
    },
  };
}

export function getFeaturePageFooterCtas(feature: FeaturePageId, isSignedIn: boolean): { primary: FeaturePageCta; secondary: FeaturePageCta } {
  if (!isSignedIn) {
    return {
      primary: {
        label: 'Start your website',
        to: '/signup',
        state: getFirstSessionSignupState(),
      },
      secondary: {
        label: 'Explore more features',
        to: '/product',
      },
    };
  }

  return {
    primary: {
      label: FEATURE_CTA_CONFIG[feature].signedInPrimaryLabel,
      to: FEATURE_CTA_CONFIG[feature].signedInPrimaryHref,
    },
    secondary: {
      label: 'Open dashboard',
      to: FIRST_SESSION_WORKSPACE_ROUTES.overview,
    },
  };
}

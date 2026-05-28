import { FIRST_SESSION_WORKSPACE_ROUTES } from '../lib/firstSessionWorkspaceRoutes';

export type TemplatePageApplyCta = {
  label: string;
  to: string;
};

export function getTemplateGalleryApplyCta(isSignedIn: boolean): TemplatePageApplyCta {
  if (isSignedIn) {
    return {
      label: 'Apply in builder',
      to: FIRST_SESSION_WORKSPACE_ROUTES.builder,
    };
  }

  return {
    label: 'Start with this',
    to: '/setup/names',
  };
}

export function getTemplateGalleryContinueCta(isSignedIn: boolean): TemplatePageApplyCta {
  if (isSignedIn) {
    return {
      label: 'Open website builder',
      to: FIRST_SESSION_WORKSPACE_ROUTES.builder,
    };
  }

  return {
    label: 'Continue setup',
    to: '/setup/names',
  };
}

export function getTemplateDetailApplyCta(isSignedIn: boolean): TemplatePageApplyCta {
  if (isSignedIn) {
    return {
      label: 'Apply in builder',
      to: FIRST_SESSION_WORKSPACE_ROUTES.builder,
    };
  }

  return {
    label: 'Use this template',
    to: '/setup/names',
  };
}

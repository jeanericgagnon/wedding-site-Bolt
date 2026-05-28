import { describe, expect, it } from 'vitest';

import { FIRST_SESSION_WORKSPACE_ROUTES } from '../lib/firstSessionWorkspaceRoutes';
import {
  getTemplateDetailApplyCta,
  getTemplateGalleryApplyCta,
  getTemplateGalleryContinueCta,
} from './templatePageCtas';

describe('templatePageCtas', () => {
  it('keeps signed-out template CTAs on the setup path', () => {
    expect(getTemplateGalleryApplyCta(false)).toEqual({
      label: 'Start with this',
      to: '/setup/names',
    });
    expect(getTemplateGalleryContinueCta(false)).toEqual({
      label: 'Continue setup',
      to: '/setup/names',
    });
    expect(getTemplateDetailApplyCta(false)).toEqual({
      label: 'Use this template',
      to: '/setup/names',
    });
  });

  it('routes signed-in template CTAs into the builder instead of setup loops', () => {
    expect(getTemplateGalleryApplyCta(true)).toEqual({
      label: 'Apply in builder',
      to: FIRST_SESSION_WORKSPACE_ROUTES.builder,
    });
    expect(getTemplateGalleryContinueCta(true)).toEqual({
      label: 'Open website builder',
      to: FIRST_SESSION_WORKSPACE_ROUTES.builder,
    });
    expect(getTemplateDetailApplyCta(true)).toEqual({
      label: 'Apply in builder',
      to: FIRST_SESSION_WORKSPACE_ROUTES.builder,
    });
  });
});

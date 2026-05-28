import { describe, expect, it } from 'vitest';

import { BUILDER_WORKSPACE_ROUTES } from './builderWorkspaceRoutes';

describe('BUILDER_WORKSPACE_ROUTES', () => {
  it('keeps the builder guide, legacy editor, V2 dashboard, and lab fallback paths explicit', () => {
    expect(BUILDER_WORKSPACE_ROUTES.guide).toBe('/dashboard/builder');
    expect(BUILDER_WORKSPACE_ROUTES.legacy).toBe('/dashboard/builder-v1');
    expect(BUILDER_WORKSPACE_ROUTES.v2).toBe('/dashboard/builder-v2');
    expect(BUILDER_WORKSPACE_ROUTES.lab).toBe('/builder-v2-lab');
  });
});

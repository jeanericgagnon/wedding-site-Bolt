import { describe, expect, it } from 'vitest';

import { resolveBuilderWorkflowRoute } from './builderWorkflowRoutes';

describe('resolveBuilderWorkflowRoute', () => {
  it('routes builder-launch through the promoted Builder V2 launch review path', () => {
    expect(resolveBuilderWorkflowRoute('builder-launch')).toBe('/dashboard/builder?publishNow=1');
  });

  it('keeps builder-polish on the explicit legacy polish path', () => {
    expect(resolveBuilderWorkflowRoute('builder-polish')).toBe('/dashboard/builder-v1#builder-concierge');
  });
});

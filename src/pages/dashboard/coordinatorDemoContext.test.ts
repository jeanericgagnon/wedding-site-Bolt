import { describe, expect, it } from 'vitest';

import { getCoordinatorDemoSiteId } from './coordinatorDemoContext';

describe('coordinator demo context', () => {
  it('uses the shared demo wedding site id for coordinator persistence', () => {
    expect(getCoordinatorDemoSiteId()).toBe('demo-site-id');
  });
});

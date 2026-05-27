import { describe, expect, it } from 'vitest';
import { summarizeBuilderSectionRail } from './BuilderSectionRail';

describe('summarizeBuilderSectionRail', () => {
  it('reports visible, hidden, locked, and missing essentials', () => {
    const summary = summarizeBuilderSectionRail([
      { id: 'hero-1', type: 'hero', enabled: true },
      { id: 'venue-1', type: 'venue', enabled: false },
      { id: 'story-1', type: 'story', enabled: true, locked: true },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.visible).toBe(2);
    expect(summary.hidden).toBe(1);
    expect(summary.locked).toBe(1);
    expect(summary.missingEssentials).toEqual(
      expect.arrayContaining(['Schedule', 'Travel & Hotels', 'RSVP', 'FAQ', 'Registry'])
    );
  });
});

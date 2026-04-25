import { describe, expect, it } from 'vitest';
import { buildSiteMembershipLabel } from './siteMembershipLabel';

describe('buildSiteMembershipLabel', () => {
  it('keeps owner-facing site labels truthful when one persisted partner name is whitespace only', () => {
    expect(buildSiteMembershipLabel('   ', ' Alex ', 'alex-and-sam')).toBe('Alex');
  });

  it('falls back to the site slug when both persisted partner names are blank', () => {
    expect(buildSiteMembershipLabel('   ', '', 'alex-and-sam')).toBe('alex-and-sam');
  });

  it('falls back to a generic label when names and slug are blank', () => {
    expect(buildSiteMembershipLabel('   ', '', '   ')).toBe('Wedding site');
  });
});

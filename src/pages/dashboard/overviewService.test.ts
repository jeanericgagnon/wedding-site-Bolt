import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_OVERVIEW_BUDGET_ITEMS,
  MAX_OVERVIEW_COLLABORATOR_LINK_ROWS,
  MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS,
  MAX_OVERVIEW_INTERACTIVE_VOTES,
  MAX_OVERVIEW_RECENT_RSVPS,
  MAX_OVERVIEW_VENDORS,
  OVERVIEW_RECENT_UPLOAD_LOOKBACK_DAYS,
  buildOverviewDismissalsWeddingData,
} from './overviewService';

describe('overviewService', () => {
  it('exports stable overview service bounds', () => {
    expect(MAX_OVERVIEW_RECENT_RSVPS).toBe(5);
    expect(MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS).toBe(8);
    expect(MAX_OVERVIEW_INTERACTIVE_VOTES).toBe(500);
    expect(MAX_OVERVIEW_COLLABORATOR_LINK_ROWS).toBe(1);
    expect(MAX_OVERVIEW_BUDGET_ITEMS).toBe(1000);
    expect(MAX_OVERVIEW_VENDORS).toBe(500);
    expect(OVERVIEW_RECENT_UPLOAD_LOOKBACK_DAYS).toBe(7);
  });

  it('preserves existing wedding data while setting intelligence dismissals', () => {
    expect(buildOverviewDismissalsWeddingData(
      {
        couple: { name: 'Alex and Jordan' },
        meta: {
          existing: true,
          intelligenceDismissals: ['old'],
        },
      },
      ['next-a', 'next-b'],
    )).toEqual({
      couple: { name: 'Alex and Jordan' },
      meta: {
        existing: true,
        intelligenceDismissals: ['next-a', 'next-b'],
      },
    });
  });

  it('routes overview writes through RPCs', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/overviewService.ts'), 'utf8');

    expect(source).toContain("supabase.rpc('wedding_site_settings_patch'");
    expect(source).toContain("supabase.rpc('overview_interactive_suggestion_hide'");
    expect(source).not.toContain(".from('interactive_suggestions')\n    .update({ is_hidden: true })");
    expect(source).not.toContain(".from('wedding_sites')\n    .update({ wedding_data: nextWeddingData })");
    expect(source).not.toContain(".from('wedding_sites')\n    .update({ site_json: nextSiteJson })");
  });
});

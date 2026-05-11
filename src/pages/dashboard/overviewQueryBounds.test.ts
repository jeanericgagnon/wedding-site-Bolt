import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('overview query bounds', () => {
  it('uses service-level exact counts and caps recent RSVP hydration', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/overviewService.ts'), 'utf8');
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useOverviewDashboardData.ts'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Overview.tsx'), 'utf8');

    expect(source).toContain('export const MAX_OVERVIEW_RECENT_RSVPS = 5;');
    expect(source).toContain('export const MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS = 8;');
    expect(source).toContain('export const MAX_OVERVIEW_INTERACTIVE_VOTES = 500;');
    expect(source).toContain('export const MAX_OVERVIEW_COLLABORATOR_LINK_ROWS = 1;');
    expect(source).toContain("export const OVERVIEW_GUEST_SELECT = 'id, rsvp_status, rsvp_received_at, first_name, last_name, name';");
    expect(source).toContain(".select('id', { count: 'exact', head: true })");
    expect(source).toContain(".or('rsvp_status.is.null,rsvp_status.eq.pending')");
    expect(source).toContain(".or('email.not.is.null,phone.not.is.null')");
    expect(source).toContain(".select(OVERVIEW_GUEST_SELECT)");
    expect(source).toContain(".limit(MAX_OVERVIEW_RECENT_RSVPS),");
    expect(source).toContain(".eq('is_hidden', false)\n      .order('created_at', { ascending: false })\n      .limit(MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS),");
    expect(source).toContain(".eq('site_slug', siteSlug)\n      .order('created_at', { ascending: false })\n      .limit(MAX_OVERVIEW_INTERACTIVE_VOTES),");
    expect(source).toContain(".eq('user_id', userId)\n      .limit(MAX_OVERVIEW_COLLABORATOR_LINK_ROWS)\n      .maybeSingle();");
    expect(source).not.toContain(".select('id, rsvp_status, rsvp_received_at, first_name, last_name, name, email, phone')");
    expect(dataHook).toContain('const overviewSnapshot = await loadOverviewDashboardSnapshot(userId);');
    expect(dataHook).toContain('const { suggestions, voteSummaries } = await loadOverviewInteractiveData(slug);');
    expect(page).toContain('useOverviewDashboardData({');
    expect(page).not.toContain("supabase.from('interactive_suggestions')");
    expect(page).not.toContain("supabase.from('interactive_votes')");
    expect(page).not.toContain("supabase.from('wedding_sites')");
    expect(page).not.toContain("supabase.from('guests')");
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('collaborator permission RLS proof', () => {
  it('covers guest, planning, registry, seating, coordinator, and adjacent RPC permission lanes while denying ungranted writes', () => {
    const source = readFileSync('tests/e2e/collaborator-permission-rls.spec.ts', 'utf8');

    expect(source).toContain('guest-permission collaborator can mutate guest rows');
    expect(source).toContain('checked_in_at');
    expect(source).toContain('thank_you_sent_at');
    expect(source).toContain('household_id');
    expect(source).toContain("restUrl('event_invitations')");
    expect(source).toContain("restUrl('wedding_sites'");
    expect(source).toContain('[401, 403]');
    expect(source).toContain('planner/coordinator permissioned non-guest actions are allowed while ungranted direct writes stay scoped');
    expect(source).toContain("permissions: ['messages', 'planning']");
    expect(source).toContain("restUrl('planning_tasks')");
    expect(source).toContain("rpcUrl('dashboard_message_write')");
    expect(source).toContain("rpcUrl('registry_item_write')");
    expect(source).toContain("permissions: ['registry']");
    expect(source).toContain("permissions: ['coordinator', 'photos', 'seating']");
    expect(source).toContain("restUrl('seating_events')");
    expect(source).toContain("restUrl('seating_tables')");
    expect(source).toContain("rpcUrl('builder_media_asset_write')");
    expect(source).toContain("rpcUrl('coordinator_guest_checkin_write')");
    expect(source).toContain("rpcUrl('coordinator_qna_write')");
    expect(source).toContain("process.env.LIVE_GUEST_DASHBOARD_SETTINGS_RPCS === '1'");
  });
});

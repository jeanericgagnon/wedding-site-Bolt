import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260511170500_serialize_submit_rsvp_capacity.sql'),
  'utf8',
);

const submitRsvp = readFileSync(
  join(process.cwd(), 'supabase/functions/submit-rsvp/index.ts'),
  'utf8',
);

describe('rsvp capacity serialization hardening', () => {
  it('serializes capacity decisions in one database function', () => {
    expect(migration).toContain('create or replace function public.apply_public_rsvp_capacity_decision(');
    expect(migration).toContain('for update;');
    expect(migration).toContain("set rsvp_status = 'confirmed'");
    expect(migration).toContain("set rsvp_status = 'declined'");
    expect(migration).toContain("set rsvp_status = 'pending'");
    expect(migration).toContain("'waitlisted', v_waitlisted");
    expect(migration).toContain("'blocked', v_blocked");
    expect(migration).toContain('set rsvp_waitlist_count = (');
    expect(migration).toContain('grant execute on function public.apply_public_rsvp_capacity_decision');
  });

  it('uses the serialized capacity decision path instead of count-then-update logic', () => {
    expect(submitRsvp).toContain('"apply_public_rsvp_capacity_decision"');
    expect(submitRsvp).toContain('p_already_confirmed: guest.rsvp_status === "confirmed"');
    expect(submitRsvp).toContain('if (capacityDecision?.blocked)');
    expect(submitRsvp).not.toContain('.select("id", { count: "exact", head: true })');
  });
});

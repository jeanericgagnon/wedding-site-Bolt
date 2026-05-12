import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('itinerary RPC safety', () => {
  it('keeps itinerary_event_write start/end time coercion type-safe', () => {
    const source = readFileSync('supabase/migrations/20260512030000_builder_section_itinerary_write_rpcs.sql', 'utf8');

    expect(source).toContain("coalesce(p_event_id, nullif(p_payload->>'id', '')::uuid, gen_random_uuid())");
    expect(source).toContain("when p_payload ? 'start_time' then nullif(p_payload->>'start_time', '')::time");
    expect(source).toContain("when p_payload ? 'end_time' then nullif(p_payload->>'end_time', '')::time");
    expect(source).not.toContain("nullif(coalesce(p_payload->>'start_time', v_existing.start_time), '')");
    expect(source).not.toContain("nullif(coalesce(p_payload->>'end_time', v_existing.end_time), '')");
    expect(source).not.toContain("values (\n    p_event_id,");
  });
});

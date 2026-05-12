import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('section RPC safety', () => {
  it('allows explicit section ids on create without treating them as missing-row updates', () => {
    const source = readFileSync('supabase/migrations/20260512030000_builder_section_itinerary_write_rpcs.sql', 'utf8');
    const sectionWriteSource = source.split('create or replace function public.section_upsert_many(')[0] ?? source;

    expect(sectionWriteSource).toContain('if found then');
    expect(sectionWriteSource).toContain('v_site_id := p_site_id;');
    expect(sectionWriteSource).not.toContain("raise exception 'section not found'");
  });
});

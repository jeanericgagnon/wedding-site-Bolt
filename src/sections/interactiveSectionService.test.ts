import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildInteractiveSuggestionInsert,
  buildInteractiveVoteInsert,
} from './interactiveSectionService';

describe('interactive section data boundary', () => {
  it('builds minimal public suggestion insert rows', () => {
    expect(buildInteractiveSuggestionInsert('kara-eric', 'Song requests', 'September')).toEqual({
      site_slug: 'kara-eric',
      prompt_key: 'Song requests',
      suggestion_text: 'September',
    });
  });

  it('builds minimal public vote insert rows', () => {
    expect(buildInteractiveVoteInsert('kara-eric', 'poll', 'poll-1', 'option-a')).toEqual({
      site_slug: 'kara-eric',
      widget_kind: 'poll',
      widget_id: 'poll-1',
      option_id: 'option-a',
    });
  });

  it('keeps public interactive sections behind the shared service', () => {
    const hub = readFileSync(join(process.cwd(), 'src/sections/variants/contact/interactiveHub.tsx'), 'utf8');
    const music = readFileSync(join(process.cwd(), 'src/sections/variants/music/requestForm.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/sections/interactiveSectionService.ts'), 'utf8');

    expect(hub).toContain('fetchInteractiveSectionSync');
    expect(hub).toContain('submitInteractiveSuggestion');
    expect(hub).toContain('submitInteractiveVote');
    expect(music).toContain('submitInteractiveSuggestion');

    expect(hub).not.toContain("from '../../../lib/supabase'");
    expect(music).not.toContain("from '../../../lib/supabase'");
    expect(hub).not.toContain('supabase.from(');
    expect(music).not.toContain('supabase.from(');

    expect(service).toContain("const INTERACTIVE_VOTE_SELECT = 'option_id'");
    expect(service).toContain("const INTERACTIVE_SUGGESTION_SELECT = 'suggestion_text'");
    expect(service).not.toContain(".select('*')");
  });
});

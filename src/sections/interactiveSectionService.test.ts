import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInteractiveSuggestionInsert,
  buildInteractiveVoteInsert,
} from './interactiveSectionService';
import {
  INTERACTIVE_HUB_STORAGE_RETENTION_MS,
  readInteractiveCooldown,
  readInteractiveCounts,
  readInteractiveSuggestions,
} from './variants/contact/interactiveHub';

describe('interactive section data boundary', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

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

    expect(service).toContain("supabase.functions.invoke('interactive-section-public'");
    expect(service).toContain("import { resolveCurrentSearchParams } from '../lib/currentSearchParams';");
    expect(service).toContain('buildPublicAccessArtifacts(siteSlug, resolveCurrentSearchParams(searchParams))');
    expect(service).toContain("action: 'sync'");
    expect(service).toContain("action: 'suggest'");
    expect(service).toContain("action: 'vote'");
    expect(service).not.toContain("supabase.from('interactive_votes')");
    expect(service).not.toContain("supabase.from('interactive_suggestions')");
    expect(service).not.toContain(".select('*')");
  });

  it('migrates and bounds interactive hub local count memory', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:15:00.000Z'));
    const key = 'interactive:maya-leo:poll:poll-1';
    window.localStorage.setItem(key, JSON.stringify({
      ' option a ': 3,
      'bad count': -1,
      [Array.from({ length: 140 }, () => 'x').join('')]: 50000,
    }));

    const counts = readInteractiveCounts(key);

    expect(counts['option-a']).toBe(3);
    expect(Object.values(counts)).toContain(9999);
    expect(counts['bad-count']).toBeUndefined();
    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T21:15:00.000Z',
      counts,
    });
  });

  it('migrates and bounds interactive hub local suggestions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T21:16:00.000Z'));
    const key = 'interactive:maya-leo:suggestions';
    window.localStorage.setItem(key, JSON.stringify([
      ` ${'a'.repeat(250)} `,
      'Late-night tacos',
      'late-night tacos',
      '',
    ]));

    const suggestions = readInteractiveSuggestions(key);

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toHaveLength(180);
    expect(suggestions[1]).toBe('Late-night tacos');
    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T21:16:00.000Z',
      suggestions,
    });
  });

  it('expires stale interactive hub local state and migrates cooldown values', () => {
    const staleDate = new Date(Date.now() - INTERACTIVE_HUB_STORAGE_RETENTION_MS - 1000).toISOString();
    const suggestionsKey = 'interactive:maya-leo:suggestions';
    const cooldownKey = 'interactive:maya-leo:suggestionCooldown';
    window.localStorage.setItem(suggestionsKey, JSON.stringify({
      savedAtISO: staleDate,
      suggestions: ['Signature mocktail'],
    }));
    window.localStorage.setItem(cooldownKey, '1778100000000');

    expect(readInteractiveSuggestions(suggestionsKey)).toEqual([]);
    expect(window.localStorage.getItem(suggestionsKey)).toBeNull();
    expect(readInteractiveCooldown(cooldownKey)).toBe(1778100000000);
    expect(JSON.parse(window.localStorage.getItem(cooldownKey) || '{}')).toHaveProperty('savedAtISO');

    window.localStorage.setItem(cooldownKey, JSON.stringify({ savedAtISO: staleDate, value: 1778100000000 }));
    expect(readInteractiveCooldown(cooldownKey)).toBe(0);
    expect(window.localStorage.getItem(cooldownKey)).toBeNull();
  });
});

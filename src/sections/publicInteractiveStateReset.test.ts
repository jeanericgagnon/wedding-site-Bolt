import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public interactive state reset guards', () => {
  it('rehydrates public interactive hub state when the active site context changes', () => {
    const hub = readFileSync(
      join(process.cwd(), 'src/sections/variants/contact/interactiveHub.tsx'),
      'utf8',
    );

    expect(hub).toContain('useEffect(() => {\n    setCounts(readInteractiveCounts(fullKey));\n  }, [fullKey]);');
    expect(hub).toContain('setSelectedPoll(null);');
    expect(hub).toContain('setSelectedPollMulti([]);');
    expect(hub).toContain('setSelectedQuiz(null);');
    expect(hub).toContain("setSuggestions(readInteractiveSuggestions(storageKey(siteSlug, 'suggestions')));");
    expect(hub).toContain('setSuggestionInput(\'\');');
    expect(hub).toContain('setSuggestionSaving(false);');
    expect(hub).toContain('setSuggestionError(\'\');');
  });

  it('clears public music request form draft state when the site context changes', () => {
    const music = readFileSync(
      join(process.cwd(), 'src/sections/variants/music/requestForm.tsx'),
      'utf8',
    );

    expect(music).toContain('useEffect(() => {');
    expect(music).toContain('setValue(\'\');');
    expect(music).toContain('setSent(false);');
    expect(music).toContain('setSaving(false);');
    expect(music).toContain('setError(\'\');');
    expect(music).toContain('setRecent([]);');
    expect(music).toContain('}, [promptKey, siteSlug]);');
  });
});

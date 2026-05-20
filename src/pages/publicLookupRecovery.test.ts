import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('public lookup recovery guards', () => {
  it('clears stale RSVP lookup and submit state when the guest edits the search field again', () => {
    const source = read('src/pages/RSVP.tsx');

    expect(source).toContain('const updateSearchValue = useCallback((value: string) => {');
    expect(source).toContain('invalidateActiveSubmit();');
    expect(source).toContain("setError('');");
    expect(source).toContain('setSearchValue(value);');
    expect(source).toContain('onSearchValueChange: updateSearchValue,');
  });

  it('clears stale guest-contact lookup status when the guest changes record selection or household scope', () => {
    const source = read('src/pages/GuestContactUpdate.tsx');

    expect(source).toContain('const clearResult = () => setResult(null);');
    expect(source).toContain('const resetLookupSelection = () => {');
    expect(source).toContain('const resetContactDraft = () => {');
    expect(source).toContain('setMatches([]);');
    expect(source).toContain("setSelectedContactSession('');");
    expect(source).toContain('setSelectedHouseholdSize(1);');
    expect(source).toContain('setSelectedHouseholdAllowed(false);');
    expect(source).toContain('setApplyHousehold(false);');
    expect(source).toContain("setEmail('');");
    expect(source).toContain("setPhone('');");
    expect(source).toContain("setRsvpStatus('');");
    expect(source).toContain("onQueryChange={(value) => { clearResult(); resetLookupSelection(); resetContactDraft(); setQuery(value); }}");
    expect(source).toContain("onVerifierChange={(value) => { clearResult(); resetLookupSelection(); resetContactDraft(); setVerifier(value); }}");
    expect(source).toContain("onHouseholdVerifierChange={(value) => { clearResult(); resetLookupSelection(); resetContactDraft(); setHouseholdVerifier(value); }}");
    expect(source).toContain('onSelectContactSession={(contactSession) => {');
    expect(source).toContain('clearResult();');
    expect(source).toContain('resetContactDraft();');
    expect(source).toContain('onToggleApplyHousehold={(value) => {');
    expect(source).toContain('setApplyHousehold(value);');
  });
});

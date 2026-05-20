import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('public invite route reset guards', () => {
  it('clears stale payment-required async state when the payment route query changes', () => {
    const source = read('src/pages/PaymentRequired.tsx');

    expect(source).toContain('const [searchParams] = useSearchParams();');
    expect(source).toContain('setLoading(false);');
    expect(source).toContain('setCheckingStatus(false);');
    expect(source).toContain('setError(null);');
    expect(source).toContain('}, [searchParams]);');
  });

  it('resets guestbook drafts when the invite route context changes', () => {
    const source = read('src/pages/GuestbookSubmit.tsx');

    expect(source).toContain('const [searchParams] = useSearchParams();');
    expect(source).toContain("setGuestName('');");
    expect(source).toContain("setGuestEmail('');");
    expect(source).toContain("setMessage('');");
    expect(source).toContain("setWebsite('');");
    expect(source).toContain('setStatus(null);');
    expect(source).toContain('setError(null);');
    expect(source).toContain('setSubmitting(false);');
    expect(source).toContain('}, [searchParams, siteSlug]);');
  });

  it('resets guest contact lookup and draft state when the invite route context changes', () => {
    const source = read('src/pages/GuestContactUpdate.tsx');

    expect(source).toContain('const [searchParams] = useSearchParams();');
    expect(source).toContain("setQuery('');");
    expect(source).toContain("setVerifier('');");
    expect(source).toContain("setHouseholdVerifier('');");
    expect(source).toContain("setSelectedContactSession('');");
    expect(source).toContain("setEmail('');");
    expect(source).toContain("setPhone('');");
    expect(source).toContain("setRsvpStatus('');");
    expect(source).toContain('setLoading(false);');
    expect(source).toContain('setSearching(false);');
    expect(source).toContain('setResult(null);');
    expect(source).toContain('}, [searchParams, siteRef]);');
  });

  it('resets vault contribution drafts and reloads against the current invite query context', () => {
    const source = read('src/pages/VaultContribute.tsx');

    expect(source).toContain('const [searchParams] = useSearchParams();');
    expect(source).toContain("const qaOpen = searchParams.get('vaultQaOpen') === '1';");
    expect(source).toContain('setSelectedFiles([]);');
    expect(source).toContain('setSubmitError(null);');
    expect(source).toContain('setUploadProgress(null);');
    expect(source).toContain('setCompressionStatus(null);');
    expect(source).toContain('setSubmitting(false);');
    expect(source).toContain("media_type: 'text',");
    expect(source).toContain('setErrors({});');
    expect(source).toContain('setIsRecordingVoice(false);');
    expect(source).toContain('}, [searchParams, siteSlug, year]);');
    expect(source).toContain('}, [qaOpen, searchParams, siteSlug, year]);');
  });
});

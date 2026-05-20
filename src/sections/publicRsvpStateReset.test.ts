import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public RSVP state reset guards', () => {
  it('resets inline RSVP confirmation state when the site or route context changes', () => {
    const rsvpSection = readFileSync(
      join(process.cwd(), 'src/sections/components/RsvpSection.tsx'),
      'utf8',
    );

    expect(rsvpSection).toContain('useEffect(() => {');
    expect(rsvpSection).toContain('setSubmitted(false);');
    expect(rsvpSection).toContain('setAttending(false);');
    expect(rsvpSection).toContain("}, [siteSlug, searchParams.toString(), sectionTitle, deadline]);");
    expect(rsvpSection).toContain("}, [siteSlug, searchParams.toString(), sectionTitle, deadline, displayName]);");
  });

  it('resets multi-event RSVP draft and status state when the public RSVP context changes', () => {
    const multiEvent = readFileSync(
      join(process.cwd(), 'src/sections/variants/rsvp/multiEvent.tsx'),
      'utf8',
    );

    expect(multiEvent).toContain('setName(\'\');');
    expect(multiEvent).toContain('setEmail(\'\');');
    expect(multiEvent).toContain('setAttending(null);');
    expect(multiEvent).toContain('setGuestCount(1);');
    expect(multiEvent).toContain('setDietary(\'\');');
    expect(multiEvent).toContain("setStatus('idle');");
    expect(multiEvent).toContain('setErrorMsg(\'\');');
    expect(multiEvent).toContain('}, [siteSlug, searchParams.toString(), headline, deadline, safeEmbedUrl, illustratedImageUrl, data.layoutStyle]);');
  });
});

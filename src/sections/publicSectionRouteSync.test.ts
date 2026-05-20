import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public section route sync guards', () => {
  it('threads live router search params through public interactive section helpers', () => {
    const service = readFileSync(join(process.cwd(), 'src/sections/interactiveSectionService.ts'), 'utf8');
    const hub = readFileSync(join(process.cwd(), 'src/sections/variants/contact/interactiveHub.tsx'), 'utf8');
    const music = readFileSync(join(process.cwd(), 'src/sections/variants/music/requestForm.tsx'), 'utf8');

    expect(service).toContain('searchParams?: URLSearchParams;');
    expect(service).toContain('...getInteractivePublicAccess(params.siteSlug, params.searchParams),');
    expect(hub).toContain('const [searchParams] = useSearchParams();');
    expect(hub).toContain('searchParams,');
    expect(music).toContain('const [searchParams] = useSearchParams();');
    expect(music).toContain('searchParams,');
  });

  it('keeps public RSVP sections on live router location instead of frozen window search state', () => {
    const rsvpSection = readFileSync(join(process.cwd(), 'src/sections/components/RsvpSection.tsx'), 'utf8');
    const multiEvent = readFileSync(join(process.cwd(), 'src/sections/variants/rsvp/multiEvent.tsx'), 'utf8');

    expect(rsvpSection).toContain('const location = useLocation();');
    expect(rsvpSection).toContain("const siteSlug = useMemo(() => location.pathname.split('/site/')[1] ?? '', [location.pathname]);");
    expect(rsvpSection).toContain('const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);');
    expect(rsvpSection).toContain('buildPublicAccessArtifacts(siteSlug, searchParams)');
    expect(rsvpSection).not.toContain('new URLSearchParams(window.location.search)');
    expect(multiEvent).toContain('const [searchParams] = useSearchParams();');
    expect(multiEvent).toContain('buildPublicAccessArtifacts(slug, searchParams)');
    expect(multiEvent).not.toContain('new URLSearchParams(window.location.search)');
  });
});

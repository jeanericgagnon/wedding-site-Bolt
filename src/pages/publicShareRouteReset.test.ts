import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public share route reset wiring', () => {
  it('resets EventHub route state when search params or slug change', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/EventHub.tsx'),
      'utf8',
    );

    expect(source).toContain('const [routerSearchParams] = useSearchParams();');
    expect(source).toContain('const searchParams = useMemo(() => new URLSearchParams(routerSearchParams), [routerSearchParams]);');
    expect(source).toContain("setGuestName('');");
    expect(source).toContain("setGuestContact('');");
    expect(source).toContain("setTravelShareStatus(null);");
    expect(source).toContain('travelCopyRequestIdRef.current += 1;');
    expect(source).toContain('const isCurrentTravelCopy = () => mountedRef.current && requestId === travelCopyRequestIdRef.current;');
    expect(source).toContain("setAnnouncement(null);");
    expect(source).toContain('}, [searchParams, slug]);');
  });

  it('resets EventRecap route state when search params or slug change', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/EventRecap.tsx'),
      'utf8',
    );

    expect(source).toContain('const [routerSearchParams] = useSearchParams();');
    expect(source).toContain('const searchParams = useMemo(() => new URLSearchParams(routerSearchParams), [routerSearchParams]);');
    expect(source).toContain('setData(null);');
    expect(source).toContain("setGuestName('');");
    expect(source).toContain("setEmail('');");
    expect(source).toContain("setPhone('');");
    expect(source).toContain("setShareStatus(null);");
    expect(source).toContain('}, [searchParams, slug]);');
  });
});

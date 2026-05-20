import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard tool route intents', () => {
  it('consumes the vault anniversary tool route after opening the helper target', () => {
    const source = read('src/pages/dashboard/Vault.tsx');

    expect(source).toContain("if (searchParams.get('tool') !== 'anniversary-capsules') return;");
    expect(source).toContain("nextParams.delete('tool');");
    expect(source).toContain("target.scrollIntoView({ behavior: 'smooth', block: 'start' });");
    expect(source).toContain("navigate(");
    expect(source).toContain("{ replace: true },");
  });

  it('consumes guest-photo tool routes after scrolling to the requested dashboard surface', () => {
    const source = read('src/pages/dashboard/GuestPhotoSharing.tsx');

    expect(source).toContain('const targetIds = resolveGuestPhotoScrollTargets(location.search);');
    expect(source).toContain("nextParams.delete('tool');");
    expect(source).toContain("target.scrollIntoView({ behavior: 'smooth', block: 'start' });");
    expect(source).toContain("{ replace: true },");
  });

  it('consumes guest dashboard tool and tab route hints after applying the requested workspace mode', () => {
    const source = read('src/pages/dashboard/Guests.tsx');

    expect(source).toContain('const routeState = resolveGuestRouteState(searchParams.toString() ? `?${searchParams.toString()}` : \'\');');
    expect(source).toContain('if (routeState.guestsTab !== null) setGuestsTab(routeState.guestsTab);');
    expect(source).toContain("if (nextSearchParams.has('tool') || nextSearchParams.get('tab') === 'rsvp-settings' || nextSearchParams.get('tab') === 'list') {");
    expect(source).toContain("nextSearchParams.delete('tool');");
    expect(source).toContain("nextSearchParams.delete('tab');");
    expect(source).toContain("{ replace: true },");
  });
});

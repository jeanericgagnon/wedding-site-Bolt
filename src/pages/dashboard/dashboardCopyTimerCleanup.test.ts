import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard copy timer cleanup guards', () => {
  it('cleans up payment summary copy timers on unmount', () => {
    const source = read('src/pages/dashboard/planning/PaymentsTab.tsx');

    expect(source).toContain('const summaryCopyNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (summaryCopyNoticeTimeoutRef.current) window.clearTimeout(summaryCopyNoticeTimeoutRef.current);');
  });

  it('cleans up DJ list copy timers on unmount', () => {
    const source = read('src/pages/dashboard/planning/SongRequestsTab.tsx');

    expect(source).toContain('const djListCopyNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (djListCopyNoticeTimeoutRef.current) window.clearTimeout(djListCopyNoticeTimeoutRef.current);');
  });

  it('cleans up address collection copy timers on unmount', () => {
    const source = read('src/pages/dashboard/planning/AddressCollectionTab.tsx');

    expect(source).toContain('const copyNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);');
  });

  it('cleans up guest itinerary drawer copy timers on unmount', () => {
    const source = read('src/pages/dashboard/guests/GuestItineraryDrawer.tsx');

    expect(source).toContain('const copyNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);');
    expect(source).toContain("copyNoticeTimeoutRef.current = window.setTimeout(() => setCopyNotice((current) => (current?.key === 'preview' ? null : current)), 1800);");
  });
});

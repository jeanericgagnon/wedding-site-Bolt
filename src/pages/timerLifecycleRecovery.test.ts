import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('timer lifecycle recovery guards', () => {
  it('cleans up vendor live-url notice timers on unmount', () => {
    const source = read('src/pages/VendorProfileCreate.tsx');

    expect(source).toContain('const liveUrlNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (liveUrlNoticeTimeoutRef.current) window.clearTimeout(liveUrlNoticeTimeoutRef.current);');
  });

  it('cleans up vault card share, recap, and delete timers on unmount', () => {
    const source = read('src/pages/dashboard/VaultCard.tsx');

    expect(source).toContain('const shareLinkNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const recapLinkNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const confirmDeleteTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (confirmDeleteTimeoutRef.current) window.clearTimeout(confirmDeleteTimeoutRef.current);');
  });

  it('cleans up shared QR copy-status timers on unmount', () => {
    const source = read('src/components/ui/ShareQrPanel.tsx');

    expect(source).toContain('const copyStatusTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);');
  });

  it('cleans up payment success navigation and polling timers on unmount', () => {
    const source = read('src/pages/PaymentSuccess.tsx');

    expect(source).toContain('const navTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const pollTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const clearTimers = () => {');
    expect(source).toContain('cancelled = true;');
    expect(source).toContain('if (cancelled) return;');
    expect(source).toContain('const redirectToNextStep = (paymentStatus: string | null) => {\n        if (cancelled) return;');
    expect(source).toContain('pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);');
  });

  it('cleans up planner copy timers on unmount', () => {
    const source = read('src/pages/dashboard/planning/NameChangePlannerTab.tsx');

    expect(source).toContain('const copiedTemplateNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const copiedPlannerExportNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const copiedInstitutionPacketNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (copiedInstitutionPacketNoticeTimeoutRef.current) window.clearTimeout(copiedInstitutionPacketNoticeTimeoutRef.current);');
  });

  it('cleans up builder lab save and notice timers on unmount', () => {
    const source = read('src/pages/BuilderV2Lab.tsx');

    expect(source).toContain('const saveStateTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const actionNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (saveStateTimeoutRef.current) window.clearTimeout(saveStateTimeoutRef.current);');
    expect(source).toContain('actionNoticeTimeoutRef.current = window.setTimeout(() => setActionNotice(\'\'), 2200);');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard timer cleanup recovery guards', () => {
  it('cleans up error-log copy timers on unmount', () => {
    const source = read('src/pages/dashboard/ErrorLogs.tsx');

    expect(source).toContain('const copyStatusTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('const copyStatusRequestIdRef = useRef(0);');
    expect(source).toContain('const isCurrentCopyRequest = () => mountedRef.current && requestId === copyStatusRequestIdRef.current;');
    expect(source).toContain('if (copyStatusTimeoutRef.current) window.clearTimeout(copyStatusTimeoutRef.current);');
  });

  it('cleans up guest-photo export copy timers on unmount', () => {
    const source = read('src/pages/dashboard/guestPhotos/useGuestPhotoExportActions.ts');

    expect(source).toContain('const copyNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (copyNoticeTimeoutRef.current) window.clearTimeout(copyNoticeTimeoutRef.current);');
  });

  it('cleans up registry owner cooldown and copied-hint timers on unmount', () => {
    const source = read('src/pages/dashboard/registry/RegistryItemCard.tsx');

    expect(source).toContain('const copiedHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);');
    expect(source).toContain('if (cooldownRef.current) clearTimeout(cooldownRef.current);');
    expect(source).toContain('if (copiedHintTimeoutRef.current) clearTimeout(copiedHintTimeoutRef.current);');
  });
});

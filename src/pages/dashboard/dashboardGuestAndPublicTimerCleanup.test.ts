import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard guest and public timer cleanup guards', () => {
  it('cleans up public registry purchase and cash-fund timers on unmount', () => {
    const source = read('src/sections/components/RegistrySection.tsx');

    expect(source).toContain('const closeTimerRef = useRef<number | null>(null);');
    expect(source).toContain('const zelleStatusTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);');
    expect(source).toContain('if (zelleStatusTimeoutRef.current) window.clearTimeout(zelleStatusTimeoutRef.current);');
    expect(source).toContain('closeTimerRef.current = window.setTimeout(onClose, 2000);');
  });

  it('cleans up guest delete confirmation timers on unmount', () => {
    const source = read('src/pages/dashboard/guests/useGuestDashboardCrudActions.ts');

    expect(source).toContain('const confirmDeleteTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (confirmDeleteTimeoutRef.current) window.clearTimeout(confirmDeleteTimeoutRef.current);');
    expect(source).toContain('confirmDeleteTimeoutRef.current = window.setTimeout(() => setConfirmDeleteId(null), 3000);');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard toast timer cleanup guards', () => {
  it('cleans up message dashboard toast timers on unmount', () => {
    const source = read('src/pages/dashboard/messages/useMessageDashboardUiState.ts');

    expect(source).toContain('const toastTimeoutsRef = useRef<number[]>([]);');
    expect(source).toContain('toastTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));');
    expect(source).toContain('toastTimeoutsRef.current.push(timer);');
  });

  it('cleans up registry dashboard toast timers on unmount', () => {
    const source = read('src/pages/dashboard/Registry.tsx');

    expect(source).toContain('const toastTimeoutsRef = useRef<number[]>([]);');
    expect(source).toContain('toastTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));');
    expect(source).toContain('toastTimeoutsRef.current.push(timer);');
  });

  it('cleans up vault dashboard toast timers on unmount', () => {
    const source = read('src/pages/dashboard/Vault.tsx');

    expect(source).toContain('const toastTimeoutsRef = useRef<number[]>([]);');
    expect(source).toContain('toastTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));');
    expect(source).toContain('toastTimeoutsRef.current.push(timer);');
  });
});

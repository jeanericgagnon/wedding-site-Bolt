import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public prop-seeded state reset guards', () => {
  it('resets registry purchase modal state when the active item changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/sections/components/RegistrySection.tsx'),
      'utf8',
    );

    expect(source).toContain("useEffect(() => {");
    expect(source).toContain("setName('');");
    expect(source).toContain("setLoading(false);");
    expect(source).toContain("setDone(false);");
    expect(source).toContain('}, [item.id]);');
  });

  it('recomputes countdown state immediately when the target date changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/sections/variants/countdown/simple.tsx'),
      'utf8',
    );

    expect(source).toContain('setTime(getTime());');
    expect(source).toContain('}, [targetDate]);');
  });

  it('resets quote reveal state when quote content changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/sections/variants/quotes/grid.tsx'),
      'utf8',
    );

    expect(source).toContain('function useIntersection(ref: React.RefObject<Element | null>, resetKey: string, threshold = 0.1) {');
    expect(source).toContain('setVisible(false);');
    expect(source).toContain('}, [resetKey, threshold]);');
    expect(source).toContain("const visibilityKey = `${q.id}|${q.text}|${q.author}|${q.role}|${q.photo}`;");
    expect(source).toContain('const visible = useIntersection(ref, visibilityKey);');
  });

  it('resets custom section reveal state when block content changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/sections/variants/custom/customSection.tsx'),
      'utf8',
    );

    expect(source).toContain('function useScrollReveal(ref: React.RefObject<Element | null>, resetKey: string) {');
    expect(source).toContain('setVisible(false);');
    expect(source).toContain('}, [resetKey]);');
    expect(source).toContain('const visibilityKey = JSON.stringify(block);');
    expect(source).toContain('const visible = useScrollReveal(ref, visibilityKey);');
  });
});

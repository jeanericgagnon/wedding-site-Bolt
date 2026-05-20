import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public gallery and quotes selection reset guards', () => {
  it('resets public gallery active selection when image collections change', () => {
    const carousel = readFileSync(
      join(process.cwd(), 'src/sections/variants/gallery/carousel.tsx'),
      'utf8',
    );
    const filmStrip = readFileSync(
      join(process.cwd(), 'src/sections/variants/gallery/filmStrip.tsx'),
      'utf8',
    );
    const polaroid = readFileSync(
      join(process.cwd(), 'src/sections/variants/gallery/polaroid.tsx'),
      'utf8',
    );

    expect(carousel).toContain('useEffect(() => {\n    setIndex(0);\n  }, [data.images]);');
    expect(filmStrip).toContain('setLightboxIndex(null);');
    expect(filmStrip).toContain('setActiveIndex(0);');
    expect(filmStrip).toContain('setIsGlidePaused(false);');
    expect(filmStrip).toContain('}, [data.images]);');
    expect(polaroid).toContain('useEffect(() => {\n    setLightboxIndex(null);\n  }, [data.images]);');
  });

  it('resets public quote carousel selection when quote collections change', () => {
    const quotes = readFileSync(
      join(process.cwd(), 'src/sections/variants/quotes/carousel.tsx'),
      'utf8',
    );

    expect(quotes).toContain('useEffect(() => {\n    setCurrent(0);\n  }, [data.quotes]);');
  });
});

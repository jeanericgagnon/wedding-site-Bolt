import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public media and FAQ state reset guards', () => {
  it('resets FAQ helper state when the visible FAQ set changes', () => {
    const faqSection = readFileSync(
      join(process.cwd(), 'src/sections/components/FaqSection.tsx'),
      'utf8',
    );

    expect(faqSection).toContain('useEffect(() => {');
    expect(faqSection).toContain('setOpenId(null);');
    expect(faqSection).toContain('setSearch(\'\');');
    expect(faqSection).toContain("setCategory('all');");
    expect(faqSection).toContain('}, [faqsToShow]);');
  });

  it('resets public gallery and video transient state when the backing media changes', () => {
    const galleryGrid = readFileSync(
      join(process.cwd(), 'src/sections/variants/gallery/grid.tsx'),
      'utf8',
    );
    const galleryMasonry = readFileSync(
      join(process.cwd(), 'src/sections/variants/gallery/masonry.tsx'),
      'utf8',
    );
    const videoFull = readFileSync(
      join(process.cwd(), 'src/sections/variants/video/full.tsx'),
      'utf8',
    );
    const videoInline = readFileSync(
      join(process.cwd(), 'src/sections/variants/video/inline.tsx'),
      'utf8',
    );

    expect(galleryGrid).toContain('useEffect(() => {\n    setLightboxIndex(null);\n  }, [data.images]);');
    expect(galleryMasonry).toContain('useEffect(() => {\n    setLightboxIndex(null);\n  }, [data.images]);');
    expect(videoFull).toContain('useEffect(() => {\n    setPlaying(false);\n  }, [data.layoutStyle, data.videoType, data.videoUrl, data.thumbnailUrl, data.autoplay]);');
    expect(videoInline).toContain('useEffect(() => {\n    setPlaying(false);\n  }, [data.contentPosition, data.videoType, data.videoUrl, data.thumbnailUrl]);');
  });
});

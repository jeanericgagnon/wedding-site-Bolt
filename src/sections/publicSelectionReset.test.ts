import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public section selection reset guards', () => {
  it('resets schedule day selection when schedule groups or days change', () => {
    const scheduleSection = readFileSync(
      join(process.cwd(), 'src/sections/components/ScheduleSection.tsx'),
      'utf8',
    );
    const scheduleTabs = readFileSync(
      join(process.cwd(), 'src/sections/variants/schedule/dayTabs.tsx'),
      'utf8',
    );

    expect(scheduleSection).toContain('useEffect(() => {\n    setActiveDay(dayGroups[0]?.key ?? \'\');\n  }, [dayGroups]);');
    expect(scheduleTabs).toContain('useEffect(() => {\n    setActiveDay(data.days[0]?.id ?? \'\');\n  }, [data.days]);');
  });

  it('resets playlist, menu, and faq selections when public section data changes', () => {
    const playlist = readFileSync(
      join(process.cwd(), 'src/sections/variants/music/playlist.tsx'),
      'utf8',
    );
    const menuTabs = readFileSync(
      join(process.cwd(), 'src/sections/variants/menu/tabs.tsx'),
      'utf8',
    );
    const faq = readFileSync(
      join(process.cwd(), 'src/sections/variants/faq/accordion.tsx'),
      'utf8',
    );

    expect(playlist).toContain('useEffect(() => {\n    setActiveTab(0);\n  }, [data.playlists]);');
    expect(menuTabs).toContain('useEffect(() => {\n    setActiveTab(0);\n  }, [data.courses]);');
    expect(faq).toContain('setOpenId(data.expandFirstByDefault && data.items[0] ? data.items[0].id : null);');
    expect(faq).toContain("setActiveCategory(categories[0] ?? 'Details');");
    expect(faq).toContain('}, [categories, data.expandFirstByDefault, data.items]);');
  });
});

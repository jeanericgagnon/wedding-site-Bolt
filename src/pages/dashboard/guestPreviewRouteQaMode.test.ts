import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest preview QA route mode', () => {
  it('forces the guests dashboard into list mode for the guest preview proof lane', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Guests.tsx'), 'utf8');

    expect(source).toContain("import React, { useEffect, useMemo, useRef } from 'react';");
    expect(source).toContain("const guestPreviewQa = searchParams.get('guestPreviewQa') === '1';");
    expect(source).toContain('if (!guestPreviewQa) return;');
    expect(source).toContain("setViewMode('list');");
    expect(source).toContain('setShowInsights(false);');
    expect(source).toContain('setCheckInMode(false);');
  });
});

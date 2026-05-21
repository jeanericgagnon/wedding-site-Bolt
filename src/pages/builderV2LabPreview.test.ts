import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/demoData', () => ({
  demoWeddingSite: {
    couple_name_1: 'Alex',
    couple_name_2: '',
    wedding_date: '2026-09-12',
  },
}));

import { getInitialBuilderV2LabPreviewFields } from './builderV2LabPreview';

describe('builder v2 lab preview defaults', () => {
  it('keeps single-name couple previews truthful when demo names are incomplete', () => {
    expect(getInitialBuilderV2LabPreviewFields().coupleDisplayName).toBe('Alex');
  });

  it('keeps demo date defaults intact', () => {
    expect(getInitialBuilderV2LabPreviewFields().eventDateISO).toBe('2026-09-12T16:00:00');
    expect(getInitialBuilderV2LabPreviewFields().rsvpDeadlineISO).toBe('2026-09-12T00:00:00');
  });

  it('keeps builder lab layout export on the shared attached-anchor download helper', () => {
    const builderLab = readFileSync(resolve(__dirname, 'BuilderV2Lab.tsx'), 'utf8');

    expect(builderLab).toContain("import { downloadTextFile } from '../lib/copyText';");
    expect(builderLab).toContain('downloadTextFile(');
    expect(builderLab).toContain('application/json;charset=utf-8');
    expect(builderLab).not.toContain('a.download = `builder-v2-${Date.now()}.json`;');
  });
});

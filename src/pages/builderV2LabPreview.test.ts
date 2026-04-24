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
});

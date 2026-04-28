import { describe, expect, it } from 'vitest';
import { getArchiveModeDescriptor } from './archiveMode';

describe('getArchiveModeDescriptor', () => {
  it('falls back to planning mode when the persisted wedding date is impossible', () => {
    expect(getArchiveModeDescriptor({ weddingDate: '2027-02-30' })).toMatchObject({
      state: 'planning',
      isArchiveLike: false,
    });
  });

  it('keeps archived mode precedence even when the wedding date is impossible', () => {
    expect(getArchiveModeDescriptor({ weddingDate: '2027-02-30', archivedAt: '2027-03-01T00:00:00Z' })).toMatchObject({
      state: 'archived',
      isArchiveLike: true,
    });
  });
});

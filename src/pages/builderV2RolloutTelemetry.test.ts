import { beforeEach, describe, expect, it } from 'vitest';

import {
  appendBuilderV2RolloutTelemetryEntry,
  type BuilderV2RolloutTelemetryEntry,
  createEmptyBuilderV2RolloutTelemetrySnapshot,
  readBuilderV2RolloutTelemetry,
  summarizeBuilderV2RolloutTelemetry,
  writeBuilderV2RolloutTelemetry,
} from './builderV2RolloutTelemetry';

describe('builderV2RolloutTelemetry', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('reads an empty snapshot when storage is blank', () => {
    expect(readBuilderV2RolloutTelemetry()).toEqual({ entries: [] });
  });

  it('appends entries and writes them back to session storage', () => {
    const snapshot = appendBuilderV2RolloutTelemetryEntry(
      createEmptyBuilderV2RolloutTelemetrySnapshot(),
      {
        action: 'add',
        outcome: 'success',
        operation: 'section',
        recordedAtISO: '2026-05-28T12:00:00.000Z',
      },
    );

    expect(writeBuilderV2RolloutTelemetry(snapshot)).toBe(true);
    expect(readBuilderV2RolloutTelemetry()).toEqual(snapshot);
  });

  it('summarizes success and failure rates by rollout action', () => {
    const entries: BuilderV2RolloutTelemetryEntry[] = [
      { action: 'add', outcome: 'success', operation: 'section', recordedAtISO: '2026-05-28T12:00:00.000Z' },
      { action: 'add', outcome: 'failure', operation: 'block', recordedAtISO: '2026-05-28T12:01:00.000Z', reason: 'Max 3 Text Block block(s)' },
      { action: 'duplicate', outcome: 'failure', operation: 'page', recordedAtISO: '2026-05-28T12:02:00.000Z', reason: 'We could not duplicate that page yet' },
      { action: 'import', outcome: 'success', operation: 'builder-v2-layout', recordedAtISO: '2026-05-28T12:03:00.000Z' },
      { action: 'export', outcome: 'failure', operation: 'copy-json', recordedAtISO: '2026-05-28T12:04:00.000Z', reason: 'Clipboard is unavailable in this browser context' },
    ];

    const snapshot = entries.reduce(
      (current, entry) => appendBuilderV2RolloutTelemetryEntry(current, entry),
      createEmptyBuilderV2RolloutTelemetrySnapshot(),
    );

    expect(summarizeBuilderV2RolloutTelemetry(snapshot)).toEqual([
      {
        action: 'add',
        label: 'Add',
        totalCount: 2,
        successCount: 1,
        failureCount: 1,
        failureRate: 0.5,
        latestFailureReason: 'Max 3 Text Block block(s)',
      },
      {
        action: 'duplicate',
        label: 'Duplicate',
        totalCount: 1,
        successCount: 0,
        failureCount: 1,
        failureRate: 1,
        latestFailureReason: 'We could not duplicate that page yet',
      },
      {
        action: 'remove',
        label: 'Remove',
        totalCount: 0,
        successCount: 0,
        failureCount: 0,
        failureRate: 0,
        latestFailureReason: null,
      },
      {
        action: 'import',
        label: 'Import',
        totalCount: 1,
        successCount: 1,
        failureCount: 0,
        failureRate: 0,
        latestFailureReason: null,
      },
      {
        action: 'export',
        label: 'Export',
        totalCount: 1,
        successCount: 0,
        failureCount: 1,
        failureRate: 1,
        latestFailureReason: 'Clipboard is unavailable in this browser context',
      },
    ]);
  });
});

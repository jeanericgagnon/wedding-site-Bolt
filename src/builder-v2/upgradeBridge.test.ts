import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumeBuilderV2UpgradeBridge, saveBuilderV2UpgradeBridge } from './upgradeBridge';
import { createEmptyBuilderProject } from '../types/builder/project';
import { createEmptyWeddingData } from '../types/weddingData';

describe('builderV2 upgrade bridge', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it('stores and consumes a current builder draft for the V2 lab', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T21:00:00.000Z'));

    const project = createEmptyBuilderProject('site-1', 'modern-luxe');
    const weddingData = createEmptyWeddingData();
    weddingData.couple.partner1Name = 'Alex';
    weddingData.couple.partner2Name = 'Jordan';

    expect(saveBuilderV2UpgradeBridge({
      sourceName: 'Alex & Jordan current builder draft',
      project,
      weddingData,
    })).toBe(true);

    const result = consumeBuilderV2UpgradeBridge(new Date('2026-05-27T21:05:00.000Z').getTime());
    expect(result).toMatchObject({
      sourceName: 'Alex & Jordan current builder draft',
      project: { weddingId: 'site-1' },
      weddingData: { couple: { partner1Name: 'Alex', partner2Name: 'Jordan' } },
    });
    expect(window.sessionStorage.getItem('dayof.builder-v2-upgrade-bridge')).toBeNull();
  });

  it('drops stale upgrade drafts instead of opening a misleading migration', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-27T21:00:00.000Z'));

    const project = createEmptyBuilderProject('site-2', 'modern-luxe');
    saveBuilderV2UpgradeBridge({
      sourceName: 'Stale draft',
      project,
      weddingData: null,
    });

    const result = consumeBuilderV2UpgradeBridge(new Date('2026-05-27T21:45:01.000Z').getTime());
    expect(result).toBeNull();
  });
});

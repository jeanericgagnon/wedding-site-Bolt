import { beforeEach, describe, expect, it } from 'vitest';

import { emptySetupDraft } from '../lib/setupDraft';
import {
  clearBuilderV2SetupBridge,
  consumeBuilderV2SetupBridge,
  readBuilderV2SetupBridge,
  saveBuilderV2SetupBridge,
} from './builderV2SetupBridge';

describe('builderV2SetupBridge', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('saves and consumes a fresh setup bridge draft', () => {
    const draft = {
      ...emptySetupDraft,
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingCity: 'Napa',
      selectedTemplateId: 'coastal-breeze',
    };

    expect(saveBuilderV2SetupBridge(draft)).toBe(true);
    expect(readBuilderV2SetupBridge()).toEqual(draft);
    expect(consumeBuilderV2SetupBridge()).toEqual(draft);
    expect(readBuilderV2SetupBridge()).toBeNull();
  });

  it('drops expired setup bridge drafts', () => {
    const draft = {
      ...emptySetupDraft,
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
    };

    expect(saveBuilderV2SetupBridge(draft)).toBe(true);
    const thirtyOneMinutesLater = Date.now() + (31 * 60 * 1000);

    expect(readBuilderV2SetupBridge(thirtyOneMinutesLater)).toBeNull();
    expect(consumeBuilderV2SetupBridge(thirtyOneMinutesLater)).toBeNull();
  });

  it('clears the setup bridge explicitly', () => {
    expect(saveBuilderV2SetupBridge(emptySetupDraft)).toBe(true);
    clearBuilderV2SetupBridge();
    expect(readBuilderV2SetupBridge()).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  REGISTRY_DASHBOARD_ITEMS_LOAD_RETRY_ERROR,
  REGISTRY_DASHBOARD_LOAD_ERROR,
  REGISTRY_DASHBOARD_SETUP_RETRY_ERROR,
  REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR,
  REGISTRY_DUPLICATE_MERGE_RETRY_ERROR,
  REGISTRY_DUPLICATE_REVIEW_COPY_RETRY_ERROR,
  REGISTRY_ITEM_DELETE_RETRY_ERROR,
  REGISTRY_ITEM_SAVE_RETRY_ERROR,
  REGISTRY_ITEM_PURCHASE_RETRY_ERROR,
  REGISTRY_ITEM_PURCHASE_RESET_RETRY_ERROR,
  REGISTRY_METADATA_REFRESH_RETRY_ERROR,
  REGISTRY_METADATA_REIMPORT_RETRY_ERROR,
  REGISTRY_THANK_YOU_SAVE_RETRY_ERROR,
  REGISTRY_THANK_YOU_UPDATE_RETRY_ERROR,
  safeRegistryDashboardError,
} from './registryDashboardErrorCopy';

describe('registryDashboardErrorCopy', () => {
  it('masks provider and backend errors behind calm registry dashboard copy', () => {
    expect(safeRegistryDashboardError(new Error('openai provider timeout token=abc'), REGISTRY_ITEM_DELETE_RETRY_ERROR)).toBe(
      REGISTRY_ITEM_DELETE_RETRY_ERROR,
    );
    expect(
      safeRegistryDashboardError(
        new Error('Supabase row-level security policy denied thank_you_ledger update'),
        REGISTRY_THANK_YOU_SAVE_RETRY_ERROR,
      ),
    ).toBe(REGISTRY_THANK_YOU_SAVE_RETRY_ERROR);
  });

  it('uses the fallback when no readable message is available', () => {
    expect(safeRegistryDashboardError(null, REGISTRY_DASHBOARD_ITEMS_LOAD_RETRY_ERROR)).toBe(
      REGISTRY_DASHBOARD_ITEMS_LOAD_RETRY_ERROR,
    );
  });

  it('keeps registry dashboard recovery copy calm and customer-safe', () => {
    expect(REGISTRY_DASHBOARD_ITEMS_LOAD_RETRY_ERROR).toBe('Could not load registry items right now. Please try again.');
    expect(REGISTRY_DASHBOARD_SETUP_RETRY_ERROR).toBe('Could not finish setup right now. Please try again.');
    expect(REGISTRY_DASHBOARD_LOAD_ERROR).toBe('Could not load registry right now. Try again in a moment.');
    expect(REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR).toBe('Could not save refresh settings right now. Please try again.');
    expect(REGISTRY_METADATA_REFRESH_RETRY_ERROR).toBe('Could not refresh gift details right now. Please try again.');
    expect(REGISTRY_METADATA_REIMPORT_RETRY_ERROR).toBe('Could not refresh this gift right now. Try Edit if the store page is light on details.');
    expect(REGISTRY_DUPLICATE_REVIEW_COPY_RETRY_ERROR).toBe('Could not copy the duplicate review list right now.');
    expect(REGISTRY_DUPLICATE_MERGE_RETRY_ERROR).toBe('Could not merge those duplicate gifts right now. Please try again.');
    expect(REGISTRY_THANK_YOU_SAVE_RETRY_ERROR).toBe('Could not save thank-you follow-up right now. Please try again.');
    expect(REGISTRY_THANK_YOU_UPDATE_RETRY_ERROR).toBe('Could not update thank-you follow-up right now. Please try again.');
    expect(REGISTRY_ITEM_SAVE_RETRY_ERROR).toBe('Could not save this gift right now. Please try again.');
    expect(REGISTRY_ITEM_DELETE_RETRY_ERROR).toBe('Could not remove that gift right now. Please try again.');
    expect(REGISTRY_ITEM_PURCHASE_RETRY_ERROR).toBe('Could not update that gift right now. Please try again.');
    expect(REGISTRY_ITEM_PURCHASE_RESET_RETRY_ERROR).toBe('Could not clear purchase state right now. Please try again.');
  });
});

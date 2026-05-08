import { describe, expect, it } from 'vitest';
import {
  isInternalPhotoAnalysisCopy,
  safeOptionalPhotoAnalysisText,
  safePhotoAnalysisList,
  safePhotoAnalysisText,
} from './photoAnalysisCustomerCopy';

describe('photo analysis customer copy', () => {
  it('hides provider and cost wording from customer-facing photo analysis copy', () => {
    expect(isInternalPhotoAnalysisCopy('OpenAI GPT-4.1 failed because token spend limit was reached')).toBe(true);
    expect(safePhotoAnalysisText('OpenAI GPT-4.1 failed because token spend limit was reached')).toBe('Ready to review');
    expect(safeOptionalPhotoAnalysisText('OpenAI GPT-4.1 failed because token spend limit was reached')).toBeNull();
    expect(isInternalPhotoAnalysisCopy('Google OAuth service_role api-key refresh failed')).toBe(true);
    expect(safePhotoAnalysisText('Google OAuth service_role api-key refresh failed')).toBe('Ready to review');
  });

  it('hides storage and backend wording from customer-facing photo analysis copy', () => {
    expect(isInternalPhotoAnalysisCopy('Storage bucket policy failed for photo-analyze-batch')).toBe(true);
    expect(safePhotoAnalysisText('Storage bucket policy failed for photo-analyze-batch')).toBe('Ready to review');
    expect(safeOptionalPhotoAnalysisText('Database function returned request failed')).toBeNull();
  });

  it('keeps normal wedding moment copy intact', () => {
    expect(safePhotoAnalysisText('Cocktail hour candids')).toBe('Cocktail hour candids');
    expect(safePhotoAnalysisText('Head table flowers')).toBe('Head table flowers');
    expect(safePhotoAnalysisList(['ceremony', 'first dance', 'GPT model retry', 'storage permission denied'])).toEqual([
      'ceremony',
      'first dance',
      'Needs review',
    ]);
  });
});

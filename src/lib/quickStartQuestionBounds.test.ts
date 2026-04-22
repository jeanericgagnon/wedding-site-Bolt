import { describe, expect, it } from 'vitest';
import { clampQuickStartQuestionIndex } from './quickStartQuestionBounds';

describe('quickStartQuestionBounds', () => {
  it('clamps negative and invalid indexes to zero', () => {
    expect(clampQuickStartQuestionIndex(-1, 14)).toBe(0);
    expect(clampQuickStartQuestionIndex(Number.NaN, 14)).toBe(0);
  });

  it('clamps fractional and unsafe indexes to zero', () => {
    expect(clampQuickStartQuestionIndex(2.5, 14)).toBe(0);
    expect(clampQuickStartQuestionIndex(Number.MAX_SAFE_INTEGER + 1, 14)).toBe(0);
  });

  it('clamps invalid question counts to zero', () => {
    expect(clampQuickStartQuestionIndex(2, -1)).toBe(0);
    expect(clampQuickStartQuestionIndex(2, 0)).toBe(0);
    expect(clampQuickStartQuestionIndex(2, 2.5)).toBe(0);
    expect(clampQuickStartQuestionIndex(2, Number.MAX_SAFE_INTEGER + 1)).toBe(0);
    expect(clampQuickStartQuestionIndex(2, Number.NaN)).toBe(0);
  });

  it('clamps oversized indexes to the last valid question', () => {
    expect(clampQuickStartQuestionIndex(99, 14)).toBe(13);
  });

  it('keeps valid indexes unchanged', () => {
    expect(clampQuickStartQuestionIndex(5, 14)).toBe(5);
  });
});

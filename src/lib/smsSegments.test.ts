import { describe, expect, it } from 'vitest';
import { countSmsSegments, estimateSmsCredits } from './smsSegments';

describe('sms segment credit math', () => {
  it('counts one 160-character segment per recipient', () => {
    expect(countSmsSegments('')).toBe(0);
    expect(countSmsSegments('x'.repeat(160))).toBe(1);
    expect(countSmsSegments('x'.repeat(161))).toBe(2);
    expect(estimateSmsCredits('x'.repeat(161), 3)).toBe(6);
  });
});

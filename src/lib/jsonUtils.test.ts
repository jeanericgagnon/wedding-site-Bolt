import { describe, it, expect } from 'vitest';
import { safeJsonParse } from './jsonUtils';

describe('safeJsonParse', () => {
  it('returns fallback for null', () => {
    expect(safeJsonParse(null, { default: true })).toEqual({ default: true });
  });

  it('returns fallback for undefined', () => {
    expect(safeJsonParse(undefined, { default: true })).toEqual({ default: true });
  });

  it('returns object as-is', () => {
    const obj = { a: 1 };
    expect(safeJsonParse(obj, {})).toBe(obj);
  });

  it('parses valid JSON string', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('not json', {})).toEqual({});
  });

  it('returns fallback when JSON is non-object (number)', () => {
    expect(safeJsonParse('42', {})).toEqual({});
  });

  it('returns fallback when JSON is null string', () => {
    expect(safeJsonParse('null', {})).toEqual({});
  });

  it('handles nested objects', () => {
    expect(safeJsonParse('{"a":{"b":2}}', {})).toEqual({ a: { b: 2 } });
  });
});

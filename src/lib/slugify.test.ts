import { describe, it, expect } from 'vitest';
import { slugify, generateWeddingSlug } from './slugify';

describe('slugify', () => {
  it('lowercases text', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(slugify('hello! @world#')).toBe('hello-world');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo--bar')).toBe('foo-bar');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('-foo-')).toBe('foo');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles already-slug input', () => {
    expect(slugify('already-slug')).toBe('already-slug');
  });
});

describe('generateWeddingSlug', () => {
  it('generates slug from two names', () => {
    expect(generateWeddingSlug('Alice', 'Bob')).toBe('alice-and-bob');
  });

  it('slugifies two names joined with and', () => {
    const slug = generateWeddingSlug('', '');
    expect(slug).toBe('and');
  });
});

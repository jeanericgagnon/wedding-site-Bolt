import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  isSafeEmailAddress,
  safeEmailHref,
  safeEmailUrl,
  sanitizeEmailSubject,
} from '../../supabase/functions/_shared/emailSafety';

describe('shared Edge Function email safety helpers', () => {
  it('escapes hostile HTML before interpolation into transactional templates', () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')">&done`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;done',
    );
  });

  it('keeps email URLs to public http/https destinations only', () => {
    expect(safeEmailUrl('https://dayof.love/rsvp?token=abc#details')).toBe('https://dayof.love/rsvp?token=abc#details');
    expect(safeEmailUrl('http://example.com/path')).toBe('http://example.com/path');
    expect(safeEmailUrl('javascript:alert(1)', 'https://dayof.love')).toBe('https://dayof.love');
    expect(safeEmailUrl('data:text/html,<script>alert(1)</script>', null)).toBeNull();
    expect(safeEmailUrl('https://user:pass@dayof.love/rsvp', 'https://dayof.love')).toBe('https://dayof.love');
    expect(safeEmailUrl('http://169.254.169.254/latest/meta-data', null)).toBeNull();
    expect(safeEmailUrl('https://metadata.google.internal/computeMetadata/v1/', 'https://dayof.love')).toBe('https://dayof.love');
    expect(safeEmailUrl('http://localhost:54321/rsvp', 'https://dayof.love')).toBe('https://dayof.love');
    expect(safeEmailUrl('https://proof.invalid/rsvp', 'https://dayof.love')).toBe('https://dayof.love');
    expect(safeEmailUrl('https://preview.example/rsvp', 'https://dayof.love')).toBe('https://dayof.love');
    expect(safeEmailUrl('not a url', 'https://dayof.love/fallback')).toBe('https://dayof.love/fallback');
  });

  it('escapes href attributes after URL validation', () => {
    expect(safeEmailHref('https://example.com/search?q=<tag>&next="quoted"')).toBe(
      'https://example.com/search?q=%3Ctag%3E&amp;next=%22quoted%22',
    );
    expect(safeEmailHref('file:///etc/passwd', 'https://dayof.love')).toBe('https://dayof.love');
  });

  it('sanitizes subjects by removing control characters and bounding length', () => {
    expect(sanitizeEmailSubject('Hello\r\nBcc: attacker@example.com\t<script>')).toBe(
      'Hello Bcc: attacker@example.com <script>',
    );
    expect(sanitizeEmailSubject('')).toBe('DayOf update');
    expect(sanitizeEmailSubject('x'.repeat(220))).toHaveLength(180);
  });

  it('validates email addresses without header-ish punctuation', () => {
    expect(isSafeEmailAddress('guest@example.com')).toBe(true);
    expect(isSafeEmailAddress(' guest@example.com ')).toBe(true);
    expect(isSafeEmailAddress('guest+tag@example.co')).toBe(true);
    expect(isSafeEmailAddress('bad@example.com>')).toBe(false);
    expect(isSafeEmailAddress('"bad"@example.com')).toBe(false);
    expect(isSafeEmailAddress('bad(comment)@example.com')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('service worker safety', () => {
  it('caches only safe same-origin static assets', () => {
    const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

    expect(source).toContain('function isSafeStaticRequest');
    expect(source).toContain("requestUrl.origin !== self.location.origin");
    expect(source).toContain("requestUrl.pathname.startsWith('/functions/v1/')");
    expect(source).toContain("requestUrl.pathname.startsWith('/auth/v1/')");
    expect(source).toContain("requestUrl.pathname.startsWith('/rest/v1/')");
    expect(source).toContain("requestUrl.pathname.startsWith('/storage/v1/')");
    expect(source).toContain('STATIC_ASSET_PATTERN');
    expect(source).not.toContain('cache.put(event.request, copy)).catch(() => {});\n        return response;\n      })\n      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(\'/\')))');
  });
});

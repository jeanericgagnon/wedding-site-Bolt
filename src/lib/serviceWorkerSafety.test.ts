import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('service worker safety', () => {
  it('caches only safe same-origin static assets', () => {
    const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

    expect(source).toContain('function isSafeStaticRequest');
    expect(source).toContain("request.headers.has('Authorization')");
    expect(source).toContain("requestUrl.origin !== self.location.origin");
    expect(source).toContain('function isGuestHubNavigationRequest');
    expect(source).toContain("request.mode !== 'navigate'");
    expect(source).toContain("return /^\\/event\\/[^/]+(?:\\/.*)?$/.test(requestUrl.pathname);");
    expect(source).toContain("fetch(event.request).catch(() => caches.match('/event-hub-offline.html'))");
    expect(source).toContain("request.mode === 'navigate'");
    expect(source).toContain("request.destination === 'document'");
    expect(source).toContain("requestUrl.pathname.startsWith('/functions/v1/')");
    expect(source).toContain("requestUrl.pathname.startsWith('/auth/v1/')");
    expect(source).toContain("requestUrl.pathname.startsWith('/rest/v1/')");
    expect(source).toContain("requestUrl.pathname.startsWith('/storage/v1/')");
    expect(source).toContain("if (requestUrl.search) return false");
    expect(source).toContain('function isCacheableStaticResponse');
    expect(source).toContain("response.headers.get('Cache-Control')");
    expect(source).toContain("response.headers.get('Content-Type')");
    expect(source).toContain('/text\\/html|application\\/json/i');
    expect(source).toContain('STATIC_ASSET_PATTERN');
    expect(source).toContain("const ASSETS = ['/manifest.webmanifest', '/image.png', '/event-hub-offline.html'];");
    expect(source).not.toContain("const ASSETS = ['/', '/manifest.webmanifest', '/image.png', '/event-hub-offline.html'];");
    expect(source).toContain('catch(() => caches.match(event.request))');
    expect(source).not.toContain("cached || caches.match('/')");
    expect(source).not.toContain('cache.put(event.request, copy)).catch(() => {});\n        return response;\n      })\n      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(\'/\')))');
  });
});

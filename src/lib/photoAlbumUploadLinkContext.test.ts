import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('photo album upload link context', () => {
  it('adds albumName context to created upload links', () => {
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/photo-album-create/index.ts'), 'utf8');

    expect(functionSource).toContain('params.set("albumName", cleanAlbumName)');
    expect(functionSource).toContain('const uploadUrl = buildUploadUrl(appUrl, token, created.name as string | null | undefined);');
  });

  it('adds albumName context to regenerated upload links', () => {
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/photo-album-manage/index.ts'), 'utf8');

    expect(functionSource).toContain('params.set("albumName", cleanAlbumName)');
    expect(functionSource).toContain('const uploadUrl = buildUploadUrl(appUrl, token, album.name as string | null | undefined);');
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("photo-album-manage safety", () => {
  it("keeps lookup, update, and unexpected failures admin-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/photo-album-manage/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("PHOTO_ALBUM_MANAGE_LOOKUP_FAILED"');
    expect(functionSource).toContain('reason: "PHOTO_ALBUM_LOOKUP_ERROR"');
    expect(functionSource).toContain('console.error("PHOTO_ALBUM_MANAGE_SET_ACTIVE_FAILED"');
    expect(functionSource).toContain('reason: "PHOTO_ALBUM_SET_ACTIVE_ERROR"');
    expect(functionSource).toContain('console.error("PHOTO_ALBUM_MANAGE_SET_WINDOW_FAILED"');
    expect(functionSource).toContain('reason: "PHOTO_ALBUM_SET_WINDOW_ERROR"');
    expect(functionSource).toContain('console.error("PHOTO_ALBUM_MANAGE_REGENERATE_LINK_FAILED"');
    expect(functionSource).toContain('reason: "PHOTO_ALBUM_REGENERATE_LINK_ERROR"');
    expect(functionSource).toContain('console.error("PHOTO_ALBUM_MANAGE_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_PHOTO_ALBUM_MANAGE_FAILURE"');
    expect(functionSource).toContain('json({ error: "Could not manage this album. Please try again." }, 404)');
    expect(functionSource).toContain('json({ error: "Could not update this album. Please try again." }, 400)');
    expect(functionSource).toContain('json({ error: "Could not manage this album. Please try again." }, 500)');
    expect(functionSource).not.toContain('json({ error: albumErr?.message ?? "Album not found" }, 404)');
    expect(functionSource).not.toContain('json({ error: error.message }, 400)');
    expect(functionSource).not.toContain('json({ error: err instanceof Error ? err.message : "Internal server error" }, 500)');
  });
});

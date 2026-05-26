import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("photo-album-create safety", () => {
  it("keeps insert and unexpected failures admin-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/photo-album-create/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("PHOTO_ALBUM_CREATE_INSERT_FAILED"');
    expect(functionSource).toContain('reason: "PHOTO_ALBUM_CREATE_INSERT_ERROR"');
    expect(functionSource).toContain('console.error("PHOTO_ALBUM_CREATE_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_PHOTO_ALBUM_CREATE_FAILURE"');
    expect(functionSource).toContain('fail("DB_ERROR", "Could not create this album. Please try again.", 400)');
    expect(functionSource).toContain('fail("INTERNAL_ERROR", "Could not create this album. Please try again.", 500)');
    expect(functionSource).not.toContain('fail("DB_ERROR", error.message, 400)');
    expect(functionSource).not.toContain('fail("INTERNAL_ERROR", err instanceof Error ? err.message : "Internal server error", 500)');
  });
});

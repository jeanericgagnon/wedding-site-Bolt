import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("photo-upload-moderate safety", () => {
  it("keeps update and unexpected failures admin-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/photo-upload-moderate/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("PHOTO_UPLOAD_MODERATE_UPDATE_FAILED"');
    expect(functionSource).toContain('reason: "PHOTO_UPLOAD_MODERATION_UPDATE_ERROR"');
    expect(functionSource).toContain('console.error("PHOTO_UPLOAD_MODERATE_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_PHOTO_UPLOAD_MODERATION_FAILURE"');
    expect(functionSource).toContain('fail("DB_ERROR", "Could not update photo moderation. Please try again.", 400)');
    expect(functionSource).toContain('fail("INTERNAL_ERROR", "Could not update photo moderation. Please try again.", 500)');
    expect(functionSource).not.toContain('fail("DB_ERROR", updateErr.message, 400)');
    expect(functionSource).not.toContain('fail("INTERNAL_ERROR", err instanceof Error ? err.message : "Internal server error", 500)');
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("photo-upload safety", () => {
  it("keeps unexpected failures guest-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/photo-upload/index.ts"), "utf8");

    expect(functionSource).toContain('const siteSlug = String(form.get("siteSlug") ?? "").trim().toLowerCase();');
    expect(functionSource).toContain('if (!token && !siteSlug) return fail("TOKEN_REQUIRED", "token is required", 400);');
    expect(functionSource).toContain('console.error("PHOTO_UPLOAD_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_PHOTO_UPLOAD_FAILURE"');
    expect(functionSource).toContain('return fail("INTERNAL_ERROR", "Could not upload files. Please try again.", 500);');
    expect(functionSource).not.toContain('return fail("INTERNAL_ERROR", err instanceof Error ? err.message : "Internal server error", 500);');
  });
});

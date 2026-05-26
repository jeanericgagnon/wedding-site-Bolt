import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("guest-contact-submit safety", () => {
  it("keeps update and unexpected failures guest-safe", () => {
    const source = readFileSync(join(process.cwd(), "supabase/functions/guest-contact-submit/index.ts"), "utf8");

    expect(source).toContain("GUEST_CONTACT_SUBMIT_UPDATE_FAILED");
    expect(source).toContain("GUEST_CONTACT_SUBMIT_UPDATE_ERROR");
    expect(source).toContain("GUEST_CONTACT_SUBMIT_UNEXPECTED_FAILED");
    expect(source).toContain("UNEXPECTED_GUEST_CONTACT_SUBMIT_FAILURE");
    expect(source).toContain('JSON.stringify({ error: "Could not update this guest. Please try again." })');
    expect(source).not.toContain("JSON.stringify({ error: updateError.message })");
    expect(source).not.toContain('JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" })');
  });
});

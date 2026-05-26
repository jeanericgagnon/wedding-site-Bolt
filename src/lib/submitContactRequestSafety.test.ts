import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("submit-contact-request safety", () => {
  it("keeps update and unexpected failures guest-safe", () => {
    const source = readFileSync(join(process.cwd(), "supabase/functions/submit-contact-request/index.ts"), "utf8");

    expect(source).toContain("SUBMIT_CONTACT_REQUEST_UPDATE_FAILED");
    expect(source).toContain("GUEST_CONTACT_REQUEST_UPDATE_FAILED");
    expect(source).toContain("SUBMIT_CONTACT_REQUEST_UNEXPECTED_FAILED");
    expect(source).toContain("UNEXPECTED_CONTACT_REQUEST_FAILURE");
    expect(source).toContain('JSON.stringify({ error: "Could not update this guest. Please try again." })');
    expect(source).not.toContain("JSON.stringify({ error: guestErr.message })");
    expect(source).not.toContain('JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" })');
  });
});

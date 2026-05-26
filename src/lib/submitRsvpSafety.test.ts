import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("submit-rsvp safety", () => {
  it("keeps unexpected failures guest-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/submit-rsvp/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("SUBMIT_RSVP_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_SUBMIT_RSVP_FAILURE"');
    expect(functionSource).toContain('return json({ error: "Could not submit this RSVP. Please try again." }, 500);');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain("return json({ error: message }, 500);");
  });
});

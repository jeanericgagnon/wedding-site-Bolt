import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("setup-bootstrap safety", () => {
  it("keeps unexpected failures admin-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/setup-bootstrap/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("SETUP_BOOTSTRAP_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_SETUP_BOOTSTRAP_FAILURE"');
    expect(functionSource).toContain('fail("INTERNAL_ERROR", "Could not finish setup bootstrap. Please try again.", 500)');
    expect(functionSource).not.toContain('fail("INTERNAL_ERROR", err instanceof Error ? err.message : "Internal server error", 500)');
  });
});

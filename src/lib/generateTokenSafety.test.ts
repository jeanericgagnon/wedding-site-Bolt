import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("generate-token safety", () => {
  it("keeps unexpected failures guest-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/generate-token/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("GENERATE_TOKEN_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_GENERATE_TOKEN_FAILURE"');
    expect(functionSource).toContain('return json({ error: "Could not generate a token. Please try again." }, 500);');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain("return json({ error: message }, 500);");
  });
});

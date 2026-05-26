import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("log-client-error safety", () => {
  it("keeps insert and unexpected failures guest-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/log-client-error/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("LOG_CLIENT_ERROR_INSERT_FAILED"');
    expect(functionSource).toContain('reason: "APP_ERROR_LOG_INSERT_FAILED"');
    expect(functionSource).toContain('console.error("LOG_CLIENT_ERROR_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_CLIENT_ERROR_LOG_FAILURE"');
    expect(functionSource).toContain('return json({ error: "Could not record this error report. Please try again." }, 500);');
    expect(functionSource).not.toContain("return json({ error: error.message }, 500);");
    expect(functionSource).not.toContain('const msg = err instanceof Error ? err.message : "Internal error";');
    expect(functionSource).not.toContain("return json({ error: msg }, 500);");
  });
});

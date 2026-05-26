import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("google-drive-health safety", () => {
  it("keeps unexpected failures admin-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/google-drive-health/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("GOOGLE_DRIVE_HEALTH_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_GOOGLE_DRIVE_HEALTH_FAILURE"');
    expect(functionSource).toContain('message: "Could not verify Google Drive health. Please reconnect and try again."');
    expect(functionSource).not.toContain('message: err instanceof Error ? err.message : "Health check failed."');
  });
});

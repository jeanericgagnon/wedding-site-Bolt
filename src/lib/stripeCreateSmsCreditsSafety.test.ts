import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("stripe-create-sms-credits safety", () => {
  it("keeps unexpected failures guest-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/stripe-create-sms-credits/index.ts"), "utf8");

    expect(functionSource).toContain('const SMS_SENDING_ENABLED = smsSendingEnabledRaw === "true"');
    expect(functionSource).toContain('JSON.stringify({ error: "SMS credits are not available in this workspace yet." })');
    expect(functionSource).toContain('console.error("STRIPE_CREATE_SMS_CREDITS_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_STRIPE_CREATE_SMS_CREDITS_FAILURE"');
    expect(functionSource).toContain('JSON.stringify({ error: "Could not start SMS credits checkout. Please try again." })');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain('JSON.stringify({ error: message })');
  });
});

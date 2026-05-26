import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("stripe-verify-checkout-session safety", () => {
  it("keeps update and unexpected failures guest-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/stripe-verify-checkout-session/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("STRIPE_VERIFY_CHECKOUT_SESSION_UPDATE_FAILED"');
    expect(functionSource).toContain('reason: "STRIPE_VERIFY_CHECKOUT_SESSION_UPDATE_ERROR"');
    expect(functionSource).toContain('console.error("STRIPE_VERIFY_CHECKOUT_SESSION_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_STRIPE_VERIFY_CHECKOUT_SESSION_FAILURE"');
    expect(functionSource).toContain('JSON.stringify({ error: "Could not verify this checkout session. Please try again." })');
    expect(functionSource).not.toContain("JSON.stringify({ error: updateError.message })");
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain('JSON.stringify({ error: message })');
  });
});

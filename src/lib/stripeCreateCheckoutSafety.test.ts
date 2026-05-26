import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("stripe-create-checkout safety", () => {
  it("keeps unexpected failures guest-safe", () => {
    const functionSource = readFileSync(join(process.cwd(), "supabase/functions/stripe-create-checkout/index.ts"), "utf8");

    expect(functionSource).toContain('console.error("STRIPE_CREATE_CHECKOUT_UNEXPECTED_FAILED"');
    expect(functionSource).toContain('reason: "UNEXPECTED_STRIPE_CREATE_CHECKOUT_FAILURE"');
    expect(functionSource).toContain('JSON.stringify({ error: "Could not start checkout. Please try again." })');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain('JSON.stringify({ error: message })');
  });
});

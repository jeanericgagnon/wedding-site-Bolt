import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Payload = {
  source?: string;
  severity?: "error" | "warning" | "info" | string;
  route?: string;
  message?: string;
  stack?: string;
  weddingSiteId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

function clamp(input: string | undefined | null, max: number): string | null {
  if (!input) return null;
  return input.slice(0, max);
}

function redact(text: string | null): string | null {
  if (!text) return null;
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(token|invite_token|authorization|apikey|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}

async function fingerprint(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = (await req.json()) as Payload;
    const source = clamp(payload.source, 80) ?? "client";
    const severity = clamp(payload.severity, 16) ?? "error";
    const route = clamp(payload.route, 255);
    const message = redact(clamp(payload.message, 2000));
    const stack = redact(clamp(payload.stack, 4000));

    if (!message) return json({ error: "message is required" }, 400);

    const fp = await fingerprint(`${source}|${route ?? ""}|${message.slice(0, 500)}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const metadata = payload.metadata && typeof payload.metadata === "object"
      ? payload.metadata
      : {};

    const { error } = await adminClient.from("app_error_logs").insert({
      source,
      severity,
      route,
      message,
      stack,
      fingerprint: fp,
      wedding_site_id: payload.weddingSiteId ?? null,
      user_id: payload.userId ?? null,
      metadata,
    });

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});

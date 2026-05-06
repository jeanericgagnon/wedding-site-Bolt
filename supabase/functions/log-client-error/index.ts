import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts";

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
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/([?&#](?:token|invite_token|secureToken|access_token|apikey|api_key|password|authorization)=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/(token|invite_token|secureToken|access_token|authorization|apikey|api_key|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}

function sanitizeRoute(value: string | null): string | null {
  if (!value) return null;
  const [withoutHash] = value.split("#");
  const [withoutQuery] = withoutHash.split("?");
  return clamp(withoutQuery || "/", 255);
}

function sanitizeSeverity(value: string | undefined): "error" | "warning" | "info" {
  return value === "warning" || value === "info" ? value : "error";
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return redact(clamp(value, 500));
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitizeMetadataValue(item, depth + 1));
  if (typeof value !== "object") return null;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 25)) {
    if (/token|secret|password|authorization|apikey|service_role|service-role|cookie/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = sanitizeMetadataValue(item, depth + 1);
    }
  }
  return result;
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
    const severity = sanitizeSeverity(payload.severity);
    const route = sanitizeRoute(clamp(payload.route, 255));
    const message = redact(clamp(payload.message, 2000));
    const stack = redact(clamp(payload.stack, 4000));

    if (!message) return json({ error: "message is required" }, 400);

    const fp = await fingerprint(`${source}|${route ?? ""}|${message.slice(0, 500)}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const rateLimit = await enforcePublicSubmissionRateLimit({
      admin: adminClient,
      request: req,
      scope: "log_client_error",
      subject: `${source}:${fp}`,
      maxIp: 60,
      maxSubject: 30,
      windowMinutes: 10,
    });
    if (!rateLimit.ok) return json({ error: rateLimit.message }, rateLimit.status);

    const metadata = payload.metadata && typeof payload.metadata === "object"
      ? sanitizeMetadataValue(payload.metadata)
      : {};

    let inferredUserId: string | null = null;
    let inferredSiteId: string | null = null;

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      const { data: userData } = await adminClient.auth.getUser(token);
      inferredUserId = userData.user?.id ?? null;

      if (inferredUserId && payload.weddingSiteId) {
        const { data: requestedSite } = await adminClient
          .from("wedding_sites")
          .select("id")
          .eq("id", payload.weddingSiteId)
          .eq("user_id", inferredUserId)
          .maybeSingle();
        inferredSiteId = requestedSite?.id ?? null;
      }

      if (!inferredSiteId && inferredUserId) {
        const { data: siteData } = await adminClient
          .from("wedding_sites")
          .select("id")
          .eq("user_id", inferredUserId)
          .maybeSingle();
        inferredSiteId = siteData?.id ?? null;
      }
    }

    const { error } = await adminClient.from("app_error_logs").insert({
      source,
      severity,
      route,
      message,
      stack,
      fingerprint: fp,
      wedding_site_id: inferredSiteId,
      user_id: inferredUserId,
      metadata,
    });

    if (error) {
      console.error("LOG_CLIENT_ERROR_INSERT_FAILED", { reason: "CLIENT_ERROR_INSERT_FAILED" });
      return json({ error: "Could not save error report." }, 500);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("LOG_CLIENT_ERROR_UNEXPECTED_FAILED", { reason: "UNEXPECTED_CLIENT_ERROR_LOG_FAILURE" });
    return json({ error: "Could not save error report." }, 500);
  }
});

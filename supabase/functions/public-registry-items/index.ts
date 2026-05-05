import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifySessionToken } from "../_shared/signedSession.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_REGISTRY_ITEM_COLUMNS = [
  "id",
  "wedding_site_id",
  "item_name",
  "description",
  "registry_url",
  "image_url",
  "price",
  "price_label",
  "store_name",
  "merchant",
  "quantity_needed",
  "quantity_purchased",
  "purchase_status",
  "hide_when_purchased",
  "priority",
  "sort_order",
  "created_at",
].join(",");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PasswordSessionPayload {
  scope: "public_site_password";
  slug: string;
  exp: number;
}

async function hasValidPasswordSession(
  slug: string | null,
  sessionToken: string | null,
  secret: string,
): Promise<boolean> {
  if (!slug || !sessionToken) return false;
  const payload = await verifySessionToken<PasswordSessionPayload>(sessionToken, secret);
  return Boolean(
    payload &&
    payload.scope === "public_site_password" &&
    payload.slug === slug &&
    Number.isFinite(payload.exp) &&
    payload.exp > Date.now(),
  );
}

async function canReadPublicSubresource(input: {
  site: {
    site_slug: string | null;
    is_published: boolean | null;
    privacy_mode?: string | null;
    guest_access_token?: string | null;
  };
  inviteToken: string;
  passwordSession: string | null;
  secret: string;
}): Promise<boolean> {
  if (input.site.is_published !== true) return false;
  const privacyMode = input.site.privacy_mode ?? "public";
  if (privacyMode === "password_protected") {
    return hasValidPasswordSession(input.site.site_slug, input.passwordSession, input.secret);
  }
  if (privacyMode === "invite_only") {
    const stored = input.site.guest_access_token?.trim() ?? "";
    return Boolean(input.inviteToken && stored && input.inviteToken === stored);
  }
  return privacyMode === "public" || privacyMode === "hidden";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const weddingSiteId = typeof body.wedding_site_id === "string" ? body.wedding_site_id.trim() : "";
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
    const passwordSession = typeof body.passwordSession === "string" ? body.passwordSession : null;
    const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Math.min(100, Number(body.limit))) : 100;

    if (!weddingSiteId) {
      return json({ items: [] }, 200);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ items: [] }, 200);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: site, error: siteError } = await admin
      .from("wedding_sites")
      .select("id,site_slug,is_published,privacy_mode,guest_access_token")
      .eq("id", weddingSiteId)
      .maybeSingle();

    if (
      siteError ||
      !site ||
      !(await canReadPublicSubresource({ site, inviteToken, passwordSession, secret: serviceRoleKey }))
    ) {
      return json({ items: [] }, 200);
    }

    const { data: items, error: itemsError } = await admin
      .from("registry_items")
      .select(PUBLIC_REGISTRY_ITEM_COLUMNS)
      .eq("wedding_site_id", weddingSiteId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (itemsError || !Array.isArray(items)) {
      return json({ items: [] }, 200);
    }

    return json({ items }, 200);
  } catch {
    return json({ items: [] }, 200);
  }
});

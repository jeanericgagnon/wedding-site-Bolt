import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_REGISTRY_ITEM_COLUMNS = [
  "id",
  "wedding_site_id",
  "item_type",
  "item_name",
  "description",
  "image_url",
  "price_label",
  "price_amount",
  "store_name",
  "merchant",
  "item_url",
  "canonical_url",
  "notes",
  "quantity_needed",
  "quantity_purchased",
  "purchaser_name",
  "purchase_status",
  "hide_when_purchased",
  "priority",
  "sort_order",
  "fund_goal_amount",
  "fund_received_amount",
  "fund_venmo_url",
  "fund_paypal_url",
  "fund_zelle_handle",
  "fund_custom_url",
  "fund_custom_label",
  "created_at",
  "updated_at",
].join(",");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Math.min(500, Number(body.limit))) : 500;

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
      !(await canReadPublicSubresource({
        isPublished: site.is_published === true,
        privacyMode: site.privacy_mode,
        siteSlug: site.site_slug,
        inviteToken,
        passwordSession,
        storedInviteToken: site.guest_access_token,
        secret: serviceRoleKey,
      }))
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

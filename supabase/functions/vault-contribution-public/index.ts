import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VAULT_LINK_UNAVAILABLE_COPY = "This memory vault link is not available.";
const VAULT_SELECTION_REQUIRED_COPY = "Choose a memory vault to open.";

type VaultContributionConfigInfo = {
  id: string;
  label: string;
  duration_years: number;
  is_enabled: boolean;
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanSlug(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanInviteToken(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanPasswordSession(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function cleanVaultYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return parsed > 0 ? parsed : null;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const siteSlug = cleanSlug(body.siteSlug);
    const vaultYear = cleanVaultYear(body.vaultYear);
    const inviteToken = cleanInviteToken(body.inviteToken);
    const passwordSession = cleanPasswordSession(body.passwordSession);

    if (!siteSlug) return json({ error: VAULT_LINK_UNAVAILABLE_COPY }, 400);
    if (body.vaultYear != null && vaultYear == null) {
      return json({ error: VAULT_SELECTION_REQUIRED_COPY }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id,site_slug,is_published,privacy_mode,guest_access_token")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    const hasAccess = site
      ? await canReadPublicSubresource({
          isPublished: site.is_published === true,
          privacyMode: site.privacy_mode,
          siteSlug: site.site_slug,
          inviteToken,
          passwordSession,
          storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null,
          secret: Deno.env.get("PUBLIC_SITE_SESSION_SECRET") || serviceRole,
        })
      : false;

    if (!site?.id || !hasAccess) {
      return json({ error: VAULT_LINK_UNAVAILABLE_COPY }, 403);
    }

    if (vaultYear != null) {
      const { data: config, error } = await admin
        .from("vault_configs")
        .select("id,label,duration_years,is_enabled")
        .eq("wedding_site_id", site.id)
        .eq("duration_years", vaultYear)
        .eq("is_enabled", true)
        .maybeSingle();

      if (error || !config) {
        return json({ config: null });
      }

      return json({ config: config as VaultContributionConfigInfo });
    }

    const { data: configs, error } = await admin
      .from("vault_configs")
      .select("id,label,duration_years,is_enabled")
      .eq("wedding_site_id", site.id)
      .eq("is_enabled", true)
      .order("duration_years", { ascending: true });

    if (error || !Array.isArray(configs)) {
      return json({ configs: [] });
    }

    return json({
      configs: (configs as VaultContributionConfigInfo[]).sort((a, b) => a.duration_years - b.duration_years),
    });
  } catch {
    return json({ configs: [] });
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const siteRef = String(body.site_ref ?? "").trim();
    const query = String(body.query ?? "").trim();

    if (!siteRef || query.length < 2) {
      return json({ matches: [] });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const siteQuery = admin
      .from("wedding_sites")
      .select("id")
      .eq(UUID_RE.test(siteRef) ? "id" : "site_slug", siteRef)
      .maybeSingle();
    const { data: site } = await siteQuery;

    if (!site?.id) {
      return json({ matches: [] });
    }

    const { data: guests } = await admin
      .from("guests")
      .select("id, name, first_name, last_name, household_id")
      .eq("wedding_site_id", site.id)
      .or(`name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .limit(10);

    const householdIds = Array.from(new Set((guests ?? []).map((g: any) => g.household_id).filter(Boolean)));
    const householdCounts: Record<string, number> = {};

    if (householdIds.length > 0) {
      const { data: hh } = await admin
        .from("guests")
        .select("household_id")
        .eq("wedding_site_id", site.id)
        .in("household_id", householdIds as string[]);
      for (const row of (hh ?? []) as any[]) {
        if (!row.household_id) continue;
        householdCounts[row.household_id] = (householdCounts[row.household_id] ?? 0) + 1;
      }
    }

    const matches = (guests ?? []).map((g: any) => ({
      id: g.id,
      name: g.name || [g.first_name, g.last_name].filter(Boolean).join(" "),
      household_id: g.household_id,
      household_size: g.household_id ? (householdCounts[g.household_id] ?? 1) : 1,
    }));

    return json({ matches });
  } catch (err) {
    console.error("GUEST_CONTACT_LOOKUP_UNEXPECTED_FAILED", err);
    return json({ error: "Could not look up guests. Please try again." }, 500);
  }
});

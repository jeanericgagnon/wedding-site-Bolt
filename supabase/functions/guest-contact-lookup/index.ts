import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const siteRef = String(body.site_ref ?? "").trim();
    const query = String(body.query ?? "").trim();

    if (!siteRef || query.length < 2) {
      return new Response(JSON.stringify({ matches: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: site } = await admin
      .from("wedding_sites")
      .select("id")
      .or(`id.eq.${siteRef},site_slug.eq.${siteRef}`)
      .maybeSingle();

    if (!site?.id) {
      return new Response(JSON.stringify({ matches: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: guests } = await admin
      .from("guests")
      .select("id, name, first_name, last_name, household_id")
      .eq("wedding_site_id", site.id)
      .or(`name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .limit(10);

    const householdIds = Array.from(
      new Set(((guests ?? []) as Array<{ household_id?: string | null }>).map((guest) => guest.household_id).filter(Boolean)),
    );
    const householdCounts: Record<string, number> = {};

    if (householdIds.length > 0) {
      const { data: hh } = await admin
        .from("guests")
        .select("household_id")
        .eq("wedding_site_id", site.id)
        .in("household_id", householdIds as string[]);
      for (const row of (hh ?? []) as Array<{ household_id?: string | null }>) {
        if (!row.household_id) continue;
        householdCounts[row.household_id] = (householdCounts[row.household_id] ?? 0) + 1;
      }
    }

    const matches = ((guests ?? []) as Array<{ id: string; name?: string | null; first_name?: string | null; last_name?: string | null; household_id?: string | null }>).map((g) => ({
      id: g.id,
      name: g.name || [g.first_name, g.last_name].filter(Boolean).join(" "),
      household_id: g.household_id,
      household_size: g.household_id ? (householdCounts[g.household_id] ?? 1) : 1,
    }));

    return new Response(JSON.stringify({ matches }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    console.error("GUEST_CONTACT_LOOKUP_UNEXPECTED_FAILED", {
      reason: "UNEXPECTED_GUEST_CONTACT_LOOKUP_FAILURE",
    });
    return new Response(JSON.stringify({ error: "Could not look up guests. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

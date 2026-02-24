import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PACKS: Record<string, { credits: number; envKey: string }> = {
  sms_100: { credits: 100, envKey: "STRIPE_SMS_PRICE_ID_100" },
  sms_500: { credits: 500, envKey: "STRIPE_SMS_PRICE_ID_500" },
  sms_1000: { credits: 1000, envKey: "STRIPE_SMS_PRICE_ID_1000" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { wedding_site_id, success_url, cancel_url, pack } = body as {
      wedding_site_id: string;
      success_url: string;
      cancel_url: string;
      pack: string;
    };

    if (!wedding_site_id || !success_url || !cancel_url || !pack) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const packDef = PACKS[pack];
    if (!packDef) {
      return new Response(JSON.stringify({ error: "Invalid pack" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const priceId = Deno.env.get(packDef.envKey);
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Missing env ${packDef.envKey}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: site, error: siteError } = await supabaseAdmin
      .from("wedding_sites")
      .select("id, user_id, stripe_customer_id")
      .eq("id", wedding_site_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Wedding site not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-04-10" });

    let customerId = site.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id, wedding_site_id },
      });
      customerId = customer.id;
      await supabaseAdmin.from("wedding_sites").update({ stripe_customer_id: customerId }).eq("id", wedding_site_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: {
        purchase_type: "sms_credits",
        sms_pack: pack,
        sms_credits: String(packDef.credits),
        wedding_site_id,
        supabase_user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          purchase_type: "sms_credits",
          sms_pack: pack,
          sms_credits: String(packDef.credits),
          wedding_site_id,
          supabase_user_id: user.id,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
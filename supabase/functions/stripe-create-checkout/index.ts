import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { wedding_site_id, success_url, cancel_url } = body as {
      wedding_site_id: string;
      success_url: string;
      cancel_url: string;
    };

    if (!wedding_site_id || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "Missing required fields: wedding_site_id, success_url, cancel_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: site, error: siteError } = await supabaseAdmin
      .from("wedding_sites")
      .select("id, user_id, payment_status, stripe_customer_id")
      .eq("id", wedding_site_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Wedding site not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (site.payment_status === "active") {
      return new Response(JSON.stringify({ error: "Already paid" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    let customerId = site.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id, wedding_site_id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("wedding_sites")
        .update({ stripe_customer_id: customerId })
        .eq("id", wedding_site_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: { supabase_user_id: user.id, wedding_site_id },
      payment_intent_data: {
        metadata: { supabase_user_id: user.id, wedding_site_id },
      },
    });

    await supabaseAdmin
      .from("wedding_sites")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", wedding_site_id);

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

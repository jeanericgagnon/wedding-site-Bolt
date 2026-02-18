import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

    if (!sig) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ received: true, skipped: "not paid" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const weddingSiteId = session.metadata?.wedding_site_id;
      const supabaseUserId = session.metadata?.supabase_user_id;

      if (!weddingSiteId || !supabaseUserId) {
        return new Response(JSON.stringify({ error: "Missing metadata on session" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("wedding_sites")
        .update({
          payment_status: "active",
          paid_at: new Date().toISOString(),
          stripe_customer_id: session.customer as string | null,
          stripe_checkout_session_id: session.id,
        })
        .eq("id", weddingSiteId)
        .eq("user_id", supabaseUserId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (event.type === "charge.refunded" || event.type === "payment_intent.canceled") {
      const obj = event.data.object as { metadata?: { wedding_site_id?: string } };
      const weddingSiteId = obj.metadata?.wedding_site_id;
      if (weddingSiteId) {
        await supabase
          .from("wedding_sites")
          .update({ payment_status: "canceled" })
          .eq("id", weddingSiteId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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

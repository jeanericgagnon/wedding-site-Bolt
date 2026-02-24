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
      const purchaseType = session.metadata?.purchase_type;

      if (!weddingSiteId || !supabaseUserId) {
        return new Response(JSON.stringify({ error: "Missing metadata on session" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (purchaseType === "sms_credits") {
        const credits = Number(session.metadata?.sms_credits ?? 0);
        const amountCents = session.amount_total ?? null;

        if (credits <= 0) {
          return new Response(JSON.stringify({ error: "Invalid sms credit amount" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: existing } = await supabase
          .from("sms_credit_transactions")
          .select("id")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle();

        if (!existing) {
          const { data: site } = await supabase
            .from("wedding_sites")
            .select("sms_credits_balance")
            .eq("id", weddingSiteId)
            .eq("user_id", supabaseUserId)
            .maybeSingle();

          const balance = Number(site?.sms_credits_balance ?? 0);

          const { error: txError } = await supabase
            .from("sms_credit_transactions")
            .insert({
              wedding_site_id: weddingSiteId,
              stripe_checkout_session_id: session.id,
              credits_delta: credits,
              amount_cents: amountCents,
              reason: "purchase",
              metadata: {
                pack: session.metadata?.sms_pack ?? null,
                payment_intent: session.payment_intent ?? null,
              },
            });

          if (txError) {
            return new Response(JSON.stringify({ error: txError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const { error: balError } = await supabase
            .from("wedding_sites")
            .update({ sms_credits_balance: balance + credits })
            .eq("id", weddingSiteId)
            .eq("user_id", supabaseUserId);

          if (balError) {
            return new Response(JSON.stringify({ error: balError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        return new Response(JSON.stringify({ received: true, type: "sms_credits" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paidAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

      if (session.mode === "subscription") {
        const { error: updateError } = await supabase
          .from("wedding_sites")
          .update({
            payment_status: "active",
            billing_type: "recurring",
            paid_at: paidAt,
            site_expires_at: null,
            stripe_customer_id: session.customer as string | null,
            stripe_checkout_session_id: session.id,
            stripe_subscription_id: session.subscription as string | null,
          })
          .eq("id", weddingSiteId)
          .eq("user_id", supabaseUserId);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { error: updateError } = await supabase
          .from("wedding_sites")
          .update({
            payment_status: "active",
            billing_type: "one_time",
            paid_at: paidAt,
            site_expires_at: expiresAt,
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
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const weddingSiteId = subscription.metadata?.wedding_site_id;

      if (!weddingSiteId) {
        return new Response(JSON.stringify({ received: true, skipped: "no wedding_site_id in subscription metadata" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (event.type === "customer.subscription.deleted" || subscription.status === "canceled") {
        const { data: site } = await supabase
          .from("wedding_sites")
          .select("paid_at")
          .eq("id", weddingSiteId)
          .maybeSingle();

        const paidAt = site?.paid_at ? new Date(site.paid_at) : new Date();
        const expiresAt = new Date(paidAt.getTime() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from("wedding_sites")
          .update({
            billing_type: "one_time",
            site_expires_at: expiresAt,
            stripe_subscription_id: null,
          })
          .eq("id", weddingSiteId);
      } else if (subscription.status === "active") {
        await supabase
          .from("wedding_sites")
          .update({
            billing_type: "recurring",
            site_expires_at: null,
            stripe_subscription_id: subscription.id,
          })
          .eq("id", weddingSiteId);
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

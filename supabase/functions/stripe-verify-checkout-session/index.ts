import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const INCLUDED_SMS_CREDITS = 1000;
const CHECKOUT_VERIFY_SIGNIN_REQUIRED_COPY = "Please sign in to confirm checkout.";
const CHECKOUT_VERIFY_SESSION_REQUIRED_COPY = "Choose a checkout session to confirm payment.";
const CHECKOUT_VERIFY_SESSION_UNAVAILABLE_COPY = "This checkout session is not available.";
const CHECKOUT_VERIFY_SESSION_NOT_READY_COPY = "This checkout session is not ready to confirm yet.";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function grantIncludedSmsCredits(supabase: ReturnType<typeof createClient>, weddingSiteId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("sms_credit_transactions")
    .select("id")
    .eq("wedding_site_id", weddingSiteId)
    .eq("reason", "included")
    .contains("metadata", { source: "included_with_site_purchase" })
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return;

  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const { error: txError } = await supabase
    .from("sms_credit_transactions")
    .insert({
      wedding_site_id: weddingSiteId,
      credits_delta: INCLUDED_SMS_CREDITS,
      remaining_credits: INCLUDED_SMS_CREDITS,
      expires_at: expiresAt,
      reason: "included",
      metadata: {
        source: "included_with_site_purchase",
        unit: "160_character_sms_segment",
      },
    });

  if (txError) throw txError;

  const { data: site, error: siteError } = await supabase
    .from("wedding_sites")
    .select("sms_credits_balance")
    .eq("id", weddingSiteId)
    .maybeSingle();

  if (siteError) throw siteError;

  const current = Number(site?.sms_credits_balance ?? 0);
  const { error: balanceError } = await supabase
    .from("wedding_sites")
    .update({ sms_credits_balance: current + INCLUDED_SMS_CREDITS })
    .eq("id", weddingSiteId);

  if (balanceError) throw balanceError;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: CHECKOUT_VERIFY_SIGNIN_REQUIRED_COPY }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: CHECKOUT_VERIFY_SIGNIN_REQUIRED_COPY }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id || "").trim();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: CHECKOUT_VERIFY_SESSION_REQUIRED_COPY }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const weddingSiteId = session.metadata?.wedding_site_id;
    const supabaseUserId = session.metadata?.supabase_user_id;

    if (!weddingSiteId || !supabaseUserId) {
      return new Response(JSON.stringify({ error: CHECKOUT_VERIFY_SESSION_NOT_READY_COPY }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (supabaseUserId !== user.id) {
      return new Response(JSON.stringify({ error: CHECKOUT_VERIFY_SESSION_UNAVAILABLE_COPY }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paid = session.payment_status === "paid" || session.status === "complete";

    if (!paid) {
      return new Response(JSON.stringify({ paid: false, status: session.status, payment_status: session.payment_status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paidAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
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
      .eq("user_id", user.id);

    if (updateError) {
      console.error("STRIPE_VERIFY_CHECKOUT_UPDATE_FAILED", { reason: "CHECKOUT_STATUS_UPDATE_FAILED" });
      return json({ error: "Could not confirm payment yet. Please try again." }, 500);
    }

    await grantIncludedSmsCredits(supabaseAdmin, weddingSiteId);

    return json({ paid: true, session_id: session.id });
  } catch (err) {
    console.error("STRIPE_VERIFY_CHECKOUT_UNEXPECTED_FAILED", { reason: "UNEXPECTED_CHECKOUT_VERIFY_FAILURE" });
    return json({ error: "Could not confirm payment yet. Please try again." }, 500);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PACKS: Record<string, { credits: number; envKey: string }> = {
  sms_100: { credits: 100, envKey: "STRIPE_SMS_PRICE_ID_100" },
  sms_500: { credits: 500, envKey: "STRIPE_SMS_PRICE_ID_500" },
  sms_1000: { credits: 1000, envKey: "STRIPE_SMS_PRICE_ID_1000" },
};

const SMS_CREDITS_SIGNIN_REQUIRED_COPY = "Please sign in to continue checkout.";
const SMS_CREDITS_DETAILS_REQUIRED_COPY = "Choose a site, return links, and a credit pack before continuing checkout.";
const SMS_CREDITS_PACK_REQUIRED_COPY = "Choose a valid SMS credit pack.";
const SMS_CREDITS_SITE_UNAVAILABLE_COPY = "This site is not available for SMS credit checkout.";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAllowedCheckoutRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (parsed.username || parsed.password) return false;
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    const appUrl = new URL(Deno.env.get("APP_PUBLIC_URL") || "https://dayof.love");
    const appOrigin = appUrl.origin;
    const appHost = appUrl.hostname.toLowerCase().replace(/\.$/, "");
    if (parsed.origin === appOrigin) return true;
    if (hostname === "dayof.love" || hostname.endsWith(".dayof.love")) return true;
    if ((hostname === "localhost" || hostname === "127.0.0.1") && (appHost === "localhost" || appHost === "127.0.0.1")) return true;
    return false;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (Deno.env.get("ENABLE_SMS_CREDIT_PURCHASES") !== "true") {
      return json({ error: "SMS credit purchases will open after texting setup is complete." }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: SMS_CREDITS_SIGNIN_REQUIRED_COPY }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return json({ error: SMS_CREDITS_SIGNIN_REQUIRED_COPY }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { wedding_site_id, success_url, cancel_url, pack } = body as {
      wedding_site_id: string;
      success_url: string;
      cancel_url: string;
      pack: string;
    };

    if (!wedding_site_id || !success_url || !cancel_url || !pack) {
      return json({ error: SMS_CREDITS_DETAILS_REQUIRED_COPY }, 400);
    }

    if (!isAllowedCheckoutRedirect(success_url) || !isAllowedCheckoutRedirect(cancel_url)) {
      return json({ error: "Checkout return URL is not allowed." }, 400);
    }

    const packDef = PACKS[pack];
    if (!packDef) {
      return json({ error: SMS_CREDITS_PACK_REQUIRED_COPY }, 400);
    }

    const priceId = Deno.env.get(packDef.envKey);
    if (!priceId) {
      return json({ error: "SMS credit checkout is not ready yet." }, 500);
    }

    const { data: site, error: siteError } = await supabaseAdmin
      .from("wedding_sites")
      .select("id, user_id, stripe_customer_id")
      .eq("id", wedding_site_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (siteError || !site) {
      return json({ error: SMS_CREDITS_SITE_UNAVAILABLE_COPY }, 404);
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

    return json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("STRIPE_CREATE_SMS_CREDITS_UNEXPECTED_FAILED", { reason: "UNEXPECTED_SMS_CREDITS_CHECKOUT_FAILURE" });
    return json({ error: "Could not start SMS credit checkout. Please try again." }, 500);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CHECKOUT_SIGNIN_REQUIRED_COPY = "Please sign in to continue checkout.";
const CHECKOUT_DETAILS_REQUIRED_COPY = "Choose a site and return links before continuing checkout.";
const CHECKOUT_SITE_UNAVAILABLE_COPY = "This site is not available for checkout.";
const CHECKOUT_ALREADY_PAID_COPY = "This site is already paid.";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: CHECKOUT_SIGNIN_REQUIRED_COPY }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return json({ error: CHECKOUT_SIGNIN_REQUIRED_COPY }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { wedding_site_id, success_url, cancel_url } = body as {
      wedding_site_id: string;
      success_url: string;
      cancel_url: string;
    };

    if (!wedding_site_id || !success_url || !cancel_url) {
      return json({ error: CHECKOUT_DETAILS_REQUIRED_COPY }, 400);
    }

    if (!isAllowedCheckoutRedirect(success_url) || !isAllowedCheckoutRedirect(cancel_url)) {
      return json({ error: "Checkout return URL is not allowed." }, 400);
    }

    const { data: site, error: siteError } = await supabaseAdmin
      .from("wedding_sites")
      .select("id, user_id, payment_status, stripe_customer_id")
      .eq("id", wedding_site_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (siteError || !site) {
      return json({ error: CHECKOUT_SITE_UNAVAILABLE_COPY }, 404);
    }

    if (site.payment_status === "active") {
      return json({ error: CHECKOUT_ALREADY_PAID_COPY }, 409);
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
      payment_method_types: ["card"],
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

    return json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("STRIPE_CREATE_CHECKOUT_UNEXPECTED_FAILED", { reason: "UNEXPECTED_CHECKOUT_CREATE_FAILURE" });
    return json({ error: "Could not start checkout. Please try again." }, 500);
  }
});

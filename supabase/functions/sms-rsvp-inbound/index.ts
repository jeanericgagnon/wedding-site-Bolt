import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TWILIO_XML_HEADERS = {
  ...corsHeaders,
  "Content-Type": "application/xml; charset=utf-8",
};

function normalizePhone(input: string): string {
  const cleaned = (input || "").replace(/[^\d+]/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  return `+${cleaned}`;
}

function normalizeBody(input: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function interpretRsvp(text: string): "confirmed" | "declined" | "pending" | null {
  if (!text) return null;

  const yes = ["yes", "y", "confirm", "confirmed", "attending", "coming", "accept"];
  const no = ["no", "n", "decline", "declined", "not coming", "cant come", "cannot come"];
  const maybe = ["maybe", "pending", "unsure"];

  if (yes.some((k) => text === k || text.includes(` ${k} `) || text.startsWith(`${k} `) || text.endsWith(` ${k}`))) return "confirmed";
  if (no.some((k) => text === k || text.includes(` ${k} `) || text.startsWith(`${k} `) || text.endsWith(` ${k}`))) return "declined";
  if (maybe.some((k) => text === k || text.includes(` ${k} `) || text.startsWith(`${k} `) || text.endsWith(` ${k}`))) return "pending";
  return null;
}

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Message></Response>`;
  return new Response(xml, { status: 200, headers: TWILIO_XML_HEADERS });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRole);

  try {
    const contentType = req.headers.get("content-type") || "";
    let from = "";
    let to = "";
    let body = "";
    let sid: string | null = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      from = String(form.get("From") || "");
      to = String(form.get("To") || "");
      body = String(form.get("Body") || "");
      sid = String(form.get("MessageSid") || "") || null;
    } else {
      const json = await req.json().catch(() => ({}));
      from = String(json?.from || json?.From || "");
      to = String(json?.to || json?.To || "");
      body = String(json?.body || json?.Body || "");
      sid = String(json?.messageSid || json?.MessageSid || "") || null;
    }

    const fromNorm = normalizePhone(from);
    const toNorm = normalizePhone(to);
    const bodyNorm = normalizeBody(body);
    const interpreted = interpretRsvp(bodyNorm);

    if (!fromNorm || !bodyNorm) {
      await admin.from("sms_inbound_rsvp_events").insert({
        from_number: fromNorm || from || "unknown",
        to_number: toNorm || to || null,
        message_sid: sid,
        raw_body: body || "",
        normalized_body: bodyNorm || "",
        interpreted_status: null,
        process_result: "ignored",
        process_error: "Missing from number or body",
      });
      return twiml("Sorry, we couldn't read that RSVP. Reply YES or NO.");
    }

    // Resolve likely site via latest SMS delivery row for this number.
    const { data: deliveryRows } = await admin
      .from("message_deliveries")
      .select("message_id, recipient_email, created_at")
      .eq("recipient_email", fromNorm)
      .order("created_at", { ascending: false })
      .limit(20);

    const messageIds = (deliveryRows || []).map((r: any) => r.message_id).filter(Boolean);

    let weddingSiteId: string | null = null;
    if (messageIds.length > 0) {
      const { data: msgs } = await admin
        .from("messages")
        .select("id, wedding_site_id, channel")
        .in("id", messageIds)
        .eq("channel", "sms");
      weddingSiteId = (msgs || [])[0]?.wedding_site_id ?? null;
    }

    let guest: { id: string; wedding_site_id: string; first_name: string | null } | null = null;
    if (weddingSiteId) {
      const { data } = await admin
        .from("guests")
        .select("id, wedding_site_id, first_name, phone")
        .eq("wedding_site_id", weddingSiteId)
        .eq("phone", fromNorm)
        .limit(1);
      guest = (data || [])[0] ?? null;
    }

    if (!guest) {
      // fallback global match by phone if unique
      const { data } = await admin
        .from("guests")
        .select("id, wedding_site_id, first_name, phone")
        .eq("phone", fromNorm)
        .limit(2);
      if ((data || []).length === 1) {
        guest = data![0] as any;
        weddingSiteId = guest.wedding_site_id;
      }
    }

    if (!interpreted) {
      await admin.from("sms_inbound_rsvp_events").insert({
        from_number: fromNorm,
        to_number: toNorm || null,
        message_sid: sid,
        raw_body: body,
        normalized_body: bodyNorm,
        interpreted_status: null,
        guest_id: guest?.id ?? null,
        wedding_site_id: weddingSiteId,
        process_result: "needs_clarification",
      });
      return twiml("Got it. Please reply YES to confirm or NO to decline.");
    }

    if (!guest || !weddingSiteId) {
      await admin.from("sms_inbound_rsvp_events").insert({
        from_number: fromNorm,
        to_number: toNorm || null,
        message_sid: sid,
        raw_body: body,
        normalized_body: bodyNorm,
        interpreted_status: interpreted,
        process_result: "unmatched",
        process_error: "Could not match phone to a single guest/site",
      });
      return twiml("Thanks! We received your RSVP reply, but couldn't match this number. Please use your RSVP link or contact the couple.");
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("guests")
      .update({ rsvp_status: interpreted, responded_at: nowIso })
      .eq("id", guest.id);

    await admin.from("sms_inbound_rsvp_events").insert({
      from_number: fromNorm,
      to_number: toNorm || null,
      message_sid: sid,
      raw_body: body,
      normalized_body: bodyNorm,
      interpreted_status: interpreted,
      guest_id: guest.id,
      wedding_site_id: weddingSiteId,
      process_result: updateErr ? "failed" : "updated",
      process_error: updateErr?.message,
    });

    if (updateErr) {
      return twiml("Sorry, we couldn't update your RSVP right now. Please try again shortly.");
    }

    const firstName = guest.first_name || "there";
    const confirmationText = interpreted === "confirmed"
      ? `Thanks ${firstName}! You're marked as attending.`
      : interpreted === "declined"
      ? `Thanks ${firstName}. We've marked you as not attending.`
      : `Thanks ${firstName}. We saved your RSVP as pending.`;

    return twiml(confirmationText);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    await admin.from("sms_inbound_rsvp_events").insert({
      from_number: "unknown",
      raw_body: "",
      normalized_body: "",
      process_result: "failed",
      process_error: message,
    }).catch(() => {});
    return twiml("Sorry, something went wrong processing your RSVP reply.");
  }
});

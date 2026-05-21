import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { escapeHtml, isSafeEmailAddress, safeEmailHref, sanitizeEmailSubject } from "../_shared/emailSafety.ts";
import { resolveLaunchFromAddress } from "../_shared/emailSender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 3;
const SAFE_DELIVERY_ERROR = "Email delivery did not complete. Please try again.";
const EMAIL_QUEUE_ACCESS_REQUIRED_COPY = "This email queue request is not available.";
const EMAIL_QUEUE_REQUEST_INVALID_COPY = "This email queue request is not available.";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildEmailHtml(type: string, payload: Record<string, unknown>): { subject: string; html: string } | null {
  const p = payload as Record<string, string | boolean | null>;
  const c1 = escapeHtml((p.coupleName1 as string) ?? "Partner");
  const c2 = escapeHtml((p.coupleName2 as string) ?? "Partner");

  if (type === "rsvp_notification") {
    const attending = p.attending as boolean;
    const guestName = escapeHtml(p.guestName || "A guest");
    return {
      subject: `New RSVP from ${String(p.guestName || "A guest")}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
    <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">New RSVP Received</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:28px;font-weight:400;">${c1} &amp; ${c2}</h1>
  </div>
  <div style="padding:40px;">
    <div style="background:${attending ? "#f0fdf4" : "#fef2f2"};border:1px solid ${attending ? "#bbf7d0" : "#fecaca"};border-radius:8px;padding:20px 24px;text-align:center;">
      <p style="margin:0;font-size:18px;font-weight:600;color:${attending ? "#15803d" : "#dc2626"};">${guestName} will ${attending ? "be attending" : "not be attending"}</p>
    </div>
    ${attending && p.mealChoice ? `<p style="margin:20px 0 0;font-size:14px;color:#555;">Meal: <strong>${escapeHtml(p.mealChoice)}</strong></p>` : ""}
    ${attending && p.plusOneName ? `<p style="margin:8px 0 0;font-size:14px;color:#555;">Plus one: <strong>${escapeHtml(p.plusOneName)}</strong></p>` : ""}
    ${p.notes ? `<p style="margin:8px 0 0;font-size:14px;color:#555;">Notes: ${escapeHtml(p.notes)}</p>` : ""}
  </div>
  <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;"><p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p></div>
</div></body></html>`,
    };
  }

  if (type === "rsvp_confirmation") {
    const attending = p.attending as boolean;
    const guestName = escapeHtml(p.guestName || "there");
    return {
      subject: `RSVP Confirmed – ${c1} & ${c2}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
    <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">RSVP Confirmed</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:28px;font-weight:400;">${c1} &amp; ${c2}</h1>
  </div>
  <div style="padding:40px;text-align:center;">
    <p style="font-size:18px;color:#333;">Dear ${guestName},</p>
    ${attending
      ? `<p style="font-size:15px;color:#555;line-height:1.7;">Thank you for your RSVP! We are thrilled to celebrate this special day with you.</p>`
      : `<p style="font-size:15px;color:#555;line-height:1.7;">Thank you for letting us know. We'll miss you!</p>`}
    ${attending && (p.weddingDate || p.venueName) ? `<div style="background:#f9f7f4;border-radius:8px;padding:20px 24px;margin-top:24px;text-align:left;">
      <p style="margin:0 0 12px;font-size:13px;color:#888;letter-spacing:2px;text-transform:uppercase;">Event Details</p>
      ${p.weddingDate ? `<p style="margin:0 0 6px;font-size:15px;color:#333;">${escapeHtml(p.weddingDate)}</p>` : ""}
      ${p.venueName ? `<p style="margin:0;font-size:15px;color:#333;">${escapeHtml(p.venueName)}</p>` : ""}
    </div>` : ""}
  </div>
  <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;"><p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p></div>
</div></body></html>`,
    };
  }

  if (type === "guest_recap_available") {
    return {
      subject: `The ${String(p.coupleLabel || `${payload.coupleName1 || "Partner"} & ${payload.coupleName2 || "Partner"}`)} wedding recap is ready`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <div style="background:#1a1a1a;padding:34px 40px;text-align:center;">
    <p style="margin:0;color:#c8a97e;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Wedding Recap</p>
    <h1 style="margin:10px 0 0;color:#fff;font-size:30px;font-weight:400;">${p.coupleLabel ? escapeHtml(p.coupleLabel) : `${c1} &amp; ${c2}`}</h1>
  </div>
  <div style="padding:38px 36px;text-align:center;">
    <p style="font-size:18px;color:#333;margin:0 0 10px;">Hi ${escapeHtml(p.guestName || "there")},</p>
    <p style="font-size:15px;color:#555;line-height:1.75;margin:0 0 26px;">The guest photo recap is ready: highlights, memory chapters, and shared moments from the wedding weekend.</p>
    <a href="${safeEmailHref(p.recapUrl)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 34px;border-radius:999px;font-size:14px;font-weight:600;">View the recap</a>
    <p style="margin:22px 0 0;font-size:13px;color:#777;line-height:1.6;">Have photos from the day? You can still add them from the recap page.</p>
  </div>
  <div style="padding:20px 36px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
    <p style="margin:0;font-size:12px;color:#999;">Made with DayOf</p>
  </div>
</div></body></html>`,
    };
  }

  if (type === "prospect_future_event") {
    return {
      subject: `Want a DayOf site for your own event?`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <div style="background:#1a1a1a;padding:34px 40px;text-align:center;">
    <p style="margin:0;color:#c8a97e;font-size:12px;letter-spacing:3px;text-transform:uppercase;">DayOf</p>
    <h1 style="margin:10px 0 0;color:#fff;font-size:28px;font-weight:400;">Make your event feel this easy</h1>
  </div>
  <div style="padding:38px 36px;text-align:center;">
    <p style="font-size:18px;color:#333;margin:0 0 10px;">Hi ${escapeHtml(p.guestName || "there")},</p>
    <p style="font-size:15px;color:#555;line-height:1.75;margin:0 0 18px;">You used DayOf for ${p.coupleLabel ? escapeHtml(p.coupleLabel) : `${c1} &amp; ${c2}`}. If you ever plan your own wedding or private event, you can get the same RSVP, photo recap, guest messaging, and planning tools in one place.</p>
    <a href="${safeEmailHref(p.signupUrl || "https://dayof.love/signup")}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 34px;border-radius:999px;font-size:14px;font-weight:600;">Create your DayOf</a>
    <p style="margin:22px 0 0;font-size:13px;color:#777;line-height:1.6;">Want to remember what it looked like? <a href="${safeEmailHref(p.recapUrl)}" style="color:#1a1a1a;">Open the wedding recap</a>.</p>
  </div>
  <div style="padding:20px 36px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
    <p style="margin:0;font-size:12px;color:#999;">Made with DayOf</p>
  </div>
</div></body></html>`,
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const apiKey = req.headers.get("apikey");
    if (bearerToken !== serviceRoleKey && apiKey !== serviceRoleKey) {
      return json({ error: EMAIL_QUEUE_ACCESS_REQUIRED_COPY }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const queueIds = Array.isArray(body?.queueIds)
      ? Array.from(new Set(body.queueIds.filter((value: unknown): value is string => typeof value === "string" && isUuid(value))))
      : [];
    if (Array.isArray(body?.queueIds) && queueIds.length !== body.queueIds.length) {
      return json({ error: EMAIL_QUEUE_REQUEST_INVALID_COPY }, 400);
    }
    if (queueIds.length > BATCH_SIZE) {
      return json({ error: EMAIL_QUEUE_REQUEST_INVALID_COPY }, 400);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return json({ error: "Could not process email queue. Please try again." }, 500);
    }

    let fetchQuery = adminClient
      .from("email_queue")
      .select("id, type, payload_json, attempts")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS);

    if (queueIds.length > 0) {
      fetchQuery = fetchQuery.in("id", queueIds);
    } else {
      fetchQuery = fetchQuery.order("created_at", { ascending: true }).limit(BATCH_SIZE);
    }

    const { data: items, error: fetchErr } = await fetchQuery;

    if (fetchErr) throw fetchErr;
    if (!items || items.length === 0) {
      return json({ processed: 0 });
    }

    let delivered = 0;
    let failed = 0;

    for (const item of items) {
      const payload = item.payload_json as Record<string, unknown>;
      const to = payload.to as string | undefined;

      if (!isSafeEmailAddress(to)) {
        await adminClient
          .from("email_queue")
          .update({ status: "failed", error: "Invalid recipient email", attempts: item.attempts + 1 })
          .eq("id", item.id);
        failed++;
        continue;
      }

      const built = buildEmailHtml(item.type, payload);
      if (!built) {
        await adminClient
          .from("email_queue")
          .update({ status: "failed", error: "Unknown email type", attempts: item.attempts + 1 })
          .eq("id", item.id);
        failed++;
        continue;
      }

      await adminClient
        .from("email_queue")
        .update({ status: "sending", attempts: item.attempts + 1 })
        .eq("id", item.id);

      try {
        const coupleName1 = typeof payload.coupleName1 === "string" ? payload.coupleName1 : null;
        const coupleName2 = typeof payload.coupleName2 === "string" ? payload.coupleName2 : null;
        const siteSlug = typeof payload.siteSlug === "string" ? payload.siteSlug : null;
        const { fromAddress } = resolveLaunchFromAddress({ coupleName1, coupleName2, siteSlug });
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [to],
            subject: sanitizeEmailSubject(built.subject),
            html: built.html,
          }),
        });

        if (res.ok) {
          await adminClient
            .from("email_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", item.id);
          delivered++;
        } else {
          console.error("PROCESS_EMAIL_QUEUE_PROVIDER_FAILED", { status: res.status });
          await adminClient
            .from("email_queue")
            .update({ status: item.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending", error: SAFE_DELIVERY_ERROR })
            .eq("id", item.id);
          failed++;
        }
      } catch (sendErr) {
        console.error("PROCESS_EMAIL_QUEUE_SEND_FAILED", { reason: "QUEUE_SEND_FAILED" });
        await adminClient
          .from("email_queue")
          .update({ status: item.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending", error: SAFE_DELIVERY_ERROR })
          .eq("id", item.id);
        failed++;
      }
    }

    return json({ processed: items.length, delivered, failed });
  } catch (err) {
    console.error("PROCESS_EMAIL_QUEUE_UNEXPECTED_FAILED", { reason: "UNEXPECTED_EMAIL_QUEUE_FAILURE" });
    return json({ error: "Could not process email queue. Please try again." }, 500);
  }
});

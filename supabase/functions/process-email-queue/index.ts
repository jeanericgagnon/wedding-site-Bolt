import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

function buildEmailHtml(type: string, payload: Record<string, unknown>): { subject: string; html: string } | null {
  const p = payload as Record<string, string | boolean | null>;
  const c1 = (p.coupleName1 as string) ?? "Partner";
  const c2 = (p.coupleName2 as string) ?? "Partner";

  if (type === "rsvp_notification") {
    const attending = p.attending as boolean;
    const guestName = p.guestName as string;
    return {
      subject: `New RSVP from ${guestName}`,
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
    ${attending && p.mealChoice ? `<p style="margin:20px 0 0;font-size:14px;color:#555;">Meal: <strong>${p.mealChoice}</strong></p>` : ""}
    ${attending && p.plusOneName ? `<p style="margin:8px 0 0;font-size:14px;color:#555;">Plus one: <strong>${p.plusOneName}</strong></p>` : ""}
    ${p.notes ? `<p style="margin:8px 0 0;font-size:14px;color:#555;">Notes: ${p.notes}</p>` : ""}
  </div>
  <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;"><p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p></div>
</div></body></html>`,
    };
  }

  if (type === "rsvp_confirmation") {
    const attending = p.attending as boolean;
    const guestName = p.guestName as string;
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
      ${p.weddingDate ? `<p style="margin:0 0 6px;font-size:15px;color:#333;">${p.weddingDate}</p>` : ""}
      ${p.venueName ? `<p style="margin:0;font-size:15px;color:#333;">${p.venueName}</p>` : ""}
    </div>` : ""}
  </div>
  <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;"><p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p></div>
</div></body></html>`,
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return json({ error: "Email service not configured" }, 500);
    }

    const { data: items, error: fetchErr } = await adminClient
      .from("email_queue")
      .select("id, type, payload_json, attempts")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!items || items.length === 0) {
      return json({ processed: 0 });
    }

    let delivered = 0;
    let failed = 0;

    for (const item of items) {
      const payload = item.payload_json as Record<string, unknown>;
      const to = payload.to as string | undefined;

      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
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
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "DayOf <onboarding@resend.dev>",
            to: [to],
            subject: built.subject,
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
          const errBody = await res.text();
          await adminClient
            .from("email_queue")
            .update({ status: item.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending", error: errBody })
            .eq("id", item.id);
          failed++;
        }
      } catch (sendErr) {
        const msg = sendErr instanceof Error ? sendErr.message : "Send error";
        await adminClient
          .from("email_queue")
          .update({ status: item.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending", error: msg })
          .eq("id", item.id);
        failed++;
      }
    }

    return json({ processed: items.length, delivered, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});

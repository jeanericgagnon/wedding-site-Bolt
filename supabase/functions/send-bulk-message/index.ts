import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendBulkPayload {
  messageId: string;
}

function buildEmailHtml(opts: {
  subject: string;
  body: string;
  coupleName1: string;
  coupleName2: string;
  guestName?: string;
}): string {
  const { subject, body, coupleName1, coupleName2, guestName } = opts;
  const greeting = guestName ? `<p style="margin:0 0 16px;font-size:16px;color:#333;">Dear ${guestName},</p>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
      <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">${subject}</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:400;">${coupleName1} &amp; ${coupleName2}</h1>
    </div>
    <div style="padding:40px;">
      ${greeting}
      <div style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
      <p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendViaResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opts.from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { error: `Resend ${res.status}: ${body}` };
    }
    const data = await res.json();
    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: SendBulkPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messageId } = payload;
    if (!messageId) {
      return new Response(JSON.stringify({ error: "messageId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: message, error: msgErr } = await adminClient
      .from("messages")
      .select("*, wedding_sites(id, couple_name_1, couple_name_2, user_id)")
      .eq("id", messageId)
      .maybeSingle();

    if (msgErr || !message) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (message.wedding_sites?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["queued", "scheduled", "failed"].includes(message.status)) {
      return new Response(JSON.stringify({ error: `Cannot send message with status '${message.status}'` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (message.status === "scheduled" && message.scheduled_for) {
      const scheduledAt = new Date(message.scheduled_for).getTime();
      if (scheduledAt > Date.now()) {
        return new Response(JSON.stringify({ error: "Message is scheduled for a future time" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const audience: string = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? "all";
    let guestQuery = adminClient
      .from("guests")
      .select("id, first_name, last_name, name, email, rsvp_status")
      .eq("wedding_site_id", message.wedding_sites.id)
      .not("email", "is", null);

    if (audience === "attending") {
      guestQuery = guestQuery.eq("rsvp_status", "confirmed");
    } else if (audience === "not_responded") {
      guestQuery = guestQuery.eq("rsvp_status", "pending");
    } else if (audience === "declined") {
      guestQuery = guestQuery.eq("rsvp_status", "declined");
    }

    const { data: guests, error: guestErr } = await guestQuery;
    if (guestErr) {
      return new Response(JSON.stringify({ error: "Failed to load guest list" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eligibleGuests = (guests ?? []).filter((g) => g.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email));

    await adminClient
      .from("messages")
      .update({ status: "sending", sending_started_at: new Date().toISOString() })
      .eq("id", messageId);

    const coupleName1: string = message.wedding_sites?.couple_name_1 ?? "Partner";
    const coupleName2: string = message.wedding_sites?.couple_name_2 ?? "Partner";
    const fromAddress = `${coupleName1} & ${coupleName2} <onboarding@resend.dev>`;

    let deliveredCount = 0;
    let failedCount = 0;

    const deliveryInserts: Array<{
      message_id: string;
      guest_id: string;
      recipient_email: string;
      recipient_name: string;
      status: string;
      provider_message_id?: string;
      error_message?: string;
      attempted_at: string;
      delivered_at?: string;
    }> = [];

    for (const guest of eligibleGuests) {
      const guestName = guest.first_name && guest.last_name
        ? `${guest.first_name} ${guest.last_name}`
        : guest.name;

      const attemptedAt = new Date().toISOString();

      if (!resendApiKey) {
        deliveryInserts.push({
          message_id: messageId,
          guest_id: guest.id,
          recipient_email: guest.email,
          recipient_name: guestName,
          status: "failed",
          error_message: "Email provider not configured (RESEND_API_KEY missing)",
          attempted_at: attemptedAt,
        });
        failedCount++;
        continue;
      }

      const html = buildEmailHtml({
        subject: message.subject,
        body: message.body,
        coupleName1,
        coupleName2,
        guestName,
      });

      const result = await sendViaResend({
        apiKey: resendApiKey,
        from: fromAddress,
        to: guest.email,
        subject: message.subject,
        html,
      });

      if (result.error) {
        deliveryInserts.push({
          message_id: messageId,
          guest_id: guest.id,
          recipient_email: guest.email,
          recipient_name: guestName,
          status: "failed",
          error_message: result.error,
          attempted_at: attemptedAt,
        });
        failedCount++;
      } else {
        deliveryInserts.push({
          message_id: messageId,
          guest_id: guest.id,
          recipient_email: guest.email,
          recipient_name: guestName,
          status: "sent",
          provider_message_id: result.id,
          attempted_at: attemptedAt,
          delivered_at: new Date().toISOString(),
        });
        deliveredCount++;
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    if (deliveryInserts.length > 0) {
      await adminClient.from("message_deliveries").insert(deliveryInserts);
    }

    const finalStatus = failedCount === 0 ? "sent" : deliveredCount === 0 ? "failed" : "partial";
    await adminClient
      .from("messages")
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        sending_finished_at: new Date().toISOString(),
        delivered_count: deliveredCount,
        failed_count: failedCount,
        recipient_count: eligibleGuests.length,
      })
      .eq("id", messageId);

    return new Response(
      JSON.stringify({
        success: true,
        delivered: deliveredCount,
        failed: failedCount,
        total: eligibleGuests.length,
        status: finalStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

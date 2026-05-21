import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { escapeHtml, sanitizeEmailSubject } from "../_shared/emailSafety.ts";
import { canMutateMessages } from "../_shared/collaboratorPermissions.ts";
import { resolveLaunchFromAddress } from "../_shared/emailSender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendBulkPayload {
  messageId?: string;
  processScheduled?: boolean;
  limit?: number;
}

type SiteMessagingRole = "owner" | "planner" | "coordinator" | "viewer";
const SMS_SEGMENT_SIZE = 160;
const MESSAGE_EVENT_AUDIENCE_REQUIRED_COPY = "Choose an event audience before sending this message.";
const MESSAGE_NOT_READY_TO_SEND_COPY = "This message is not ready to send yet.";
const MESSAGE_SCHEDULED_LATER_COPY = "This message is still scheduled for later.";
const MESSAGE_REQUEST_INVALID_COPY = "Could not read this message request. Please try again.";
const MESSAGE_SELECTION_REQUIRED_COPY = "Choose a message before sending.";
const MESSAGE_SIGNIN_REQUIRED_COPY = "Please sign in to send this message.";
const MESSAGE_ACCESS_UNAVAILABLE_COPY = "This message request is not available.";
const MESSAGE_NOT_FOUND_COPY = "This message is not available.";
const MESSAGE_DELIVERY_SELECT = [
  "id",
  "wedding_site_id",
  "subject",
  "body",
  "status",
  "scheduled_for",
  "audience_filter",
  "recipient_filter",
  "channel",
  "wedding_sites(id,couple_name_1,couple_name_2,site_slug,user_id)",
].join(",");

function safeSendBulkError(code: string): string {
  switch (code) {
    case "AUDIENCE_LOAD_FAILED":
      return "Could not load this message audience. Please try again.";
    case "DELIVERY_LOG_FAILED":
      return "Could not save delivery history. Please try again.";
    case "MESSAGE_UPDATE_FAILED":
      return "Could not update this message. Please try again.";
    case "DELIVERY_PROVIDER_FAILED":
      return "Delivery did not complete. Please review the recipient and try again.";
    case "SMS_CREDITS_FAILED":
      return "Could not verify SMS credits. Please try again.";
    default:
      return "Could not process this message. Please try again.";
  }
}

function safeDeliveryFailureMessage(channel: string): string {
  return channel === "sms"
    ? "Text delivery did not complete. Please review the recipient and try again."
    : "Email delivery did not complete. Please review the recipient and try again.";
}

function normalizeRecipientFilterGuestIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  ));
}

function countSmsSegments(body: string): number {
  const length = body.trim().length;
  if (length <= 0) return 0;
  return Math.ceil(length / SMS_SEGMENT_SIZE);
}

async function sendViaTwilio(opts: {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const auth = btoa(`${opts.accountSid}:${opts.authToken}`);
    const form = new URLSearchParams();
    form.set("From", opts.from);
    form.set("To", opts.to);
    form.set("Body", opts.body);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${opts.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    if (!res.ok) {
      console.error("SEND_BULK_MESSAGE_SMS_PROVIDER_FAILED", { status: res.status });
      return { error: safeDeliveryFailureMessage("sms") };
    }

    const data = await res.json();
    return { id: data.sid };
  } catch (err) {
    console.error("SEND_BULK_MESSAGE_SMS_NETWORK_FAILED", { reason: "SMS_NETWORK_FAILED" });
    return { error: safeDeliveryFailureMessage("sms") };
  }
}

function buildEmailHtml(opts: {
  subject: string;
  body: string;
  coupleName1: string;
  coupleName2: string;
  guestName?: string;
}): string {
  const { subject, body, coupleName1, coupleName2, guestName } = opts;
  const safeSubject = escapeHtml(subject);
  const safeCoupleName1 = escapeHtml(coupleName1);
  const safeCoupleName2 = escapeHtml(coupleName2);
  const greeting = guestName ? `<p style="margin:0 0 16px;font-size:16px;color:#333;">Dear ${escapeHtml(guestName)},</p>` : "";
  const safeBody = escapeHtml(body);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
      <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">${safeSubject}</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:400;">${safeCoupleName1} &amp; ${safeCoupleName2}</h1>
    </div>
    <div style="padding:40px;">
      ${greeting}
      <div style="font-size:15px;color:#444;line-height:1.8;white-space:pre-wrap;">${safeBody}</div>
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
        subject: sanitizeEmailSubject(opts.subject),
        html: opts.html,
      }),
    });
    if (!res.ok) {
      console.error("SEND_BULK_MESSAGE_EMAIL_PROVIDER_FAILED", { status: res.status });
      return { error: safeDeliveryFailureMessage("email") };
    }
    const data = await res.json();
    return { id: data.id };
  } catch (err) {
    console.error("SEND_BULK_MESSAGE_EMAIL_NETWORK_FAILED", { reason: "EMAIL_NETWORK_FAILED" });
    return { error: safeDeliveryFailureMessage("email") };
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isMissingDeliveriesTableError(error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined): boolean {
  const haystack = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes("message_deliveries")
    || haystack.includes("does not exist")
    || haystack.includes("schema cache")
    || haystack.includes("42p01");
}

async function resolveSiteMessagingRole(adminClient: ReturnType<typeof createClient>, weddingSiteId: string, userId: string): Promise<SiteMessagingRole | null> {
  const { data: ownedSite, error: ownedError } = await adminClient
    .from("wedding_sites")
    .select("id")
    .eq("id", weddingSiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (ownedSite?.id) return "owner";

  const { data: collaboratorRow, error: collaboratorError } = await adminClient
    .from("wedding_site_collaborators")
    .select("role, permissions")
    .eq("wedding_site_id", weddingSiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (collaboratorError) throw collaboratorError;
  const role = collaboratorRow?.role;
  if (canMutateMessages(role, collaboratorRow?.permissions)) {
    return role;
  }
  return null;
}

async function listMessageManageableSiteIds(adminClient: ReturnType<typeof createClient>, userId: string): Promise<string[]> {
  const [{ data: ownedSites, error: ownedError }, { data: collaboratorSites, error: collaboratorError }] = await Promise.all([
    adminClient
      .from("wedding_sites")
      .select("id")
      .eq("user_id", userId),
    adminClient
      .from("wedding_site_collaborators")
      .select("wedding_site_id, role, permissions")
      .eq("user_id", userId)
  ]);

  if (ownedError) throw ownedError;
  if (collaboratorError) throw collaboratorError;

  return Array.from(new Set([
    ...(ownedSites ?? []).map((row: { id: string }) => row.id),
    ...(collaboratorSites ?? [])
      .filter((row: { role?: unknown; permissions?: unknown }) => canMutateMessages(row.role, row.permissions))
      .map((row: { wedding_site_id: string }) => row.wedding_site_id),
  ].filter(Boolean)));
}

async function deliverMessage(opts: {
  adminClient: ReturnType<typeof createClient>;
  userId: string;
  messageId: string;
  resendApiKey?: string | null;
  twilioSid?: string | null;
  twilioToken?: string | null;
  twilioFrom?: string | null;
}): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const { adminClient, userId, messageId, resendApiKey, twilioSid, twilioToken, twilioFrom } = opts;

  const { data: message, error: msgErr } = await adminClient
    .from("messages")
    .select(MESSAGE_DELIVERY_SELECT)
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr || !message) {
    return { ok: false, status: 404, body: { error: MESSAGE_NOT_FOUND_COPY } };
  }

  const siteRole = await resolveSiteMessagingRole(adminClient, message.wedding_sites.id, userId);
  if (!siteRole) {
    return { ok: false, status: 403, body: { error: MESSAGE_ACCESS_UNAVAILABLE_COPY } };
  }

  if (!["queued", "scheduled", "failed"].includes(message.status)) {
    return { ok: false, status: 400, body: { error: MESSAGE_NOT_READY_TO_SEND_COPY } };
  }

  if (message.status === "scheduled" && message.scheduled_for) {
    const scheduledAt = new Date(message.scheduled_for).getTime();
    if (scheduledAt > Date.now()) {
      return { ok: false, status: 400, body: { error: MESSAGE_SCHEDULED_LATER_COPY } };
    }
  }

  const audience: string = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? "all";
  const channel: string = message.channel ?? "email";
  let guestQuery = adminClient
    .from("guests")
    .select("id, first_name, last_name, name, email, phone, sms_consent, rsvp_status")
    .eq("wedding_site_id", message.wedding_sites.id);

  if (channel === "sms") {
    guestQuery = guestQuery.not("phone", "is", null);
  } else {
    guestQuery = guestQuery.not("email", "is", null);
  }

  if (audience.startsWith("event:")) {
    const eventId = audience.replace("event:", "").trim();
    if (!eventId) {
      return { ok: false, status: 400, body: { error: MESSAGE_EVENT_AUDIENCE_REQUIRED_COPY } };
    }

    const { data: eventInvites, error: eventInvitesError } = await adminClient
      .from("event_invitations")
      .select("guest_id")
      .eq("event_id", eventId);

    if (eventInvitesError) {
      return { ok: false, status: 500, body: { error: "Failed to load event audience" } };
    }

    const guestIds = Array.from(new Set((eventInvites ?? []).map((row: { guest_id: string | null }) => row.guest_id).filter(Boolean))) as string[];
    guestQuery = guestIds.length === 0
      ? guestQuery.in("id", ["00000000-0000-0000-0000-000000000000"])
      : guestQuery.in("id", guestIds);
  } else if (audience === "attending") {
    guestQuery = guestQuery.in("rsvp_status", ["confirmed", "attending", "accepted"]);
  } else if (audience === "not_responded") {
    guestQuery = guestQuery.or("rsvp_status.is.null,rsvp_status.eq.pending");
  } else if (audience === "declined") {
    guestQuery = guestQuery.in("rsvp_status", ["declined", "not_attending"]);
  }

  const { data: guests, error: guestErr } = await guestQuery;
  if (guestErr) {
    return { ok: false, status: 500, body: { error: "Failed to load guest list" } };
  }

  const allGuests = guests ?? [];
  const retryGuestIds = normalizeRecipientFilterGuestIds(message.recipient_filter?.retry_guest_ids);
  const excludedGuestIds = new Set(normalizeRecipientFilterGuestIds(message.recipient_filter?.excluded_guest_ids));
  const scopedGuests = allGuests
    .filter((guest) => retryGuestIds.length === 0 || retryGuestIds.includes(guest.id))
    .filter((guest) => !excludedGuestIds.has(guest.id));
  const eligibleGuests = scopedGuests.filter((g) => {
    if (channel === "sms") return !!g.phone && g.sms_consent === true;
    return g.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email);
  });
  const skippedGuests = scopedGuests.filter((g) => {
    if (channel === "sms") return !g.phone || g.sms_consent !== true;
    return !(g.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email));
  });

  const coupleName1: string = message.wedding_sites?.couple_name_1 ?? "Partner";
  const coupleName2: string = message.wedding_sites?.couple_name_2 ?? "Partner";

  const { fromAddress } = resolveLaunchFromAddress({
    coupleName1,
    coupleName2,
    siteSlug: message.wedding_sites?.site_slug as string | undefined,
  });

  if (channel === "email") {
    const { data: sentRows, error: sentErr } = await adminClient
      .from("messages")
      .select("recipient_count,status")
      .eq("wedding_site_id", message.wedding_sites.id)
      .eq("channel", "email");

    if (sentErr) {
      console.error("SEND_BULK_MESSAGE_EMAIL_CAP_LOAD_FAILED", { reason: "EMAIL_CAP_LOAD_FAILED" });
      return { ok: false, status: 500, body: { error: safeSendBulkError("AUDIENCE_LOAD_FAILED") } };
    }

    const used = (sentRows ?? [])
      .filter((r: any) => ["sent", "partial", "queued"].includes(String(r.status ?? "")))
      .reduce((sum: number, r: any) => sum + Number(r.recipient_count ?? 0), 0);

    const HARD_EMAIL_CAP = 1000;
    if (used + eligibleGuests.length > HARD_EMAIL_CAP) {
      return {
        ok: false,
        status: 400,
        body: {
          error: `Email send cap reached. This account allows up to ${HARD_EMAIL_CAP} total recipients. Used ${used}, attempted ${eligibleGuests.length}.`,
        },
      };
    }
  }

  let deliveredCount = 0;
  let failedCount = 0;
  const refreshedRecipientFilter = {
    ...(message.recipient_filter ?? {}),
    audience,
    recipient_count: scopedGuests.length,
    reachable_count: eligibleGuests.length,
    skipped_count: skippedGuests.length,
    retry_guest_ids: retryGuestIds,
    excluded_guest_ids: Array.from(excludedGuestIds),
    sms_segment_count: channel === "sms" ? countSmsSegments(message.body ?? "") : null,
    sms_credit_cost: channel === "sms" ? eligibleGuests.length * countSmsSegments(message.body ?? "") : null,
  };

  if (channel === "sms") {
    const smsSegmentCount = countSmsSegments(message.body ?? "");
    const smsCreditCost = eligibleGuests.length * smsSegmentCount;

    if (Deno.env.get("ENABLE_SMS_PROVIDER") !== "true") {
      return { ok: false, status: 503, body: { error: "SMS provider setup pending. Telnyx sending is not enabled yet." } };
    }

    if (!twilioSid || !twilioToken || !twilioFrom) {
      return { ok: false, status: 500, body: { error: "SMS sending is not available right now. Please try again later." } };
    }

    const nowIso = new Date().toISOString();
    const { data: purchaseLots, error: lotsError } = await adminClient
      .from("sms_credit_transactions")
      .select("id, remaining_credits, expires_at, created_at")
      .eq("wedding_site_id", message.wedding_sites.id)
      .in("reason", ["purchase", "included"])
      .order("created_at", { ascending: true });

    if (lotsError) {
      console.error("SEND_BULK_MESSAGE_SMS_CREDITS_LOAD_FAILED", { reason: "SMS_CREDITS_LOAD_FAILED" });
      return { ok: false, status: 500, body: { error: safeSendBulkError("SMS_CREDITS_FAILED") } };
    }

    const lots = (purchaseLots ?? []).map((l: any) => ({
      id: l.id as string,
      remaining: Number(l.remaining_credits ?? 0),
      expiresAt: l.expires_at as string | null,
    }));

    let expiredCredits = 0;
    for (const lot of lots) {
      if (lot.remaining <= 0) continue;
      if (lot.expiresAt && lot.expiresAt < nowIso) {
        expiredCredits += lot.remaining;
        await adminClient.from("sms_credit_transactions").update({ remaining_credits: 0 }).eq("id", lot.id);
      }
    }

    const usableLots = lots
      .filter((l) => l.remaining > 0 && (!l.expiresAt || l.expiresAt >= nowIso))
      .sort((a, b) => (a.expiresAt || "").localeCompare(b.expiresAt || ""));
    const availableCredits = usableLots.reduce((sum, l) => sum + l.remaining, 0);

    if (availableCredits < smsCreditCost) {
      return { ok: false, status: 400, body: { error: `Insufficient SMS credits: need ${smsCreditCost}, have ${availableCredits}` } };
    }

    let remainingToConsume = smsCreditCost;
    for (const lot of usableLots) {
      if (remainingToConsume <= 0) break;
      const take = Math.min(lot.remaining, remainingToConsume);
      if (take > 0) {
        await adminClient.from("sms_credit_transactions").update({ remaining_credits: lot.remaining - take }).eq("id", lot.id);
        remainingToConsume -= take;
      }
    }

    const { data: siteWallet } = await adminClient
      .from("wedding_sites")
      .select("sms_credits_balance")
      .eq("id", message.wedding_sites.id)
      .maybeSingle();
    const currentCredits = Number(siteWallet?.sms_credits_balance ?? 0);
    const nextCredits = Math.max(currentCredits - smsCreditCost - expiredCredits, 0);

    await adminClient
      .from("wedding_sites")
      .update({ sms_credits_balance: nextCredits })
      .eq("id", message.wedding_sites.id);

    await adminClient.from("sms_credit_transactions").insert({
      wedding_site_id: message.wedding_sites.id,
      credits_delta: -smsCreditCost,
      reason: "usage",
      metadata: { message_id: messageId, audience, channel, sms_segment_count: smsSegmentCount, recipient_count: eligibleGuests.length },
    });

    if (expiredCredits > 0) {
      await adminClient.from("sms_credit_transactions").insert({
        wedding_site_id: message.wedding_sites.id,
        credits_delta: -expiredCredits,
        reason: "expiry",
        metadata: { swept_at: nowIso },
      });
    }
  }

  await adminClient
    .from("messages")
    .update({ status: "sending", sending_started_at: new Date().toISOString() })
    .eq("id", messageId);

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

  const clearDeliveriesResult = await adminClient
    .from("message_deliveries")
    .delete()
    .eq("message_id", messageId);
  if (clearDeliveriesResult.error && !isMissingDeliveriesTableError(clearDeliveriesResult.error)) {
    console.error("SEND_BULK_MESSAGE_DELIVERY_CLEAR_FAILED", { reason: "DELIVERY_CLEAR_FAILED" });
    return { ok: false, status: 500, body: { error: safeSendBulkError("DELIVERY_LOG_FAILED") } };
  }
  const canWriteDeliveryLog = !clearDeliveriesResult.error;

  for (const guest of skippedGuests) {
    const guestName = guest.first_name && guest.last_name
      ? `${guest.first_name} ${guest.last_name}`
      : guest.name;

    deliveryInserts.push({
      message_id: messageId,
      guest_id: guest.id,
      recipient_email: channel === "sms" ? (guest.phone ?? "") : (guest.email ?? ""),
      recipient_name: guestName,
      status: "skipped",
      error_message: channel === "sms"
        ? "Skipped: guest is missing a phone number or SMS consent"
        : "Skipped: guest is missing a valid email address",
      attempted_at: new Date().toISOString(),
    });
  }

  for (const guest of eligibleGuests) {
    const guestName = guest.first_name && guest.last_name
      ? `${guest.first_name} ${guest.last_name}`
      : guest.name;

    const attemptedAt = new Date().toISOString();
    let result: { id?: string; error?: string };
    const recipient = channel === "sms" ? guest.phone : guest.email;

    if (channel === "sms") {
      result = await sendViaTwilio({
        accountSid: twilioSid!,
        authToken: twilioToken!,
        from: twilioFrom!,
        to: guest.phone,
        body: message.body,
      });
    } else {
      if (!resendApiKey) {
        deliveryInserts.push({
          message_id: messageId,
          guest_id: guest.id,
          recipient_email: guest.email,
          recipient_name: guestName,
          status: "failed",
          error_message: safeDeliveryFailureMessage("email"),
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

      result = await sendViaResend({
        apiKey: resendApiKey,
        from: fromAddress,
        to: guest.email,
        subject: message.subject,
        html,
      });
    }

    if (result.error) {
      deliveryInserts.push({
        message_id: messageId,
        guest_id: guest.id,
        recipient_email: recipient,
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
        recipient_email: recipient,
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

  if (deliveryInserts.length > 0 && canWriteDeliveryLog) {
    const insertDeliveriesResult = await adminClient.from("message_deliveries").insert(deliveryInserts);
    if (insertDeliveriesResult.error && !isMissingDeliveriesTableError(insertDeliveriesResult.error)) {
      console.error("SEND_BULK_MESSAGE_DELIVERY_INSERT_FAILED", { reason: "DELIVERY_INSERT_FAILED" });
      return { ok: false, status: 500, body: { error: safeSendBulkError("DELIVERY_LOG_FAILED") } };
    }
  }

  const skippedCount = skippedGuests.length;
  const finalStatus = failedCount === 0 && skippedCount === 0
    ? "sent"
    : deliveredCount === 0 && failedCount > 0
    ? "failed"
    : "partial";
  const sentAt = new Date().toISOString();

  const finalStatusUpdate = await adminClient
    .from("messages")
    .update({
      status: finalStatus,
      sent_at: sentAt,
    })
    .eq("id", messageId);

  if (finalStatusUpdate.error) {
    console.error("SEND_BULK_MESSAGE_STATUS_UPDATE_FAILED", { reason: "STATUS_UPDATE_FAILED" });
    return { ok: false, status: 500, body: { error: safeSendBulkError("MESSAGE_UPDATE_FAILED") } };
  }

  await adminClient
    .from("messages")
    .update({
      sending_finished_at: sentAt,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      recipient_count: allGuests.length,
    })
    .eq("id", messageId);

  await adminClient
    .from("messages")
    .update({ recipient_filter: refreshedRecipientFilter })
    .eq("id", messageId);

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      delivered: deliveredCount,
      failed: failedCount,
      total: allGuests.length,
      skipped: skippedCount,
      status: finalStatus,
      messageId,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: MESSAGE_SIGNIN_REQUIRED_COPY });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse(401, { error: MESSAGE_SIGNIN_REQUIRED_COPY });
    }

    let payload: SendBulkPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(400, { error: MESSAGE_REQUEST_INVALID_COPY });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    if (payload.processScheduled) {
      const limit = Math.max(1, Math.min(Number(payload.limit ?? 10) || 10, 25));
      const nowIso = new Date().toISOString();
      const manageableSiteIds = await listMessageManageableSiteIds(adminClient, user.id);

      if (manageableSiteIds.length === 0) {
        return jsonResponse(200, {
          success: true,
          processed: 0,
          sent: 0,
          failed: 0,
          partial: 0,
          skipped: 0,
          messages: [],
        });
      }

      const { data: dueMessages, error: dueMessagesError } = await adminClient
        .from("messages")
        .select("id, scheduled_for, wedding_site_id")
        .eq("status", "scheduled")
        .lte("scheduled_for", nowIso)
        .in("wedding_site_id", manageableSiteIds)
        .order("scheduled_for", { ascending: true })
        .limit(limit);

      if (dueMessagesError) {
        console.error("SEND_BULK_MESSAGE_DUE_MESSAGES_LOAD_FAILED", { reason: "DUE_MESSAGES_LOAD_FAILED" });
        return jsonResponse(500, { error: safeSendBulkError("AUDIENCE_LOAD_FAILED") });
      }

      const messageIds = (dueMessages ?? []).map((row: any) => row.id as string).filter(Boolean);
      if (messageIds.length === 0) {
        return jsonResponse(200, {
          success: true,
          processed: 0,
          sent: 0,
          failed: 0,
          partial: 0,
          skipped: 0,
          messages: [],
        });
      }

      const results = [] as Array<Record<string, unknown>>;
      let sent = 0;
      let failed = 0;
      let partial = 0;
      let skippedMessages = 0;
      let skippedRecipients = 0;

      for (const id of messageIds) {
        const result = await deliverMessage({
          adminClient,
          userId: user.id,
          messageId: id,
          resendApiKey,
          twilioSid,
          twilioToken,
          twilioFrom,
        });

        if (result.ok) {
          const status = String(result.body.status ?? "");
          skippedRecipients += Number(result.body.skipped ?? 0);
          if (status === "sent") sent += 1;
          else if (status === "partial") partial += 1;
          else if (status === "failed") failed += 1;
        } else if (result.status === 400 && String(result.body.error ?? "").includes("future time")) {
          skippedMessages += 1;
        } else {
          failed += 1;
        }

        results.push({ messageId: id, ok: result.ok, ...result.body });
      }

      return jsonResponse(200, {
        success: true,
        processed: messageIds.length,
        sent,
        failed,
        partial,
        skippedMessages,
        skippedRecipients,
        messages: results,
      });
    }

    if (!payload.messageId) {
      return jsonResponse(400, { error: MESSAGE_SELECTION_REQUIRED_COPY });
    }

    const result = await deliverMessage({
      adminClient,
      userId: user.id,
      messageId: payload.messageId,
      resendApiKey,
      twilioSid,
      twilioToken,
      twilioFrom,
    });

    return jsonResponse(result.status, result.body);
  } catch (err) {
    console.error("SEND_BULK_MESSAGE_UNEXPECTED_FAILED", { reason: "UNEXPECTED_SEND_BULK_FAILURE" });
    return jsonResponse(500, { error: "Could not process this message. Please try again." });
  }
});

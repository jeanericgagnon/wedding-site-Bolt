import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { escapeHtml, safeEmailUrl, sanitizeEmailSubject } from "../_shared/emailSafety.ts";
import { canMutateGuestsOrMessages, canMutateMessages } from "../_shared/collaboratorPermissions.ts";
import { resolveLaunchFromAddress } from "../_shared/emailSender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAIL_REQUEST_INVALID_COPY = "Could not read this email request. Please try again.";
const EMAIL_REQUEST_REQUIRED_COPY = "Complete the email details before sending.";
const EMAIL_ACCESS_UNAVAILABLE_COPY = "This email request is not available.";
const EMAIL_SIGNIN_REQUIRED_COPY = "Please sign in to send this email.";
const EMAIL_RECIPIENT_INVALID_COPY = "Enter a valid recipient email address.";
const EMAIL_SITE_REQUIRED_COPY = "Choose a site before sending this email.";

interface EmailPayload {
  type: "rsvp_notification" | "rsvp_confirmation" | "signup_welcome" | "wedding_invitation" | "anniversary_reminder";
  to: string;
  data: Record<string, unknown>;
}

function safeText(value: unknown, fallback = ""): string {
  const raw = String(value ?? "").trim();
  return escapeHtml(raw || fallback);
}

function anniversaryReminderHtml(data: Record<string, unknown>): string {
  const coupleName1 = safeText(data.coupleName1, "Partner");
  const coupleName2 = safeText(data.coupleName2, "Partner");
  const vaultLabel = safeText(data.vaultLabel, "Anniversary vault");
  const anniversaryYear = Number(data.anniversaryYear);
  const safeAnniversaryYear = Number.isFinite(anniversaryYear) ? anniversaryYear : 1;
  const unlockDate = data.unlockDate ? safeText(data.unlockDate) : null;
  const vaultUrl = safeEmailUrl(data.vaultUrl);
  const vaultUrlHtml = vaultUrl ? escapeHtml(vaultUrl) : null;
  const reminderKind = (data.reminderKind as string | null) ?? 'upcoming';

  const headline = reminderKind === 'unlock'
    ? 'Your anniversary vault is ready to open'
    : reminderKind === 'nudge'
      ? 'Add one more note before the anniversary arrives'
      : 'Your anniversary vault is coming up';

  const body = reminderKind === 'unlock'
    ? `The ${vaultLabel} for ${coupleName1} &amp; ${coupleName2} is now unlocked.`
    : reminderKind === 'nudge'
      ? `There’s still time to add something meaningful before the ${safeAnniversaryYear}${safeAnniversaryYear === 1 ? 'st' : safeAnniversaryYear === 2 ? 'nd' : safeAnniversaryYear === 3 ? 'rd' : 'th'} anniversary vault opens.`
      : `The ${vaultLabel} for ${coupleName1} &amp; ${coupleName2} is coming up soon.`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
      <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">Anniversary Vault</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:400;">${coupleName1} &amp; ${coupleName2}</h1>
    </div>
    <div style="padding:40px;">
      <p style="font-size:18px;color:#333;margin-bottom:8px;">${headline}</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin-bottom:24px;">${body}</p>
      <div style="background:#f9f7f4;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;">Vault</p>
        <p style="margin:0;font-size:17px;color:#1a1a1a;font-weight:600;">${vaultLabel}</p>
        ${unlockDate ? `<p style="margin:8px 0 0;font-size:14px;color:#666;">Unlock date: ${unlockDate}</p>` : ''}
      </div>
      ${vaultUrlHtml ? `<a href="${vaultUrlHtml}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Open Vault</a>` : ''}
    </div>
    <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
      <p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p>
    </div>
  </div>
</body>
</html>`;
}

function rsvpNotificationHtml(data: Record<string, unknown>): string {
  const guestName = safeText(data.guestName, "A guest");
  const attending = data.attending as boolean;
  const mealChoice = data.mealChoice ? safeText(data.mealChoice) : null;
  const plusOneName = data.plusOneName ? safeText(data.plusOneName) : null;
  const notes = data.notes ? safeText(data.notes) : null;
  const coupleName1 = safeText(data.coupleName1, "Partner");
  const coupleName2 = safeText(data.coupleName2, "Partner");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
      <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">New RSVP Received</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:400;">${coupleName1} &amp; ${coupleName2}</h1>
    </div>
    <div style="padding:40px;">
      <div style="background:${attending ? '#f0fdf4' : '#fef2f2'};border:1px solid ${attending ? '#bbf7d0' : '#fecaca'};border-radius:8px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <p style="margin:0;font-size:18px;font-weight:600;color:${attending ? '#15803d' : '#dc2626'};">
          ${guestName} will ${attending ? 'be attending' : 'not be attending'}
        </p>
      </div>
      ${attending ? `
      <table style="width:100%;border-collapse:collapse;">
        ${mealChoice ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#888;font-size:14px;width:40%;">Meal Choice</td><td style="padding:10px 0;border-bottom:1px solid #f0ece4;font-size:14px;text-transform:capitalize;">${mealChoice}</td></tr>` : ''}
        ${plusOneName ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#888;font-size:14px;">Plus One</td><td style="padding:10px 0;border-bottom:1px solid #f0ece4;font-size:14px;">${plusOneName}</td></tr>` : ''}
        ${notes ? `<tr><td style="padding:10px 0;color:#888;font-size:14px;vertical-align:top;">Notes</td><td style="padding:10px 0;font-size:14px;">${notes}</td></tr>` : ''}
      </table>
      ` : ''}
    </div>
    <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
      <p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p>
    </div>
  </div>
</body>
</html>`;
}

function rsvpConfirmationHtml(data: Record<string, unknown>): string {
  const guestName = safeText(data.guestName, "there");
  const attending = data.attending as boolean;
  const coupleName1 = safeText(data.coupleName1, "Partner");
  const coupleName2 = safeText(data.coupleName2, "Partner");
  const weddingDate = data.weddingDate ? safeText(data.weddingDate) : null;
  const venueName = data.venueName ? safeText(data.venueName) : null;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
      <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">RSVP Confirmed</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:400;">${coupleName1} &amp; ${coupleName2}</h1>
    </div>
    <div style="padding:40px;text-align:center;">
      <p style="font-size:18px;color:#333;margin-bottom:8px;">Dear ${guestName},</p>
      ${attending
        ? `<p style="font-size:15px;color:#555;line-height:1.7;">Thank you for your RSVP! We are thrilled to celebrate this special day with you. We'll see you soon!</p>`
        : `<p style="font-size:15px;color:#555;line-height:1.7;">Thank you for letting us know. We'll miss you and hope to celebrate with you another time!</p>`
      }
      ${attending && (weddingDate || venueName) ? `
      <div style="background:#f9f7f4;border-radius:8px;padding:20px 24px;margin-top:24px;text-align:left;">
        <p style="margin:0 0 12px;font-size:13px;color:#888;letter-spacing:2px;text-transform:uppercase;">Event Details</p>
        ${weddingDate ? `<p style="margin:0 0 6px;font-size:15px;color:#333;">${weddingDate}</p>` : ''}
        ${venueName ? `<p style="margin:0;font-size:15px;color:#333;">${venueName}</p>` : ''}
      </div>` : ''}
    </div>
    <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
      <p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p>
    </div>
  </div>
</body>
</html>`;
}

function signupWelcomeHtml(data: Record<string, unknown>): string {
  const coupleName1 = safeText(data.coupleName1, "Partner");
  const coupleName2 = safeText(data.coupleName2, "Partner");
  const siteUrl = safeText(data.siteUrl, "Your wedding site");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:32px 40px;text-align:center;">
      <p style="margin:0;color:#c8a97e;font-size:13px;letter-spacing:3px;text-transform:uppercase;">Welcome to DayOf</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:400;">${coupleName1} &amp; ${coupleName2}</h1>
    </div>
    <div style="padding:40px;">
      <p style="font-size:16px;color:#333;line-height:1.7;margin-bottom:20px;">Congratulations! Your wedding website has been created. We're honored to be part of your special day.</p>
      <p style="font-size:15px;color:#555;line-height:1.7;margin-bottom:28px;">Your personal wedding site is ready. Once you've customized it, you can share it with your guests:</p>
      <div style="background:#f9f7f4;border-radius:8px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;">Your Wedding Site</p>
        <p style="margin:0;font-size:17px;color:#1a1a1a;font-weight:600;">${siteUrl}</p>
      </div>
      <ul style="padding-left:20px;color:#555;font-size:14px;line-height:2;">
        <li>Customize your site with photos and details</li>
        <li>Add your guest list and send invitations</li>
        <li>Track RSVPs in real time</li>
        <li>Manage your registry</li>
      </ul>
    </div>
    <div style="padding:24px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
      <p style="margin:0 0 10px;font-size:13px;color:#555;line-height:1.6;">I'm always working to make DayOf better.<br>If something breaks or you want a new feature, please email me at <a href="mailto:eric@dayof.love" style="color:#1a1a1a;text-decoration:none;font-weight:600;">eric@dayof.love</a>.</p>
      <p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p>
    </div>
  </div>
</body>
</html>`;
}

function weddingInvitationHtml(data: Record<string, unknown>): string {
  const guestName = safeText(data.guestName, "Guest");
  const coupleName1 = safeText(data.coupleName1, "Partner");
  const coupleName2 = safeText(data.coupleName2, "Partner");
  const weddingDate = data.weddingDate ? safeText(data.weddingDate) : null;
  const venueName = data.venueName ? safeText(data.venueName) : null;
  const venueAddress = data.venueAddress ? safeText(data.venueAddress) : null;
  const siteUrl = typeof data.siteUrl === "string" ? data.siteUrl : null;
  const inviteToken = typeof data.inviteToken === "string" ? data.inviteToken : null;

  const normalizeSiteUrl = (raw: string): string => {
    if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
    if (raw.includes('.')) return `https://${raw}`;
    return `https://${raw}.dayof.love`;
  };

  const baseUrl = siteUrl ? normalizeSiteUrl(siteUrl) : null;
  const rsvpUrl = baseUrl && inviteToken
    ? safeEmailUrl(`${baseUrl}/rsvp?token=${encodeURIComponent(inviteToken)}`)
    : baseUrl
    ? safeEmailUrl(`${baseUrl}/rsvp`)
    : null;
  const rsvpUrlHtml = rsvpUrl ? escapeHtml(rsvpUrl) : null;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#1a1a1a;padding:40px;text-align:center;">
      <p style="margin:0;color:#c8a97e;font-size:12px;letter-spacing:4px;text-transform:uppercase;">You're Invited</p>
      <div style="margin:16px 0;width:40px;height:1px;background:#c8a97e;display:inline-block;"></div>
      <h1 style="margin:8px 0;color:#ffffff;font-size:36px;font-weight:400;">${coupleName1}</h1>
      <p style="margin:0;color:#c8a97e;font-size:20px;">&amp;</p>
      <h1 style="margin:0;color:#ffffff;font-size:36px;font-weight:400;">${coupleName2}</h1>
    </div>
    <div style="padding:40px;text-align:center;">
      <p style="font-size:17px;color:#333;line-height:1.7;margin-bottom:8px;">Dear ${guestName},</p>
      <p style="font-size:15px;color:#555;line-height:1.8;margin-bottom:28px;">Together with their families, we joyfully invite you to share in the celebration of their wedding.</p>
      ${weddingDate || venueName ? `
      <div style="border:1px solid #ede9e0;border-radius:8px;padding:24px;margin-bottom:28px;">
        ${weddingDate ? `
        <p style="margin:0 0 8px;font-size:12px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">Date</p>
        <p style="margin:0 0 20px;font-size:18px;color:#1a1a1a;">${weddingDate}</p>
        ` : ''}
        ${venueName ? `
        <p style="margin:0 0 8px;font-size:12px;color:#aaa;letter-spacing:2px;text-transform:uppercase;">Location</p>
        <p style="margin:0;font-size:16px;color:#1a1a1a;">${venueName}</p>
        ${venueAddress ? `<p style="margin:4px 0 0;font-size:14px;color:#888;">${venueAddress}</p>` : ''}
        ` : ''}
      </div>` : ''}
      ${rsvpUrlHtml ? `
      <a href="${rsvpUrlHtml}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:14px;letter-spacing:2px;text-transform:uppercase;">RSVP Now</a>
      <p style="margin-top:16px;font-size:12px;color:#aaa;">or visit: <a href="${rsvpUrlHtml}" style="color:#888;">${rsvpUrlHtml}</a></p>
      ` : ''}
    </div>
    <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
      <p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p>
    </div>
  </div>
</body>
</html>`;
}

const AUTHENTICATED_EMAIL_TYPES = new Set(["wedding_invitation", "signup_welcome", "anniversary_reminder"]);
const SERVICE_ROLE_ONLY_TYPES = new Set(["rsvp_notification", "rsvp_confirmation"]);

async function canSendWeddingInvitation(opts: {
  adminClient: ReturnType<typeof createClient>;
  weddingSiteId: string;
  userId: string;
  inviteToken?: string | null;
  recipientEmail: string;
}): Promise<boolean> {
  const { adminClient, weddingSiteId, userId, inviteToken, recipientEmail } = opts;
  const { data: ownedSite, error: ownedError } = await adminClient
    .from("wedding_sites")
    .select("id")
    .eq("id", weddingSiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedError) throw ownedError;

  let hasSiteAccess = !!ownedSite?.id;
  if (!hasSiteAccess) {
    const { data: collaborator, error: collaboratorError } = await adminClient
      .from("wedding_site_collaborators")
      .select("role, permissions")
      .eq("wedding_site_id", weddingSiteId)
      .eq("user_id", userId)
      .maybeSingle();

    if (collaboratorError) throw collaboratorError;
    hasSiteAccess = canMutateGuestsOrMessages(collaborator?.role, collaborator?.permissions);
  }

  if (!hasSiteAccess) return false;
  if (!inviteToken) return true;

  const { data: guest, error: guestError } = await adminClient
    .from("guests")
    .select("id, email")
    .eq("wedding_site_id", weddingSiteId)
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (guestError) throw guestError;
  if (!guest?.id) return false;
  return String(guest.email ?? "").trim().toLowerCase() === recipientEmail.trim().toLowerCase();
}

async function canSendSiteScopedEmail(opts: {
  adminClient: ReturnType<typeof createClient>;
  weddingSiteId: string;
  userId: string;
}): Promise<boolean> {
  const { adminClient, weddingSiteId, userId } = opts;
  const { data: ownedSite, error: ownedError } = await adminClient
    .from("wedding_sites")
    .select("id")
    .eq("id", weddingSiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (ownedSite?.id) return true;

  const { data: collaborator, error: collaboratorError } = await adminClient
    .from("wedding_site_collaborators")
    .select("role, permissions")
    .eq("wedding_site_id", weddingSiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (collaboratorError) throw collaboratorError;
  return canMutateMessages(collaborator?.role, collaborator?.permissions);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const isServiceRole = token === serviceRoleKey;

    let payload: EmailPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: EMAIL_REQUEST_INVALID_COPY }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, to, data } = payload;

    if (!type || !to || !data) {
      return new Response(JSON.stringify({ error: EMAIL_REQUEST_REQUIRED_COPY }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (SERVICE_ROLE_ONLY_TYPES.has(type) && !isServiceRole) {
      return new Response(JSON.stringify({ error: EMAIL_ACCESS_UNAVAILABLE_COPY }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let authedUserId: string | null = null;
    let authedUserEmail: string | null = null;

    // Direct send types require an authenticated user or the server-side queue/service role.
    if (AUTHENTICATED_EMAIL_TYPES.has(type) && !isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: EMAIL_SIGNIN_REQUIRED_COPY }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: EMAIL_SIGNIN_REQUIRED_COPY }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authedUserId = user.id;
      authedUserEmail = user.email ?? null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      return new Response(JSON.stringify({ error: EMAIL_RECIPIENT_INVALID_COPY }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = AUTHENTICATED_EMAIL_TYPES.has(type) && !isServiceRole
      ? createClient(
        Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey,
      )
      : null;

    if (type === "signup_welcome" && !isServiceRole) {
      if (!authedUserEmail || authedUserEmail.trim().toLowerCase() !== to.trim().toLowerCase()) {
        return new Response(JSON.stringify({ error: EMAIL_ACCESS_UNAVAILABLE_COPY }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (type === "wedding_invitation" && !isServiceRole) {
      const weddingSiteId = typeof data.weddingSiteId === "string" ? data.weddingSiteId.trim() : "";
      if (!weddingSiteId) {
        return new Response(JSON.stringify({ error: EMAIL_SITE_REQUIRED_COPY }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allowed = await canSendWeddingInvitation({
        adminClient: adminClient!,
        weddingSiteId,
        userId: authedUserId!,
        inviteToken: typeof data.inviteToken === "string" ? data.inviteToken : null,
        recipientEmail: to,
      });

      if (!allowed) {
        return new Response(JSON.stringify({ error: EMAIL_ACCESS_UNAVAILABLE_COPY }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (type === "anniversary_reminder" && !isServiceRole) {
      const weddingSiteId = typeof data.weddingSiteId === "string" ? data.weddingSiteId.trim() : "";
      if (!weddingSiteId) {
        return new Response(JSON.stringify({ error: EMAIL_SITE_REQUIRED_COPY }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allowed = await canSendSiteScopedEmail({
        adminClient: adminClient!,
        weddingSiteId,
        userId: authedUserId!,
      });

      if (!allowed) {
        return new Response(JSON.stringify({ error: EMAIL_ACCESS_UNAVAILABLE_COPY }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Could not send this email. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let html = "";

    const coupleName1 = data.coupleName1 as string ?? "Partner";
    const coupleName2 = data.coupleName2 as string ?? "Partner";

    switch (type) {
      case "rsvp_notification":
        subject = `New RSVP from ${data.guestName}`;
        html = rsvpNotificationHtml(data);
        break;
      case "rsvp_confirmation":
        subject = `RSVP Confirmed – ${coupleName1} & ${coupleName2}`;
        html = rsvpConfirmationHtml(data);
        break;
      case "signup_welcome":
        subject = `Your wedding site is ready – ${coupleName1} & ${coupleName2}`;
        html = signupWelcomeHtml(data);
        break;
      case "wedding_invitation":
        subject = `You're Invited – ${coupleName1} & ${coupleName2}`;
        html = weddingInvitationHtml(data);
        break;
      case "anniversary_reminder":
        subject = `Anniversary vault update – ${coupleName1} & ${coupleName2}`;
        html = anniversaryReminderHtml(data);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { fromAddress } = resolveLaunchFromAddress({
      coupleName1,
      coupleName2,
      siteSlug: typeof data.siteSlug === "string" ? data.siteSlug : null,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: sanitizeEmailSubject(subject),
        html,
      }),
    });

    if (!resendResponse.ok) {
      console.error("SEND_WEDDING_EMAIL_PROVIDER_FAILED", { status: resendResponse.status });
      return new Response(JSON.stringify({ error: "Could not send this email. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendResponse.json();

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("SEND_WEDDING_EMAIL_UNEXPECTED_FAILED", { reason: "UNEXPECTED_SEND_EMAIL_FAILURE" });
    return new Response(JSON.stringify({ error: "Could not send this email. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

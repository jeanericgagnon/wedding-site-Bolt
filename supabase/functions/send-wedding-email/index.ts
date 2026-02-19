import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  type: "rsvp_notification" | "rsvp_confirmation" | "signup_welcome" | "wedding_invitation";
  to: string;
  data: Record<string, unknown>;
}

function rsvpNotificationHtml(data: Record<string, unknown>): string {
  const guestName = data.guestName as string;
  const attending = data.attending as boolean;
  const mealChoice = data.mealChoice as string | null;
  const plusOneName = data.plusOneName as string | null;
  const notes = data.notes as string | null;
  const coupleName1 = data.coupleName1 as string;
  const coupleName2 = data.coupleName2 as string;

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
  const guestName = data.guestName as string;
  const attending = data.attending as boolean;
  const coupleName1 = data.coupleName1 as string;
  const coupleName2 = data.coupleName2 as string;
  const weddingDate = data.weddingDate as string | null;
  const venueName = data.venueName as string | null;

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
  const coupleName1 = data.coupleName1 as string;
  const coupleName2 = data.coupleName2 as string;
  const siteUrl = data.siteUrl as string;

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
  const guestName = data.guestName as string;
  const coupleName1 = data.coupleName1 as string;
  const coupleName2 = data.coupleName2 as string;
  const weddingDate = data.weddingDate as string | null;
  const venueName = data.venueName as string | null;
  const venueAddress = data.venueAddress as string | null;
  const siteUrl = data.siteUrl as string | null;
  const inviteToken = data.inviteToken as string | null;

  const rsvpUrl = siteUrl && inviteToken
    ? `https://${siteUrl}/rsvp?token=${inviteToken}`
    : siteUrl
    ? `https://${siteUrl}/rsvp`
    : null;

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
      ${rsvpUrl ? `
      <a href="${rsvpUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:14px;letter-spacing:2px;text-transform:uppercase;">RSVP Now</a>
      <p style="margin-top:16px;font-size:12px;color:#aaa;">or visit: <a href="${rsvpUrl}" style="color:#888;">${rsvpUrl}</a></p>
      ` : ''}
    </div>
    <div style="padding:20px 40px;background:#f9f7f4;text-align:center;border-top:1px solid #ede9e0;">
      <p style="margin:0;font-size:12px;color:#aaa;">Powered by DayOf</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: EmailPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, to, data } = payload;

    if (!type || !to || !data) {
      return new Response(JSON.stringify({ error: "Missing required fields: type, to, data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      return new Response(JSON.stringify({ error: "Invalid recipient email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
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
      default:
        return new Response(JSON.stringify({ error: "Unknown email type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DayOf <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error("Resend error:", errorBody);
      return new Response(JSON.stringify({ error: "Failed to send email", details: errorBody }), {
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
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

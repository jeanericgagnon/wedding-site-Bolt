type SupabaseAdmin = {
  from: (table: string) => {
    select: (...args: unknown[]) => unknown;
    insert: (value: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

type RateLimitOptions = {
  admin: SupabaseAdmin;
  request: Request;
  scope: string;
  subject?: string | null;
  siteId?: string | null;
  siteSlug?: string | null;
  maxIp?: number;
  maxSubject?: number;
  windowMinutes?: number;
};

export function getRequesterIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  return forwardedFor.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;
}

async function sha256Hex(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function subjectMarker(scope: string, subject: string, siteId: string | null, siteSlug: string | null): Promise<string> {
  return `h:${await sha256Hex(`${scope}:${siteId ?? siteSlug ?? "global"}:${subject}`)}`;
}

async function requesterIpMarker(scope: string, ip: string, siteId: string | null, siteSlug: string | null): Promise<string> {
  return `h:${await sha256Hex(`${scope}:${siteId ?? siteSlug ?? "global"}:${ip}`)}`;
}

function safeReferrer(value: string | null): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}

async function countRecent(
  admin: SupabaseAdmin,
  filters: Record<string, string | null>,
  sinceIso: string,
) {
  let query = admin
    .from("public_submission_events")
    .select("id", { count: "exact", head: true }) as {
      eq: (column: string, value: string) => unknown;
      gte: (column: string, value: string) => Promise<{ count: number | null; error: { message: string } | null }>;
    };

  for (const [column, value] of Object.entries(filters)) {
    if (value) {
      query = query.eq(column, value) as typeof query;
    }
  }

  const { count, error } = await query.gte("created_at", sinceIso);
  if (error) throw new Error("PUBLIC_SUBMISSION_RATE_LIMIT_COUNT_FAILED");
  return count ?? 0;
}

export async function enforcePublicSubmissionRateLimit({
  admin,
  request,
  scope,
  subject = null,
  siteId = null,
  siteSlug = null,
  maxIp = 30,
  maxSubject = 10,
  windowMinutes = 10,
}: RateLimitOptions) {
  const ip = getRequesterIp(request);
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 500) || null;
  const referrer = safeReferrer(request.headers.get("referer"));
  const sinceIso = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const safeSubject = subject ? await subjectMarker(scope, subject, siteId, siteSlug) : null;
  const safeRequesterIp = ip ? await requesterIpMarker(scope, ip, siteId, siteSlug) : null;

  if (safeRequesterIp) {
    const ipCount = await countRecent(admin, { scope, requester_ip: safeRequesterIp }, sinceIso);
    if (ipCount >= maxIp) {
      return { ok: false as const, status: 429, message: "Too many requests. Please try again shortly.", requesterIpMarker: safeRequesterIp };
    }
  }

  if (safeSubject) {
    const subjectCount = await countRecent(admin, { scope, subject: safeSubject }, sinceIso);
    if (subjectCount >= maxSubject) {
      return { ok: false as const, status: 429, message: "Too many requests for this link. Please try again shortly.", requesterIpMarker: safeRequesterIp };
    }
  }

  const { error } = await admin.from("public_submission_events").insert({
    scope,
    subject: safeSubject,
    wedding_site_id: siteId,
    site_slug: siteSlug,
    requester_ip: safeRequesterIp,
    user_agent: userAgent,
    referrer,
  });
  if (error) throw new Error("PUBLIC_SUBMISSION_RATE_LIMIT_RECORD_FAILED");

  return { ok: true as const, requesterIpMarker: safeRequesterIp };
}

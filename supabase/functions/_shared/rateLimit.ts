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
  if (error) throw new Error(error.message);
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
  const referrer = (request.headers.get("referer") || "").slice(0, 500) || null;
  const sinceIso = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  if (ip) {
    const ipCount = await countRecent(admin, { scope, requester_ip: ip }, sinceIso);
    if (ipCount >= maxIp) {
      return { ok: false as const, status: 429, message: "Too many requests. Please try again shortly.", requesterIp: ip };
    }
  }

  if (subject) {
    const subjectCount = await countRecent(admin, { scope, subject }, sinceIso);
    if (subjectCount >= maxSubject) {
      return { ok: false as const, status: 429, message: "Too many requests for this link. Please try again shortly.", requesterIp: ip };
    }
  }

  const { error } = await admin.from("public_submission_events").insert({
    scope,
    subject,
    wedding_site_id: siteId,
    site_slug: siteSlug,
    requester_ip: ip,
    user_agent: userAgent,
    referrer,
  });
  if (error) throw new Error(error.message);

  return { ok: true as const, requesterIp: ip };
}

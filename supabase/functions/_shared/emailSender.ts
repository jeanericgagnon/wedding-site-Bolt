const PROD_LIKE_MODES = new Set(["production", "prod", "staging", "preview"]);

function truthy(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const domain = value.trim().toLowerCase().replace(/^@+/, "");
  if (!domain || !domain.includes(".")) return null;
  return domain;
}

function inferProdLikeMode() {
  if (truthy(Deno.env.get("IS_PRODUCTION"))) return true;
  const mode = (Deno.env.get("APP_ENV") || Deno.env.get("NODE_ENV") || "").trim().toLowerCase();
  if (!mode) return false;
  return PROD_LIKE_MODES.has(mode);
}

export function resolveLaunchFromAddress(params: {
  coupleName1?: string | null;
  coupleName2?: string | null;
  siteSlug?: string | null;
}) {
  const { coupleName1, coupleName2, siteSlug } = params;
  const fromDomain = normalizeDomain(Deno.env.get("FROM_EMAIL_DOMAIN"));
  const fromEmail = (Deno.env.get("FROM_EMAIL") || "").trim().toLowerCase();
  const fromName = (Deno.env.get("FROM_EMAIL_NAME") || "").trim() || `${coupleName1 || "Partner"} & ${coupleName2 || "Partner"}`;

  const slugSource = (siteSlug || `${coupleName1 || "partner"}-${coupleName2 || "partner"}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "wedding";
  const derivedFrom = fromDomain ? `noreply+${slugSource}@${fromDomain}` : "";
  const senderEmail = fromEmail || derivedFrom;

  if (inferProdLikeMode() && !senderEmail) {
    throw new Error("Launch sender configuration missing: set FROM_EMAIL or FROM_EMAIL_DOMAIN.");
  }

  return {
    senderEmail,
    fromAddress: `${fromName} <${senderEmail}>`,
  };
}

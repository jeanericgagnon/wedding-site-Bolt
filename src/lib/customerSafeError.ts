const INTERNAL_CUSTOMER_ERROR_PATTERN =
  /\b(openai|gpt(?:[-\w.]+)?|anthropic|claude|gemini|google|oauth|provider|model|api[-_\s]*key|apikey|anon[-_\s]*key|authorization|auth|bearer|cookie|passcode|credential(?:s)?|jwt|access[-_\s]*token|refresh[-_\s]*token|session[-_\s]*(?:token|cookie|id|refresh)|token(?:s)?|secret|service[-_\s]*role|supabase|postgres|postgrest|rpc|sql|schema|relation|table|column|constraint|duplicate\s*key|foreign\s*key|violates|row[-_\s]*level[-_\s]*security|rls|row|insert|update|delete|edge[-_\s]*function|functions?\/v1|function|database|storage|bucket|policy|permission(?:s)?|network|fetch|request\s*failed|failed\s*to\s*fetch|timeout|timed\s*out|status\s*code|error_code|error_message|metadata|stripe|checkout|telnyx|twilio)\b/i;

type CustomerSafeErrorOptions = {
  allow?: RegExp[];
};

export function isInternalCustomerErrorMessage(message: string): boolean {
  return INTERNAL_CUSTOMER_ERROR_PATTERN.test(message);
}

export function customerSafeErrorMessage(
  err: unknown,
  fallback: string,
  options: CustomerSafeErrorOptions = {}
): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const message = raw.replace(/\s+/g, ' ').trim();
  if (!message) return fallback;
  if (options.allow?.some((pattern) => pattern.test(message))) return message;
  if (isInternalCustomerErrorMessage(message)) return fallback;
  return fallback;
}

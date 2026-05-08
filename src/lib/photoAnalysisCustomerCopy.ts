const INTERNAL_PROVIDER_COPY =
  /\b(openai|gpt(?:[-\w.]+)?|anthropic|claude|gemini|google\s+oauth|provider|model|api[-_\s]*key|apikey|authorization|bearer|access[-_\s]*token|refresh[-_\s]*token|token(?:s)?|jwt|secret|service[-_\s]*role|ai\s*spend|spending|cost)\b/i;

const INTERNAL_INFRASTRUCTURE_COPY =
  /\b(supabase|postgres|postgrest|rpc|sql|schema|relation|duplicate\s*key|foreign\s*key|violates|edge[-_\s]*function|functions?\/v1|function|database|storage|bucket|policy|permission(?:s)?|row[-_\s]*level[-_\s]*security|rls|network|fetch|request\s*failed|failed\s*to\s*fetch|timeout|timed\s*out|status\s*code|error_code|error_message|metadata)\b/i;

const WHITESPACE = /\s+/g;

export function isInternalPhotoAnalysisCopy(value: string | null | undefined): boolean {
  const text = String(value ?? '');
  return INTERNAL_PROVIDER_COPY.test(text) || INTERNAL_INFRASTRUCTURE_COPY.test(text);
}

export function safePhotoAnalysisText(
  value: string | null | undefined,
  fallback = 'Ready to review',
): string {
  const cleaned = String(value ?? '').replace(WHITESPACE, ' ').trim();
  if (!cleaned || isInternalPhotoAnalysisCopy(cleaned)) return fallback;
  return cleaned;
}

export function safeOptionalPhotoAnalysisText(value: string | null | undefined): string | null {
  const cleaned = String(value ?? '').replace(WHITESPACE, ' ').trim();
  if (!cleaned || isInternalPhotoAnalysisCopy(cleaned)) return null;
  return cleaned;
}

export function safePhotoAnalysisList(values: string[] | null | undefined): string[] {
  return (values ?? [])
    .map((value) => safePhotoAnalysisText(value, 'Needs review'))
    .filter((value, index, list) => value && list.indexOf(value) === index);
}

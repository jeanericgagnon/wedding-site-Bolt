export function extractDietaryNote(customAnswers: Record<string, unknown> | null | undefined, notes?: string | null): string | null {
  const answers = customAnswers || {};
  const match = Object.entries(answers).find(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    return (normalizedKey.includes('dietary') || normalizedKey.includes('allerg') || normalizedKey.includes('meal note')) && String(value || '').trim();
  });
  if (match) return String(match[1]).trim();
  if (notes?.toLowerCase().includes('dietary:')) return notes.split(/dietary:/i)[1]?.trim() || null;
  return null;
}

export const genericCopyPatterns = [
  /your presence is the greatest gift/i,
  /special day/i,
  /answers to common questions/i,
  /comfortable lodging/i,
  /kindly respond/i,
  /kindly let us know/i,
  /grateful for your kindness/i,
  /close friends and family/i,
  /look forward to celebrating/i,
];

export const scoreCopyLine = (value: string) => {
  const text = (value || '').trim();
  let score = 100;

  if (!text) score -= 100;
  if (text.length < 20) score -= 20;
  if (text.length > 180) score -= 10;
  if (genericCopyPatterns.some((pattern) => pattern.test(text))) score -= 35;
  if (/\[[^\]]+\]|\bTBD\b|to be confirmed/i.test(text)) score -= 60;
  if (/meaningful|cherished|journey|special|beautiful/i.test(text)) score -= 10;
  if (/kindly|grateful|thoughtfulness/i.test(text)) score -= 8;

  return score;
};


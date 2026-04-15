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
  /shared with care and clarity/i,
  /comfortable and convenient/i,
  /welcome you warmly/i,
  /arrival details/i,
  /local planning help/i,
  /appreciate your thoughtfulness/i,
  /some words about/i,
  /standing with us on this day/i,
  /our journey continues/i,
  /those we hold dear/i,
  /mean the most to us/i,
  /pleased to introduce/i,
  /focus is on celebrating with you/i,
  /rest of our lives/i,
  /soul ?mates?/i,
  /forever/i,
];

export const scoreCopyLine = (value: string) => {
  const text = (value || '').trim();
  let score = 100;

  if (!text) score -= 100;
  if (text.length < 20) score -= 20;
  if (text.length > 180) score -= 10;
  if (genericCopyPatterns.some((pattern) => pattern.test(text))) score -= 35;
  if (/\[[^\]]+\]|\bTBD\b|to be confirmed/i.test(text)) score -= 60;
  if (/meaningful|cherished|journey|special|beautiful|dear|forever|soulmate/i.test(text)) score -= 10;
  if (/kindly|grateful|thoughtfulness|attendance/i.test(text)) score -= 8;
  if (/support|helpful information|planning help|details to help/i.test(text)) score -= 8;
  if (/\bthey\b|\btheir\b/.test(text) && /met|celebrate|look forward|chosen|grateful/.test(text)) score -= 10;
  if (/\bplease reply by\b|\bplease let us know\b|\bconfirm your attendance\b/.test(text)) score -= 8;

  return score;
};

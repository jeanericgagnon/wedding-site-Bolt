export const SMS_SEGMENT_SIZE = 160;

export function countSmsSegments(body: string): number {
  const length = body.trim().length;
  if (length <= 0) return 0;
  return Math.ceil(length / SMS_SEGMENT_SIZE);
}

export function estimateSmsCredits(body: string, reachableRecipients: number): number {
  return countSmsSegments(body) * Math.max(reachableRecipients, 0);
}

export function normalizeCsvHeader(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function findCsvHeaderIndex(headers: string[], ...candidates: string[]): number {
  const normalizedHeaders = headers.map(normalizeCsvHeader);
  const normalizedCandidates = candidates.map(normalizeCsvHeader);

  for (const candidate of normalizedCandidates) {
    const exact = normalizedHeaders.indexOf(candidate);
    if (exact >= 0) return exact;
  }

  for (const candidate of normalizedCandidates) {
    const partial = normalizedHeaders.findIndex((header) => header.includes(candidate) || candidate.includes(header));
    if (partial >= 0) return partial;
  }

  return -1;
}

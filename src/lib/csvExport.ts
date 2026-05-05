const CSV_FORMULA_PREFIX_RE = /^[\s]*[=+\-@\t\r\n]/;

export function neutralizeSpreadsheetFormula(value: unknown): string {
  const text = String(value ?? '');
  return CSV_FORMULA_PREFIX_RE.test(text) ? `'${text}` : text;
}

export function escapeCsvCell(value: unknown): string {
  const safe = neutralizeSpreadsheetFormula(value).replace(/"/g, '""');
  return `"${safe}"`;
}

export function toSafeCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

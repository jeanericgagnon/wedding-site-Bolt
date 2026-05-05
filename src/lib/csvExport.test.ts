import { describe, expect, it } from 'vitest';
import { escapeCsvCell, neutralizeSpreadsheetFormula, toSafeCsv } from './csvExport';

describe('csvExport', () => {
  it('escapes quotes and wraps cells', () => {
    expect(escapeCsvCell('Rivera "Party"')).toBe('"Rivera ""Party"""');
  });

  it('neutralizes spreadsheet formulas before export', () => {
    expect(neutralizeSpreadsheetFormula('=IMPORTXML("https://bad.example")')).toBe('\'=IMPORTXML("https://bad.example")');
    expect(neutralizeSpreadsheetFormula(' +SUM(1,1)')).toBe("' +SUM(1,1)");
    expect(neutralizeSpreadsheetFormula('@cmd')).toBe("'@cmd");
  });

  it('renders safe CSV rows', () => {
    expect(toSafeCsv([
      ['Name', 'Note'],
      ['Alex', '=HYPERLINK("https://bad.example")'],
    ])).toBe('"Name","Note"\n"Alex","\'=HYPERLINK(""https://bad.example"")"');
  });
});

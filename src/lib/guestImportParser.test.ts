import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDefaultCsvFieldMap, buildGuestImportPreview, detectCsvDelimiter, GUEST_IMPORT_MAX_ROWS, isCsvNameMappingValid, normalizeImportedInviteToken, parseCsvRows, readGuestImportRows } from './guestImportParser';

const events = [
  { id: 'event-ceremony', event_name: 'Ceremony' },
  { id: 'event-reception', event_name: 'Reception' },
  { id: 'event-brunch', event_name: 'Farewell Brunch' },
];

describe('guestImportParser', () => {
  it('parses quoted CSV cells without breaking commas inside names or notes', () => {
    expect(parseCsvRows('Full Name,Notes\n"Rivera, Jordan","Vegetarian, no nuts"\n')).toEqual([
      ['Full Name', 'Notes'],
      ['Rivera, Jordan', 'Vegetarian, no nuts'],
    ]);
  });

  it('detects semicolon and tab delimited spreadsheet exports', () => {
    expect(detectCsvDelimiter('First Name;Last Name;Email\nA;B;a@example.com')).toBe(';');
    expect(parseCsvRows('First Name;Last Name;Notes\nJordan;Rivera;"Vegetarian, no nuts"')).toEqual([
      ['First Name', 'Last Name', 'Notes'],
      ['Jordan', 'Rivera', 'Vegetarian, no nuts'],
    ]);
    expect(detectCsvDelimiter('First Name\tLast Name\tEmail\nA\tB\ta@example.com')).toBe('\t');
    expect(parseCsvRows('First Name\tLast Name\nAlex\tRivera')).toEqual([
      ['First Name', 'Last Name'],
      ['Alex', 'Rivera'],
    ]);
  });

  it('rejects oversized row counts before preview', async () => {
    const rows = ['First Name,Last Name'];
    for (let i = 0; i < GUEST_IMPORT_MAX_ROWS + 1; i += 1) rows.push(`Guest${i},Rivera`);
    const file = new File([rows.join('\n')], 'too-many.csv', { type: 'text/csv' });

    await expect(readGuestImportRows(file)).rejects.toThrow('2,000 rows');
  });

  it('keeps spreadsheet import bounded and off the vulnerable xlsx package', async () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const source = readFileSync(join(process.cwd(), 'src/lib/guestImportParser.ts'), 'utf8');
    const wideHeaders = Array.from({ length: 81 }, (_, idx) => `Column ${idx + 1}`).join(',');

    expect(packageJson.dependencies?.xlsx).toBeUndefined();
    expect(packageJson.devDependencies?.xlsx).toBeUndefined();
    expect(source).toContain("read-excel-file/browser");
    expect(source).not.toContain("from 'xlsx'");
    expect(source).not.toContain('from "xlsx"');

    await expect(readGuestImportRows(new File(['First Name\nAlex'], 'legacy.xls'))).rejects.toThrow('legacy .xls');
    await expect(readGuestImportRows(new File(['First Name\nAlex'], 'guests.html', { type: 'text/html' }))).rejects.toThrow('CSV or .xlsx');
    await expect(readGuestImportRows(new File([wideHeaders], 'wide.csv', { type: 'text/csv' }))).rejects.toThrow('80 columns');
    await expect(readGuestImportRows(new File([`First Name\n${wideHeaders}`], 'wide-row.csv', { type: 'text/csv' }))).rejects.toThrow('80 columns');
  });

  it('auto-maps household, plus-one, children, RSVP, and event spreadsheet columns', () => {
    const headers = [
      'full name',
      'email address',
      'household id',
      'household name',
      'plus one name',
      'children count',
      'rsvp status',
      'meal choice',
      'invited events',
    ];
    const fieldMap = buildDefaultCsvFieldMap(headers);

    expect(isCsvNameMappingValid(fieldMap)).toBe(true);
    expect(fieldMap.full_name).toBe(0);
    expect(fieldMap.household_id).toBe(2);
    expect(fieldMap.household_name).toBe(3);
    expect(fieldMap.plus_one).toBe(-1);
    expect(fieldMap.plus_one_name).toBe(4);
    expect(fieldMap.children_count).toBe(5);
    expect(fieldMap.status).toBe(6);
    expect(fieldMap.meal_choice).toBe(7);
    expect(fieldMap.invited_events).toEqual([8]);
  });

  it('does not confuse plus-one names with plus-one allowance fields', () => {
    const headers = ['first name', 'last name', 'plus one name', 'plus one count'];
    const fieldMap = buildDefaultCsvFieldMap(headers);

    expect(fieldMap.plus_one).toBe(-1);
    expect(fieldMap.plus_one_name).toBe(2);
    expect(fieldMap.plus_one_count).toBe(3);
  });

  it('only imports deliberate invitation links or token columns', () => {
    const broadTokenMap = buildDefaultCsvFieldMap(['first name', 'last name', 'token']);
    const inviteLinkMap = buildDefaultCsvFieldMap(['first name', 'last name', 'existing invitation link']);
    const safeToken = 'inviteToken_1234567890';

    expect(broadTokenMap.invite_token).toBe(-1);
    expect(inviteLinkMap.invite_token).toBe(2);
    expect(normalizeImportedInviteToken(`https://dayof.love/rsvp?token=${safeToken}`)).toBe(safeToken);
    expect(normalizeImportedInviteToken('=HYPERLINK("https://dayof.love/rsvp?token=bad")')).toBe('');
    expect(normalizeImportedInviteToken('short')).toBe('');
  });

  it('builds household-aware previews with plus-one names and event invites', () => {
    const headers = ['full name', 'email', 'household id', 'household name', 'plus one name', 'rsvp status', 'meal choice', 'invited events'];
    const fieldMap = buildDefaultCsvFieldMap(headers);
    const result = buildGuestImportPreview({
      headers,
      fieldMap,
      itineraryEvents: events,
      weddingSiteId: 'site-1',
      dataRows: [
        ['Jordan Rivera', 'jordan@example.com', 'HH-1', 'Rivera Household', 'Sam Rivera', 'Confirmed', 'Vegetarian', 'Ceremony; Reception'],
        ['Alex Rivera', 'alex@example.com', 'HH-1', 'Rivera Household', '', 'Pending', '', 'Reception'],
      ],
    });

    expect(result.skipped).toEqual([]);
    expect(result.householdWarnings).toEqual([]);
    expect(result.mappingSummary.household).toContain('household_id');
    expect(result.parsed).toHaveLength(2);
    expect(result.parsed[0]).toMatchObject({
      first_name: 'Jordan',
      last_name: 'Rivera',
      group_name: 'Rivera Household',
      plus_one_allowed: true,
      max_additional_guests: 1,
      __household_key: 'id:hh-1',
      __plus_one_name: 'Sam Rivera',
      __plus_one_count: 1,
      __meal_choice: 'Vegetarian',
      rsvp_status: 'confirmed',
    });
    expect(result.parsed[0].__invited_event_ids).toEqual(['event-ceremony', 'event-reception']);
    expect(result.parsed[1]).toMatchObject({
      first_name: 'Alex',
      last_name: 'Rivera',
      plus_one_allowed: false,
      __household_key: 'id:hh-1',
      rsvp_status: 'pending',
    });
    expect(result.intelligence).toMatchObject({
      householdConfidence: 100,
      likelyPlusOneCount: 1,
      contactCompleteness: 100,
      eventInviteConfidence: 100,
    });
  });

  it('warns instead of merging name-only households that mix last names', () => {
    const headers = ['first name', 'last name', 'household'];
    const fieldMap = buildDefaultCsvFieldMap(headers);
    const result = buildGuestImportPreview({
      headers,
      fieldMap,
      itineraryEvents: events,
      weddingSiteId: 'site-1',
      dataRows: [
        ['Jamie', 'Stone', 'Wedding Party'],
        ['Taylor', 'Kim', 'Wedding Party'],
      ],
    });

    expect(result.householdWarnings).toEqual(['Wedding Party: mixed last names under name-only household key']);
    expect(result.parsed.map((row) => row.__household_key)).toEqual(['name:wedding party', 'name:wedding party']);
  });
});

import readXlsxFile from 'read-excel-file';
import { findCsvHeaderIndex, normalizeCsvHeader } from './csvHeaderMatcher';
import { hasRespondedRsvpStatus } from './rsvpStatus';

export const GUEST_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const GUEST_IMPORT_MAX_ROWS = 2000;
export const GUEST_IMPORT_MAX_COLUMNS = 80;
const IMPORTED_INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{16,160}$/;

export interface CsvFieldMap {
  first_name: number;
  last_name: number;
  full_name: number;
  email: number;
  phone: number;
  plus_one: number;
  plus_one_name: number;
  plus_one_count: number;
  children_allowed: number;
  children_count: number;
  max_additional_guests: number;
  status: number;
  meal_choice: number;
  rsvp_date: number;
  invite_token: number;
  household_id: number;
  household_name: number;
  invited_events: number[];
}

export interface GuestImportItineraryEvent {
  id: string;
  event_name: string;
}

export interface GuestImportPreviewResult {
  parsed: Record<string, unknown>[];
  skipped: string[];
  unknownEvents: string[];
  duplicateNames: string[];
  householdWarnings: string[];
  intelligence: {
    householdConfidence: number;
    likelyPlusOneCount: number;
    contactCompleteness: number;
    eventInviteConfidence: number;
    reviewNotes: string[];
  };
  mappingSummary: {
    core: string[];
    rsvp: string[];
    household: string[];
    eventCols: string[];
    weak: string[];
  };
}

export async function readGuestImportRows(file: File): Promise<{ headers: string[]; dataRows: string[][]; samples: string[] }> {
  const lowerName = file.name.toLowerCase();
  if (file.size > GUEST_IMPORT_MAX_FILE_BYTES) {
    throw new Error('Guest import files must be 5MB or smaller.');
  }
  if (lowerName.endsWith('.xls') && !lowerName.endsWith('.xlsx')) {
    throw new Error('Please save legacy .xls files as .xlsx or CSV before importing.');
  }
  if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx')) {
    throw new Error('Guest import files must be CSV or .xlsx.');
  }

  const rawRows = lowerName.endsWith('.xlsx')
    ? await readXlsxFile(file)
    : parseCsvRows(await file.text());

  const rows = rawRows
    .map((row) => row.map((value) => String(value ?? '').trim()))
    .filter((row) => row.some((value) => value.length > 0));

  if (rows.length > GUEST_IMPORT_MAX_ROWS + 1) {
    throw new Error(`Guest import is limited to ${GUEST_IMPORT_MAX_ROWS.toLocaleString()} rows at a time. Split the spreadsheet and import in batches.`);
  }
  const maxColumnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (maxColumnCount > GUEST_IMPORT_MAX_COLUMNS) {
    throw new Error(`Guest import is limited to ${GUEST_IMPORT_MAX_COLUMNS} columns. Remove unused columns and try again.`);
  }

  const headers = (rows[0] || []).map((header) => normalizeCsvHeader(String(header ?? '')));
  const dataRows = rows.slice(1);
  const samples = headers.map((_, idx) => {
    for (const row of dataRows) {
      const sample = String(row?.[idx] ?? '').trim();
      if (sample.length > 0) return sample;
    }
    return '';
  });

  return { headers, dataRows, samples };
}

export function parseCsvRows(text: string): string[][] {
  const delimiter = detectCsvDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field.trim());
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function detectCsvDelimiter(text: string): ',' | ';' | '\t' {
  const firstMeaningfulLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const counts = {
    ',': countDelimiterOutsideQuotes(firstMeaningfulLine, ','),
    ';': countDelimiterOutsideQuotes(firstMeaningfulLine, ';'),
    '\t': countDelimiterOutsideQuotes(firstMeaningfulLine, '\t'),
  };
  const best = (Object.entries(counts) as Array<[',' | ';' | '\t', number]>)
    .sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ',';
}

function countDelimiterOutsideQuotes(line: string, delimiter: ',' | ';' | '\t') {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') i += 1;
      else inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) count += 1;
  }
  return count;
}

export function buildDefaultCsvFieldMap(headers: string[]): CsvFieldMap {
  const findIdx = (...candidates: string[]) => findCsvHeaderIndex(headers, ...candidates);
  const normalizedHeaders = headers.map(normalizeCsvHeader);
  const findStrictIdx = (...candidates: string[]) => {
    const normalizedCandidates = candidates.map(normalizeCsvHeader);
    for (const candidate of normalizedCandidates) {
      const exact = normalizedHeaders.indexOf(candidate);
      if (exact >= 0) return exact;
    }
    for (const candidate of normalizedCandidates) {
      const partial = normalizedHeaders.findIndex((header) => header.includes(candidate));
      if (partial >= 0) return partial;
    }
    return -1;
  };
  const findExactIdx = (...candidates: string[]) => {
    const normalizedCandidates = candidates.map(normalizeCsvHeader);
    for (const candidate of normalizedCandidates) {
      const exact = normalizedHeaders.indexOf(candidate);
      if (exact >= 0) return exact;
    }
    return -1;
  };
  const fullNameIndex = (() => {
    const exact = findExactIdx('full name', 'full_name', 'guest_name', 'guest name', 'name', 'primary guest name');
    if (exact >= 0) return exact;
    return normalizedHeaders.findIndex((header) => (
      (header.includes('full') || header.includes('primary') || header.includes('guest'))
      && header.includes('name')
      && !header.includes('plus')
      && !header.includes('+1')
      && !header.includes('household')
    ));
  })();
  const plusOneAllowedIndex = (() => {
    const exact = findExactIdx('plus one allowed', 'plus_one_allowed', 'plus one', 'plus_one', '+1', 'plus 1', 'guest allowed', 'additional guest allowed');
    if (exact >= 0) return exact;
    return normalizedHeaders.findIndex((header) => (
      (header.includes('plus one') || header.includes('plus_one') || header.includes('+1') || header.includes('additional guest'))
      && !header.includes('name')
      && !header.includes('count')
      && !header.includes('number')
      && !header.includes('max')
    ));
  })();

  return {
    first_name: findIdx('first name', 'first_name', 'firstname', 'given name', 'given_name', 'first', 'guest first name'),
    last_name: findIdx('last name', 'last_name', 'lastname', 'surname', 'family_name', 'family name', 'last', 'guest last name'),
    full_name: fullNameIndex,
    email: findIdx('email', 'email address', 'email_address', 'e mail', 'primary email', 'guest email', 'mail'),
    phone: findIdx('phone', 'phone number', 'phone_number', 'mobile', 'mobile number', 'cell', 'telephone', 'guest phone'),
    plus_one: plusOneAllowedIndex,
    plus_one_name: findIdx('plus one name', 'plus_one_name', '+1 name', 'guest name', 'additional guest name'),
    plus_one_count: findIdx('plus one count', 'plus_one_count', '+1 count', 'additional guest count', 'additional guests', 'guest count'),
    children_allowed: findIdx('children allowed', 'children_allowed', 'kids allowed', 'child allowed'),
    children_count: findIdx('children count', 'children_count', 'kids count', 'number of children', 'child count'),
    max_additional_guests: findIdx('max additional guests', 'max_additional_guests', 'max guests', 'additional allowance', 'guest allowance'),
    status: findIdx('status', 'rsvp_status', 'rsvp status', 'rsvp'),
    meal_choice: findIdx('meal choice', 'meal_choice', 'meal', 'meal option', 'meal selection'),
    rsvp_date: findIdx('rsvp date', 'rsvp_date', 'responded_at', 'response date', 'responded', 'submitted at'),
    invite_token: findExactIdx('existing invitation link', 'rsvp link', 'invitation link', 'invite token', 'invite_token'),
    household_id: findStrictIdx('household_id', 'household id', 'household key', 'family_id', 'party_id', 'group id'),
    household_name: findIdx('household_name', 'household name', 'household', 'family', 'family name', 'group_name', 'group', 'group name', 'household group', 'party name'),
    invited_events: (() => {
      const i = findIdx('invited_events', 'invited events', 'events', 'event_invites', 'event invites list');
      return i >= 0 ? [i] : [];
    })(),
  };
}

export function isCsvNameMappingValid(fieldMap: CsvFieldMap | null): boolean {
  if (!fieldMap) return false;
  return (fieldMap.first_name >= 0 && fieldMap.last_name >= 0) || fieldMap.full_name >= 0;
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  const trimmed = value.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  if (trimmed.includes(',')) {
    const [last, ...rest] = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
    return { firstName: rest.join(' '), lastName: last || '' };
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) || '' };
}

function parseBooleanLike(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['yes', 'true', '1', 'y', 'allowed', 'allow', 'include', 'included', 'invited', '+1', 'plus one', 'plus-one'].includes(normalized)) return true;
  if (['no', 'false', '0', 'n', 'not allowed', 'none', 'exclude', 'excluded', 'not invited'].includes(normalized)) return false;
  return null;
}

function parseCount(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeEventName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function cell(values: string[], index: number): string {
  return index >= 0 ? String(values[index] ?? '').trim() : '';
}

export function normalizeImportedInviteToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const token = parsed.searchParams.get('token')?.trim() ?? '';
    return IMPORTED_INVITE_TOKEN_RE.test(token) ? token : '';
  } catch {
    return IMPORTED_INVITE_TOKEN_RE.test(trimmed) ? trimmed : '';
  }
}

export function buildGuestImportPreview(input: {
  headers: string[];
  dataRows: string[][];
  fieldMap: CsvFieldMap;
  itineraryEvents: GuestImportItineraryEvent[];
  weddingSiteId: string | null;
}): GuestImportPreviewResult {
  const { headers, dataRows, fieldMap, itineraryEvents, weddingSiteId } = input;
  const itineraryByNormalizedName = new Map(itineraryEvents.map((ev) => [normalizeEventName(ev.event_name), ev.id] as const));
  const inviteEventColumns = headers
    .map((h, idx) => ({ h, idx }))
    .filter(({ h }) => h.startsWith('invite:') || itineraryByNormalizedName.has(normalizeEventName(h)));

  const weakMappings = [
    fieldMap.full_name >= 0 && (fieldMap.first_name < 0 || fieldMap.last_name < 0) ? 'Full name is carrying first/last split' : '',
    fieldMap.household_name >= 0 && fieldMap.household_id < 0 ? 'Households rely on name/group matching only' : '',
    fieldMap.email < 0 && fieldMap.phone < 0 ? 'No direct contact column mapped' : '',
    inviteEventColumns.length === 0 && fieldMap.invited_events.length === 0 ? 'No event-invite mapping detected' : '',
  ].filter(Boolean);

  const mappingSummary = {
    core: [
      fieldMap.first_name >= 0 ? 'First Name' : '',
      fieldMap.last_name >= 0 ? 'Last Name' : '',
      fieldMap.full_name >= 0 ? 'Full Name' : '',
      fieldMap.email >= 0 ? 'Email' : '',
      fieldMap.phone >= 0 ? 'Phone' : '',
      fieldMap.plus_one >= 0 ? 'Plus One Allowed' : '',
      fieldMap.plus_one_name >= 0 ? 'Plus One Name' : '',
      fieldMap.plus_one_count >= 0 ? 'Plus One Count' : '',
      fieldMap.children_count >= 0 ? 'Children Count' : '',
    ].filter(Boolean),
    rsvp: [
      fieldMap.status >= 0 ? 'Status → RSVP status' : '',
      fieldMap.meal_choice >= 0 ? 'Meal Choice → RSVP meal' : '',
      fieldMap.rsvp_date >= 0 ? 'RSVP Date → RSVP responded_at' : '',
      fieldMap.invite_token >= 0 ? 'Invite Token → guest token' : '',
    ].filter(Boolean),
    household: [
      fieldMap.household_id >= 0 ? 'household_id' : '',
      fieldMap.household_name >= 0 ? 'household_name / group_name' : '',
    ].filter(Boolean),
    eventCols: inviteEventColumns.map(({ h }) => h),
    weak: weakMappings,
  };

  const skipped: string[] = [];
  const unknownEvents = new Set<string>();
  const parsed: Record<string, unknown>[] = [];

  dataRows.forEach((row, idx) => {
    const values = (row || []).map((v) => String(v ?? '').trim());
    const fullName = cell(values, fieldMap.full_name);
    const split = splitFullName(fullName);
    const firstName = cell(values, fieldMap.first_name) || split.firstName;
    const lastName = cell(values, fieldMap.last_name) || split.lastName;

    const email = cell(values, fieldMap.email) || null;
    const phone = cell(values, fieldMap.phone) || null;
    const plusOneName = cell(values, fieldMap.plus_one_name);
    const plusOneCountRaw = cell(values, fieldMap.plus_one_count);
    const plusOneCount = plusOneCountRaw ? parseCount(plusOneCountRaw) : plusOneName ? 1 : 0;
    const plusBoolean = parseBooleanLike(cell(values, fieldMap.plus_one));
    const plusOneAllowed = plusBoolean ?? (plusOneCount > 0 || plusOneName.length > 0);
    const childrenAllowedRaw = parseBooleanLike(cell(values, fieldMap.children_allowed));
    const childrenCount = parseCount(cell(values, fieldMap.children_count));
    const childrenAllowed = childrenAllowedRaw ?? (childrenCount > 0);
    const maxAdditionalRaw = parseCount(cell(values, fieldMap.max_additional_guests));
    const maxAdditionalGuests = Math.max(maxAdditionalRaw, plusOneAllowed ? Math.max(1, plusOneCount) : 0, childrenCount);
    const statusRaw = cell(values, fieldMap.status).toLowerCase().trim();
    const normalizedStatus: 'pending' | 'confirmed' | 'declined' =
      ['confirmed', 'attending', 'accepted', 'yes'].includes(statusRaw)
        ? 'confirmed'
        : ['declined', 'no', 'not attending', 'rejected'].includes(statusRaw)
          ? 'declined'
          : 'pending';
    const mealChoice = cell(values, fieldMap.meal_choice);
    const rsvpDateRaw = cell(values, fieldMap.rsvp_date);
    const parsedRsvpDate = rsvpDateRaw ? new Date(rsvpDateRaw) : null;
    const inviteTokenRaw = normalizeImportedInviteToken(cell(values, fieldMap.invite_token));
    const householdIdRaw = cell(values, fieldMap.household_id);
    const householdNameRaw = cell(values, fieldMap.household_name);
    const householdKey = householdIdRaw ? `id:${householdIdRaw.toLowerCase()}` : householdNameRaw ? `name:${householdNameRaw.toLowerCase()}` : '';

    const invitedEventIds = new Set<string>();
    if (fieldMap.invited_events.length > 0) {
      fieldMap.invited_events.forEach((colIdx) => {
        const raw = values[colIdx] || '';
        raw.split(/[|,;]/).map((x) => x.trim()).filter(Boolean).forEach((eventName) => {
          const eventId = itineraryByNormalizedName.get(normalizeEventName(eventName));
          if (eventId) invitedEventIds.add(eventId);
          else unknownEvents.add(eventName);
        });
      });
    }

    inviteEventColumns.forEach(({ h, idx: colIdx }) => {
      const eventName = (h.startsWith('invite:') ? h.replace(/^invite:/, '') : h).trim();
      const eventId = itineraryByNormalizedName.get(normalizeEventName(eventName));
      if (!eventId) {
        unknownEvents.add(eventName);
        return;
      }
      const truth = parseBooleanLike(values[colIdx] || '');
      if (truth === true) invitedEventIds.add(eventId);
      if (truth === false) invitedEventIds.delete(eventId);
    });

    if (!firstName || !lastName) {
      skipped.push(`Row ${idx + 2}: missing first or last name`);
      return;
    }

    parsed.push({
      wedding_site_id: weddingSiteId,
      first_name: firstName || null,
      last_name: lastName || null,
      name: `${firstName || ''} ${lastName || ''}`.trim() || (email || 'Guest'),
      email,
      phone,
      group_name: householdNameRaw || null,
      plus_one_allowed: plusOneAllowed,
      children_allowed: childrenAllowed,
      max_children: childrenAllowed ? childrenCount : 0,
      max_additional_guests: maxAdditionalGuests,
      rsvp_status: normalizedStatus,
      rsvp_received_at: hasRespondedRsvpStatus(normalizedStatus)
        ? (parsedRsvpDate && !Number.isNaN(parsedRsvpDate.getTime()) ? parsedRsvpDate.toISOString() : new Date().toISOString())
        : null,
      invite_token: inviteTokenRaw || null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      __household_key: householdKey || null,
      __invited_event_ids: Array.from(invitedEventIds),
      __meal_choice: mealChoice || null,
      __plus_one_name: plusOneName || null,
      __plus_one_count: plusOneAllowed ? Math.max(plusOneName ? 1 : 0, plusOneCount) : 0,
      __children_count: childrenAllowed ? childrenCount : 0,
      __rsvp_date: parsedRsvpDate && !Number.isNaN(parsedRsvpDate.getTime()) ? parsedRsvpDate.toISOString() : null,
    });
  });

  const householdWarnings = new Set<string>();
  const householdGroups = new Map<string, Array<{ lastName: string; label: string }>>();
  parsed.forEach((row) => {
    const key = String((row.__household_key as string | null | undefined) || '');
    if (!key) return;
    const lastName = String(row.last_name || '').trim().toLowerCase();
    const label = String(row.group_name || key.replace(/^name:/, ''));
    const existing = householdGroups.get(key) ?? [];
    existing.push({ lastName, label });
    householdGroups.set(key, existing);
  });
  householdGroups.forEach((members, key) => {
    if (!key.startsWith('name:')) return;
    const lastNames = Array.from(new Set(members.map((m) => m.lastName).filter(Boolean)));
    if (members.length > 1 && lastNames.length > 1) householdWarnings.add(`${members[0]?.label || key}: mixed last names under name-only household key`);
  });

  const duplicateNameCounts = new Map<string, number>();
  parsed.forEach((row) => {
    const key = `${String(row.first_name || '').trim().toLowerCase()}|${String(row.last_name || '').trim().toLowerCase()}`;
    if (!key || key === '|') return;
    duplicateNameCounts.set(key, (duplicateNameCounts.get(key) || 0) + 1);
  });
  const duplicateNames = Array.from(duplicateNameCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [first, last] = key.split('|');
      return `${first} ${last} (${count})`;
    });

  const contactableCount = parsed.filter((row) => Boolean(row.email || row.phone)).length;
  const householdMappedCount = parsed.filter((row) => Boolean(row.__household_key)).length;
  const plusOneCount = parsed.filter((row) => Boolean(row.plus_one_allowed) || Number(row.__plus_one_count ?? 0) > 0).length;
  const eventInviteRows = parsed.filter((row) => Array.isArray(row.__invited_event_ids) && (row.__invited_event_ids as unknown[]).length > 0).length;
  const rowCount = Math.max(parsed.length, 1);
  const intelligence = {
    householdConfidence: Math.round((householdMappedCount / rowCount) * 100),
    likelyPlusOneCount: plusOneCount,
    contactCompleteness: Math.round((contactableCount / rowCount) * 100),
    eventInviteConfidence: Math.round((eventInviteRows / rowCount) * 100),
    reviewNotes: [
      householdMappedCount === 0 ? 'No household signal found. Guests will import individually.' : '',
      contactableCount < parsed.length ? `${parsed.length - contactableCount} guest${parsed.length - contactableCount === 1 ? '' : 's'} need email or phone coverage.` : '',
      plusOneCount > 0 ? `${plusOneCount} likely plus-one allowance${plusOneCount === 1 ? '' : 's'} detected.` : '',
      eventInviteRows === 0 && itineraryEvents.length > 0 ? 'No event-specific invite mapping detected.' : '',
      duplicateNames.length > 0 ? 'Duplicate names need a quick scan before import.' : '',
    ].filter(Boolean),
  };

  return {
    parsed,
    skipped,
    unknownEvents: Array.from(unknownEvents),
    duplicateNames,
    householdWarnings: Array.from(householdWarnings),
    intelligence,
    mappingSummary,
  };
}

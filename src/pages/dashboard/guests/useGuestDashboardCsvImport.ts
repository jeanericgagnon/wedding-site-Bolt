import { useCallback, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';

import {
  buildDefaultCsvFieldMap,
  buildGuestImportPreview,
  isCsvNameMappingValid,
  readGuestImportRows,
  type CsvFieldMap,
} from '../../../lib/guestImportParser';
import { isAttendingRsvpStatus, isDeclinedRsvpStatus } from '../../../lib/rsvpStatus';
import type { ToastType } from '../../../components/ui/Toast';
import {
  insertEventInvitations,
  insertImportedGuests,
  replaceImportedGuestRsvps,
  resolveGuestDashboardSiteId,
  updateHouseholdGuestIds,
} from './guestService';
import type { GuestWithRSVP, ItineraryEvent } from './guestDashboardTypes';
import { safeGuestImportReadError, safeGuestsDashboardError } from './guestDashboardUtils';

export interface CsvMappingSummary {
  core: string[];
  rsvp: string[];
  household: string[];
  eventCols: string[];
  weak: string[];
}

export interface GuestImportSummary {
  duplicateNames: number;
  guardedHouseholds: number;
  householdKeys: number;
  imported: number;
  skipped: number;
  unknownEvents: number;
}

interface UseGuestDashboardCsvImportInput {
  buildQuickStartPhotosPath: () => string;
  drawerItineraryEvents: ItineraryEvent[];
  fetchGuests: () => Promise<void>;
  fromQuickStart: boolean;
  generateLocalInviteToken: () => string;
  generateSecureToken: () => Promise<string>;
  isDemoMode: boolean;
  isGuestsReadOnly: boolean;
  navigate: (to: string) => void;
  nextStep: string | null;
  setGuests: Dispatch<SetStateAction<GuestWithRSVP[]>>;
  setWeddingSiteId: Dispatch<SetStateAction<string | null>>;
  toast: (message: string, type?: ToastType) => void;
  userId: string | null;
  weddingSiteId: string | null;
}

const EMPTY_MAPPING_SUMMARY: CsvMappingSummary = {
  core: [],
  rsvp: [],
  household: [],
  eventCols: [],
  weak: [],
};

export function useGuestDashboardCsvImport({
  buildQuickStartPhotosPath,
  drawerItineraryEvents,
  fetchGuests,
  fromQuickStart,
  generateLocalInviteToken,
  generateSecureToken,
  isDemoMode,
  isGuestsReadOnly,
  navigate,
  nextStep,
  setGuests,
  setWeddingSiteId,
  toast,
  userId,
  weddingSiteId,
}: UseGuestDashboardCsvImportInput) {
  const [csvPreview, setCsvPreview] = useState<Record<string, unknown>[] | null>(null);
  const [csvSkipped, setCsvSkipped] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvUnknownEvents, setCsvUnknownEvents] = useState<string[]>([]);
  const [csvDuplicateNames, setCsvDuplicateNames] = useState<string[]>([]);
  const [csvHouseholdWarnings, setCsvHouseholdWarnings] = useState<string[]>([]);
  const [csvSelectedFilename, setCsvSelectedFilename] = useState<string | null>(null);
  const [csvMappingSummary, setCsvMappingSummary] = useState<CsvMappingSummary>(EMPTY_MAPPING_SUMMARY);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([]);
  const [csvColumnSamples, setCsvColumnSamples] = useState<string[]>([]);
  const [csvFieldMap, setCsvFieldMap] = useState<CsvFieldMap | null>(null);
  const [csvShowMapper, setCsvShowMapper] = useState(false);
  const [csvImportSummary, setCsvImportSummary] = useState<GuestImportSummary | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  const csvNameMappingValid = isCsvNameMappingValid(csvFieldMap);

  const resetCsvReviewState = useCallback(() => {
    setCsvPreview(null);
    setCsvSkipped([]);
    setCsvUnknownEvents([]);
    setCsvDuplicateNames([]);
    setCsvHouseholdWarnings([]);
    setCsvSelectedFilename(null);
    setCsvMappingSummary(EMPTY_MAPPING_SUMMARY);
  }, []);

  const resetCsvParserState = useCallback(() => {
    setCsvHeaders([]);
    setCsvDataRows([]);
    setCsvColumnSamples([]);
    setCsvFieldMap(null);
    setCsvShowMapper(false);
  }, []);

  const buildCsvPreviewFromMapping = useCallback(async (headers: string[], dataRows: string[][], fieldMap: CsvFieldMap) => {
    if (!isCsvNameMappingValid(fieldMap)) {
      toast('Please map First Name + Last Name, or use Full Name instead.', 'error');
      return;
    }

    let resolvedSiteId = weddingSiteId;
    if (!resolvedSiteId && !isDemoMode) {
      resolvedSiteId = userId ? await resolveGuestDashboardSiteId(userId) : null;
      if (resolvedSiteId) setWeddingSiteId(resolvedSiteId);
    }
    if (!resolvedSiteId && !isDemoMode) {
      toast('Couldn’t find your website right now. Refresh and try again.', 'error');
      return;
    }

    const result = buildGuestImportPreview({
      headers,
      dataRows,
      fieldMap,
      itineraryEvents: drawerItineraryEvents,
      weddingSiteId: resolvedSiteId,
    });
    const parsed = result.parsed;

    if (parsed.length === 0) {
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      toast('No guests could be read from this file. Check the name columns and try again.', 'error');
      return;
    }

    setCsvPreview(parsed);
    setCsvSkipped(result.skipped);
    setCsvUnknownEvents(result.unknownEvents);
    setCsvDuplicateNames(result.duplicateNames);
    setCsvShowMapper(false);
    setCsvHouseholdWarnings(result.householdWarnings);
    setCsvMappingSummary(result.mappingSummary);
    const skippedMsg = result.skipped.length > 0 ? ` (${result.skipped.length} row${result.skipped.length === 1 ? '' : 's'} need review)` : '';
    const unknownMsg = result.unknownEvents.length > 0 ? `, ${result.unknownEvents.length} event name${result.unknownEvents.length === 1 ? '' : 's'} need review` : '';
    const dupMsg = result.duplicateNames.length > 0 ? `, ${result.duplicateNames.length} possible repeat${result.duplicateNames.length === 1 ? '' : 's'}` : '';
    const householdMsg = result.householdWarnings.length > 0 ? `, ${result.householdWarnings.length} household match${result.householdWarnings.length === 1 ? '' : 'es'} need review` : '';
    toast(`${parsed.length} guest${parsed.length !== 1 ? 's' : ''} ready to import${skippedMsg}${unknownMsg}${dupMsg}${householdMsg}.`, 'success');
  }, [drawerItineraryEvents, isDemoMode, setWeddingSiteId, toast, userId, weddingSiteId]);

  const importCSV = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role is read-only for guest imports.', 'info');
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      toast('Please choose a CSV file to import.', 'error');
      return;
    }

    setCsvSelectedFilename(file.name);
    toast(`Parsing ${file.name}...`, 'success');

    try {
      const { headers, dataRows, samples } = await readGuestImportRows(file);

      if (headers.length === 0 || dataRows.length === 0) {
        setCsvUnknownEvents([]);
        setCsvDuplicateNames([]);
        toast('File appears to be empty or missing a header row.', 'error');
        return;
      }

      const defaultMap = buildDefaultCsvFieldMap(headers);

      setCsvHeaders(headers);
      setCsvDataRows(dataRows);
      setCsvColumnSamples(samples);
      setCsvFieldMap(defaultMap);
      setCsvShowMapper(true);
    } catch (err) {
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      toast(safeGuestImportReadError(err), 'error');
    } finally {
      event.target.value = '';
    }
  }, [isGuestsReadOnly, toast]);

  const confirmCsvImport = useCallback(async () => {
    if (!csvPreview) return;

    setCsvImporting(true);
    try {
      let resolvedSiteId = weddingSiteId;
      if (!resolvedSiteId && !isDemoMode) {
        resolvedSiteId = userId ? await resolveGuestDashboardSiteId(userId) : null;
        if (resolvedSiteId) setWeddingSiteId(resolvedSiteId);
      }
      if (!resolvedSiteId && !isDemoMode) {
        toast('Couldn’t find your wedding site. Refresh and try again.', 'error');
        return;
      }

      if (isDemoMode) {
        const importedGuests = csvPreview.map((guest, index) => ({
          id: `demo-import-${Date.now()}-${index}`,
          first_name: String(guest.first_name || ''),
          last_name: String(guest.last_name || ''),
          name: `${String(guest.first_name || '')} ${String(guest.last_name || '')}`.trim(),
          email: guest.email ? String(guest.email) : null,
          phone: guest.phone ? String(guest.phone) : null,
          plus_one_allowed: Boolean(guest.plus_one_allowed),
          plus_one_name: null,
          children_allowed: Boolean(guest.children_allowed),
          max_children: Number(guest.max_children ?? 0),
          max_additional_guests: Number(guest.max_additional_guests ?? 0),
          invited_to_ceremony: true,
          invited_to_reception: true,
          invite_token: generateLocalInviteToken(),
          rsvp_status: 'pending',
          rsvp_received_at: null,
          household_id: (guest.__household_key as string | null) || null,
          group_name: (guest.group_name as string | null) || null,
        } as GuestWithRSVP));

        setGuests((prev) => [...importedGuests, ...prev]);
        setCsvImportSummary({
          duplicateNames: csvDuplicateNames.length,
          guardedHouseholds: 0,
          householdKeys: 0,
          imported: csvPreview.length,
          skipped: csvSkipped.length,
          unknownEvents: 0,
        });
        const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} row${csvSkipped.length === 1 ? '' : 's'} need review` : '';
        toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}`, 'success');
        resetCsvReviewState();
        resetCsvParserState();
        if (fromQuickStart && nextStep === 'photos') {
          navigate(buildQuickStartPhotosPath());
          return;
        }
        return;
      }

      const guestsWithTokens: Array<Record<string, unknown>> = await Promise.all(
        csvPreview.map(async (guest) => {
          const existingToken = (guest.invite_token as string | null | undefined) ?? null;
          return {
            ...guest,
            invite_token: existingToken && existingToken.length > 0 ? existingToken : await generateSecureToken(),
          };
        }),
      );

      const guestRows = guestsWithTokens.map((guest) => {
        const row = { ...guest } as Record<string, unknown>;
        delete row.__household_key;
        delete row.__invited_event_ids;
        delete row.__meal_choice;
        delete row.__plus_one_name;
        delete row.__plus_one_count;
        delete row.__children_count;
        delete row.__rsvp_date;
        return row;
      });

      const inserted = await insertImportedGuests(guestRows);
      const keyToGuestIds = new Map<string, string[]>();
      const householdLastNames = new Map<string, Set<string>>();

      guestsWithTokens.forEach((row, index) => {
        const key = row.__household_key as string | null | undefined;
        if (!key) return;
        const guestId = inserted[index]?.id as string | undefined;
        if (!guestId) return;
        const existing = keyToGuestIds.get(key) ?? [];
        existing.push(guestId);
        keyToGuestIds.set(key, existing);
        const lastNames = householdLastNames.get(key) ?? new Set<string>();
        const lastName = String(row.last_name || '').trim().toLowerCase();
        if (lastName) lastNames.add(lastName);
        householdLastNames.set(key, lastNames);
      });

      let guardedHouseholds = 0;
      for (const [key, ids] of keyToGuestIds) {
        if (ids.length < 2) continue;
        const lastNames = householdLastNames.get(key) ?? new Set<string>();
        if (key.startsWith('name:') && lastNames.size > 1) {
          guardedHouseholds += 1;
          continue;
        }
        await updateHouseholdGuestIds(ids[0], ids);
      }

      const eventInviteRows: Array<{ event_id: string; guest_id: string }> = [];
      const rsvpRows: Array<{
        attending: boolean;
        children_count: number;
        guest_id: string;
        meal_choice: string | null;
        plus_one_count: number;
        plus_one_name: string | null;
        responded_at: string | null;
      }> = [];

      guestsWithTokens.forEach((row, index) => {
        const guestId = inserted[index]?.id as string | undefined;
        if (!guestId) return;
        const eventIds = (row.__invited_event_ids as string[] | undefined) ?? [];
        eventIds.forEach((eventId) => eventInviteRows.push({ event_id: eventId, guest_id: guestId }));

        const status = String(row.rsvp_status || 'pending').toLowerCase();
        const attending = isAttendingRsvpStatus(status);
        const declined = isDeclinedRsvpStatus(status) || status === 'no';
        if (attending || declined) {
          rsvpRows.push({
            guest_id: guestId,
            attending,
            meal_choice: (row.__meal_choice as string | null | undefined) ?? null,
            plus_one_name: (row.__plus_one_name as string | null | undefined) ?? null,
            plus_one_count: Number(row.__plus_one_count ?? 0),
            children_count: Number(row.__children_count ?? 0),
            responded_at:
              (row.__rsvp_date as string | null | undefined)
              || (row.rsvp_received_at as string | null | undefined)
              || new Date().toISOString(),
          });
        }
      });

      if (eventInviteRows.length > 0) {
        await insertEventInvitations(eventInviteRows);
      }

      if (rsvpRows.length > 0) {
        await replaceImportedGuestRsvps(rsvpRows);
      }

      await fetchGuests();
      setCsvImportSummary({
        duplicateNames: csvDuplicateNames.length,
        guardedHouseholds,
        householdKeys: keyToGuestIds.size,
        imported: csvPreview.length,
        skipped: csvSkipped.length,
        unknownEvents: csvUnknownEvents.length,
      });
      const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} row${csvSkipped.length === 1 ? '' : 's'} need review` : '';
      const householdsMsg = keyToGuestIds.size > 0 ? `, ${keyToGuestIds.size} household group${keyToGuestIds.size === 1 ? '' : 's'}` : '';
      const guardedMsg = guardedHouseholds > 0 ? `, ${guardedHouseholds} household match${guardedHouseholds === 1 ? '' : 'es'} left separate` : '';
      const eventsMsg = eventInviteRows.length > 0 ? `, ${eventInviteRows.length} event invite${eventInviteRows.length === 1 ? '' : 's'}` : '';
      const unknownEventsMsg = csvUnknownEvents.length > 0 ? `, ${csvUnknownEvents.length} event name${csvUnknownEvents.length === 1 ? '' : 's'} need review` : '';
      toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}${householdsMsg}${guardedMsg}${eventsMsg}${unknownEventsMsg}`, 'success');
      resetCsvReviewState();
      resetCsvParserState();
      if (fromQuickStart && nextStep === 'photos') {
        navigate(buildQuickStartPhotosPath());
      }
    } catch (err) {
      toast(safeGuestsDashboardError(err, 'Couldn’t import guests. Please try again.'), 'error');
    } finally {
      setCsvImporting(false);
    }
  }, [
    buildQuickStartPhotosPath,
    csvDuplicateNames.length,
    csvPreview,
    csvSkipped.length,
    csvUnknownEvents.length,
    fetchGuests,
    fromQuickStart,
    generateLocalInviteToken,
    generateSecureToken,
    isDemoMode,
    navigate,
    nextStep,
    resetCsvParserState,
    resetCsvReviewState,
    setGuests,
    setWeddingSiteId,
    toast,
    userId,
    weddingSiteId,
  ]);

  return {
    csvColumnSamples,
    csvDataRows,
    csvDuplicateNames,
    csvFieldMap,
    csvFileInputRef,
    csvHeaders,
    csvHouseholdWarnings,
    csvImporting,
    csvImportSummary,
    csvMappingSummary,
    csvNameMappingValid,
    csvPreview,
    csvSelectedFilename,
    csvShowMapper,
    csvSkipped,
    csvUnknownEvents,
    buildCsvPreviewFromMapping,
    confirmCsvImport,
    importCSV,
    resetCsvReviewState,
    setCsvFieldMap,
    setCsvShowMapper,
  };
}

import { buildSeatingCateringHandoffReview, buildSeatingCateringPacket } from '../../../lib/seatingCateringExportReadiness';
import type { EligibleGuest, ItineraryEvent, SeatingAssignment, SeatingTable } from './seatingService';
import {
  buildArrivedGuestIdSet,
  buildAssignedGuestIdSet,
  countArrivedAttendingGuests,
  getCheckInCandidates,
  getUnassignedAttendingGuests,
  type SeatingCheckInFilter,
} from './seatingDashboardUtils';

export function buildSeatingDashboardDerivedState(args: {
  allGuests: EligibleGuest[];
  assignments: SeatingAssignment[];
  checkInFilter: SeatingCheckInFilter;
  checkInQuery: string;
  counters: { attending: number } | null;
  itineraryEvents: ItineraryEvent[];
  selectedEventId: string | null;
  tables: SeatingTable[];
}) {
  const unassignedGuests = getUnassignedAttendingGuests(args.allGuests, args.assignments);
  const selectedItineraryEvent = args.itineraryEvents.find((event) => event.id === args.selectedEventId);
  const arrivedGuestIds = buildArrivedGuestIdSet(args.assignments);
  const assignedGuestIdSet = buildAssignedGuestIdSet(args.assignments);
  const arrivedCount = countArrivedAttendingGuests(args.allGuests, arrivedGuestIds);
  const checkInCandidates = getCheckInCandidates({
    guests: args.allGuests,
    arrivedIds: arrivedGuestIds,
    assignedIds: assignedGuestIdSet,
    filter: args.checkInFilter,
    query: args.checkInQuery,
  });
  const cateringAssignments = args.assignments.filter((assignment): assignment is SeatingAssignment & { table_id: string } => typeof assignment.table_id === 'string');
  const cateringPacket = buildSeatingCateringPacket({
    guests: args.allGuests,
    tables: args.tables,
    assignments: cateringAssignments,
  });
  const cateringHandoffReview = buildSeatingCateringHandoffReview(cateringPacket);
  const mealHeadcountByTable = cateringPacket.tableSummaries;
  const packetReadyTone = cateringPacket.readiness.status === 'ready'
    ? 'border-success/25 bg-success/5'
    : cateringPacket.readiness.status === 'needs-review'
      ? 'border-primary/25 bg-primary/5'
      : 'border-border-subtle bg-surface';

  return {
    arrivedCount,
    arrivedGuestIds,
    assignedGuestIdSet,
    cateringHandoffReview,
    cateringPacket,
    checkInCandidates,
    mealHeadcountByTable,
    packetReadyTone,
    selectedItineraryEvent,
    unassignedGuests,
  };
}

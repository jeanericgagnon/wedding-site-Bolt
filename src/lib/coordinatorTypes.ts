export type CoordinatorGuestDoorRoute = 'walk-in' | 'help-desk' | 'manager-decision';

export type CoordinatorGuestEventArrival = {
  seating_event_id: string | null;
  table_id?: string | null;
  table_name: string | null;
  checked_in_at: string | null;
  is_seated: boolean;
};

export type GuestLiteForCoordinator = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  rsvp_status: string;
  household_id?: string | null;
  group_name?: string | null;
  checked_in_at?: string | null;
  door_route?: CoordinatorGuestDoorRoute | null;
  event_arrivals?: Record<string, CoordinatorGuestEventArrival>;
};

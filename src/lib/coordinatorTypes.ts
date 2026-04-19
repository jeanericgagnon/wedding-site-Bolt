export type GuestLiteForCoordinator = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  rsvp_status: string;
  checked_in_at?: string | null;
};

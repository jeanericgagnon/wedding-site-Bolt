import { supabase } from './supabase';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function sendRsvpNotification(opts: {
  coupleEmail: string;
  guestName: string;
  attending: boolean;
  mealChoice?: string | null;
  plusOneName?: string | null;
  notes?: string | null;
  coupleName1: string;
  coupleName2: string;
}) {
  const headers = await getAuthHeaders();
  return fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'rsvp_notification',
      to: opts.coupleEmail,
      data: {
        guestName: opts.guestName,
        attending: opts.attending,
        mealChoice: opts.mealChoice ?? null,
        plusOneName: opts.plusOneName ?? null,
        notes: opts.notes ?? null,
        coupleName1: opts.coupleName1,
        coupleName2: opts.coupleName2,
      },
    }),
  });
}

export async function sendRsvpConfirmation(opts: {
  guestEmail: string;
  guestName: string;
  attending: boolean;
  coupleName1: string;
  coupleName2: string;
  weddingDate?: string | null;
  venueName?: string | null;
}) {
  const headers = await getAuthHeaders();
  return fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'rsvp_confirmation',
      to: opts.guestEmail,
      data: {
        guestName: opts.guestName,
        attending: opts.attending,
        coupleName1: opts.coupleName1,
        coupleName2: opts.coupleName2,
        weddingDate: opts.weddingDate ?? null,
        venueName: opts.venueName ?? null,
      },
    }),
  });
}

export async function sendSignupWelcome(opts: {
  email: string;
  coupleName1: string;
  coupleName2: string;
  siteUrl: string;
}) {
  const headers = await getAuthHeaders();
  return fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'signup_welcome',
      to: opts.email,
      data: {
        coupleName1: opts.coupleName1,
        coupleName2: opts.coupleName2,
        siteUrl: opts.siteUrl,
      },
    }),
  });
}

export async function sendWeddingInvitation(opts: {
  guestEmail: string;
  guestName: string;
  coupleName1: string;
  coupleName2: string;
  weddingDate?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  siteUrl?: string | null;
  inviteToken?: string | null;
}) {
  const headers = await getAuthHeaders();
  return fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'wedding_invitation',
      to: opts.guestEmail,
      data: {
        guestName: opts.guestName,
        coupleName1: opts.coupleName1,
        coupleName2: opts.coupleName2,
        weddingDate: opts.weddingDate ?? null,
        venueName: opts.venueName ?? null,
        venueAddress: opts.venueAddress ?? null,
        siteUrl: opts.siteUrl ?? null,
        inviteToken: opts.inviteToken ?? null,
      },
    }),
  });
}

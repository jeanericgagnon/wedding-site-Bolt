import { Route } from 'react-router-dom';
import {
  AcceptCollaboratorInvite,
  EventHub,
  EventRecap,
  EventRSVP,
  GuestContactUpdate,
  GuestbookSubmit,
  PhotoUpload,
  RSVP,
  VaultContribute,
} from './routePages';

export function GuestRoutes() {
  return (
    <>
      <Route path="/vault/:siteSlug" element={<VaultContribute />} />
      <Route path="/vault/:siteSlug/:year" element={<VaultContribute />} />
      <Route path="/accept-collaborator-invite" element={<AcceptCollaboratorInvite />} />
      <Route path="/event/:siteRef" element={<EventHub />} />
      <Route path="/event/:siteRef/recap" element={<EventRecap />} />
      <Route path="/photos/upload" element={<PhotoUpload />} />
      <Route path="/rsvp" element={<RSVP />} />
      <Route path="/rsvp/:token" element={<RSVP />} />
      <Route path="/events" element={<EventRSVP />} />
      <Route path="/guest-contact/:token" element={<GuestContactUpdate />} />
      <Route path="/guestbook/:siteRef" element={<GuestbookSubmit />} />
    </>
  );
}

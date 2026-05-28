import { BUILDER_WORKSPACE_ROUTES } from './builderWorkspaceRoutes';

export const FIRST_SESSION_WORKSPACE_ROUTES = {
  builder: BUILDER_WORKSPACE_ROUTES.guide,
  coordinator: '/dashboard/coordinator',
  guests: '/dashboard/guests',
  itinerary: '/dashboard/itinerary',
  messages: '/dashboard/messages',
  overview: '/dashboard/overview',
  photos: '/dashboard/photos',
  planning: '/dashboard/planning',
  registry: '/dashboard/registry',
  rsvpBoard: '/dashboard/rsvp-board',
  seating: '/dashboard/seating',
  settings: '/dashboard/settings',
} as const;

export const getFirstSessionSignupState = () => ({
  returnTo: FIRST_SESSION_WORKSPACE_ROUTES.builder,
});

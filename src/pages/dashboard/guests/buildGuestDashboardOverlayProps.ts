import type { ComponentProps } from 'react';
import { GuestDashboardOverlays } from './GuestDashboardOverlays';

export type GuestDashboardOverlayPropsInput = ComponentProps<typeof GuestDashboardOverlays>;

export function buildGuestDashboardOverlayProps(
  input: GuestDashboardOverlayPropsInput,
): ComponentProps<typeof GuestDashboardOverlays> {
  return input;
}

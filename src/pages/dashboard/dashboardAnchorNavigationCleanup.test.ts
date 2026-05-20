import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard anchor navigation cleanup', () => {
  it('uses router links for coordinator, guest, planning, and seating dashboard cross-links', () => {
    const coordinatorSource = read('src/pages/dashboard/coordinator/CoordinatorModePanels.tsx');
    const guestHeaderSource = read('src/pages/dashboard/guests/GuestDashboardHeader.tsx');
    const guestRsvpSource = read('src/pages/dashboard/guests/GuestRsvpSettingsView.tsx');
    const planningShellSource = read('src/pages/dashboard/planning/PlanningDashboardShell.tsx');
    const seatingSource = read('src/pages/dashboard/seating/SeatingDashboardRouteContent.tsx');

    expect(coordinatorSource).toContain("import { Link } from 'react-router-dom';");
    expect(coordinatorSource).toContain('to="/dashboard/rsvp-board"');
    expect(coordinatorSource).toContain('to="/dashboard/seating-lookup"');
    expect(coordinatorSource).toContain('to="/dashboard/planning"');
    expect(coordinatorSource).not.toContain('href="/dashboard/rsvp-board"');

    expect(guestHeaderSource).toContain("import { Link } from 'react-router-dom';");
    expect(guestHeaderSource).toContain('to="/dashboard/rsvp-board"');
    expect(guestHeaderSource).not.toContain('href="/dashboard/rsvp-board"');

    expect(guestRsvpSource).toContain("import { Link } from 'react-router-dom';");
    expect(guestRsvpSource).toContain('to="/dashboard/rsvp-board"');
    expect(guestRsvpSource).not.toContain('href="/dashboard/rsvp-board"');

    expect(planningShellSource).toContain("import { Link } from 'react-router-dom';");
    expect(planningShellSource).toContain('to="/dashboard/itinerary"');
    expect(planningShellSource).toContain('to="/dashboard/guests"');
    expect(planningShellSource).toContain('to="/dashboard/coordinator"');
    expect(planningShellSource).not.toContain('href="/dashboard/itinerary"');

    expect(seatingSource).toContain("import { Link } from 'react-router-dom';");
    expect(seatingSource).toContain('to="/dashboard/seating-lookup"');
    expect(seatingSource).toContain('to="/dashboard/coordinator"');
    expect(seatingSource).not.toContain('href="/dashboard/seating-lookup"');
  });
});

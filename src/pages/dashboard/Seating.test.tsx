import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardSeating } from './Seating';

const seatingState = {
  allGuests: [],
  assignments: [],
  counters: { assigned: 0, totalGuests: 0, checkedIn: 0, tables: 0, seats: 0 },
  invalidCount: 0,
  itineraryEvents: [] as Array<{ id: string; event_name: string }>,
  loading: false,
  loadingSeating: false,
  loadSeatingData: vi.fn(),
  seatingEvent: null as { id: string; event_name: string } | null,
  selectedEventId: null as string | null,
  setAssignments: vi.fn(),
  setSelectedEventId: vi.fn(),
  setTables: vi.fn(),
  setVersions: vi.fn(),
  siteId: 'site-1',
  tables: [],
  versions: [],
};

vi.mock('../../components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/dashboard/DashboardStateBlock', () => ({
  DashboardStateBlock: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

vi.mock('../../components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isDemoMode: false }),
}));

vi.mock('./seating/seatingService', () => ({
  unassignGuest: vi.fn(),
}));

vi.mock('./seating/buildSeatingDashboardDerivedState', () => ({
  buildSeatingDashboardDerivedState: () => ({
    arrivedCount: 0,
    arrivedGuestIds: new Set(),
    assignedGuestIdSet: new Set(),
    cateringHandoffReview: null,
    cateringPacket: null,
    checkInCandidates: [],
    mealHeadcountByTable: [],
    packetReadyTone: 'neutral',
    selectedItineraryEvent: null,
    unassignedGuests: [],
  }),
}));

vi.mock('./seating/SeatingDashboardRouteContent', () => ({
  SeatingDashboardRouteContent: () => <div>Seating dashboard content</div>,
}));

vi.mock('./seating/useSeatingDashboardActions', () => ({
  useSeatingDashboardActions: () => ({
    assignGuestToSeatDirect: vi.fn(),
    clearSeatAssignment: vi.fn(),
    getDefaultTablePosition: vi.fn(),
    handleAddTable: vi.fn(),
    handleAutoCreateTables: vi.fn(),
    handleAutoSeat: vi.fn(),
    handleBulkCheckIn: vi.fn(),
    handleCheckDrift: vi.fn(),
    handleDeleteTable: vi.fn(),
    handleRemoveGuest: vi.fn(),
    handleReset: vi.fn(),
    handleResizeTable: vi.fn(),
    handleRotateTable: vi.fn(),
    handleToggleCheckIn: vi.fn(),
    handleUpdateTable: vi.fn(),
    startMoveTable: vi.fn(),
  }),
}));

vi.mock('./seating/useSeatingDashboardArtifacts', () => ({
  useSeatingDashboardArtifacts: () => ({
    handleExportCSV: vi.fn(),
    handleExportCateringCSV: vi.fn(),
    handleExportKitchenSummaryCSV: vi.fn(),
    handleExportImage: vi.fn(),
    handleExportPDF: vi.fn(),
    handleExportPlaceCards: vi.fn(),
    handleExportTableSummaryCSV: vi.fn(),
    handlePrint: vi.fn(),
    handleRestoreVersion: vi.fn(),
    handleSaveVersion: vi.fn(),
  }),
}));

vi.mock('./seating/useSeatingDashboardInteractionState', () => ({
  useSeatingDashboardInteractionState: () => ({
    activeGuest: null,
    activeSeatGuest: null,
    addingTable: false,
    autoCapacity: 8,
    canvasFullscreen: false,
    canvasZoom: 1,
    checkInFilter: 'all',
    checkInMode: 'off',
    checkInQuery: '',
    closeSeatPicker: vi.fn(),
    confirmDialog: null,
    editingTable: null,
    handleCanvasWheelZoom: vi.fn(),
    layoutMode: 'floor-plan',
    movingTableId: null,
    openSeatPicker: vi.fn(),
    requestConfirmation: vi.fn(),
    seatPicker: null,
    seatPickerOptions: [],
    seatPickerQuery: '',
    seatingBusyAction: null,
    selectedTableId: null,
    sensors: [],
    setActiveGuest: vi.fn(),
    setAddingTable: vi.fn(),
    setAutoCapacity: vi.fn(),
    setCanvasFullscreen: vi.fn(),
    setCanvasZoom: vi.fn(),
    setCheckInFilter: vi.fn(),
    setCheckInMode: vi.fn(),
    setCheckInQuery: vi.fn(),
    setEditingTable: vi.fn(),
    setLayoutMode: vi.fn(),
    setMovingTableId: vi.fn(),
    setSeatPicker: vi.fn(),
    setSeatPickerQuery: vi.fn(),
    setSeatingBusyAction: vi.fn(),
    setSelectedTableId: vi.fn(),
    setShowAutoTablesModal: vi.fn(),
    setShowResetConfirm: vi.fn(),
    showAutoTablesModal: false,
    showResetConfirm: false,
    tableDragRef: { current: null },
  }),
}));

vi.mock('./seating/useSeatingDashboardData', () => ({
  useSeatingDashboardData: () => seatingState,
}));

describe('DashboardSeating', () => {
  it('shows the itinerary setup state instead of an empty main region when there are no events', () => {
    render(<DashboardSeating />);

    expect(screen.getByText('No Events Yet')).toBeInTheDocument();
    expect(screen.getByText('Create itinerary events first to start managing seating.')).toBeInTheDocument();
  });

  it('shows a clear state block when no seating event is resolved', () => {
    seatingState.itineraryEvents = [{ id: 'event-1', event_name: 'Ceremony' }];
    seatingState.selectedEventId = null;
    seatingState.seatingEvent = null;

    render(<DashboardSeating />);

    expect(screen.getByText('Choose an event to open seating')).toBeInTheDocument();
    expect(screen.getByText('This route needs a wedding event before the seating tools can load. Add or pick an itinerary event, then come back here.')).toBeInTheDocument();

    seatingState.itineraryEvents = [];
  });

  it('renders the seating dashboard content once an event is resolved', () => {
    seatingState.itineraryEvents = [{ id: 'event-1', event_name: 'Ceremony' }];
    seatingState.selectedEventId = 'event-1';
    seatingState.seatingEvent = { id: 'event-1', event_name: 'Ceremony' };

    render(<DashboardSeating />);

    expect(screen.getByText('Seating dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('No Events Yet')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose an event to open seating')).not.toBeInTheDocument();

    seatingState.itineraryEvents = [];
    seatingState.selectedEventId = null;
    seatingState.seatingEvent = null;
  });

  it('moves cleanly from the empty and unresolved states into live seating content', () => {
    const { rerender } = render(<DashboardSeating />);

    expect(screen.getByText('No Events Yet')).toBeInTheDocument();
    expect(screen.queryByText('Seating dashboard content')).not.toBeInTheDocument();

    seatingState.itineraryEvents = [{ id: 'event-1', event_name: 'Ceremony' }];
    seatingState.selectedEventId = null;
    seatingState.seatingEvent = null;

    rerender(<DashboardSeating />);

    expect(screen.getByText('Choose an event to open seating')).toBeInTheDocument();
    expect(screen.queryByText('No Events Yet')).not.toBeInTheDocument();

    seatingState.selectedEventId = 'event-1';
    seatingState.seatingEvent = { id: 'event-1', event_name: 'Ceremony' };

    rerender(<DashboardSeating />);

    expect(screen.getByText('Seating dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('Choose an event to open seating')).not.toBeInTheDocument();

    seatingState.itineraryEvents = [];
    seatingState.selectedEventId = null;
    seatingState.seatingEvent = null;
  });

  it('keeps the itinerary CTA wired to the itinerary dashboard', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    render(<DashboardSeating />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to Itinerary' }));

    expect(window.location.href).toBe('/dashboard/itinerary');

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });
});

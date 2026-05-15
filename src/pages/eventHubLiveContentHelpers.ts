type TravelGuestJourneyStep = {
  id: string;
  label: string;
  detail: string;
  href?: string;
  status: 'ready' | 'needs-content' | 'needs-info' | 'planned';
};

type DayOfModeSignalState = 'ready' | 'needs-content' | 'planned';
type DayOfHubStatusItemState = 'ready' | 'needs-content' | 'planned';

export function getTravelJourneyStatusLabel(status: TravelGuestJourneyStep['status']) {
  return status === 'ready' ? 'Travel step ready' : 'Travel step needs setup';
}

export function getDayOfSignalStatusLabel(state: DayOfModeSignalState) {
  return state === 'ready' ? 'Mode ready' : state === 'needs-content' ? 'Mode needs info' : 'Mode planned';
}

export function getHubStatusLabel(state: DayOfHubStatusItemState) {
  return state === 'ready' ? 'Hub item ready' : state === 'needs-content' ? 'Hub item needs info' : 'Hub item planned';
}

export function buildTravelJourneySummary(travelGuestJourney: TravelGuestJourneyStep[]) {
  const readyCount = travelGuestJourney.filter((step) => step.status === 'ready').length;
  const needsInfoCount = travelGuestJourney.filter((step) => step.status !== 'ready').length;
  const readyLabels = travelGuestJourney.filter((step) => step.status === 'ready').map((step) => step.label);
  const needsInfoLabels = travelGuestJourney.filter((step) => step.status !== 'ready').map((step) => step.label);

  return {
    readyCount,
    needsInfoCount,
    readyLabels,
    needsInfoLabels,
  };
}

export type FlowStatus = 'current' | 'next' | 'then';
export type FlowJourneyStatus = 'done' | 'current' | 'next' | 'available';

export function getFlowStatusLabel(status: FlowStatus): string {
  switch (status) {
    case 'current':
      return 'Right now';
    case 'next':
      return 'Next up';
    case 'then':
    default:
      return 'Keep warm';
  }
}

export function getJourneyStatusLabel(status: FlowJourneyStatus): string {
  switch (status) {
    case 'done':
      return 'Done';
    case 'current':
      return 'Here now';
    case 'next':
      return 'Next up';
    case 'available':
    default:
      return 'Ready';
  }
}

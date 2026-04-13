export interface PlusOneStateInput {
  plusOneAllowed?: boolean | null;
  plusOneName?: string | null;
  attending?: boolean | null;
}

export interface PlusOneStateDescriptor {
  label: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'success';
}

export function getPlusOneState(input: PlusOneStateInput): PlusOneStateDescriptor {
  if (!input.plusOneAllowed) {
    return {
      label: 'No plus-one',
      detail: 'This guest is not currently carrying a plus-one invite.',
      tone: 'neutral',
    };
  }

  if (input.attending && input.plusOneName) {
    return {
      label: 'Plus-one confirmed',
      detail: 'A plus-one is allowed here and the guest name has been captured.',
      tone: 'success',
    };
  }

  if (input.attending) {
    return {
      label: 'Plus-one needs a name',
      detail: 'This guest can bring someone, but the actual plus-one name is still missing.',
      tone: 'warning',
    };
  }

  return {
    label: 'Plus-one available',
    detail: 'This guest can bring someone if they attend, but no plus-one has been claimed yet.',
    tone: 'neutral',
  };
}

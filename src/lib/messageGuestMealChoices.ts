export interface MessageGuestMealRow {
  guest_id?: unknown;
  meal_choice?: unknown;
}

export interface MessageGuestMealTarget {
  id: string;
  meal_choice?: string | null;
}

export function mergeGuestsWithCanonicalMealChoices<T extends MessageGuestMealTarget>(
  guests: T[],
  mealRows: MessageGuestMealRow[],
): T[] {
  const mealChoiceByGuestId = new Map<string, string>();

  mealRows.forEach((row) => {
    const guestId = typeof row.guest_id === 'string' ? row.guest_id : null;
    const mealChoice = typeof row.meal_choice === 'string' ? row.meal_choice.trim() : '';
    if (!guestId || !mealChoice) return;
    mealChoiceByGuestId.set(guestId, mealChoice);
  });

  return guests.map((guest) => {
    const canonicalMealChoice = mealChoiceByGuestId.get(guest.id);
    if (!canonicalMealChoice) return guest;
    return { ...guest, meal_choice: canonicalMealChoice };
  });
}

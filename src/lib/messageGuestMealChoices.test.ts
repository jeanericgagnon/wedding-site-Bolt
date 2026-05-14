import { describe, expect, it } from 'vitest';
import { mergeGuestsWithCanonicalMealChoices } from './messageGuestMealChoices';

describe('messageGuestMealChoices', () => {
  it('overlays canonical RSVP meal choices onto message guests without clobbering unrelated guests', () => {
    expect(mergeGuestsWithCanonicalMealChoices(
      [
        { id: 'guest-1', meal_choice: null, name: 'A' },
        { id: 'guest-2', meal_choice: 'Old value', name: 'B' },
      ],
      [
        { guest_id: 'guest-1', meal_choice: 'Vegetarian' },
        { guest_id: 'guest-2', meal_choice: '' },
        { guest_id: 'guest-3', meal_choice: 'Fish' },
      ],
    )).toEqual([
      { id: 'guest-1', meal_choice: 'Vegetarian', name: 'A' },
      { id: 'guest-2', meal_choice: 'Old value', name: 'B' },
    ]);
  });
});

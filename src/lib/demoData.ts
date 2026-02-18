export const demoWeddingSite = {
  id: 'demo-site-id',
  user_id: 'demo-user-id',
  couple_name_1: 'Alex Thompson',
  couple_name_2: 'Jordan Rivera',
  wedding_date: '2026-06-15',
  venue_name: 'Sunset Gardens Estate',
  venue_location: '123 Garden Lane, Napa Valley, CA 94558',
  site_url: 'alex-jordan-demo',
  hero_image_url: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
  theme_settings: {
    primaryColor: '#8B7355',
    accentColor: '#D4A574',
  },
};

export const demoGuests = [
  ...Array.from({ length: 68 }, (_, i) => ({
    id: `confirmed-guest-${i}`,
    wedding_site_id: 'demo-site-id',
    name: `Confirmed Guest ${i + 1}`,
    first_name: 'Confirmed',
    last_name: `Guest${i + 1}`,
    email: `confirmed${i + 1}@demo.com`,
    rsvp_status: 'confirmed' as const,
    meal_preference: ['Beef', 'Chicken', 'Fish', 'Vegetarian'][i % 4],
    invite_token: `token-c-${i + 1}`,
    invited_to_ceremony: true,
    invited_to_reception: true,
  })),
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `declined-guest-${i}`,
    wedding_site_id: 'demo-site-id',
    name: `Declined Guest ${i + 1}`,
    first_name: 'Declined',
    last_name: `Guest${i + 1}`,
    email: `declined${i + 1}@demo.com`,
    rsvp_status: 'declined' as const,
    meal_preference: null,
    invite_token: `token-d-${i + 1}`,
    invited_to_ceremony: true,
    invited_to_reception: true,
  })),
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `pending-guest-${i}`,
    wedding_site_id: 'demo-site-id',
    name: `Pending Guest ${i + 1}`,
    first_name: 'Pending',
    last_name: `Guest${i + 1}`,
    email: `pending${i + 1}@demo.com`,
    rsvp_status: 'pending' as const,
    meal_preference: null,
    invite_token: `token-p-${i + 1}`,
    invited_to_ceremony: true,
    invited_to_reception: true,
  })),
];

export const demoEvents = [
  {
    id: 'welcome-dinner-id',
    wedding_site_id: 'demo-site-id',
    event_name: 'Welcome Dinner',
    description: 'Kick off the weekend',
    event_date: '2026-06-14',
    start_time: '18:00',
    location_name: 'The Vineyard Restaurant',
    display_order: 1,
  },
  {
    id: 'ceremony-id',
    wedding_site_id: 'demo-site-id',
    event_name: 'Ceremony',
    description: 'Exchange vows in the Rose Garden',
    event_date: '2026-06-15',
    start_time: '16:00',
    location_name: 'Rose Garden',
    display_order: 2,
  },
  {
    id: 'reception-id',
    wedding_site_id: 'demo-site-id',
    event_name: 'Reception',
    description: 'Dinner, drinks, and dancing',
    event_date: '2026-06-15',
    start_time: '18:00',
    location_name: 'Grand Ballroom',
    display_order: 3,
  },
  {
    id: 'brunch-id',
    wedding_site_id: 'demo-site-id',
    event_name: 'Sunday Brunch',
    description: 'Farewell brunch',
    event_date: '2026-06-16',
    start_time: '10:00',
    location_name: 'Garden Terrace Café',
    display_order: 4,
  },
];

export const demoRSVPs: Array<{
  id: string;
  guest_id: string;
  attending: boolean;
  meal_choice: string | null;
  plus_one_name: string | null;
  notes: string | null;
}> = [
  ...demoGuests
    .filter((g) => g.rsvp_status === 'confirmed')
    .map((g) => ({
      id: `rsvp-${g.id}`,
      guest_id: g.id,
      attending: true,
      meal_choice: g.meal_preference as string | null,
      plus_one_name: null,
      notes: null,
    })),
  ...demoGuests
    .filter((g) => g.rsvp_status === 'declined')
    .map((g) => ({
      id: `rsvp-${g.id}`,
      guest_id: g.id,
      attending: false,
      meal_choice: null,
      plus_one_name: null,
      notes: null,
    })),
];

export const demoRegistryItems = [
  {
    id: 'registry-1',
    wedding_site_id: 'demo-site-id',
    item_name: 'KitchenAid Stand Mixer',
    price: 449.99,
    store_name: 'Williams Sonoma',
    quantity_needed: 1,
    quantity_purchased: 0,
    priority: 'high' as const,
  },
  {
    id: 'registry-2',
    wedding_site_id: 'demo-site-id',
    item_name: 'Le Creuset Dutch Oven',
    price: 399.95,
    store_name: 'Sur La Table',
    quantity_needed: 1,
    quantity_purchased: 1,
    priority: 'high' as const,
  },
];

export const demoMessages = [
  {
    id: 'message-1',
    wedding_site_id: 'demo-site-id',
    subject: 'Save the Date!',
    body: 'June 15, 2026',
    channel: 'email' as const,
    audience_filter: 'all' as const,
    recipient_count: 120,
  },
];

export const demoStats = {
  totalGuests: 120,
  confirmed: 68,
  declined: 22,
  pending: 30,
  mealChoices: {
    Beef: 17,
    Chicken: 17,
    Fish: 17,
    Vegetarian: 17,
  },
};

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

const DEMO_NAME_POOL = [
  ['Emma', 'Waters'], ['Noah', 'Waters'], ['Olivia', 'Nguyen'], ['Liam', 'Nguyen'],
  ['Sophia', 'Patel'], ['Mason', 'Patel'], ['Isabella', 'Garcia'], ['Lucas', 'Garcia'],
  ['Mia', 'Kim'], ['Ethan', 'Kim'], ['Ava', 'Turner'], ['James', 'Turner'],
  ['Charlotte', 'Diaz'], ['Benjamin', 'Diaz'], ['Amelia', 'Cruz'], ['Henry', 'Cruz'],
  ['Harper', 'Lee'], ['Alexander', 'Lee'], ['Evelyn', 'Bennett'], ['Michael', 'Bennett'],
  ['Abigail', 'Morgan'], ['Daniel', 'Morgan'], ['Ella', 'Brooks'], ['Jack', 'Brooks'],
  ['Scarlett', 'Reed'], ['Owen', 'Reed'], ['Grace', 'Campbell'], ['Sebastian', 'Campbell'],
  ['Chloe', 'Price'], ['Logan', 'Price'], ['Lily', 'Hughes'], ['Elijah', 'Hughes'],
  ['Nora', 'Foster'], ['Jacob', 'Foster'], ['Aria', 'Cox'], ['William', 'Cox'],
  ['Zoey', 'Bailey'], ['Samuel', 'Bailey'], ['Layla', 'Perry'], ['Aiden', 'Perry'],
];

const makeDemoGuest = (idx: number, status: 'confirmed' | 'declined' | 'pending') => {
  const [first, last] = DEMO_NAME_POOL[idx % DEMO_NAME_POOL.length];
  const householdIndex = Math.floor((idx % 80) / 2) + 1;
  return {
    id: `${status}-guest-${idx}`,
    wedding_site_id: 'demo-site-id',
    name: `${first} ${last}`,
    first_name: first,
    last_name: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}+${idx}@dayof.demo`,
    household_id: `demo-household-${householdIndex}`,
    relationship_to_couple: idx % 3 === 0 ? 'Family' : idx % 3 === 1 ? 'Friends' : 'Coworkers',
    rsvp_status: status,
    meal_preference: status === 'confirmed' ? ['Beef', 'Chicken', 'Fish', 'Vegetarian'][idx % 4] : null,
    invite_token: `token-${status[0]}-${idx + 1}`,
    invited_to_ceremony: true,
    invited_to_reception: true,
  };
};

export const demoGuests = [
  ...Array.from({ length: 68 }, (_, i) => makeDemoGuest(i, 'confirmed')),
  ...Array.from({ length: 22 }, (_, i) => makeDemoGuest(i + 68, 'declined')),
  ...Array.from({ length: 30 }, (_, i) => makeDemoGuest(i + 90, 'pending')),
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

export const demoPlanningTasks = [
  { id: 'demo-task-1', wedding_site_id: 'demo-site-id', title: 'Finalize ceremony timeline', description: 'Lock processional order and cue sheet with planner.', due_date: '2026-05-20', status: 'in_progress', priority: 'high', owner_name: 'Alex', linked_event_id: 'ceremony-id', linked_vendor_id: null, sort_order: 10, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'demo-task-2', wedding_site_id: 'demo-site-id', title: 'Confirm final guest count', description: 'Send headcount to venue + caterer.', due_date: '2026-05-28', status: 'todo', priority: 'high', owner_name: 'Jordan', linked_event_id: null, linked_vendor_id: 'demo-vendor-1', sort_order: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'demo-task-3', wedding_site_id: 'demo-site-id', title: 'Assemble welcome bags', description: 'Include itinerary card, snacks, and local map.', due_date: '2026-06-10', status: 'todo', priority: 'medium', owner_name: '', linked_event_id: 'welcome-dinner-id', linked_vendor_id: null, sort_order: 30, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
] as const;

export const demoBudgetItems = [
  { id: 'demo-budget-1', wedding_site_id: 'demo-site-id', category: 'Venue', item_name: 'Sunset Gardens Estate', estimated_amount: 12000, actual_amount: 12000, paid_amount: 9000, due_date: '2026-05-30', vendor_id: 'demo-vendor-1', notes: 'Final payment due 2 weeks prior.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'demo-budget-2', wedding_site_id: 'demo-site-id', category: 'Photography', item_name: '8-hour coverage', estimated_amount: 4200, actual_amount: 3900, paid_amount: 2000, due_date: '2026-06-01', vendor_id: 'demo-vendor-2', notes: 'Engagement shoot included.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
] as const;

export const demoVendors = [
  { id: 'demo-vendor-1', wedding_site_id: 'demo-site-id', vendor_type: 'Venue', name: 'Sunset Gardens Estate', contact_name: 'Maya Chen', email: 'maya@sunsetgardens.demo', phone: '(555) 210-4498', website: 'https://venue.dayof.demo', contract_total: 12000, amount_paid: 9000, balance_due: 3000, next_payment_due: '2026-05-30', notes: 'Includes ceremony chairs + basic lighting.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'demo-vendor-2', wedding_site_id: 'demo-site-id', vendor_type: 'Photography', name: 'Everlight Studio', contact_name: 'Renee Torres', email: 'renee@everlight.demo', phone: '(555) 018-3321', website: 'https://photo.dayof.demo', contract_total: 3900, amount_paid: 2000, balance_due: 1900, next_payment_due: '2026-06-01', notes: 'Second shooter + 4 week gallery delivery.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
] as const;

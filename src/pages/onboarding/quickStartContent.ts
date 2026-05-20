export type QuickStartQuestionKey =
  | 'partnerNames'
  | 'partnerLabels'
  | 'venueLocation'
  | 'venueName'
  | 'theme'
  | 'guestFeel'
  | 'weekendEvents'
  | 'ceremonyTime'
  | 'guestCount'
  | 'plusOnePolicy'
  | 'childrenAllowed'
  | 'rsvpDeadline'
  | 'mealChoice'
  | 'story';

export type QuickStartQuestionDef = {
  key: QuickStartQuestionKey;
  label: string;
  prompt: string;
  helper?: string;
  type?: 'text' | 'date' | 'textarea' | 'choice';
  placeholder?: string;
  choices?: Array<{ label: string; value: string }>;
  optional?: boolean;
};

export const quickStartQuestions: QuickStartQuestionDef[] = [
  { key: 'partnerNames', label: "Who's getting married?", prompt: "Who's getting married?", helper: 'Use the names exactly how you want guests to see them on the site.', placeholder: 'Alex & Jordan' },
  {
    key: 'partnerLabels',
    label: 'Labels',
    prompt: 'How should we refer to each of you on the site?',
    helper: 'Choose the simplest option that fits best.',
    type: 'choice',
    choices: [
      { label: 'Just our names', value: 'none|none' },
      { label: 'Bride & Groom', value: 'bride|groom' },
      { label: 'Bride & Bride', value: 'bride|bride' },
      { label: 'Groom & Groom', value: 'groom|groom' },
    ],
  },
  { key: 'venueLocation', label: 'When and where', prompt: 'When and where are you getting married?', helper: 'Use the date and city or region together so we can anchor the whole site in one step.', placeholder: 'January 17, 2027 in Sayulita, Mexico' },
  { key: 'venueName', label: 'Venue', prompt: 'What venue are you getting married at?', helper: 'Use the venue name or write TBD if you are still deciding.', placeholder: 'Amor Boutique Hotel or TBD', optional: true },
  { key: 'theme', label: 'Style', prompt: 'What style should the site lean into?', helper: 'A few words is enough. Tropical, modern, editorial, classic, relaxed.', placeholder: 'Tropical, relaxed' },
  { key: 'guestFeel', label: 'Tone', prompt: 'If someone lands on your site, what should they feel right away?', helper: 'Think tone, not a perfect sentence. Warm, excited, relaxed, elegant, fun, emotional, welcoming, intimate. Anything like that works.', placeholder: 'Warm, excited, relaxed' },
  { key: 'weekendEvents', label: 'Events', prompt: 'What events are happening over the wedding weekend?', type: 'textarea', helper: 'Use one short line or sentence. We will turn it into structured events.', placeholder: 'Friday welcome drinks, Saturday wedding, Sunday brunch' },
  { key: 'ceremonyTime', label: 'Ceremony arrival', prompt: 'What time should guests arrive for the ceremony?', helper: 'A simple arrival time is enough.', placeholder: '4:30 PM' },
  {
    key: 'guestCount',
    label: 'Guest count',
    prompt: 'About how many guests are you inviting?',
    helper: 'Pick the closest range.',
    type: 'choice',
    choices: [
      { label: 'Under 50', value: 'under-50' },
      { label: '50-100', value: '50-100' },
      { label: '100-150', value: '100-150' },
      { label: '150-250', value: '150-250' },
      { label: '250+', value: '250-plus' },
    ],
  },
  {
    key: 'plusOnePolicy',
    label: 'Plus-ones',
    prompt: "What's your plus-one policy?",
    helper: 'Choose the policy you want the RSVP flow to follow.',
    type: 'choice',
    choices: [
      { label: 'No plus-ones', value: 'none' },
      { label: 'Some plus-ones', value: 'some' },
      { label: 'Everyone gets one', value: 'all' },
    ],
  },
  {
    key: 'childrenAllowed',
    label: 'Children',
    prompt: 'Are children invited?',
    helper: 'Choose yes, no, or unsure for now.',
    type: 'choice',
    choices: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unsure', value: 'unsure' },
    ],
  },
  { key: 'rsvpDeadline', label: 'RSVP', prompt: 'When do you want guests to RSVP by?', helper: 'This drives the RSVP setup immediately.', type: 'date' },
  {
    key: 'mealChoice',
    label: 'Meals',
    prompt: 'Do you want to collect meal choices?',
    helper: 'Choose yes or no.',
    type: 'choice',
    choices: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ],
  },
  { key: 'story', label: 'Story', prompt: 'Want to add your story? (totally optional)', type: 'textarea', helper: 'Optional, but helpful for stronger copy.', placeholder: 'We met on Hinge, texted for a month, then finally met up for a concert...', optional: true },
];

export const quickStartTheme = {
  pageBg: '#FAF9F7',
  text: '#2B2B2B',
  muted: '#A0A0A0',
  transcript: '#B0B0B0',
  transcriptValue: '#909090',
  warm: '#8B7355',
  soft: '#F5F4F2',
  softHover: '#EEEDEB',
  border: '#E0DED9',
} as const;

export const quickStartProcessingSteps = [
  'Aggregating your answers',
  'Mapping wedding details',
  'Checking for missing guest-facing info',
  'Shaping the first draft structure',
  'Tuning tone and style',
  'Deciding if we need anything else',
  'Preparing your next step',
] as const;

export const QUICK_START_PROCESSING_STEP_MS = 90;
export const QUICK_START_PROCESSING_FINAL_STEP_MS = 140;

export const questions = quickStartQuestions;
export const PROCESSING_STEPS = quickStartProcessingSteps;
export const PROCESSING_STEP_MS = QUICK_START_PROCESSING_STEP_MS;
export const PROCESSING_FINAL_STEP_MS = QUICK_START_PROCESSING_FINAL_STEP_MS;
export const PAGE_BG = quickStartTheme.pageBg;
export const TEXT = quickStartTheme.text;
export const MUTED = quickStartTheme.muted;
export const TRANSCRIPT = quickStartTheme.transcript;
export const TRANSCRIPT_VALUE = quickStartTheme.transcriptValue;
export const WARM = quickStartTheme.warm;
export const SOFT = quickStartTheme.soft;
export const SOFT_HOVER = quickStartTheme.softHover;
export const BORDER = quickStartTheme.border;

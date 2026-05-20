export type OnboardingStepKey = 'choice' | 'quick-1' | 'quick-2' | 'quick-3' | 'details' | 'customize' | 'complete';

export type OnboardingConciergeQuestionKey =
  | 'partnerNames'
  | 'partnerLabels'
  | 'venueLocation'
  | 'venueName'
  | 'theme'
  | 'weekendEvents'
  | 'ceremonyTime'
  | 'guestCount'
  | 'plusOnePolicy'
  | 'childrenAllowed'
  | 'rsvpDeadline'
  | 'mealChoice'
  | 'story';

export type OnboardingConciergeQuestion = {
  key: OnboardingConciergeQuestionKey;
  label: string;
  prompt: string;
  helper?: string;
  type?: 'text' | 'date' | 'time' | 'textarea';
  placeholder?: string;
};

export const onboardingConciergeQuestions: OnboardingConciergeQuestion[] = [
  { key: 'partnerNames', label: "Who's getting married?", prompt: "Who's getting married?", helper: 'Use the names exactly how you want guests to see them on the site.', placeholder: 'Alex & Jordan' },
  { key: 'partnerLabels', label: 'Labels', prompt: 'How should we refer to each of you on the site?', helper: 'Choose the simplest option that fits best.', placeholder: 'groom|bride' },
  { key: 'venueLocation', label: 'When and where', prompt: 'When and where are you getting married?', helper: 'Use the date and city or region together so we can anchor the whole site in one step.', placeholder: 'January 17, 2027 in Sayulita, Mexico' },
  { key: 'venueName', label: 'Venue', prompt: 'What venue are you getting married at?', helper: 'Use the venue name or write TBD if you are still deciding.', placeholder: 'Amor Boutique Hotel or TBD' },
  { key: 'theme', label: 'Style', prompt: 'What style should the site lean into?', helper: 'A few words is enough. Tropical, modern, editorial, classic, relaxed.', placeholder: 'Tropical, relaxed' },
  { key: 'weekendEvents', label: 'Events', prompt: 'What events are happening over the wedding weekend?', type: 'textarea', helper: 'Use one short line or sentence. We will turn it into structured events.', placeholder: 'Friday pickleball tournament and welcome dinner, Saturday rehearsal dinner, Sunday wedding' },
  { key: 'ceremonyTime', label: 'Ceremony arrival', prompt: 'What time should guests arrive for the ceremony?', helper: 'A simple arrival time is enough.', placeholder: '4:30 PM' },
  { key: 'guestCount', label: 'Guest count', prompt: 'About how many guests are you inviting?', helper: 'Pick the closest range.', placeholder: '50-100' },
  { key: 'plusOnePolicy', label: 'Plus-ones', prompt: "What's your plus-one policy?", helper: 'Choose the policy you want the RSVP flow to follow.', placeholder: 'some' },
  { key: 'childrenAllowed', label: 'Children', prompt: 'Are children invited?', helper: 'Choose yes, no, or unsure for now.', placeholder: 'unsure' },
  { key: 'rsvpDeadline', label: 'RSVP', prompt: 'When do you want guests to RSVP by?', helper: 'This drives the RSVP setup immediately.', type: 'date' },
  { key: 'mealChoice', label: 'Meals', prompt: 'Do you want to collect meal choices?', helper: 'Choose yes or no.', placeholder: 'yes' },
  { key: 'story', label: 'Story', prompt: 'Want to add your story? (totally optional)', type: 'textarea', helper: 'Optional, but helpful for stronger copy.', placeholder: 'We met on Hinge, texted for a month, then finally met up for a concert...' },
];

export const optionalOnboardingQuestionKeys: OnboardingConciergeQuestionKey[] = ['venueName', 'story'];

export const getOnboardingStepForQuestionIndex = (index: number): OnboardingStepKey => {
  if (index < 4) return 'quick-1';
  if (index < 7) return 'quick-2';
  return 'quick-3';
};

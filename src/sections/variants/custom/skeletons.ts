export interface CustomBlock {
  id: string;
  type: 'heading' | 'subheading' | 'paragraph' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'badge';
  content?: string;
  imageUrl?: string;
  imageAlt?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  columns?: CustomBlock[][];
  variant?: string;
}

export interface CustomSectionSkeleton {
  id: string;
  label: string;
  description: string;
  category: 'announcement' | 'content' | 'cta' | 'details' | 'blank' | 'stats' | 'numbers';
  thumbnail: string;
  blocks: CustomBlock[];
  backgroundColor: string;
  paddingSize: 'sm' | 'md' | 'lg';
}

export const CUSTOM_SKELETONS: CustomSectionSkeleton[] = [
  /* ── BLANK ── */
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start from scratch',
    category: 'blank',
    thumbnail: 'blank',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Your Heading', align: 'center', size: 'lg' },
      { id: 'p1', type: 'paragraph', content: 'Add your content here. Click to edit any block.', align: 'center' },
    ],
  },

  /* ── ANNOUNCEMENTS ── */
  {
    id: 'announcement',
    label: 'Announcement',
    description: 'Bold centered announcement with badge',
    category: 'announcement',
    thumbnail: 'announcement',
    backgroundColor: '#fdf8f6',
    paddingSize: 'lg',
    blocks: [
      { id: 'b1', type: 'badge', content: 'Important Update', align: 'center' },
      { id: 'h1', type: 'heading', content: 'We Have an Announcement', align: 'center', size: 'xl' },
      { id: 'p1', type: 'paragraph', content: 'Share exciting news with your guests here. This is a great place to post updates about your big day.', align: 'center', size: 'lg' },
      { id: 'd1', type: 'divider', align: 'center' },
      { id: 'btn1', type: 'button', buttonLabel: 'Learn More', buttonUrl: '#', align: 'center' },
    ],
  },
  {
    id: 'notice-banner',
    label: 'Notice Banner',
    description: 'Slim full-width notice strip',
    category: 'announcement',
    thumbnail: 'notice-banner',
    backgroundColor: '#1c1917',
    paddingSize: 'sm',
    blocks: [
      { id: 'b1', type: 'badge', content: 'Heads Up', align: 'center', variant: 'light' },
      { id: 'h1', type: 'heading', content: 'Shuttle Service Available', align: 'center', size: 'md', variant: 'light' },
      { id: 'p1', type: 'paragraph', content: 'A complimentary shuttle will run between the hotel and venue every 30 minutes.', align: 'center', variant: 'light' },
    ],
  },
  {
    id: 'date-save',
    label: 'Save the Date',
    description: 'Date-focused announcement card',
    category: 'announcement',
    thumbnail: 'date-save',
    backgroundColor: '#f5f0eb',
    paddingSize: 'lg',
    blocks: [
      { id: 'p1', type: 'paragraph', content: 'SAVE THE DATE', align: 'center', variant: 'eyebrow' },
      { id: 'h1', type: 'heading', content: 'June 14, 2025', align: 'center', size: 'xl' },
      { id: 'd1', type: 'divider', align: 'center' },
      { id: 'h2', type: 'subheading', content: 'Sarah & James', align: 'center' },
      { id: 'p2', type: 'paragraph', content: 'The Grand Pavilion · New York, NY', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'Add to Calendar', buttonUrl: '#', align: 'center' },
    ],
  },

  /* ── STATS & NUMBERS ── */
  {
    id: 'stat-trio',
    label: 'Stat Trio',
    description: '3 large numbers with labels side by side',
    category: 'stats',
    thumbnail: 'stat-trio',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'By the Numbers', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '8', align: 'center', size: 'xl' },
            { id: 'l1', type: 'subheading', content: 'Years Together', align: 'center' },
            { id: 'p1', type: 'paragraph', content: 'Since our first date in 2017', align: 'center' },
          ],
          [
            { id: 'n2', type: 'heading', content: '150', align: 'center', size: 'xl' },
            { id: 'l2', type: 'subheading', content: 'Guests Invited', align: 'center' },
            { id: 'p2', type: 'paragraph', content: 'Our closest family and friends', align: 'center' },
          ],
          [
            { id: 'n3', type: 'heading', content: '1', align: 'center', size: 'xl' },
            { id: 'l3', type: 'subheading', content: 'Perfect Day', align: 'center' },
            { id: 'p3', type: 'paragraph', content: 'We cannot wait to celebrate', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'stat-dark',
    label: 'Dark Stats',
    description: 'Big numbers on a dark background',
    category: 'stats',
    thumbnail: 'stat-dark',
    backgroundColor: '#111827',
    paddingSize: 'lg',
    blocks: [
      { id: 'p0', type: 'paragraph', content: 'Our story in numbers', align: 'center', variant: 'light' },
      { id: 'h1', type: 'heading', content: 'A Life Built Together', align: 'center', size: 'xl', variant: 'light' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '2017', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l1', type: 'paragraph', content: 'Year we met', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n2', type: 'heading', content: '14', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l2', type: 'paragraph', content: 'Cities explored', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n3', type: 'heading', content: '2025', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l3', type: 'paragraph', content: 'The year forever begins', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n4', type: 'heading', content: '∞', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l4', type: 'paragraph', content: 'Years ahead', align: 'center', variant: 'light' },
          ],
        ],
      },
    ],
  },
  {
    id: 'metric-split',
    label: 'Metric Split',
    description: 'One big stat beside supporting text',
    category: 'stats',
    thumbnail: 'metric-split',
    backgroundColor: '#fdf8f6',
    paddingSize: 'lg',
    blocks: [
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '2,847', align: 'center', size: 'xl' },
            { id: 'l1', type: 'subheading', content: 'Days Together', align: 'center' },
          ],
          [
            { id: 'sh1', type: 'subheading', content: 'From coffee to forever', align: 'left' },
            { id: 'p1', type: 'paragraph', content: 'We have spent 2,847 days laughing, traveling, arguing over restaurant choices, and building something real. Now we are making it official.', align: 'left' },
            { id: 'btn1', type: 'button', buttonLabel: 'Our Story', buttonUrl: '#', align: 'left' },
          ],
        ],
      },
    ],
  },
  {
    id: 'countdown-stats',
    label: 'Countdown + Stats',
    description: 'Days until the wedding plus key numbers',
    category: 'stats',
    thumbnail: 'countdown-stats',
    backgroundColor: '#f9fafb',
    paddingSize: 'lg',
    blocks: [
      { id: 'b1', type: 'badge', content: 'Almost here', align: 'center' },
      { id: 'h1', type: 'heading', content: '47 Days to Go', align: 'center', size: 'xl' },
      { id: 'p1', type: 'paragraph', content: 'June 14, 2025 · The Grand Pavilion, New York', align: 'center' },
      { id: 'd1', type: 'divider', align: 'center' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '150', align: 'center', size: 'lg' },
            { id: 'l1', type: 'paragraph', content: 'Guests', align: 'center' },
          ],
          [
            { id: 'n2', type: 'heading', content: '5', align: 'center', size: 'lg' },
            { id: 'l2', type: 'paragraph', content: 'Course dinner', align: 'center' },
          ],
          [
            { id: 'n3', type: 'heading', content: '1', align: 'center', size: 'lg' },
            { id: 'l3', type: 'paragraph', content: 'Perfect night', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'numbers-grid',
    label: 'Numbers Grid',
    description: 'Clean 2x2 grid of milestone numbers',
    category: 'numbers',
    thumbnail: 'numbers-grid',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Our Milestones', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'row1',
        type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '8', align: 'center', size: 'xl' },
            { id: 'l1', type: 'subheading', content: 'Years Together', align: 'center' },
            { id: 'p1', type: 'paragraph', content: 'Together since 2017', align: 'center' },
          ],
          [
            { id: 'n2', type: 'heading', content: '23', align: 'center', size: 'xl' },
            { id: 'l2', type: 'subheading', content: 'Countries Visited', align: 'center' },
            { id: 'p2', type: 'paragraph', content: 'Adventures across the globe', align: 'center' },
          ],
        ],
      },
      { id: 'sp2', type: 'spacer', size: 'sm' },
      {
        id: 'row2',
        type: 'columns',
        columns: [
          [
            { id: 'n3', type: 'heading', content: '3', align: 'center', size: 'xl' },
            { id: 'l3', type: 'subheading', content: 'Rescue Dogs', align: 'center' },
            { id: 'p3', type: 'paragraph', content: 'Our family of five (including them)', align: 'center' },
          ],
          [
            { id: 'n4', type: 'heading', content: '1', align: 'center', size: 'xl' },
            { id: 'l4', type: 'subheading', content: 'Forever to Go', align: 'center' },
            { id: 'p4', type: 'paragraph', content: 'June 14, 2025 and beyond', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'year-timeline',
    label: 'Year Timeline',
    description: 'Key years as a horizontal stat row',
    category: 'numbers',
    thumbnail: 'year-timeline',
    backgroundColor: '#fdf8f6',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Our Journey', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '2017', align: 'center', size: 'xl' },
            { id: 'l1', type: 'paragraph', content: 'We met', align: 'center' },
          ],
          [
            { id: 'n2', type: 'heading', content: '2019', align: 'center', size: 'xl' },
            { id: 'l2', type: 'paragraph', content: 'Moved in together', align: 'center' },
          ],
          [
            { id: 'n3', type: 'heading', content: '2023', align: 'center', size: 'xl' },
            { id: 'l3', type: 'paragraph', content: 'Engaged in Paris', align: 'center' },
          ],
          [
            { id: 'n4', type: 'heading', content: '2025', align: 'center', size: 'xl' },
            { id: 'l4', type: 'paragraph', content: 'We say "I do"', align: 'center' },
          ],
        ],
      },
    ],
  },

  /* ── CONTENT ── */
  {
    id: 'two-column-text',
    label: 'Two Column',
    description: 'Side-by-side text columns',
    category: 'content',
    thumbnail: 'two-column',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Section Title', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'ch1', type: 'subheading', content: 'Left Column', align: 'left' },
            { id: 'cp1', type: 'paragraph', content: 'Write something meaningful in this column. Share details, instructions, or a personal message.', align: 'left' },
          ],
          [
            { id: 'ch2', type: 'subheading', content: 'Right Column', align: 'left' },
            { id: 'cp2', type: 'paragraph', content: 'Continue your message in the right column. Both columns display side by side on desktop.', align: 'left' },
          ],
        ],
      },
    ],
  },
  {
    id: 'image-text',
    label: 'Image + Text',
    description: 'Photo alongside a message',
    category: 'content',
    thumbnail: 'image-text',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'img1', type: 'image', imageUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', imageAlt: 'Wedding photo', align: 'center' },
          ],
          [
            { id: 'ch1', type: 'subheading', content: 'A Special Note', align: 'left' },
            { id: 'cp1', type: 'paragraph', content: 'Share a personal message alongside your photo. Tell your guests something meaningful about this day, your relationship, or your plans for the future.', align: 'left' },
            { id: 'sp1', type: 'spacer', size: 'sm' },
            { id: 'btn1', type: 'button', buttonLabel: 'Read More', buttonUrl: '#', align: 'left' },
          ],
        ],
      },
    ],
  },
  {
    id: 'full-width-message',
    label: 'Full-Width Message',
    description: 'Large text-only section',
    category: 'content',
    thumbnail: 'full-width',
    backgroundColor: '#fdf8f6',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'A Message From Us', align: 'center', size: 'xl' },
      { id: 'd1', type: 'divider', align: 'center' },
      { id: 'p1', type: 'paragraph', content: 'Write a personal message to your guests here. This section is perfect for a heartfelt note, special instructions, or sharing a meaningful quote.', align: 'center', size: 'lg' },
      { id: 'p2', type: 'paragraph', content: 'We are so grateful for everyone who has supported us on this journey. We cannot wait to celebrate with you.', align: 'center', size: 'lg' },
    ],
  },
  {
    id: 'pull-quote',
    label: 'Pull Quote',
    description: 'Large decorative quote block',
    category: 'content',
    thumbnail: 'pull-quote',
    backgroundColor: '#1c1917',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: '"The best thing to hold onto in life is each other."', align: 'center', size: 'xl', variant: 'light' },
      { id: 'p1', type: 'paragraph', content: '— Audrey Hepburn', align: 'center', variant: 'light' },
    ],
  },
  {
    id: 'three-columns',
    label: 'Three Columns',
    description: 'Three equal text/icon columns',
    category: 'content',
    thumbnail: 'three-columns',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'What to Expect', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'c1h', type: 'subheading', content: 'Ceremony', align: 'center' },
            { id: 'c1p', type: 'paragraph', content: 'A beautiful outdoor ceremony at 4 PM followed by cocktail hour.', align: 'center' },
          ],
          [
            { id: 'c2h', type: 'subheading', content: 'Dinner', align: 'center' },
            { id: 'c2p', type: 'paragraph', content: 'A five-course dinner featuring locally sourced ingredients.', align: 'center' },
          ],
          [
            { id: 'c3h', type: 'subheading', content: 'Dancing', align: 'center' },
            { id: 'c3p', type: 'paragraph', content: 'Live band followed by DJ until midnight.', align: 'center' },
          ],
        ],
      },
    ],
  },

  /* ── CTA ── */
  {
    id: 'centered-cta',
    label: 'Call to Action',
    description: 'Centered headline and button',
    category: 'cta',
    thumbnail: 'cta',
    backgroundColor: '#1c1917',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Join Us For Our Special Day', align: 'center', size: 'xl', variant: 'light' },
      { id: 'p1', type: 'paragraph', content: 'We would love for you to be there as we begin this new chapter together.', align: 'center', variant: 'light' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'RSVP Now', buttonUrl: '#rsvp', align: 'center', variant: 'outline-light' },
    ],
  },
  {
    id: 'cta-light',
    label: 'Light CTA',
    description: 'Clean light-background CTA with two buttons',
    category: 'cta',
    thumbnail: 'cta-light',
    backgroundColor: '#f9fafb',
    paddingSize: 'lg',
    blocks: [
      { id: 'b1', type: 'badge', content: 'June 14, 2025', align: 'center' },
      { id: 'h1', type: 'heading', content: 'You Are Invited', align: 'center', size: 'xl' },
      { id: 'p1', type: 'paragraph', content: 'We are so excited to celebrate with you. Please let us know if you can make it.', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'RSVP Now', buttonUrl: '#rsvp', align: 'center' },
    ],
  },

  /* ── DETAILS ── */
  {
    id: 'info-cards',
    label: 'Info Cards',
    description: 'Three side-by-side info cards',
    category: 'details',
    thumbnail: 'info-cards',
    backgroundColor: '#f9fafb',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Need to Know', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'c1h', type: 'subheading', content: 'Parking', align: 'center' },
            { id: 'c1p', type: 'paragraph', content: 'Complimentary valet parking available at the venue entrance.', align: 'center' },
          ],
          [
            { id: 'c2h', type: 'subheading', content: 'Attire', align: 'center' },
            { id: 'c2p', type: 'paragraph', content: 'Cocktail attire. Please avoid wearing white or ivory.', align: 'center' },
          ],
          [
            { id: 'c3h', type: 'subheading', content: 'Gifts', align: 'center' },
            { id: 'c3p', type: 'paragraph', content: 'Your presence is the greatest gift. Registry available for those who wish.', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'details-list',
    label: 'Details List',
    description: 'Label-value pairs for event details',
    category: 'details',
    thumbnail: 'details',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Event Details', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1',
        type: 'columns',
        columns: [
          [
            { id: 'c1h', type: 'subheading', content: 'Date', align: 'center' },
            { id: 'c1p', type: 'paragraph', content: 'Saturday, June 14, 2025', align: 'center' },
          ],
          [
            { id: 'c2h', type: 'subheading', content: 'Time', align: 'center' },
            { id: 'c2p', type: 'paragraph', content: '4:00 PM Ceremony\n6:00 PM Reception', align: 'center' },
          ],
        ],
      },
      { id: 'sp2', type: 'spacer', size: 'sm' },
      {
        id: 'cols2',
        type: 'columns',
        columns: [
          [
            { id: 'c3h', type: 'subheading', content: 'Venue', align: 'center' },
            { id: 'c3p', type: 'paragraph', content: 'The Grand Ballroom\n123 Wedding Lane', align: 'center' },
          ],
          [
            { id: 'c4h', type: 'subheading', content: 'RSVP By', align: 'center' },
            { id: 'c4p', type: 'paragraph', content: 'May 1, 2025', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'checklist',
    label: 'Guest Checklist',
    description: 'Bulleted list of things for guests to know',
    category: 'details',
    thumbnail: 'checklist',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Before You Arrive', align: 'left', size: 'lg' },
      { id: 'p1', type: 'paragraph', content: '✓  RSVP by May 1st with your meal preference', align: 'left' },
      { id: 'p2', type: 'paragraph', content: '✓  Book your hotel room — our block expires April 15th', align: 'left' },
      { id: 'p3', type: 'paragraph', content: '✓  Arrange transport — the venue is 20 min from downtown', align: 'left' },
      { id: 'p4', type: 'paragraph', content: '✓  Dress code: cocktail attire (no white please!)', align: 'left' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'RSVP Now', buttonUrl: '#rsvp', align: 'left' },
    ],
  },
];

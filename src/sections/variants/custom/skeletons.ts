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

  /* ════════════ BLANK ════════════ */
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

  /* ════════════ STATS ════════════ */
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
        id: 'cols1', type: 'columns',
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
        id: 'cols1', type: 'columns',
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
        id: 'cols1', type: 'columns',
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
        id: 'cols1', type: 'columns',
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
    id: 'stat-wide-bar',
    label: 'Wide Stat Bar',
    description: 'Five stats in a single horizontal row',
    category: 'stats',
    thumbnail: 'stat-wide-bar',
    backgroundColor: '#18181b',
    paddingSize: 'md',
    blocks: [
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '8', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l1', type: 'paragraph', content: 'Years', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n2', type: 'heading', content: '150', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l2', type: 'paragraph', content: 'Guests', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n3', type: 'heading', content: '23', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l3', type: 'paragraph', content: 'Countries', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n4', type: 'heading', content: '5', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l4', type: 'paragraph', content: 'Courses', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n5', type: 'heading', content: '1', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l5', type: 'paragraph', content: 'Forever', align: 'center', variant: 'light' },
          ],
        ],
      },
    ],
  },
  {
    id: 'stat-accent',
    label: 'Accent Stats',
    description: 'Stats with a warm accent background',
    category: 'stats',
    thumbnail: 'stat-accent',
    backgroundColor: '#fff7ed',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Our Story in Numbers', align: 'center', size: 'lg' },
      { id: 'p0', type: 'paragraph', content: 'Eight years. Two continents. One wedding.', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '8', align: 'center', size: 'xl' },
            { id: 'l1', type: 'subheading', content: 'Years Together', align: 'center' },
          ],
          [
            { id: 'n2', type: 'heading', content: '2', align: 'center', size: 'xl' },
            { id: 'l2', type: 'subheading', content: 'Continents Visited', align: 'center' },
          ],
          [
            { id: 'n3', type: 'heading', content: '150+', align: 'center', size: 'xl' },
            { id: 'l3', type: 'subheading', content: 'Guests Joining Us', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'stat-minimal',
    label: 'Minimal Stats',
    description: 'Clean borderless numbers, no extra decoration',
    category: 'stats',
    thumbnail: 'stat-minimal',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '06.14', align: 'center', size: 'xl' },
            { id: 'l1', type: 'paragraph', content: 'Wedding date', align: 'center' },
          ],
          [
            { id: 'n2', type: 'heading', content: '4 PM', align: 'center', size: 'xl' },
            { id: 'l2', type: 'paragraph', content: 'Ceremony begins', align: 'center' },
          ],
          [
            { id: 'n3', type: 'heading', content: '150', align: 'center', size: 'xl' },
            { id: 'l3', type: 'paragraph', content: 'Guests invited', align: 'center' },
          ],
          [
            { id: 'n4', type: 'heading', content: '5', align: 'center', size: 'xl' },
            { id: 'l4', type: 'paragraph', content: 'Course dinner', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'stat-bordered',
    label: 'Bordered Stats',
    description: 'Stats in framed card boxes',
    category: 'stats',
    thumbnail: 'stat-bordered',
    backgroundColor: '#f8fafc',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'The Big Day by the Numbers', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '180', align: 'center', size: 'xl' },
            { id: 'l1', type: 'subheading', content: 'Guests', align: 'center' },
            { id: 'p1', type: 'paragraph', content: 'Family and friends from across the world', align: 'center' },
          ],
          [
            { id: 'n2', type: 'heading', content: '7', align: 'center', size: 'xl' },
            { id: 'l2', type: 'subheading', content: 'Hours of Celebration', align: 'center' },
            { id: 'p2', type: 'paragraph', content: 'Ceremony, dinner, dancing and more', align: 'center' },
          ],
          [
            { id: 'n3', type: 'heading', content: '3', align: 'center', size: 'xl' },
            { id: 'l3', type: 'subheading', content: 'Live Musicians', align: 'center' },
            { id: 'p3', type: 'paragraph', content: 'String quartet, jazz trio, DJ', align: 'center' },
          ],
        ],
      },
    ],
  },

  /* ════════════ NUMBERS ════════════ */
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
        id: 'row1', type: 'columns',
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
        id: 'row2', type: 'columns',
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
        id: 'cols1', type: 'columns',
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
  {
    id: 'numbers-dark-grid',
    label: 'Dark Numbers Grid',
    description: '4-up grid of milestones on dark background',
    category: 'numbers',
    thumbnail: 'numbers-dark-grid',
    backgroundColor: '#0f172a',
    paddingSize: 'lg',
    blocks: [
      { id: 'p0', type: 'paragraph', content: 'Built on eight remarkable years', align: 'center', variant: 'light' },
      { id: 'h1', type: 'heading', content: 'Our Numbers', align: 'center', size: 'xl', variant: 'light' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '8', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l1', type: 'subheading', content: 'Years Together', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n2', type: 'heading', content: '23', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l2', type: 'subheading', content: 'Countries', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n3', type: 'heading', content: '150', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l3', type: 'subheading', content: 'Guests', align: 'center', variant: 'light' },
          ],
          [
            { id: 'n4', type: 'heading', content: '∞', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l4', type: 'subheading', content: 'Years Ahead', align: 'center', variant: 'light' },
          ],
        ],
      },
    ],
  },
  {
    id: 'single-hero-number',
    label: 'Hero Number',
    description: 'One giant number as a centerpiece',
    category: 'numbers',
    thumbnail: 'single-hero-number',
    backgroundColor: '#fdf8f6',
    paddingSize: 'lg',
    blocks: [
      { id: 'p0', type: 'paragraph', content: 'We have been together for', align: 'center' },
      { id: 'h1', type: 'heading', content: '2,847', align: 'center', size: 'xl' },
      { id: 'p1', type: 'paragraph', content: 'days — and counting.', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'd1', type: 'divider', align: 'center' },
      { id: 'p2', type: 'paragraph', content: 'On June 14th, we stop counting and start forever.', align: 'center' },
    ],
  },
  {
    id: 'number-split-dark',
    label: 'Split Number Dark',
    description: 'Huge number left, description right, dark bg',
    category: 'numbers',
    thumbnail: 'number-split-dark',
    backgroundColor: '#1c1917',
    paddingSize: 'lg',
    blocks: [
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '150', align: 'center', size: 'xl', variant: 'light' },
            { id: 'l1', type: 'subheading', content: 'Guests', align: 'center', variant: 'light' },
          ],
          [
            { id: 'sh1', type: 'subheading', content: 'Friends & Family', align: 'left', variant: 'light' },
            { id: 'p1', type: 'paragraph', content: 'We are bringing together 150 of the most important people in our lives for one unforgettable celebration.', align: 'left', variant: 'light' },
            { id: 'btn1', type: 'button', buttonLabel: 'RSVP Now', buttonUrl: '#rsvp', align: 'left', variant: 'outline-light' },
          ],
        ],
      },
    ],
  },
  {
    id: 'numbered-steps',
    label: 'Numbered Steps',
    description: 'Step-by-step numbered list',
    category: 'numbers',
    thumbnail: 'numbered-steps',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'How the Day Unfolds', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'n1', type: 'heading', content: '01', align: 'left', size: 'xl' },
            { id: 'l1', type: 'subheading', content: 'Ceremony — 4:00 PM', align: 'left' },
            { id: 'p1', type: 'paragraph', content: 'Gather in the garden for the exchange of vows.', align: 'left' },
          ],
          [
            { id: 'n2', type: 'heading', content: '02', align: 'left', size: 'xl' },
            { id: 'l2', type: 'subheading', content: 'Cocktail Hour — 5:00 PM', align: 'left' },
            { id: 'p2', type: 'paragraph', content: 'Drinks and canapés in the courtyard.', align: 'left' },
          ],
        ],
      },
      { id: 'sp2', type: 'spacer', size: 'sm' },
      {
        id: 'cols2', type: 'columns',
        columns: [
          [
            { id: 'n3', type: 'heading', content: '03', align: 'left', size: 'xl' },
            { id: 'l3', type: 'subheading', content: 'Dinner — 6:30 PM', align: 'left' },
            { id: 'p3', type: 'paragraph', content: 'Five-course seated dinner in the grand hall.', align: 'left' },
          ],
          [
            { id: 'n4', type: 'heading', content: '04', align: 'left', size: 'xl' },
            { id: 'l4', type: 'subheading', content: 'Dancing — 9:00 PM', align: 'left' },
            { id: 'p4', type: 'paragraph', content: 'Live band followed by DJ until midnight.', align: 'left' },
          ],
        ],
      },
    ],
  },

  /* ════════════ ANNOUNCEMENTS ════════════ */
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
  {
    id: 'change-update',
    label: 'Change Update',
    description: 'Alert guests to a schedule change',
    category: 'announcement',
    thumbnail: 'change-update',
    backgroundColor: '#fffbeb',
    paddingSize: 'md',
    blocks: [
      { id: 'b1', type: 'badge', content: 'Update', align: 'center' },
      { id: 'h1', type: 'heading', content: 'Ceremony Location Change', align: 'center', size: 'lg' },
      { id: 'p1', type: 'paragraph', content: 'Due to forecasted rain, the ceremony will now be held indoors at The Grand Ballroom. All other details remain the same.', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'See New Directions', buttonUrl: '#', align: 'center' },
    ],
  },
  {
    id: 'welcome-note',
    label: 'Welcome Note',
    description: 'Warm greeting at the top of the page',
    category: 'announcement',
    thumbnail: 'welcome-note',
    backgroundColor: '#f5f0eb',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Welcome, Loved Ones', align: 'center', size: 'xl' },
      { id: 'd1', type: 'divider', align: 'center' },
      { id: 'p1', type: 'paragraph', content: 'We are so grateful you are here. This page has everything you need to know for our wedding — from the venue address to hotel recommendations to the RSVP form.', align: 'center', size: 'lg' },
      { id: 'p2', type: 'paragraph', content: 'We cannot wait to celebrate with you.', align: 'center' },
      { id: 'p3', type: 'paragraph', content: '— Sarah & James', align: 'center' },
    ],
  },
  {
    id: 'late-addition',
    label: 'New Addition',
    description: 'Announce a new baby, pet, or exciting news',
    category: 'announcement',
    thumbnail: 'late-addition',
    backgroundColor: '#fdf2f8',
    paddingSize: 'lg',
    blocks: [
      { id: 'b1', type: 'badge', content: 'Exciting News', align: 'center' },
      { id: 'h1', type: 'heading', content: 'We Have a New Addition!', align: 'center', size: 'xl' },
      { id: 'p1', type: 'paragraph', content: 'We are thrilled to share some wonderful news with all of our wedding guests.', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'Read Our News', buttonUrl: '#', align: 'center' },
    ],
  },

  /* ════════════ CONTENT ════════════ */
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
        id: 'cols1', type: 'columns',
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
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'img1', type: 'image', imageUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', imageAlt: 'Wedding photo', align: 'center' },
          ],
          [
            { id: 'ch1', type: 'subheading', content: 'A Special Note', align: 'left' },
            { id: 'cp1', type: 'paragraph', content: 'Share a personal message alongside your photo. Tell your guests something meaningful about this day.', align: 'left' },
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
    description: 'Three equal text columns',
    category: 'content',
    thumbnail: 'three-columns',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'What to Expect', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
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
  {
    id: 'text-right-image',
    label: 'Text + Image',
    description: 'Text on left, photo on right',
    category: 'content',
    thumbnail: 'text-right-image',
    backgroundColor: '#f8fafc',
    paddingSize: 'md',
    blocks: [
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'b1', type: 'badge', content: 'Our Story', align: 'left' },
            { id: 'ch1', type: 'heading', content: 'How We Met', align: 'left', size: 'xl' },
            { id: 'cp1', type: 'paragraph', content: 'It started with a chance encounter at a coffee shop in Brooklyn. Eight years, three apartments, and one proposal later — here we are.', align: 'left' },
            { id: 'sp1', type: 'spacer', size: 'sm' },
            { id: 'btn1', type: 'button', buttonLabel: 'Our Full Story', buttonUrl: '#', align: 'left' },
          ],
          [
            { id: 'img1', type: 'image', imageUrl: 'https://images.pexels.com/photos/3014853/pexels-photo-3014853.jpeg?auto=compress&cs=tinysrgb&w=800', imageAlt: 'Couple photo', align: 'center' },
          ],
        ],
      },
    ],
  },
  {
    id: 'centered-intro',
    label: 'Centered Intro',
    description: 'Centered headline with badge and paragraph',
    category: 'content',
    thumbnail: 'centered-intro',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      { id: 'b1', type: 'badge', content: 'Welcome', align: 'center' },
      { id: 'h1', type: 'heading', content: 'Sarah & James', align: 'center', size: 'xl' },
      { id: 'p1', type: 'paragraph', content: 'We are getting married on June 14, 2025 and we cannot imagine celebrating without you. Browse this page for everything you need to know.', align: 'center', size: 'lg' },
      { id: 'd1', type: 'divider', align: 'center' },
      { id: 'p2', type: 'paragraph', content: 'New York, NY · The Grand Pavilion', align: 'center' },
    ],
  },
  {
    id: 'story-timeline',
    label: 'Story Timeline',
    description: 'Vertical text-based story milestones',
    category: 'content',
    thumbnail: 'story-timeline',
    backgroundColor: '#fdf8f6',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Our Love Story', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'y1', type: 'subheading', content: '2017', align: 'left' },
            { id: 'p1', type: 'paragraph', content: 'We met at a mutual friend\'s rooftop party. James spilled his drink. Sarah laughed. The rest is history.', align: 'left' },
          ],
          [
            { id: 'y2', type: 'subheading', content: '2019', align: 'left' },
            { id: 'p2', type: 'paragraph', content: 'We moved into our first apartment together in Brooklyn — a tiny studio with a view of a brick wall.', align: 'left' },
          ],
        ],
      },
      { id: 'sp2', type: 'spacer', size: 'sm' },
      {
        id: 'cols2', type: 'columns',
        columns: [
          [
            { id: 'y3', type: 'subheading', content: '2023', align: 'left' },
            { id: 'p3', type: 'paragraph', content: 'James proposed on the Seine in Paris. Sarah said yes before he could finish the question.', align: 'left' },
          ],
          [
            { id: 'y4', type: 'subheading', content: '2025', align: 'left' },
            { id: 'p4', type: 'paragraph', content: 'Now we are ready to make it official. June 14th, we finally say "I do."', align: 'left' },
          ],
        ],
      },
    ],
  },
  {
    id: 'photo-caption',
    label: 'Photo + Caption',
    description: 'Large centered photo with caption text below',
    category: 'content',
    thumbnail: 'photo-caption',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      { id: 'img1', type: 'image', imageUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1200', imageAlt: 'Wedding couple', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'h1', type: 'heading', content: 'Engaged in Paris, 2023', align: 'center', size: 'lg' },
      { id: 'p1', type: 'paragraph', content: 'He got down on one knee on the Pont de l\'Archevêché. She said yes.', align: 'center' },
    ],
  },
  {
    id: 'alternating-cols',
    label: 'Alternating Content',
    description: 'Alternating text and visual blocks',
    category: 'content',
    thumbnail: 'alternating-cols',
    backgroundColor: '#ffffff',
    paddingSize: 'md',
    blocks: [
      { id: 'h1', type: 'heading', content: 'The Weekend', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'img1', type: 'image', imageUrl: 'https://images.pexels.com/photos/3014853/pexels-photo-3014853.jpeg?auto=compress&cs=tinysrgb&w=600', imageAlt: 'Friday event', align: 'center' },
          ],
          [
            { id: 'sh1', type: 'subheading', content: 'Friday — Welcome Dinner', align: 'left' },
            { id: 'p1', type: 'paragraph', content: 'Join us for a casual welcome dinner at The Garden Room. Drinks start at 7 PM, dinner at 8 PM. Dress: smart casual.', align: 'left' },
          ],
        ],
      },
      { id: 'sp2', type: 'spacer', size: 'sm' },
      {
        id: 'cols2', type: 'columns',
        columns: [
          [
            { id: 'sh2', type: 'subheading', content: 'Sunday — Farewell Brunch', align: 'left' },
            { id: 'p2', type: 'paragraph', content: 'We would love to see you one last time before everyone heads home. Brunch from 10 AM – 12 PM.', align: 'left' },
          ],
          [
            { id: 'img2', type: 'image', imageUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=600', imageAlt: 'Sunday brunch', align: 'center' },
          ],
        ],
      },
    ],
  },

  /* ════════════ CTA ════════════ */
  {
    id: 'centered-cta',
    label: 'Dark CTA',
    description: 'Centered headline and button on dark background',
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
    description: 'Clean light-background CTA with badge',
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
  {
    id: 'cta-warm',
    label: 'Warm CTA',
    description: 'Warm toned CTA with date and headline',
    category: 'cta',
    thumbnail: 'cta-warm',
    backgroundColor: '#fdf2e9',
    paddingSize: 'lg',
    blocks: [
      { id: 'p0', type: 'paragraph', content: 'SATURDAY · JUNE 14 · 2025', align: 'center' },
      { id: 'h1', type: 'heading', content: 'Will You Be There?', align: 'center', size: 'xl' },
      { id: 'p1', type: 'paragraph', content: 'Nothing would make our day more special than celebrating with you.', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'RSVP by May 1st', buttonUrl: '#rsvp', align: 'center' },
    ],
  },
  {
    id: 'cta-split',
    label: 'Split CTA',
    description: 'Heading left, button right',
    category: 'cta',
    thumbnail: 'cta-split',
    backgroundColor: '#111827',
    paddingSize: 'md',
    blocks: [
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'h1', type: 'heading', content: 'Ready to RSVP?', align: 'left', size: 'xl', variant: 'light' },
            { id: 'p1', type: 'paragraph', content: 'Let us know if you will be joining us by May 1st.', align: 'left', variant: 'light' },
          ],
          [
            { id: 'btn1', type: 'button', buttonLabel: 'RSVP Now', buttonUrl: '#rsvp', align: 'center', variant: 'outline-light' },
          ],
        ],
      },
    ],
  },
  {
    id: 'cta-minimal',
    label: 'Minimal CTA',
    description: 'Simple white CTA, no frills',
    category: 'cta',
    thumbnail: 'cta-minimal',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'See You There', align: 'center', size: 'xl' },
      { id: 'd1', type: 'divider', align: 'center' },
      { id: 'p1', type: 'paragraph', content: 'June 14, 2025 · The Grand Pavilion, New York', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      { id: 'btn1', type: 'button', buttonLabel: 'RSVP', buttonUrl: '#rsvp', align: 'center' },
    ],
  },

  /* ════════════ DETAILS ════════════ */
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
        id: 'cols1', type: 'columns',
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
        id: 'cols1', type: 'columns',
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
        id: 'cols2', type: 'columns',
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
  {
    id: 'faq-simple',
    label: 'Simple FAQ',
    description: 'Two-column Q&A blocks',
    category: 'details',
    thumbnail: 'faq-simple',
    backgroundColor: '#f9fafb',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Frequently Asked Questions', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'q1', type: 'subheading', content: 'Is there parking?', align: 'left' },
            { id: 'a1', type: 'paragraph', content: 'Yes — complimentary valet is available at the main entrance.', align: 'left' },
            { id: 'sp1', type: 'spacer', size: 'sm' },
            { id: 'q2', type: 'subheading', content: 'Can I bring a plus-one?', align: 'left' },
            { id: 'a2', type: 'paragraph', content: 'Please check your invitation. Plus-ones are listed by name on the RSVP form.', align: 'left' },
          ],
          [
            { id: 'q3', type: 'subheading', content: 'What is the dress code?', align: 'left' },
            { id: 'a3', type: 'paragraph', content: 'Cocktail attire. Think elegant but comfortable. No white or ivory, please.', align: 'left' },
            { id: 'sp2', type: 'spacer', size: 'sm' },
            { id: 'q4', type: 'subheading', content: 'Are children welcome?', align: 'left' },
            { id: 'a4', type: 'paragraph', content: 'We love your little ones! However, the ceremony and dinner are adults-only. A childcare service is available at the hotel.', align: 'left' },
          ],
        ],
      },
    ],
  },
  {
    id: 'two-col-details',
    label: 'Two-Column Details',
    description: 'Ceremony and reception details side by side',
    category: 'details',
    thumbnail: 'two-col-details',
    backgroundColor: '#ffffff',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'The Celebration', align: 'center', size: 'lg' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'sh1', type: 'subheading', content: 'Ceremony', align: 'left' },
            { id: 'p1', type: 'paragraph', content: 'Saturday, June 14, 2025\n4:00 PM', align: 'left' },
            { id: 'p2', type: 'paragraph', content: 'The Rose Garden\n123 Elm Street, New York', align: 'left' },
            { id: 'btn1', type: 'button', buttonLabel: 'Get Directions', buttonUrl: '#', align: 'left' },
          ],
          [
            { id: 'sh2', type: 'subheading', content: 'Reception', align: 'left' },
            { id: 'p3', type: 'paragraph', content: 'Saturday, June 14, 2025\n6:00 PM – Midnight', align: 'left' },
            { id: 'p4', type: 'paragraph', content: 'The Grand Ballroom\n456 Park Avenue, New York', align: 'left' },
            { id: 'btn2', type: 'button', buttonLabel: 'Get Directions', buttonUrl: '#', align: 'left' },
          ],
        ],
      },
    ],
  },
  {
    id: 'contact-block',
    label: 'Contact Block',
    description: 'Who to contact for questions',
    category: 'details',
    thumbnail: 'contact-block',
    backgroundColor: '#fdf8f6',
    paddingSize: 'lg',
    blocks: [
      { id: 'h1', type: 'heading', content: 'Questions?', align: 'center', size: 'lg' },
      { id: 'p0', type: 'paragraph', content: 'We are happy to help. Reach out to our wedding coordinator for any logistics questions.', align: 'center' },
      { id: 'sp1', type: 'spacer', size: 'sm' },
      {
        id: 'cols1', type: 'columns',
        columns: [
          [
            { id: 'sh1', type: 'subheading', content: 'Wedding Coordinator', align: 'center' },
            { id: 'p1', type: 'paragraph', content: 'Emily Chen\nemily@grandpavilion.com\n(212) 555-0143', align: 'center' },
          ],
          [
            { id: 'sh2', type: 'subheading', content: 'For the Couple', align: 'center' },
            { id: 'p2', type: 'paragraph', content: 'hello@sarahandjames.com\nOr DM us on Instagram @sarahandjames2025', align: 'center' },
          ],
        ],
      },
    ],
  },
];

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
  category: 'announcement' | 'content' | 'cta' | 'details' | 'blank';
  thumbnail: string;
  blocks: CustomBlock[];
  backgroundColor: string;
  paddingSize: 'sm' | 'md' | 'lg';
}

export const CUSTOM_SKELETONS: CustomSectionSkeleton[] = [
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
];

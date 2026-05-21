import {
  Archive,
  Armchair,
  Bell,
  CalendarDays,
  Camera,
  ClipboardList,
  Download,
  Gift,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  Music,
  Palette,
  QrCode,
  Radio,
  ScrollText,
  Settings,
  Shield,
  UserPlus,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';

export type DashboardToolId =
  | 'overview'
  | 'builder'
  | 'guests'
  | 'itinerary'
  | 'registry'
  | 'messages'
  | 'photos'
  | 'tools'
  | 'wedding-day'
  | 'planning'
  | 'seating'
  | 'vendors'
  | 'collaborators'
  | 'guest-details'
  | 'import-export'
  | 'name-change'
  | 'seating-lookup'
  | 'coordinator'
  | 'qr-codes'
  | 'address-collection'
  | 'song-requests'
  | 'travel-stay'
  | 'guest-questions'
  | 'guestbook-prompts'
  | 'vaults'
  | 'photo-recap'
  | 'video-uploads'
  | 'anniversary-capsules'
  | 'thank-you-notes'
  | 'activity'
  | 'settings'
  | 'privacy-access'
  | 'advanced-design'
  | 'data-settings'
  | 'audit-logs'
  | 'error-logs';

export type DashboardTool = {
  id: DashboardToolId;
  name: string;
  description: string;
  path: string;
  actionLabel: string;
  icon: LucideIcon;
  primaryHome: string;
  canPinToNav?: boolean;
  canPinToHome?: boolean;
  adminOnly?: boolean;
};

export type DashboardToolGroup = {
  title: string;
  description: string;
  tools: DashboardTool[];
};

export const DASHBOARD_NAV_PIN_STORAGE_KEY = 'dayof.dashboard.navPins.v1';
export const DASHBOARD_HOME_PIN_STORAGE_KEY = 'dayof.dashboard.homePins.v1';

export function buildDashboardToolPinsStorageKey(key: string, storageScope?: string | null): string {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${key}::${scope}` : key;
}

export const DEFAULT_DASHBOARD_TOOLS: DashboardTool[] = [
  { id: 'overview', name: 'Home', description: 'Everything guests need, in one calm place.', path: '/dashboard/overview', actionLabel: 'Open Home', icon: Globe, primaryHome: 'Home' },
  { id: 'builder', name: 'Website', description: 'Manage what guests see.', path: '/dashboard/builder', actionLabel: 'Open Website', icon: Palette, primaryHome: 'Website' },
  { id: 'guests', name: 'Guests', description: 'People, replies, and details.', path: '/dashboard/guests', actionLabel: 'Open Guests', icon: Users, primaryHome: 'Guests' },
  { id: 'itinerary', name: 'Schedule', description: 'A weekend guests can follow easily.', path: '/dashboard/itinerary', actionLabel: 'Open Schedule', icon: CalendarDays, primaryHome: 'Schedule' },
  { id: 'registry', name: 'Registry', description: 'Gifts and funds, clearly shared.', path: '/dashboard/registry', actionLabel: 'Open Registry', icon: Gift, primaryHome: 'Registry' },
  { id: 'messages', name: 'Messages', description: 'Updates guests can actually use.', path: '/dashboard/messages', actionLabel: 'Open Messages', icon: Mail, primaryHome: 'Messages' },
  { id: 'photos', name: 'Memories', description: 'Photos, notes, and moments from the celebration.', path: '/dashboard/photos', actionLabel: 'Open Memories', icon: Archive, primaryHome: 'Memories' },
  { id: 'planning', name: 'Planning', description: 'Tasks, budget, vendors, songs, and wedding planning essentials.', path: '/dashboard/planning', actionLabel: 'Open planning', icon: ClipboardList, primaryHome: 'Planning' },
  { id: 'settings', name: 'Settings', description: 'Team access, privacy, billing, and account controls.', path: '/dashboard/settings', actionLabel: 'Open settings', icon: Settings, primaryHome: 'Settings' },
];

export const DASHBOARD_TOOL_GROUPS: DashboardToolGroup[] = [
  {
    title: 'Planning',
    description: 'Notes, vendors, collaborators, files, and post-wedding details when you want them close.',
    tools: [
      { id: 'planning', name: 'Planning', description: 'Plans, notes, budget, payments, songs, addresses, and finishing touches.', path: '/dashboard/planning', actionLabel: 'Open planning', icon: ClipboardList, primaryHome: 'More Tools', canPinToNav: true, canPinToHome: true },
      { id: 'vendors', name: 'Vendors', description: 'Find vendors worth saving, keep notes, and track who you are considering.', path: '/dashboard/planning?tab=vendors', actionLabel: 'Find vendors', icon: UserPlus, primaryHome: 'More Tools', canPinToNav: true, canPinToHome: true },
      { id: 'collaborators', name: 'Collaborators', description: 'Invite planners, coordinators, or family with the right level of access.', path: '/dashboard/settings?tab=team', actionLabel: 'Invite collaborator', icon: Users, primaryHome: 'Settings', canPinToHome: true },
      { id: 'import-export', name: 'Import / Export', description: 'Bring in guest lists and export details for vendors or planning handoffs.', path: '/dashboard/guests?tool=import-export', actionLabel: 'Import or export', icon: Download, primaryHome: 'Guests', canPinToHome: true },
      { id: 'name-change', name: 'Name Change', description: 'Name change, organized when you need it after the wedding.', path: '/dashboard/planning?tab=nameChange', actionLabel: 'Open name change', icon: ScrollText, primaryHome: 'More Tools', canPinToNav: true, canPinToHome: true },
    ],
  },
  {
    title: 'Wedding Day',
    description: 'Schedule, seating, QR codes, and helper views for the day itself.',
    tools: [
      { id: 'wedding-day', name: 'Wedding Day', description: 'Everything your helpers need on the wedding day.', path: '/dashboard/coordinator', actionLabel: 'Open Wedding Day', icon: Radio, primaryHome: 'More Tools', canPinToNav: true, canPinToHome: true },
      { id: 'seating', name: 'Seating', description: 'Tables, assignments, and lookup.', path: '/dashboard/seating', actionLabel: 'Open seating', icon: Armchair, primaryHome: 'More Tools', canPinToNav: true, canPinToHome: true },
      { id: 'seating-lookup', name: 'Seating Lookup', description: 'A fast guest lookup for helpers and hosts.', path: '/dashboard/seating-lookup', actionLabel: 'Open lookup', icon: HelpCircle, primaryHome: 'Seating', canPinToHome: true },
      { id: 'coordinator', name: 'Coordinator View', description: 'A focused helper view for check-in, timeline, QR codes, and last-minute details.', path: '/dashboard/coordinator', actionLabel: 'Open coordinator view', icon: Radio, primaryHome: 'Wedding Day', canPinToHome: true },
      { id: 'qr-codes', name: 'QR Codes', description: 'Create links for the website, photo uploads, guest updates, and wedding-day signs.', path: '/dashboard/builder?tool=qr-codes', actionLabel: 'Create QR code', icon: QrCode, primaryHome: 'Website', canPinToHome: true },
    ],
  },
  {
    title: 'Guest Experience',
    description: 'Private links, questions, song ideas, and guestbook prompts for smoother guest moments.',
    tools: [
      { id: 'address-collection', name: 'Address Collection', description: 'Collect mailing addresses and contact details with private guest links.', path: '/dashboard/guests?tool=address-collection', actionLabel: 'Collect addresses', icon: Mail, primaryHome: 'Guests', canPinToHome: true },
      { id: 'guest-details', name: 'Guest Details', description: 'Open the guest workspace in list mode for names, contact details, notes, and household fixes.', path: '/dashboard/guests?tool=guest-details', actionLabel: 'Review guest details', icon: Users, primaryHome: 'Guests', canPinToHome: true },
      { id: 'thank-you-notes', name: 'Thank-you Notes', description: 'See who still needs a thank-you and keep post-wedding follow-through in one place.', path: '/dashboard/guests?tool=thank-you-notes', actionLabel: 'Review thank-yous', icon: Bell, primaryHome: 'Guests', canPinToHome: true },
      { id: 'song-requests', name: 'Song Requests', description: 'Collect music ideas from guests and keep the list near planning.', path: '/dashboard/planning?tab=songs', actionLabel: 'Open song requests', icon: Music, primaryHome: 'More Tools', canPinToHome: true },
      { id: 'travel-stay', name: 'Travel & Stay', description: 'Edit hotel notes, travel details, and guest logistics right where the website pulls them from.', path: '/dashboard/builder?tool=travel', actionLabel: 'Edit travel details', icon: Globe, primaryHome: 'Website', canPinToHome: true },
      { id: 'guest-questions', name: 'Guest Questions', description: 'Reusable RSVP and guest-detail prompts for the information you need.', path: '/dashboard/guests?tab=rsvp-settings', actionLabel: 'Review questions', icon: HelpCircle, primaryHome: 'Guests', canPinToHome: true },
      { id: 'guestbook-prompts', name: 'Guestbook Prompts', description: 'Invite notes, memories, and wishes into the guestbook experience.', path: '/dashboard/photos?tool=guestbook', actionLabel: 'Open guestbook', icon: Bell, primaryHome: 'Memories', canPinToHome: true },
    ],
  },
  {
    title: 'Memories',
    description: 'Photos, videos, recaps, vaults, and keepsakes worth returning to later.',
    tools: [
      { id: 'vaults', name: 'Vaults', description: 'Private folders for photos, keepsakes, documents, and anniversary notes.', path: '/dashboard/vault', actionLabel: 'Manage vaults', icon: Archive, primaryHome: 'Memories', canPinToHome: true },
      { id: 'photo-recap', name: 'Photo Recap', description: 'Turn guest uploads and favorite photos into a recap people can revisit.', path: '/dashboard/photos?tool=recap', actionLabel: 'Create recap', icon: Camera, primaryHome: 'Memories', canPinToHome: true },
      { id: 'video-uploads', name: 'Video Uploads', description: 'Collect short clips from guests when photos are not enough.', path: '/dashboard/photos?tool=video', actionLabel: 'Review videos', icon: Video, primaryHome: 'Memories', canPinToHome: true },
      { id: 'anniversary-capsules', name: 'Anniversary Capsules', description: 'Save messages, memories, and keepsakes for later moments.', path: '/dashboard/vault?tool=anniversary-capsules', actionLabel: 'Open capsules', icon: Gift, primaryHome: 'Memories', canPinToHome: true },
    ],
  },
  {
    title: 'Advanced',
    description: 'Privacy, access, design, data, and account controls kept neatly out of the way.',
    tools: [
      { id: 'activity', name: 'Activity', description: 'Recent changes across guests, messages, photos, registry, and your site.', path: '/dashboard/audit-logs', actionLabel: 'View activity', icon: ScrollText, primaryHome: 'More Tools', canPinToNav: true, canPinToHome: true },
      { id: 'settings', name: 'Settings', description: 'Access, privacy, billing, notifications, and account details.', path: '/dashboard/settings', actionLabel: 'Open settings', icon: Settings, primaryHome: 'More Tools', canPinToNav: true, canPinToHome: true },
      { id: 'privacy-access', name: 'Privacy & Access', description: 'Control who can see the site, search visibility, and collaborator access.', path: '/dashboard/settings?tab=privacy', actionLabel: 'Manage privacy', icon: Lock, primaryHome: 'Settings', canPinToHome: true },
      { id: 'advanced-design', name: 'Advanced Design', description: 'Fine tune sections, layouts, and visual details after the basics are ready.', path: '/dashboard/builder?panel=design', actionLabel: 'Open design controls', icon: Palette, primaryHome: 'Website', canPinToHome: true },
      { id: 'data-settings', name: 'Data Settings', description: 'Export data, archive the site, or manage stored wedding information.', path: '/dashboard/settings?tab=data', actionLabel: 'Open data settings', icon: Shield, primaryHome: 'Settings', canPinToHome: true },
      { id: 'audit-logs', name: 'Audit Logs', description: 'Admin record of important changes across the wedding workspace.', path: '/dashboard/audit-logs', actionLabel: 'Open audit logs', icon: ScrollText, primaryHome: 'Activity', adminOnly: true },
      { id: 'error-logs', name: 'Error Logs', description: 'Admin-only reliability logs for support and investigation.', path: '/admin/errors', actionLabel: 'Open error logs', icon: Shield, primaryHome: 'Advanced', adminOnly: true },
    ],
  },
];

export const PINNABLE_NAV_TOOL_IDS: DashboardToolId[] = ['wedding-day', 'planning', 'seating', 'vendors', 'name-change', 'activity', 'settings'];

export function getAllDashboardTools() {
  return [...DEFAULT_DASHBOARD_TOOLS, ...DASHBOARD_TOOL_GROUPS.flatMap((group) => group.tools)];
}

export function readStoredToolPins(key: string, storageScope?: string | null): DashboardToolId[] {
  if (typeof window === 'undefined') return [];
  try {
    const storageKey = buildDashboardToolPinsStorageKey(key, storageScope);
    const scopedRaw = window.localStorage.getItem(storageKey);
    const legacyRaw = storageKey !== key ? window.localStorage.getItem(key) : null;
    const raw = scopedRaw ?? legacyRaw ?? '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.filter((id): id is DashboardToolId => typeof id === 'string' && getAllDashboardTools().some((tool) => tool.id === id));
    if (storageKey !== key && normalized.length > 0 && !scopedRaw) {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set(normalized))));
      if (legacyRaw) window.localStorage.removeItem(key);
    }
    return normalized;
  } catch {
    return [];
  }
}

export function writeStoredToolPins(key: string, ids: DashboardToolId[], storageScope?: string | null) {
  if (typeof window === 'undefined') return;
  const storageKey = buildDashboardToolPinsStorageKey(key, storageScope);
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new CustomEvent('dayof:dashboard-tool-pins-changed'));
}

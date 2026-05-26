# Dayof - Wedding Planning Platform Features

A comprehensive wedding planning and management platform that helps couples organize their special day and preserve memories for years to come.

## Current AI Scope

DayOf includes a few proven AI-assisted lanes, but it should not be described as a universal AI wedding planner.

Current launch-safe AI scope:
- Quick Start orchestration to help couples move from intake to a reviewable draft
- Photo vision analysis on the server side for supported photo workflows
- Owner-triggered public-site translation generation

Helpful but not model-backed in the current launch scope:
- deterministic generated wedding-site copy and draft shaping
- deterministic planner suggestions
- deterministic photo organizer planning

Do not describe registry imports, guest messaging, or broad planning workflows as fully automated AI features unless a separately proven server route exists for that lane.

## Core Features

### 🎨 Website Builder
- Custom wedding website creation
- Personalized DayOf URL on `dayof.love`
- Drag-and-drop interface
- Multiple design templates
- Mobile-responsive designs
- Easy customization options

Current URL truth:
- Couples get a personalized DayOf URL or slug
- `*.dayof.love` routing is the supported branded host surface
- Connecting an external domain the couple already owns is not part of the current product scope

### 📧 Guest Management & RSVP
- Complete guest list management
- Digital RSVP tracking
- Meal preference collection
- Plus-one management
- Guest contact information storage
- RSVP reminder system

### 🔒 Anniversary Vaults (Time Capsule)
**Unique Feature**: Collect heartfelt messages and videos from wedding guests to be unlocked on future anniversaries.

- **1st Anniversary Vault**: Messages and videos unlocked after 1 year
- **5th Anniversary Vault**: Messages and videos unlocked after 5 years
- **10th Anniversary Vault**: Messages and videos unlocked after 10 years

Features:
- QR code sharing for easy guest contributions
- Email invitations to collect messages
- Support for text messages and video recordings
- No app or account required for guests
- Locked content with countdown timers
- Automatic unlock on anniversary dates
- Statistics tracking (messages, videos, contributors)
- Current launch-safe proof is strongest for public vault contribution and owner vault management; Google Drive-backed provider paths should be described as optional until deeper live provider proof exists

### 🎁 Gift Registry
- Multi-store registry management
- Add items from any retailer
- Track purchased vs. available items
- Gift images and descriptions
- Direct links to purchase
- Purchase status tracking
- Guest purchase notifications

### 📸 Media Vault
- Centralized photo and video storage
- Guest photo uploads via QR code
- Pass-the-camera mode for instant sharing
- No app required for guests
- Organized by contributor and date
- Download all media functionality
- Grid and list view options

### ✨ AI-Assisted Setup And Translation
- Quick Start can help shape a reviewable first draft
- Server-backed photo vision supports the audited photo-analysis lane
- Owners can generate supported public-site translations
- AI-backed lanes stay reviewable; couples can edit details before publishing or sharing
- Deterministic helpers stay clearly separated from model-backed server features
- Current launch-safe language support is guest-facing and public-site focused, not full dashboard internationalization

### 💬 Messaging System
- Direct communication with guests
- Group messaging capabilities
- Event updates and announcements
- Automated reminders

### ✈️ Travel & Accommodations
- Hotel block information
- Travel recommendations
- Transportation details
- Local area guides
- Directions and maps

### 🪑 Seating Management
- Interactive seating chart
- Table assignments
- Guest placement tools
- Dietary restriction tracking
- Print-ready seating cards

### ⚙️ Settings & Preferences
- Event details management
- Date and venue information
- Privacy controls
- Notification preferences
- Account settings

## Technical Features

### 🔐 Authentication & Security
- Secure email/password authentication
- Protected routes and data
- Row Level Security (RLS) policies
- Session management
- Secure guest access

### 📱 User Experience
- Fully responsive design
- Mobile-first approach
- Intuitive navigation
- Real-time updates
- Toast notifications
- Loading states

### 🎯 Design System
- Consistent color palette
- Custom design tokens
- Accessible components
- Beautiful gradients
- Professional typography
- Hover states and transitions

## Coming Soon

- [ ] Calendar integration
- [ ] Budget tracking
- [ ] Vendor management
- [ ] Guest check-in system
- [ ] Social media integration
- [ ] Photo contest/voting
- [ ] Wedding day timeline
- [ ] Thank you card tracker

## Technology Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Build Tool**: Vite

## Getting Started

1. Sign up for an account
2. Complete the onboarding process
3. Set your wedding date and details
4. Start building your wedding website
5. Invite guests to contribute to anniversary vaults
6. Manage RSVPs and guest information
7. Add items to your registry
8. Enjoy your special day!

---

**Note**: This is an active development project. Features and functionality are continuously being improved and expanded.

For exact current launch-proof status, use [BACKLOG.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/BACKLOG.md), [docs/PRODUCTION_HARDENING_REPORT.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/PRODUCTION_HARDENING_REPORT.md), and [docs/v1-smoke-proof-log.md](/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/docs/v1-smoke-proof-log.md).

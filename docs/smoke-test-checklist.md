# Smoke Test Checklist

Manual QA matrix to run after every production deployment.

## Auth

- [ ] Sign up with a new email — redirects to onboarding
- [ ] Log out and log back in — lands on dashboard
- [ ] Protected route (`/dashboard`) redirects unauthenticated users to `/login`

## Onboarding

- [ ] Complete quick-start flow — wedding site is created
- [ ] Wedding date, names, and location are saved and visible in settings

## Builder (Site Editor)

- [ ] Open builder at `/builder`
- [ ] Drag a section from the library onto the canvas
- [ ] Edit section settings in the inspector panel
- [ ] Change template/theme
- [ ] Publish site — site is accessible at `/site/<slug>`
- [ ] Undo/redo works correctly

## Public Site View (`/site/<slug>`)

- [ ] Hero section displays couple names and date
- [ ] Schedule section shows event timeline
- [ ] Registry section loads items from the database
- [ ] RSVP section accepts and records a response

## Registry

- [ ] Dashboard: add a new item via URL import — details auto-fill
- [ ] Dashboard: add a new item manually (fetch fails) — still saves
- [ ] Dashboard: edit an existing item
- [ ] Dashboard: delete an item with confirmation
- [ ] Public site: "I'll buy this" button opens purchase modal
- [ ] Public site: confirming purchase updates status (Available → Partial or Purchased)
- [ ] Public site: purchased items with `hide_when_purchased=true` disappear after purchase

## Guests

- [ ] Add a guest manually
- [ ] Import guests via CSV (if implemented)
- [ ] RSVP status updates correctly

## Messages

- [ ] Compose and save a draft message
- [ ] Schedule a message for a future date/time
- [ ] Send a message immediately (records in history)
- [ ] No-email-address warning appears when audience has no emails

## Dashboard Navigation

- [ ] All nav links work: Overview, Guests, Itinerary, Registry, Messages, Vault, Settings
- [ ] No dead-end buttons or broken routes

## Vault

- [ ] Page loads without errors
- [ ] "Coming Soon" badge is visible
- [ ] No interactive action buttons exist (page is informational only)
- [ ] Feature explanation cards render correctly

## Settings

- [ ] Wedding details save successfully
- [ ] Site slug updates and old URL redirects or 404s gracefully

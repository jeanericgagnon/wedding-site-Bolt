# Authenticated Capture Backlog

This started as the remaining capture checklist. A logged-in pass was completed on 2026-05-19 after the in-app browser connection became available.

The provided account credentials were not written to disk. Continue to avoid storing credentials in repo files, shell history, screenshots, or docs.

## Completed Logged-In Capture

- Wedding website dashboard.
- Editor split view.
- Desktop/mobile preview toggle.
- Edit website page list.
- Lower page list with hidden RSVP and Add Custom Page.
- Design settings and Multi-page / Single page layout controls.
- Authenticated theme browser.
- Reorder pages.
- Add custom page modal.
- Our Story content, add-block menu, and settings.
- Travel content and add-block menu.
- Privacy & URL settings.
- RSVP hidden page and RSVP event setup flow.

See `authenticated-screenshot-index.md`.

## Remaining Optional Capture

These are still useful but lower priority.

- Actual save path for a new custom page.
- Actual save path for a new page block.
- RSVP flow after turning RSVP on for an event.
- Guest-facing site after publishing, if the user explicitly wants to publish the burner site.
- Design switch confirmation behavior.
- Whether switching Multi-page to Single page persists immediately or requires save/confirmation.
- Whether hidden pages remain directly routable.

## Safe Capture Method

1. Use the existing browser session when possible.
2. If login is required again, avoid writing credentials into files or shell commands.
3. If CAPTCHA, email verification, or suspicious-login checks appear, hand off to the user.
4. Capture screenshots only after the session is logged in.
5. Do not save password prompts or account settings screens.

## Screens To Capture

Template browsing:

- Design catalog top
- Style filter open
- Color filter open
- Season filter open
- Search/sort controls if present
- Template detail view
- Template colorway switcher
- Desktop/mobile preview
- Matching invitation link behavior

Website creation:

- Step 1 couple info form
- Step 2 account/site creation, after any sensitive fields are complete
- Template selected confirmation
- Change design flow

Builder/editor:

- Page layout toggle: single page versus multi-page
- Page manager if present
- Add page
- Rename page
- Hide/show page in menu
- Reorder page/menu
- Add section
- Edit section
- Move section or convert section to page, if present
- Mobile preview
- Desktop preview

Pages:

- Home
- Our Story
- Photos
- Wedding Party
- Q + A
- Travel
- Things To Do
- Registry
- RSVP
- Custom page
- Event/schedule page
- Dress code page

Section/editor controls:

- Hero/banner image
- Story
- Schedule
- Multi-day schedule
- Travel/hotel block
- Things to do
- FAQ/Q + A
- Dress code
- Wedding party
- Gallery/photos
- Registry
- RSVP
- Menu
- Contact

Guest experience:

- Public single-page site
- Public multi-page site
- Mobile menu
- RSVP flow
- Registry link flow
- Q + A page
- Travel page
- Privacy/password behavior if exposed by test account

## Comparison Questions

- Are pages truly separate routes, or a visual menu over one page?
- Can the user convert a section into a page?
- Can the user create arbitrary custom pages?
- Can page nav contain section anchors?
- Can RSVP be a page and a section?
- Can event-specific RSVPs live on different pages?
- Are templates mostly visual skins, or do they change page composition?
- How much page/section editing is available after choosing a template?
- How many template filters are available after login?
- Does The Knot expose layout mode per template, or globally?

## DayOf Capture Goal

We do not need to reproduce The Knot. We need enough evidence to beat it:

- Template/page architecture
- Guest page vocabulary
- Editing affordances
- Mobile menu behavior
- RSVP/registry/travel depth
- Visual browsing expectations

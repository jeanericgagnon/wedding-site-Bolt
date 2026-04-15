# Feature ideas from Discord — 2026-04-15

Source: wedding-site-chat Discord thread with Peter Steinberger / Eric.
Purpose: capture raw product ideas before they get lost. These are idea notes, not yet committed roadmap scope.

## 1) Engagement site + wedding site on the same URL

Idea:
- Support both an engagement site and a wedding site for the same couple/site.
- Keep the same public URL and QR code working the whole time.
- Swap the live experience underneath that URL instead of changing the destination.

Desired behavior:
- automatic switch on a configured date
- manual switch controlled by the couple/planner
- preserve the same slug / link / QR target

Why it matters:
- lets couples launch early with engagement content
- avoids broken or outdated QR codes
- creates a cleaner transition from announcement -> planning -> wedding

## 2) Multilingual support across both phases

Idea:
- Add multilingual support across both the engagement-site and wedding-site versions.
- Language options should carry through when the site switches.

Desired behavior:
- support multiple language versions of public content
- language selection persists across engagement -> wedding transition
- avoid treating multilingual as a fake checkbox; build it as real localized rendering when implemented

Notes:
- Current repo audits suggest multilingual support is partial, not end-to-end complete.

## 3) Build a Partiful-like communication layer into the product

Idea:
- Build the useful core of Partiful-like guest communication into DayOf.
- Not a generic events clone — a wedding-specific communications system.

Core capabilities to grow toward:
- contact import
- SMS invites and reminders
- RSVP flows
- plus-one / household logic
- guest messaging
- reminder automation
- event updates
- planner/coordinator-facing communication tools

Wedding-specific moat:
- cleaner RSVP logic
- multi-event wedding workflows
- family / household handling
- coordinator/admin tools
- polished guest experience tied directly to the wedding site

Repo reality check:
- The repo already has a strong base: guest system, RSVP system, Messages dashboard, Twilio SMS send path, Resend email path, SMS credits, and inbound SMS RSVP handling.
- This should be treated as an extension of existing foundations, not a greenfield messaging build.

## 4) Optional QR-scan contact capture

Idea:
- When someone scans a QR code, optionally prompt them to provide contact details before continuing into the site.

Possible fields:
- email
- phone number
- consent checkbox for SMS if phone is collected

Product behavior:
- should be optional / configurable by the couple
- likely best as a soft gate with skip allowed
- should not hurt conversion by being too aggressive

Why it matters:
- useful for engagement announcements
- useful for save-the-dates
- creates a clean path for RSVP follow-up later
- helps build a contactable audience tied to the couple/site

## 5) QR-based follow / subscribe flow for the couple

Idea:
- Turn the built-in QR flow into a lightweight follow/subscribe entry point.

Desired flow:
- guest scans QR
- lands on couple’s site
- optional prompt to follow / subscribe to updates
- enter email and/or phone
- opt into updates
- then continue into the site

Why it matters:
- turns QR from a dumb link into a relationship entry point
- useful for engagement -> wedding transition
- useful for schedule updates, RSVP nudges, reminders, and post-event follow-up

## 6) Optional opt-in updates using collected emails

Idea:
- Use collected emails as an optional opt-in channel for future updates.

Suggested guest-facing copy:
- "Get updates about photos and future events (optional)"

Possible use cases:
- photo gallery launch
- new album drops
- anniversary or reunion events
- future couple-hosted events
- post-wedding thank-you / memory-sharing follow-up

Important behavior:
- must be clearly optional
- should be separate from required RSVP/contact fields when appropriate
- should preserve consent truth cleanly
- should be easy for the couple to turn on or off

## 7) Product framing note

Strategic framing:
- This should evolve from a wedding website builder into:
  - site
  - guest system
  - communications system
  - response / RSVP engine

Short version:
- the strongest direction is not “pretty wedding websites only”
- it is “wedding website + guest operations + messaging orchestration”

## Suggested next step

Convert these ideas into a real product plan with:
- MVP vs later scope
- exact schema changes
- UI changes
- public-site behavior changes
- messaging cost assumptions
- what to explicitly defer so the product does not bloat

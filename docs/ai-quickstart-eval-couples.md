# AI Quick Start Eval Couples

Use this set to locally test:
- next-question choice
- follow-up quality
- stop conditions
- malformed follow-up blocking
- draft-ready detection

## 1. Eric + Kara — destination / strong baseline
- names: Eric & Kara
- label preference: Just our names
- when + where: January 17, 2027 — Sayulita, Mexico
- venue: Amor Boutique Hotel
- style: Tropical, relaxed
- weekend events: Friday welcome drinks, Saturday wedding, Sunday brunch
- ceremony arrival: 4:30 PM
- guest count: 100–150
- plus-ones: some
- RSVP deadline: 2026-12-01
- meal choices: yes
- registry: cash
- story: We met online and hit it off instantly.
- expected behavior:
  - should be draft-ready
  - should not ask dumb location follow-ups
  - should not ask “what city were you in when you first met in person?”
  - should hand off cleanly

## 2. Maya + Jules — city wedding / sparse story
- names: Maya & Jules
- label preference: Just our names
- when + where: September 20, 2026 — New York, New York
- venue: Wythe Hotel
- style: Editorial, modern
- weekend events: Ceremony and dinner Saturday night
- ceremony arrival: 5:00 PM
- guest count: 50–100
- plus-ones: none
- RSVP deadline: 2026-08-15
- meal choices: yes
- registry: gifts
- story: 
- expected behavior:
  - should maybe ask 1 smart story follow-up
  - should not ask venue city again
  - should not ask event-location questions unless there is actual event ambiguity

## 3. Leah + Sofia — venue TBD / logistics gaps
- names: Leah & Sofia
- label preference: Bride & Bride
- when + where: June 12, 2027 — Santa Barbara, California
- venue: TBD
- style: Garden party, romantic
- weekend events: Welcome drinks Friday, wedding Saturday
- ceremony arrival: 3:30 PM
- guest count: 150–250
- plus-ones: some
- RSVP deadline: 2027-04-30
- meal choices: yes
- registry: both
- story: We met in college and stayed friends for years before finally dating.
- expected behavior:
  - should ask a venue-specific follow-up only if useful
  - may ask for more precise event locations
  - should not be considered fully draft-ready without over-asking

## 4. Daniel + Chris — local wedding / no extras
- names: Daniel & Chris
- label preference: Groom & Groom
- when + where: October 8, 2026 — Austin, Texas
- venue: Springdale Station
- style: Simple, clean, modern
- weekend events: Wedding Saturday only
- ceremony arrival: 5:30 PM
- guest count: Under 50
- plus-ones: all
- RSVP deadline: 2026-09-01
- meal choices: no
- registry: none-for-now
- story: We met through mutual friends at a backyard dinner.
- expected behavior:
  - should be draft-ready quickly
  - should not force registry follow-ups
  - should not invent extra events

## 5. Priya + Noah — multi-event destination / fuller logistics
- names: Priya & Noah
- label preference: Bride & Groom
- when + where: February 14, 2027 — Jaipur, India
- venue: Samode Palace
- style: Colorful, elegant, celebratory
- weekend events: Friday welcome party, Saturday ceremony and reception, Sunday brunch
- ceremony arrival: 3:00 PM
- guest count: 250+
- plus-ones: all
- RSVP deadline: 2026-11-20
- meal choices: yes
- registry: cash
- story: We met at work, became best friends, then finally admitted this was bigger than friendship.
- expected behavior:
  - should be draft-ready
  - might ask one refinement question about travel or dress code
  - should not ask where the wedding is happening again

## 6. Ava + Ben — intentionally weak baseline
- names: Ava & Ben
- label preference: Just our names
- when + where: Spring 2027 — California
- venue: TBD
- style: Relaxed
- weekend events: Wedding and maybe brunch
- ceremony arrival: 
- guest count: 100–150
- plus-ones: some
- RSVP deadline: 
- meal choices: unsure / no answer
- registry: unsure
- story: 
- expected behavior:
  - should definitely ask follow-ups
  - follow-ups should be targeted and limited
  - should not jump to draft-ready too early
  - should not produce malformed prompts

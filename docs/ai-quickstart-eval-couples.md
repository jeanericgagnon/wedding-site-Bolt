# AI Quick Start Eval Couples

Use this set to locally test:
- next-question choice
- follow-up quality
- stop conditions
- malformed follow-up blocking
- draft-ready detection
- varying real-world completeness levels

The point is not just perfect inputs.
The point is pressure-testing the system with realistic levels of missing, vague, partial, and messy data.

## Completeness bands
- **Rich** = basically draft-ready from the initial intake
- **Medium** = enough to draft, but maybe 1–2 smart refinements
- **Sparse** = should trigger targeted follow-ups
- **Messy** = user gives vague or blended answers that the system should still handle cleanly

---

## 1. Eric + Kara — destination / medium-rich baseline
**Band:** Rich

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

**Expected behavior**
- should be draft-ready
- should not ask dumb location follow-ups
- should not ask “what city were you in when you first met in person?”
- should move forward cleanly

---

## 2. Maya + Jules — city wedding / medium completeness
**Band:** Medium

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

**Expected behavior**
- should maybe ask 1 smart story/refinement follow-up
- should not ask venue city again
- should not ask event-location questions unless there is actual ambiguity

---

## 3. Leah + Sofia — venue TBD / partial logistics
**Band:** Medium-sparse

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

**Expected behavior**
- should ask a venue-specific follow-up only if useful
- may ask for more precise event location detail
- should not over-ask once the draft is already viable

---

## 4. Daniel + Chris — local wedding / minimal extras
**Band:** Rich

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
- registry: no registry for now
- story: We met through mutual friends at a backyard dinner.

**Expected behavior**
- should be draft-ready quickly
- should not force registry follow-ups
- should not invent extra events

---

## 5. Priya + Noah — multi-event destination / fuller logistics
**Band:** Rich

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

**Expected behavior**
- should be draft-ready
- might ask one refinement question about travel or dress code
- should not ask where the wedding is happening again

---

## 6. Ava + Ben — intentionally weak baseline
**Band:** Sparse

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
- meal choices: 
- registry: unsure
- story: 

**Expected behavior**
- should definitely ask follow-ups
- follow-ups should be targeted and limited
- should not jump to draft-ready too early
- should not produce malformed prompts

---

## 7. Sam + Jordan — vague but usable
**Band:** Sparse-medium

- names: Sam & Jordan
- label preference: Just our names
- when + where: May 2027 — Nashville
- venue: downtown hotel
- style: fun but not too formal
- weekend events: welcome drinks and wedding
- ceremony arrival: 4ish
- guest count: around 120
- plus-ones: depends on guest
- RSVP deadline: sometime in March
- meal choices: yes
- registry: maybe
- story: We met through friends.

**Expected behavior**
- system should normalize vague answers where possible
- should ask a couple of high-value follow-ups
- should not panic and ask 8 questions at once

---

## 8. Camila + Mateo — strong couple/story, weak event structure
**Band:** Medium

- names: Camila & Mateo
- label preference: Bride & Groom
- when + where: November 6, 2026 — Mexico City
- venue: 
- style: warm, intimate, modern
- weekend events: We are doing something Friday and then the wedding Saturday
- ceremony arrival: 
- guest count: 50–100
- plus-ones: none
- RSVP deadline: 2026-09-15
- meal choices: no
- registry: cash
- story: We met in grad school and basically never stopped talking after the first night.

**Expected behavior**
- should ask smart event/location clarification questions
- should not ask story questions because story is already strong
- should prioritize useful operational gaps over fluff

---

## 9. Talia + Morgan — lots of skips, still viable
**Band:** Medium-sparse

- names: Talia & Morgan
- label preference: Just our names
- when + where: August 28, 2027 — Denver, Colorado
- venue: TBD
- style: clean, natural
- weekend events: Saturday wedding
- ceremony arrival: 5 PM
- guest count: 100–150
- plus-ones: some
- RSVP deadline: 
- meal choices: 
- registry: 
- story: 

**Expected behavior**
- should ask only the most important next questions
- should not force every optional field
- should keep momentum toward a usable draft

---

## 10. Olivia + Harper — messy/freeform user
**Band:** Messy

- names: Olivia + Harper
- label preference: Something else / unclear from typed answer
- when + where: We’re doing Labor Day weekend somewhere outside Portland, probably the vineyard if it works out
- venue: maybe Stoller, still deciding
- style: elevated but not stuffy
- weekend events: definitely welcome dinner, wedding Saturday, maybe something Sunday if people stay
- ceremony arrival: probably 4:00
- guest count: like 140?
- plus-ones: mostly yes but not for every person
- RSVP deadline: maybe early July
- meal choices: yes
- registry: not sure maybe honeymoon fund
- story: We met on Hinge, texted forever, then finally met for coffee and stayed until closing.

**Expected behavior**
- should handle blended uncertainty without generating garbage
- should ask clean clarifying questions
- should not produce malformed text like “Where is Where is asdf happening?”
- should preserve what is already usable instead of acting like everything is blank

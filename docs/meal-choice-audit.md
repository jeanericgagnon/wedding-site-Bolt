# Meal Choice Audit

Date: 2026-04-13

## Scope
Audit the current meal choice and dietary data flow across RSVP and guest operations.

## Current truth

### What exists
- RSVP data can carry `meal_choice`
- guest operations can surface meal choice when present
- missing-meal states are already used as an operational blocker in guest cleanup
- custom answers can also carry extra response detail beyond the core meal field

### What is still weak
- dietary handling is still fragmented between meal choice, custom answers, and general notes
- meal choice feels more like a field than a full workflow
- follow-up around missing or unclear meal information is still operationally shallow
- there is not yet a strong summary layer for dietary needs beyond ad hoc review

## Main call
Meal choice support exists and is useful, but it is not yet a deeply reliable meal/dietary workflow.

## Recommendation
Next work should focus on:
1. stronger dietary note capture
2. cleaner missing-meal follow-up handling
3. better summary surfaces for meal and dietary review

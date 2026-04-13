# Household + Plus-One Audit

Date: 2026-04-13

## Scope
Audit the current household and plus-one model across guest management and RSVP operations.

## Current truth

### Household model
Status: functional but blunt

Evidence:
- guests carry a `household_id`
- import flow can group guests into households from imported keys
- guest ops surfaces understand household linkage at a basic level

Weaknesses:
- household grouping is mostly structural, not behavior-rich
- there is not yet a strong household-first operational model in guest workflows
- import-stage household merges still need human review when source data is messy

### Plus-one model
Status: present but still shallow

Evidence:
- guests carry `plus_one_allowed`
- guests can store `plus_one_name`
- RSVP payloads can carry plus-one counts/names

Weaknesses:
- plus-one behavior is still closer to a field than a fully explicit rule system
- edge cases like guest swaps / unnamed plus-ones / household exceptions are not deeply modeled yet
- product truth around plus-one handling still leans on manual cleanup

## Overall call
- Household support exists, but it is not yet a deeply operational household system
- Plus-one support exists, but it is not yet a deeply reliable plus-one rules engine

## Recommendation
Next work should focus on:
1. stronger household grouping visibility
2. clearer plus-one eligibility/rule truth
3. better exception handling for household and plus-one edge cases

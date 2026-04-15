# AI secondary-section grounding

## Purpose
Ground the next AI coverage phase by identifying whether guest-helpful secondary sections already have a canonical intro-copy target.

## Registry
### Current state
- section exists in public/component path
- primarily item-driven / transactional
- current rendering is focused on registry items and contribution flow

### Grounded truth
- no clearly standardized intro/subtitle contract is currently enforced the same way hero/story/venue/schedule use `title` + `subtitle`
- likely safest AI target today is **title only** unless we deliberately add a subtitle/intro field to the section contract

### Implementation implication
- do **not** fake a rich registry intro path yet
- either:
  1. support title-only AI coverage now, or
  2. explicitly add `subtitle` as canonical registry intro field before writing AI to it

## FAQ
### Current state
- FAQ appears to exist as a conceptual guest-helpful surface, but not as a clearly grounded builder section contract in the same way as core homepage sections

### Grounded truth
- no confirmed canonical AI intro-copy field grounded yet
- needs explicit builder/component contract before AI writes into it safely

### Implementation implication
- do not generate FAQ intro copy yet
- first define canonical FAQ intro field if FAQ is meant to be AI-assisted

## Travel / accommodations
### Current state
- travel/accommodations content appears as guest-helpful product need, but not yet grounded as a clear builder-owned intro/subtitle path in the current section system we hardened

### Grounded truth
- no confirmed canonical AI intro-copy field grounded yet
- likely mixed with travel/helpful guest logistics rather than a clean standalone builder copy contract

### Implementation implication
- do not generate travel/accommodations AI copy yet
- first define explicit builder fields if this is intended to be part of the AI copy engine

## Practical conclusion
For the next honest implementation step:
- **registry** can potentially get title-only AI support now
- **FAQ** and **travel/accommodations** should wait until their canonical intro/subtitle fields are explicitly defined

## Rule
Do not let AI write meaningful copy into a section until:
1. canonical write field exists
2. public renderer field is confirmed
3. builder/public truth path is grounded

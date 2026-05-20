# DayOf Template Blueprint

This is the product/engineering blueprint from the The Knot audit.

## Recommendation

Build DayOf templates as page-aware site kits.

The current builder already has a pages data model. We should extend templates from section-only composition to page composition, then expose simple controls:

- Single-page mode: all enabled home sections render as anchors.
- Multi-page mode: selected sections/pages get dedicated URLs and nav items.
- Hybrid mode: home page remains a beautiful overview, deep sections live on dedicated pages.
- "Make dedicated page": convert or copy any section into a standalone page.

This gives users a simple mental model:

- Short site: scroll.
- Bigger site: pages.
- Big section: make it a page.

## Template Schema Extension

Current type:

```ts
export interface BuilderTemplateDefinition {
  id: string;
  displayName: string;
  description: string;
  moodTags: TemplateMoodTag[];
  previewThumbnailPath: string;
  defaultThemeId: string;
  sectionComposition: TemplateSectionSlot[];
  sectionVariantMap: Record<string, string>;
  suggestedFonts: {
    heading: string;
    body: string;
  };
  spacingProfile: 'compact' | 'balanced' | 'spacious';
}
```

Add:

```ts
export type TemplateNavigationMode = 'single-page' | 'multi-page' | 'hybrid';

export type TemplatePageRole =
  | 'home'
  | 'details'
  | 'story'
  | 'schedule'
  | 'travel'
  | 'things-to-do'
  | 'photos'
  | 'wedding-party'
  | 'dress-code'
  | 'qa'
  | 'registry'
  | 'rsvp'
  | 'menu'
  | 'music'
  | 'contact'
  | 'updates'
  | 'custom';

export interface TemplatePageSlot {
  id: string;
  title: string;
  slug: string;
  navLabel?: string;
  role: TemplatePageRole;
  isHome?: boolean;
  isHidden?: boolean;
  sections: TemplateSectionSlot[];
}

export interface BuilderTemplateDefinition {
  // existing fields...
  navigationMode?: TemplateNavigationMode;
  pageComposition?: TemplatePageSlot[];
  anchorStrategy?: 'all-home-sections' | 'selected-sections' | 'none';
  recommendedPagePromotions?: Array<{
    sectionType: string;
    when: 'always' | 'content-heavy' | 'multi-event' | 'destination' | 'large-party';
    pageRole: TemplatePageRole;
  }>;
}
```

Compatibility rule:

- If `pageComposition` is absent, keep today's `sectionComposition` path and build a one-page home page.
- If `pageComposition` exists, generate `BuilderProject.pages[]` from it.
- Keep `sectionComposition` as a flattened legacy view for gallery cards and older utilities until all callers migrate.

## Builder UX

### Page Manager

Add a compact page rail above or beside the section rail:

- Home
- Details
- Schedule
- Travel
- Photos
- Registry
- RSVP
- Add page

Each page row should support:

- Rename
- Slug
- Show/hide in nav
- Duplicate
- Delete, except home
- Reorder
- Set as home, later

### Section Anchors

Every enabled section should get a stable anchor:

- Derived from section title or type.
- Editable label.
- Can be shown/hidden in nav.
- Works on one-page sites without creating new routes.

Data shape:

```ts
interface BuilderSectionInstance {
  // existing fields...
  nav?: {
    anchorId?: string;
    label?: string;
    showInNav?: boolean;
  };
}
```

### Make Dedicated Page

Add a section action:

> Make dedicated page

Default behavior:

1. Create a new page using the section title/type.
2. Move the selected section to that page.
3. Add a lightweight teaser/link section on the source page when useful.
4. Add page to nav.
5. Switch editor focus to the new page.

Options:

- Move section to page
- Copy section to page
- Leave teaser on home
- Hide original section

Good candidates:

- Travel
- Things To Do
- Wedding Party
- Dress Code
- FAQ/Q + A
- Registry
- RSVP
- Gallery/Photos
- Menu
- Music
- Video
- Custom

### Promote Section Heuristics

Offer the action automatically when:

- FAQ has more than 6 questions.
- Wedding party has more than 8 people.
- Gallery has more than 12 photos.
- Schedule has more than 1 day.
- RSVP has multiple events.
- Travel includes hotels, room blocks, shuttles, and local guide content.
- Dress code includes palette plus examples.
- Registry includes multiple categories or a fund.

## Public Routing

Current public route renders only the home page from the render model. Multi-page support needs:

- `/site/:slug` -> home page
- `/site/:slug/:pageSlug` -> matching public page
- Anchor links on home: `/site/:slug#travel`
- Cross-page anchors: `/site/:slug/travel#hotels`

Renderer behavior:

- If page slug is missing, use home page.
- If page slug is unknown, show the public not-found/coming-soon state.
- Respect `meta.isHidden` for nav, but still allow hidden pages if directly linked only when intended.
- Keep RSVP/token/privacy handling consistent across pages.

## Navigation Model

Add a derived nav model for public and builder preview:

```ts
interface SiteNavItem {
  id: string;
  label: string;
  href: string;
  kind: 'page' | 'anchor' | 'external';
  pageId?: string;
  sectionId?: string;
  isActive?: boolean;
}
```

Single page:

- Home
- Our Story
- Schedule
- Travel
- Registry
- RSVP

Multi-page:

- Home
- Details
- Schedule
- Travel
- Photos
- Q + A
- Registry
- RSVP

Hybrid:

- Home
- Weekend
- Travel
- Photos
- Registry
- RSVP

## Section/Page Role Mapping

| Page role | Primary section types | Optional supporting sections |
|---|---|---|
| Home | hero, countdown, story, venue, schedule, rsvp | gallery, registry, footer-cta |
| Details | venue, directions, dress-code, faq | contact |
| Story | story, gallery, quotes, video | wedding-party |
| Schedule | schedule, menu, music | directions, contact |
| Travel | travel, accommodations, directions | faq, contact, things-to-do |
| Things To Do | travel:thingsToDo, custom | mapPins, localGuide |
| Photos | gallery, video | quotes |
| Wedding Party | wedding-party | gallery, quotes |
| Dress Code | dress-code | faq, gallery |
| Q + A | faq | contact |
| Registry | registry | story, footer-cta |
| RSVP | rsvp | schedule, menu, contact |
| Menu | menu | music |
| Music | music | contact, quotes |
| Contact | contact | faq, directions |
| Updates | custom, contact | schedule, travel |

## DayOf Starter Template Packs

These are original DayOf packs to build from the existing template packs and section variants.

| Pack | Mode | Pages | Why it beats a skin-only template |
|---|---|---|---|
| Modern Luxe Weekend | Hybrid | Home, Schedule, Travel, RSVP | Formal polish plus logistics depth |
| Editorial Romance | Hybrid | Home, Story, Photos, RSVP | Story-first without hiding guest tasks |
| Timeless Classic | Multi-page | Home, Details, Wedding Party, Q + A, Registry, RSVP | Familiar family-friendly structure |
| Destination Escape | Multi-page | Home, Travel, Hotels, Things To Do, Schedule, RSVP | Travel planning is first-class |
| Floral Garden | Hybrid | Home, Details, Dress Code, Photos | Color/dress guidance fits garden weddings |
| Coastal Weekend | Multi-page | Home, Travel, Things To Do, Registry, RSVP | Place identity plus guest guide |
| City Black Tie | Multi-page | Home, Details, Transportation, Dress Code, RSVP | Formal guests get clarity |
| Mountain Lodge | Multi-page | Home, Travel, Weekend Events, Packing Notes, RSVP | Weather/travel complexity handled |
| Photo Storytelling | Hybrid | Home, Story, Photos, Video | Emotional but still navigable |
| South Asian Weekend | Multi-page | Home, Events, Attire, Travel, RSVP | Multi-event RSVP and attire need pages |
| Bilingual Destination | Multi-page | Home, Travel, Q + A, RSVP | Language and logistics together |
| Family Logistics | Multi-page | Home, Details, Kids, Travel, Contact | Practical guest support as a template |
| Food And Music | Hybrid | Home, Menu, Music, RSVP | Reception personality plus utility |
| Registry/Fund Forward | Hybrid | Home, Registry, RSVP | Gifting framed cleanly and respectfully |
| Minimal Typography | Single page | Home only, optional RSVP page | Fast launch for couples with sparse content |

## Implementation Phases

### Phase 1 - Foundation

- Add `pageComposition` to template definitions.
- Add adapter from `pageComposition` to `BuilderProject.pages[]`.
- Add nav model helper.
- Add public route support for page slugs.
- Render selected page in `SiteView` instead of always home.
- Preserve anchor links for single-page home sections.
- Add tests for public rendering, hidden pages, unknown page slugs, and legacy templates.

### Phase 2 - Builder UI

- Add page rail/page manager.
- Add page rename, slug, hide/show, duplicate, delete, reorder.
- Add section nav settings.
- Add "Make dedicated page" action.
- Add "Move back to home" or "Merge into page" action for reversibility.
- Add preview navigation that mirrors public navigation.

### Phase 3 - Template Portfolio

- Convert current flagship packs into page-aware packs.
- Add 10 to 15 high-confidence multi-page packs first.
- Add original preview thumbnails for desktop and mobile.
- Add content-readiness labels.
- Add filters for style, color, season, structure, guest need, and content readiness.

### Phase 4 - Smarter Content

- Add page-specific copy prompts.
- Add logistics completeness checks per page role.
- Add suggestions to promote content-heavy sections to pages.
- Add guest task score: RSVP, travel, schedule, registry, contact all easy to find.

## Tests To Add

- Applying a legacy section-only template still creates one home page.
- Applying a page-aware template creates ordered pages with ordered sections.
- Public `/site/:slug/:pageSlug` renders the matching page.
- Public home route still renders home.
- Hidden pages do not appear in nav.
- Direct hidden page behavior is explicit and tested.
- Section anchors are stable after reorder.
- "Make dedicated page" moves/copies section and preserves settings/bindings/style overrides.
- RSVP access and guest invite tokens still work from nested page routes.
- Template gallery filters include structure and guest-need facets.

## Product Principle

The Knot's advantage is catalog breadth. DayOf's advantage should be wedding intelligence:

- Better defaults for complex weddings.
- Better guest logistics.
- Better page architecture.
- Better conversion from simple site to deep site.
- Better template families, not more one-off skins.

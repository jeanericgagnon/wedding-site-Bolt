# DayOf Builder Gap Analysis

Date: 2026-05-19
Scope: current DayOf builder/template source, local builder workbench snapshot, The Knot public preview catalog, authenticated builder screenshots, and the DayOf template blueprint.

## Executive Read

DayOf is closer to multi-page templates than it looks from the product surface. The data model already has pages, the reducer already supports page operations, serialization keeps pages, and the public render model carries a `pages[]` array.

The gap is productization. Templates are still section stacks. Public rendering still chooses the home page. Page management exists but is hidden. There is no explicit navigation mode, no reusable nav model, no public page route, no section anchor metadata, and no "make dedicated page" flow.

The lesson from The Knot is not "copy 551 designs." It is that couples understand wedding websites as full sites with predictable pages, desktop/mobile previews, colorways, and low-risk design switching. DayOf can beat that by making templates structurally smarter: single-page when simple, multi-page when logistics grow, and hybrid when the home page should stay elegant while details live deeper.

## Current DayOf Strengths

### 1. The Project Model Already Supports Pages

`BuilderProject` has `pages: BuilderPage[]`, and `BuilderPage` already has title, slug, section list, order, home flag, and hidden flag.

Evidence:

- `src/types/builder/project.ts`
- `BuilderProject.pages`
- `BuilderPage.title`
- `BuilderPage.slug`
- `BuilderPage.meta.isHome`
- `BuilderPage.meta.isHidden`

This is the biggest unlock. We do not need a ground-up rewrite for multi-page builder state.

### 2. The Reducer Already Has Page Operations

The reducer supports:

- Add page
- Update page
- Duplicate page
- Remove page, except home
- Reorder pages
- Set active page

That gives us a working internal page engine.

Current limitation: history labels reuse section action types in a few places, and there is no section-to-page promotion action yet.

### 3. Builder UI Has a Hidden Page Manager

`BuilderTopBar` includes a page manager modal with:

- Add page
- Rename page
- Edit slug
- Show/hide in nav
- Reorder
- Duplicate
- Delete

But the button that opens it is hidden with `className="hidden inline-flex..."`.

This means a useful chunk of page UI is present but not product-facing.

### 4. Templates Have Good Section Depth

Current builder template packs have:

- 13 launch-style builder packs.
- 35 older/legacy template definitions in `src/templates/registry.ts`.
- Many section variants across hero, story, venue, schedule, travel, RSVP, gallery, registry, FAQ, countdown, wedding party, dress code, accommodations, contact, custom, quotes, menu, music, directions, and video.

We have more operational section depth than The Knot appears to expose in the public template preview. Travel, RSVP, registry, music, menu, quotes, directions, and custom sections are a real advantage if templates start composing pages around them.

### 5. Content Preservation On Template Switch Exists

`TemplateGalleryPanel` has `preserveContentAcrossTemplate`, which matches existing sections by type and keeps IDs, settings, bindings, visibility, locks, and style overrides.

Current limitation: it works at active-page section level only. It does not preserve or map content across page roles.

### 6. Full Template Preview Exists Internally

`TemplateScrollCapture` and the template detail modal can render a populated preview with sample wedding data. That is good. The gap is packaging it like a couple-facing desktop/mobile preview system and screenshot capture pipeline.

## Current DayOf Gaps

### Gap 1: Templates Are Section-First, Not Page-First

`BuilderTemplateDefinition` is still centered on:

- `sectionComposition`
- `sectionVariantMap`
- mood tags
- thumbnail path
- theme
- fonts
- spacing

It does not know:

- single-page vs multi-page vs hybrid
- page roles
- page composition
- nav labels
- anchor strategy
- recommended page promotions
- guest problem solved by page structure

Impact: a "Destination Escape" template can include travel sections, but it cannot say "Travel is a dedicated page with hotels, airport, shuttle, and things to do." That leaves us competing on style instead of structure.

### Gap 2: Public Routing Only Supports The Home Site Route

Public routes include `/site/:slug`, but not `/site/:slug/:pageSlug`.

`SiteView` reads `renderModel.pages`, then selects the home page and renders only that page's sections. Other pages can exist in saved data, but guests do not get public routes for them.

Impact: multi-page templates cannot be real guest-facing pages yet. They can only be editor state unless we add routing and selected-page rendering.

### Gap 3: Hidden Page Metadata Is Lost In The Public DTO

`toPublicPageDTO` currently always returns `meta.isHidden: false`.

Impact: if we use page visibility for nav and private/hidden RSVP-style pages, the public render contract erases that signal. We need to preserve sanitized page visibility and define what hidden means:

- hidden from nav only
- direct-link allowed
- direct-link blocked unless token/invite

### Gap 4: Page Manager Exists But Is Hidden

The builder has page manager UI, but the entry button is hidden. The result is a mismatch:

- Engineers can see pages in the model.
- Couples mostly see sections.
- Templates cannot confidently promote multi-page behavior.

Impact: The Knot looks more page-native because its builder exposes page lists, custom pages, visibility, and reorder controls directly.

### Gap 5: No Public Navigation Model

DayOf does not yet have a derived public nav model that combines:

- page links
- same-page anchors
- cross-page anchors
- hidden pages
- RSVP routes
- external links
- active page state

Impact: even after routing exists, each renderer/page will be tempted to build nav ad hoc. That will make single-page, hybrid, and multi-page behavior inconsistent.

### Gap 6: No Section Anchor Metadata

Sections have IDs and `data-builder-section-id`, but not customer-facing navigation metadata like:

- anchor id
- nav label
- show in nav
- page role
- generated URL

Impact: one-page sites cannot have reliable anchor navigation, and hybrid sites cannot link from home teasers to deep sections cleanly.

### Gap 7: No "Make Dedicated Page" Flow

The Knot has custom pages and page controls, but the captured UI did not show a section promotion action. This is a DayOf opportunity.

Right now DayOf can add pages and add sections, but it cannot do the higher-level thing couples will understand:

> This Travel section is getting long. Make it a dedicated page.

Impact: couples must think like site builders. We want them to think like hosts.

### Gap 8: Template Gallery Filters Are Not Structural Enough

Current gallery supports style, season, colorway, sort, recommendations, grouping, compare, and use-case notes. That is a good base.

Missing filters/metadata:

- Structure: single page, multi-page, hybrid
- Guest need: destination, room blocks, kids, accessibility, multi-event RSVP, bilingual, cultural/interfaith
- Content readiness: few photos, no story yet, photo-heavy, full wedding party, registry-ready
- Event shape: single-day, weekend, multiple venues, ceremony/reception split

Impact: users can browse by look, but not by the wedding problem they need solved.

### Gap 9: Use-Case Packs Are Advisory, Not Transformative

`destination`, `bilingual`, and `interfaith` packs exist as recommendations and copy, but they do not yet mutate template page composition or add role-specific pages.

Impact: "Bilingual" and "interfaith" are promising product directions, but today they are mostly hints. The template system should make them real:

- Bilingual: paired language copy slots, language-aware FAQ, translated nav labels.
- Interfaith/cultural: ceremony explainer, attire guidance, multi-event schedule, family/tradition notes.
- Destination: travel page, hotel page, things-to-do page, airport/shuttle/visa guidance.

### Gap 10: Preview Story Is Split Across Surfaces

We have:

- public `/templates`
- public `/templates/:templateId`
- internal `TemplateScrollCapture`
- builder modal preview
- static preview thumbnails

But The Knot's pattern is simpler for users: each design preview shows desktop + mobile, colorways, nav expectations, and start flow together.

Impact: DayOf preview functionality exists, but the user-facing trust moment is not as crisp yet.

### Gap 11: Catalog Breadth Is Not Yet Competitive

The Knot public rendered pass captured 551 design preview URLs. DayOf has 13 launch builder packs plus older registry definitions.

We should not try to clone 551 templates. But the perceived gap is real. The answer should be:

- fewer original template families
- more colorways per family
- stronger page structures
- better guest logistics
- full previews
- AI/template scaffolding that adapts to the couple

### Gap 12: Page-Aware Persistence Needs Contract Cleanup

Serialization preserves pages, but the legacy `LayoutConfigV1` adapter collapses some page metadata:

- `LayoutConfigV1.PageConfig` has no slug or hidden flag.
- `fromBuilderProjectToExistingLayout` maps only id/title/sections.
- `site_json` is the better page-aware source, but compatibility paths can still flatten important metadata.

Impact: multi-page work should treat `site_json`/`published_json` as source of truth for page-aware rendering and keep `layout_config` as compatibility output.

## Lessons To Take From The Knot

### Lesson 1: Make Layout Mode Explicit

The Knot exposes "Multi-page" and "Single page" as a visible setting. DayOf should do the same, but better:

- Single page
- Multi-page
- Hybrid

Hybrid is our wedge: home stays beautiful and scannable, while Travel, Photos, Wedding Party, FAQ, Registry, or RSVP can become dedicated pages.

### Lesson 2: Templates Should Preview A Whole Site

The Knot preview is not just a card. It shows desktop, mobile, colorways, and nav expectations.

DayOf should make every template detail page answer:

- What does the home page look like?
- What pages are included?
- What does mobile look like?
- What guest job does this template solve?
- How does this template grow if the wedding gets more complex?

### Lesson 3: Page Vocabulary Is Standard Wedding Vocabulary

The recurring vocabulary is:

- Home
- Our Story
- Photos
- Wedding Party
- Dress Code
- Q + A / FAQ
- Travel
- Things To Do
- Registry
- RSVP
- Schedule / Wedding Day
- Custom Page

DayOf should standardize these as page roles, not just display labels.

### Lesson 4: Breadth Matters, But Structure Matters More

The Knot has huge visual breadth. DayOf can feel as broad by using:

- template families
- colorways
- section variants
- preview screenshots
- use-case filters

But DayOf should win by making each family operationally deeper.

### Lesson 5: Custom Pages Are Expected

Couples expect to add a page. That is table stakes. The DayOf differentiator is making the page for them from existing content.

### Lesson 6: RSVP Should Feel Like A Page And A System

The Knot treats RSVP as a page that can be hidden and has a setup flow. DayOf has stronger guest/RSVP infrastructure, but template architecture should reflect that:

- RSVP page role
- multi-event RSVP templates
- hidden/direct-link handling
- RSVP teaser on home
- RSVP deadline and event-specific copy

### Lesson 7: Visual Motifs Should Be Original, Not Cloned

Use The Knot screenshots for taxonomy:

- formal gold serif
- botanical sage
- black tie
- destination beach
- vintage deco
- gothic
- cultural/multi-event

But build original DayOf motifs, assets, names, typography combinations, and layout systems.

## Highest-Leverage Implementation Order

### Slice 1: Page-Aware Template Schema

Add backwards-compatible template fields:

- `navigationMode: 'single-page' | 'multi-page' | 'hybrid'`
- `pageComposition`
- `anchorStrategy`
- `recommendedPagePromotions`
- `templateFamilyId`
- `colorways`
- `pageRoles`

Add pure helpers:

- build pages from template page composition
- flatten page composition to legacy section composition
- validate page slugs and home page
- preserve content by page role and section type

Why first: this lets us ship page-aware templates without disrupting existing section-only templates.

### Slice 2: Public Page Routing And Rendering

Add:

- `/site/:slug/:pageSlug`
- selected-page lookup from `renderModel.pages`
- not-found/coming-soon behavior for unknown pages
- hidden page semantics
- same privacy/password/invite gate across all pages

Fix:

- preserve `meta.isHidden` in `toPublicPageDTO`

Why second: until public routing exists, multi-page templates are not real.

### Slice 3: Derived Nav Model

Create a single nav builder used by public site and builder preview:

- pages
- anchors
- hidden pages
- active state
- cross-page hrefs
- section labels
- RSVP special cases

Why third: this prevents every template and section from inventing its own navigation.

### Slice 4: Builder Page Rail

Promote the hidden page manager into a compact, normal UI:

- page rail near/above section rail
- add page
- rename
- slug
- show/hide
- reorder
- duplicate
- delete
- current page state

Why fourth: the internals already exist, but couples need an obvious mental model.

### Slice 5: Section Anchors

Add section `nav` metadata:

- anchor id
- label
- show in nav
- generated/default anchor

Render section wrappers with stable public `id` values.

Why fifth: this makes single-page sites feel intentionally navigable and powers hybrid links.

### Slice 6: Make Dedicated Page

Add an action available from section frame and inspector:

- Make dedicated page
- Move/copy selected section to a new page
- optionally leave a teaser/link on home
- switch editor focus to new page
- add nav item

Heuristics:

- Travel has hotels/shuttle/local guide
- FAQ has more than 6 questions
- Gallery has more than 12 images
- Wedding party has more than 8 people
- RSVP has multiple events
- Schedule spans more than one day

Why sixth: this is the DayOf feature that The Knot does not appear to have.

### Slice 7: Template Gallery Upgrade

Add:

- structure filter
- guest-need filter
- content-readiness filter
- desktop/mobile preview pair
- page set display
- colorway selector
- "preview all pages"
- "start single-page" vs "start multi-page" when supported

Why seventh: after page architecture exists, the gallery can finally sell the richer product.

## Template Family Gaps To Fill

Prioritize original DayOf families where page structure helps:

1. Destination Weekend
   - Multi-page
   - Travel, Hotels, Things To Do, Schedule, RSVP
   - Our strongest immediate wedge.

2. Formal Classic
   - Multi-page
   - Details, Wedding Party, Q + A, Registry, RSVP
   - Family-heavy, traditional, dependable.

3. Editorial Photo Story
   - Hybrid
   - Story, Photos, Details
   - Home stays beautiful, photos/story deepen.

4. Cultural Multi-Event
   - Multi-page
   - Events, Traditions, Attire, Travel, RSVP
   - Needs original respectful design and copy scaffolds.

5. Bilingual Destination
   - Multi-page
   - Travel, FAQ, RSVP with language-aware nav/copy.

6. Family Logistics
   - Multi-page
   - Kids, Accessibility, Travel, Contact, Updates
   - This is less visually flashy but extremely useful.

7. Registry/Fund Forward
   - Hybrid
   - Registry, RSVP, low-pressure gift copy.

8. Food And Music
   - Hybrid
   - Menu, Music, Song Requests, RSVP.

## Risks And Guardrails

- Do not copy competitor artwork, names, screenshots, decorative motifs, or exact layouts.
- Do not expose hidden pages in nav, but define direct-link behavior clearly.
- Keep password/invite gates consistent across page routes.
- Preserve existing single-page sites.
- Do not let template switching destroy content.
- Keep `layout_config` compatibility but use `site_json`/`published_json` as the page-aware source.
- Test public routing with registry, RSVP, travel, password, invite-only, owner preview, and guest preview contexts.
- Treat mobile preview as required for every template, not an afterthought.

## Decision

Do not build "more templates" first.

Build page-aware template infrastructure first, then create fewer but stronger original template families with colorways and full previews.

The winning DayOf product line is:

- Short site: scroll.
- Bigger site: pages.
- Big section: make it a page.
- Complex wedding: pick a template that already knows the guest logistics.

# The Knot Template Audit

Date: 2026-05-19
Scope: public The Knot wedding website catalog, public help/documentation, one public wedding-site example, and the current DayOf builder/template model.

## Executive Takeaways

The Knot is strong at breadth and familiarity. Their public catalog presents a large visual marketplace with simple filters, coordinated invitation links, strong stationery motifs, and template previews that imply both desktop and mobile outcomes.

DayOf can beat that by making templates more than skins. The right move is multi-page template architecture with original visual systems, stronger logistics pages, guest-aware sections, and builder actions that turn a section into a dedicated page when the couple's content grows.

The core DayOf product bet should be:

- Keep single-page sites as the easy default.
- Add multi-page templates for weddings with logistics, travel, multiple events, wedding parties, large FAQs, or custom guidance.
- Add anchors for every visible home section.
- Add "Make dedicated page" for any section that deserves its own URL/nav item.
- Add template families that include page composition, not just section order.

## Public The Knot Evidence

Sources used:

- The Knot public design catalog: `https://www.theknot.com/gs/wedding-websites/designs`
- The Knot help article on layouts: `https://helpcenter.theknot.com/hc/en-us/articles/39380380162580-What-is-the-difference-between-the-multi-page-and-single-page-layout`
- Public wedding-site example: `https://www.theknot.com/us/kristen-mathews-and-cody-ballard-apr-2026/things-to-do/155133714`

The help article explicitly positions multi-page as a classic wedding website with a top menu linking to separate pages, and single-page as a cleaner scroll-through layout. This validates that DayOf should support both modes instead of forcing every template into one structure.

The public design catalog is JavaScript-rendered. The first static-style capture extracted 225 public design names and filter values. A deeper rendered-catalog pass extracted 551 public template preview/detail URLs and saved cropped preview screenshots for all 551. The page copy says couples can switch to a new design at any time, which means the marketplace is built around low-risk design exploration.

The design-detail view for "Romantic Calligraphy - Grey" shows:

- Desktop preview
- Mobile preview
- Colorway dots
- Step 1 onboarding form
- Template preview nav: Home, Our Story, Travel, Things to Do, Photos, Wedding Party, Registry, RSVP

That is important because The Knot sells templates as a full site preview, not just a hero card.

## Public Template Preview Screenshots

The exhaustive public preview pass is indexed in `template-preview-screenshot-index.md`.

Captured artifacts:

- `theknot-template-preview-links.json` - 551 public design-detail URLs and names.
- `theknot-template-preview-screenshot-manifest.json` - 551 screenshot entries with source URL, design id, name, and screenshot path.
- `template-preview-screenshots/` - 551 cropped preview screenshots at 680 x 560.
- `capture-template-previews.mjs` - repeatable Playwright capture script.

Verification after capture:

- Manifest entries: 551
- PNG files: 551
- Missing screenshot files: 0
- Capture errors: 0
- Non-PNG signatures: 0

This pass deliberately used public preview/detail pages and did not apply themes inside the logged-in builder account.

## Authenticated Builder Evidence

Authenticated screenshots are indexed in `authenticated-screenshot-index.md` and stored in `authenticated-screenshots/`.

Logged-in capture confirmed the real builder supports:

- A wedding website dashboard with publish, edit, page list, custom URL, registry, privacy, theme, dress code, and RSVP entry points.
- A preview/editor split view with desktop/mobile preview toggle.
- A right-side "Edit website" panel.
- A first-class page list: Home, Our Story, Photos, Wedding Party, Q + A, Travel, Things to Do, Registry, and RSVP.
- Page visibility controls, including RSVP shown as hidden.
- Reorder pages with visible toggles per page.
- Add Custom Page with page name and visible toggle.
- Page-specific editing with Content and Settings tabs.
- Page block menus. Our Story offers Photo Timeline, Story, Title, Text Block, Photo, Photo Gallery, and GIF. Travel offers Transportation, Hotel, Title, Text Block, Photo, Photo Gallery, Activity, GIF, Q&A, Livestream, and Story.
- Design settings with current theme, colorway dots, matching invitation link, theme browsing, and an explicit layout toggle for Multi-page versus Single page.
- Privacy & URL settings with search visibility, password toggle, registry visibility, website URL, copy link, and custom domain upsell.
- RSVP setup flow with a three-step intro and an event-selection step for collecting responses. It supports Wedding Day plus popular events such as Rehearsal Dinner, Brunch, After Party, and custom events.

Most important finding: The Knot does not just imply multi-page through public examples. The authenticated editor exposes "Layout: Multi-page" with a "Single page" option in design settings. DayOf should treat layout mode as a first-class template attribute.

Second important finding: The Knot has custom pages and page-specific block menus, but the captured UI did not show a direct "make this section a dedicated page" action. That is a DayOf opportunity. We can make page creation feel smarter by promoting an existing heavy section into a page, preserving content, and leaving a teaser/anchor behind.

## Catalog Browsing Model

Public filters captured:

Style:

- Art Deco
- Beach
- Bohemian
- Botanical Greenery
- Classic and Elegant
- Cultural and Religious
- Destination
- Floral
- Gothic
- Modern
- Mountains
- Rustic
- Simple and Minimalist
- Unique
- Vintage and Retro

Color:

- Blue
- Pink
- White
- Green
- Grey
- Black
- Teal
- Gold
- Cream
- Burgundy
- Purple
- Orange
- Brown
- Red
- Multi-color
- Yellow
- Lavender

Season:

- Spring
- Summer
- Fall
- Winter

DayOf implication: our template gallery should not only filter by mood. It should support style, colorway, season, wedding type, guest logistics complexity, and page architecture.

Recommended DayOf filters:

- Style: Modern, Classic, Editorial, Floral, Garden, Destination, Beach, Mountain, Rustic, Art Deco, Gothic, Boho, Minimal, Cultural, Religious, Playful
- Color: Ivory, Black, Gold, Navy, Sage, Blush, Terracotta, Burgundy, Ocean, Lavender, Emerald, Champagne, Grey, White
- Season: Spring, Summer, Fall, Winter
- Structure: Single page, Multi-page, Weekend, Travel-first, Story-first, RSVP-first
- Guest need: Local guests, destination guests, room blocks, multi-event RSVP, kids/family details, bilingual, planner/coordinator
- Content readiness: Few photos, photo-heavy, no story yet, full wedding party, registry-ready

## Public Design Taxonomy

225 public design names were extracted. Full data:

- `theknot-design-names-public-full.json`
- `theknot-design-taxonomy.csv`
- `theknot-design-taxonomy-counts.json`

Inferred patterns from the names:

| Pattern | Count | What The Knot is doing | DayOf response |
|---|---:|---|---|
| Formal/luxe | 70 | Gold, foil, black tie, monograms, damask, regency, crown, baroque | Build formal templates with real page depth, not only gold accents |
| Motif/color led | 117 | Names often encode color or decorative motif | Treat color/motif as variants inside richer template families |
| Floral | 34 | Bouquets, blooms, flower markets, wildflowers | Make floral systems with matching hero, section dividers, RSVP, FAQ, and registry styling |
| Botanical | 33 | Leaves, vines, eucalyptus, olive, palms | Use botanicals as structural frames and subtle section rhythm, not decorative clutter |
| Retro/vintage | 29 | Regency, nouveau, antique, heirloom, old money | Build vintage families with typography, spacing, and page hierarchy |
| Classic | 28 | Elegant, timeless, simply, classic | Offer dependable classic multi-page templates for family-heavy weddings |
| Destination/place | 23 | Beach, mountain, city, western, desert, passport | Make travel-first templates where maps, hotels, schedule, and things-to-do are first-class |
| Editorial/minimal | 21 | Photo, gallery, typography, contrast, label maker | Build original photo/editorial templates that support full story and gallery pages |
| Playful/unique | 11 | Eclectic, colorful, mushroom, no-big-deal, happy-tears | Add personality templates, but keep guest tasks clear |
| Seasonal/theme | 6 | Winter, snowflake, Halloween, skeleton | Seasonal templates should include weather/travel/dress guidance |
| Cultural/religious | 5 | Lehenga, chuppah, Ankara, Stefana, church | DayOf can exceed this with respectful page kits for multi-event cultural weddings |

Color signals from extracted names:

- Gold appears in 66 names.
- White appears in 38 names.
- Blue appears in 32 names.
- Green appears in 24 names.
- Pink appears in 16 names.
- Black and Cream appear in 14 each.

DayOf implication: if we simply add more templates, we will still feel shallow. The competitor already has visual breadth. We need structural breadth: page sets, dedicated pages, and richer wedding-specific content scaffolds.

## Page And Section Vocabulary

Observed through public previews, public wedding pages, and authenticated builder screens:

- Home
- Our Story
- Photos / Gallery
- Wedding Party
- Dress Code
- Q + A
- Travel
- Things to Do
- Registry
- RSVP
- Wedding Day / Schedule
- Ceremony
- Reception
- Transportation
- Hotel / room block
- Custom named page, such as couple names or important information
- Custom page
- RSVP event setup
- Privacy & URL
- Design
- Dress Code

The public example page exposes nav links and content sections for Home, Our Story, a couple/photo page, Wedding Party, Dress Code, Q + A, Travel, Things to Do, Registry, and RSVP. The design-detail preview exposes Home, Our Story, Travel, Things to Do, Photos, Wedding Party, Registry, and RSVP. The authenticated builder exposes that same core set as editable pages and adds hidden RSVP, custom page creation, page visibility, and page reorder controls.

DayOf should standardize those as page roles, not only labels. Page roles let templates decide whether "Travel" is a home section, a dedicated page, or a cluster of pages.

## Template Types DayOf Should Support

These should be original DayOf template families, not copies of The Knot designs.

| Template family | Default structure | Differentiating pages | Key sections |
|---|---|---|---|
| Modern Luxe Weekend | Multi-page | Details, Schedule, Travel, Registry, RSVP | Fullbleed hero, split venue, hotel block, RSVP card, FAQ |
| Editorial Romance | Hybrid | Story, Photos, Details | Split hero, story chapters, masonry gallery, minimal registry |
| Timeless Classic | Multi-page | Details, Wedding Party, Q+A, RSVP | Invitation hero, family wording, formal RSVP, classic FAQ |
| Destination Escape | Multi-page | Travel, Hotels, Things To Do, Schedule | Map-first venue, flight/hotel split, local guide, multi-day schedule |
| Garden Ceremony | Hybrid | Details, Dress Code, Photos | Botanical hero, color palette dress code, floral FAQ, garden venue |
| Coastal Weekend | Multi-page | Travel, Things To Do, Registry | Beach hero, accommodations, local guide, map pins |
| Mountain Lodge | Multi-page | Travel, Weekend Events, Packing Notes | Weather-aware FAQ, altitude/travel tips, lodge accommodations |
| City Black Tie | Multi-page | Details, Transportation, Dress Code | Formal hero, transport sections, RSVP deadline, registry |
| Art Deco Reception | Hybrid | Details, Menu, Music | Geometric hero, printed menu, setlist, nightlife CTA |
| Gothic Noir | Multi-page | Details, Q+A, Photos | Dark editorial hero, dramatic gallery, formal RSVP |
| Bohemian Desert | Hybrid | Travel, Dress Code, Things To Do | Desert palette, travel guide, attire examples |
| Rustic Vineyard | Multi-page | Venue, Travel, Weekend | Map/directions, shuttle, ceremony/reception split |
| Minimal Typography | Single page by default | Optional RSVP page | Text-first hero, compact schedule, clean registry |
| Photo Storytelling | Hybrid | Story, Photos, Videos | Photo-heavy hero, chapters, filmstrip gallery, video |
| Micro Wedding / Elopement | Single page | Optional Travel | Short story, intimate schedule, simple RSVP |
| South Asian Weekend | Multi-page | Events, Travel, Attire, RSVP | Multi-event schedule, event-specific attire, multi-event RSVP |
| Jewish Chuppah Classic | Multi-page | Ceremony, Travel, Registry | Chuppah motif, ceremony explainer, formal schedule |
| Church Formal | Multi-page | Ceremony, Reception, Travel | Religious ceremony details, parking, reception directions |
| Cultural Fusion | Multi-page | Events, Traditions, Attire | Ceremony explainers, bilingual copy slots, multi-event RSVP |
| Bilingual Destination | Multi-page | Travel, FAQ, RSVP | Language toggle, guest logistics, local guide |
| Family Logistics | Multi-page | Kids, Travel, Q+A | Childcare, accessibility, shuttles, contact/planner |
| Registry/Fund Forward | Hybrid | Registry, RSVP | Fund highlight, gift categories, low-pressure copy |
| Food And Music | Hybrid | Menu, Music, RSVP | Course tabs, song request, reception schedule |
| Winter Formal | Multi-page | Travel, Weather, Dress Code | Weather tips, shuttle, coat check, winter palette |
| Fall Estate | Hybrid | Details, Photos, Registry | Warm palette, venue story, autumn dress guidance |
| Playful Color | Single page | Optional Photos | Bold hero, interactive guestbook, song requests |
| Old Money Estate | Multi-page | Details, Wedding Party, Q+A | Serif system, monogram, refined page rhythm |
| Western Ranch | Multi-page | Travel, Things To Do, Dress Code | Ranch details, denim/boots guidance, directions |
| Tropical Glam | Multi-page | Travel, Things To Do, Registry | Palm/coastal palette, hotel tiers, activity guide |
| Planner-Ready Guest Hub | Multi-page | Updates, Contact, Schedule | Coordinator contact, update log, accessibility notes |

## What DayOf Already Has

The current repo is closer to multi-page than the public UI suggests:

- `BuilderProject.pages[]` already exists in `src/types/builder/project.ts`.
- `BuilderPage` already has `title`, `slug`, `orderIndex`, `sections`, `meta.isHome`, and `meta.isHidden`.
- Reducer actions already support add/update/duplicate/remove/reorder pages in `src/builder/state/builderActions.ts` and `src/builder/state/builderReducer.ts`.
- Serialization preserves multiple pages in `src/builder/serializers/projectSerializer.ts`.
- Public render model sanitization can preserve multiple pages in `src/lib/publicSiteRenderModel.ts`.
- The public route currently chooses the home page and renders only its sections in `src/pages/SiteView.tsx`.
- `BuilderTemplateDefinition` currently supports `sectionComposition`, but not first-class page composition.
- Existing section variants already include tab-like patterns: schedule day tabs, registry tabs, FAQ tabbed, gallery categorized, menu course tabs, and music playlists.

So the missing piece is not a full rewrite. The missing piece is productizing pages:

- Builder page UI
- Public page routing
- Navigation rendering
- Template page composition
- Section-to-page extraction
- Anchor metadata

## Competitive Gaps To Exploit

The Knot catalog is broad, but many templates appear to be visual remixes: different motif, color, script, and invitation style on a similar information architecture.

DayOf can win by making templates operationally smarter:

- Travel templates with hotel blocks, map pins, shuttle notes, visa/cultural tips, and things-to-do pages.
- Weekend templates with multi-day schedule tabs and multi-event RSVP.
- Cultural templates with event-by-event pages, attire guidance, ceremony explainers, and guest-specific RSVP.
- Family/logistics templates with accessibility, kids, transportation, planner contact, and update sections.
- Photo/editorial templates that still keep RSVP and travel tasks obvious.
- Registry templates with categories/funds but low-pressure wording.
- Section-level anchors for one-page sites and dedicated pages for deep content.

## Design Guardrails For DayOf

- Do not create a giant catalog of lightly recolored clones.
- Prefer fewer, stronger families with multiple page structures and colorways.
- Every template should say what guest problem it solves.
- Every template should include a preview of mobile and desktop.
- Every template should expose "single page", "hybrid", and "multi-page" variants where appropriate.
- Every template should include a content readiness path: works with no photos, one hero photo, or many photos.
- Visual motifs should be generated/original and owned by DayOf.

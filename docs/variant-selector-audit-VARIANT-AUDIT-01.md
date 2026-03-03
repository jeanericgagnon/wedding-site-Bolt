# Variant Selector Compatibility Audit — VARIANT-AUDIT-01

Builder selector source mapped from `src/sections/sectionRegistry.tsx` (legacy selector options).
Renderer support mapped from modern registry definitions in `src/sections/registry.ts` + registered variant files.

## Used combos from 35 templates vs selector compatibility

| section type | variant | selector options (type) | modern renderer has exact combo | status |
|---|---|---|---|---|
| `accommodations` | `cards` | `cards,default` | `yes` | **supported** |
| `accommodations` | `classic` | `cards,default` | `no` | **fallback-only** |
| `accommodations` | `luxury` | `cards,default` | `no` | **fallback-only** |
| `accommodations` | `minimal` | `cards,default` | `no` | **fallback-only** |
| `accommodations` | `modern` | `cards,default` | `no` | **fallback-only** |
| `accommodations` | `showcase` | `cards,default` | `no` | **fallback-only** |
| `countdown` | `bold` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `classic` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `compact` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `detailed` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `elegant` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `flip` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `floating` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `luxury` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `minimal` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `modern` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `playful` | `banner,default` | `no` | **fallback-only** |
| `countdown` | `progress` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `cards` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `classic` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `creative` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `elegant` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `luxury` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `minimal` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `modern` | `banner,default` | `no` | **fallback-only** |
| `dress-code` | `playful` | `banner,default` | `no` | **fallback-only** |
| `faq` | `accordion` | `accordion,default,iconGrid` | `yes` | **supported** |
| `faq` | `categorized` | `accordion,default,iconGrid` | `no` | **fallback-only** |
| `faq` | `grid` | `accordion,default,iconGrid` | `no` | **fallback-only** |
| `faq` | `luxury` | `accordion,default,iconGrid` | `no` | **fallback-only** |
| `faq` | `minimal` | `accordion,default,iconGrid` | `no` | **fallback-only** |
| `faq` | `modern` | `accordion,default,iconGrid` | `no` | **fallback-only** |
| `faq` | `playful` | `accordion,default,iconGrid` | `no` | **fallback-only** |
| `faq` | `tabbed` | `accordion,default,iconGrid` | `no` | **fallback-only** |
| `footer-cta` | `bold` | `default,minimal` | `no` | **fallback-only** |
| `footer-cta` | `classic` | `default,minimal` | `no` | **fallback-only** |
| `footer-cta` | `elegant` | `default,minimal` | `no` | **fallback-only** |
| `footer-cta` | `expanded` | `default,minimal` | `no` | **fallback-only** |
| `footer-cta` | `luxury` | `default,minimal` | `no` | **fallback-only** |
| `footer-cta` | `minimal` | `default,minimal` | `no` | **supported** |
| `footer-cta` | `modern` | `default,minimal` | `no` | **fallback-only** |
| `footer-cta` | `playful` | `default,minimal` | `no` | **fallback-only** |
| `gallery` | `bold` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `carousel` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `classic` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `elegant` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `fullwidth` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `luxury` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `masonry` | `default,masonry` | `yes` | **supported** |
| `gallery` | `minimal` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `modern` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `playful` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `split` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `spotlight` | `default,masonry` | `no` | **fallback-only** |
| `gallery` | `timeline` | `default,masonry` | `no` | **fallback-only** |
| `hero` | `artistic` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `bold` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `centered` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `classic` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `coastal` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `editorial` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `floating` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `fullscreen` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `garden` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `layered` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `luxury` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `magazine` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `minimal` | `countdown,default,fullbleed,minimal` | `no` | **supported** |
| `hero` | `moody` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `playful` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `refined` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `split` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `hero` | `stacked` | `countdown,default,fullbleed,minimal` | `no` | **fallback-only** |
| `registry` | `cards` | `default,fundHighlight,grid` | `yes` | **hidden** |
| `registry` | `classic` | `default,fundHighlight,grid` | `no` | **fallback-only** |
| `registry` | `experiences` | `default,fundHighlight,grid` | `no` | **fallback-only** |
| `registry` | `luxury` | `default,fundHighlight,grid` | `no` | **fallback-only** |
| `registry` | `minimal` | `default,fundHighlight,grid` | `no` | **fallback-only** |
| `registry` | `modern` | `default,fundHighlight,grid` | `no` | **fallback-only** |
| `registry` | `playful` | `default,fundHighlight,grid` | `no` | **fallback-only** |
| `rsvp` | `bold` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `classic` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `elegant` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `extended` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `form` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `luxury` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `minimal` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `modern` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `playful` | `default,inline` | `no` | **fallback-only** |
| `rsvp` | `quick` | `default,inline` | `no` | **fallback-only** |
| `schedule` | `bold` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `cards` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `classic` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `compact` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `elegant` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `itinerary` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `luxury` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `minimal` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `modern` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `playful` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `program` | `dayTabs,default,timeline` | `no` | **fallback-only** |
| `schedule` | `timeline` | `dayTabs,default,timeline` | `yes` | **supported** |
| `story` | `bold` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `cards` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `classic` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `compact` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `editorial` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `elegant` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `immersive` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `luxury` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `magazine` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `modern` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `playful` | `centered,default,split,timeline` | `no` | **fallback-only** |
| `story` | `split` | `centered,default,split,timeline` | `no` | **supported** |
| `story` | `timeline` | `centered,default,split,timeline` | `no` | **supported** |
| `travel` | `classic` | `cards,default,localGuide` | `no` | **fallback-only** |
| `travel` | `compact` | `cards,default,localGuide` | `yes` | **hidden** |
| `travel` | `luxury` | `cards,default,localGuide` | `no` | **fallback-only** |
| `travel` | `map` | `cards,default,localGuide` | `no` | **fallback-only** |
| `travel` | `modern` | `cards,default,localGuide` | `no` | **fallback-only** |
| `travel` | `playful` | `cards,default,localGuide` | `no` | **fallback-only** |
| `travel` | `split` | `cards,default,localGuide` | `no` | **fallback-only** |
| `venue` | `artistic` | `card,default` | `no` | **fallback-only** |
| `venue` | `bold` | `card,default` | `no` | **fallback-only** |
| `venue` | `cards` | `card,default` | `no` | **fallback-only** |
| `venue` | `cinematic` | `card,default` | `no` | **fallback-only** |
| `venue` | `classic` | `card,default` | `no` | **fallback-only** |
| `venue` | `compact` | `card,default` | `no` | **fallback-only** |
| `venue` | `garden` | `card,default` | `no` | **fallback-only** |
| `venue` | `immersive` | `card,default` | `no` | **fallback-only** |
| `venue` | `luxury` | `card,default` | `no` | **fallback-only** |
| `venue` | `magazine` | `card,default` | `no` | **fallback-only** |
| `venue` | `minimal` | `card,default` | `no` | **fallback-only** |
| `venue` | `modern` | `card,default` | `no` | **fallback-only** |
| `venue` | `playful` | `card,default` | `no` | **fallback-only** |
| `venue` | `refined` | `card,default` | `no` | **fallback-only** |
| `venue` | `split` | `card,default` | `no` | **fallback-only** |
| `venue` | `timeline` | `card,default` | `no` | **fallback-only** |
| `wedding-party` | `artistic` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `cards` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `classic` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `filmstrip` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `grid` | `default,grid` | `no` | **supported** |
| `wedding-party` | `luxury` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `magazine` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `minimal` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `modern` | `default,grid` | `no` | **fallback-only** |
| `wedding-party` | `polaroid` | `default,grid` | `no` | **fallback-only** |

## Mismatch list

### Unsupported (0)
- none

### Hidden (2)
- `registry::cards`
- `travel::compact`

### Fallback-only (137)
- `accommodations::classic`
- `accommodations::luxury`
- `accommodations::minimal`
- `accommodations::modern`
- `accommodations::showcase`
- `countdown::bold`
- `countdown::classic`
- `countdown::compact`
- `countdown::detailed`
- `countdown::elegant`
- `countdown::flip`
- `countdown::floating`
- `countdown::luxury`
- `countdown::minimal`
- `countdown::modern`
- `countdown::playful`
- `countdown::progress`
- `dress-code::cards`
- `dress-code::classic`
- `dress-code::creative`
- `dress-code::elegant`
- `dress-code::luxury`
- `dress-code::minimal`
- `dress-code::modern`
- `dress-code::playful`
- `faq::categorized`
- `faq::grid`
- `faq::luxury`
- `faq::minimal`
- `faq::modern`
- `faq::playful`
- `faq::tabbed`
- `footer-cta::bold`
- `footer-cta::classic`
- `footer-cta::elegant`
- `footer-cta::expanded`
- `footer-cta::luxury`
- `footer-cta::modern`
- `footer-cta::playful`
- `gallery::bold`
- `gallery::carousel`
- `gallery::classic`
- `gallery::elegant`
- `gallery::fullwidth`
- `gallery::luxury`
- `gallery::minimal`
- `gallery::modern`
- `gallery::playful`
- `gallery::split`
- `gallery::spotlight`
- `gallery::timeline`
- `hero::artistic`
- `hero::bold`
- `hero::centered`
- `hero::classic`
- `hero::coastal`
- `hero::editorial`
- `hero::floating`
- `hero::fullscreen`
- `hero::garden`
- `hero::layered`
- `hero::luxury`
- `hero::magazine`
- `hero::moody`
- `hero::playful`
- `hero::refined`
- `hero::split`
- `hero::stacked`
- `registry::classic`
- `registry::experiences`
- `registry::luxury`
- `registry::minimal`
- `registry::modern`
- `registry::playful`
- `rsvp::bold`
- `rsvp::classic`
- `rsvp::elegant`
- `rsvp::extended`
- `rsvp::form`
- `rsvp::luxury`
- `rsvp::minimal`
- `rsvp::modern`
- `rsvp::playful`
- `rsvp::quick`
- `schedule::bold`
- `schedule::cards`
- `schedule::classic`
- `schedule::compact`
- `schedule::elegant`
- `schedule::itinerary`
- `schedule::luxury`
- `schedule::minimal`
- `schedule::modern`
- `schedule::playful`
- `schedule::program`
- `story::bold`
- `story::cards`
- `story::classic`
- `story::compact`
- `story::editorial`
- `story::elegant`
- `story::immersive`
- `story::luxury`
- `story::magazine`
- `story::modern`
- `story::playful`
- `travel::classic`
- `travel::luxury`
- `travel::map`
- `travel::modern`
- `travel::playful`
- `travel::split`
- `venue::artistic`
- `venue::bold`
- `venue::cards`
- `venue::cinematic`
- `venue::classic`
- `venue::compact`
- `venue::garden`
- `venue::immersive`
- `venue::luxury`
- `venue::magazine`
- `venue::minimal`
- `venue::modern`
- `venue::playful`
- `venue::refined`
- `venue::split`
- `venue::timeline`
- `wedding-party::artistic`
- `wedding-party::cards`
- `wedding-party::classic`
- `wedding-party::filmstrip`
- `wedding-party::luxury`
- `wedding-party::magazine`
- `wedding-party::minimal`
- `wedding-party::modern`
- `wedding-party::polaroid`

## Summary counts
- Used type+variant combos in templates: **148**.
- Selector mismatch total: **139** (unsupported: 0, hidden: 2, fallback-only: 137).
- Selector-compatible combos: **9**.

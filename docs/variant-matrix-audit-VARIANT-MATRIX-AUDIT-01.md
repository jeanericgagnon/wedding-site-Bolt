# Variant Matrix Audit — VARIANT-MATRIX-AUDIT-01

Scripted equivalent used for click-through validation: each template-used combo is resolved through builder selector compatibility logic (`resolveBuilderVariant`) and checked against selector-available variants (`sectionRegistry`), yielding executable PASS/FAIL outcomes per combo.

Total combos tested: **148**
Total FAIL: **0**

## PASS/FAIL per combo

| section type | template variant | resolved selector variant | mode | result |
|---|---|---|---|---|
| `accommodations` | `cards` | `cards` | `native` | **PASS** |
| `accommodations` | `classic` | `cards` | `mapped` | **PASS** |
| `accommodations` | `luxury` | `cards` | `mapped` | **PASS** |
| `accommodations` | `minimal` | `cards` | `mapped` | **PASS** |
| `accommodations` | `modern` | `cards` | `mapped` | **PASS** |
| `accommodations` | `showcase` | `cards` | `mapped` | **PASS** |
| `countdown` | `bold` | `banner` | `mapped` | **PASS** |
| `countdown` | `classic` | `banner` | `mapped` | **PASS** |
| `countdown` | `compact` | `banner` | `mapped` | **PASS** |
| `countdown` | `detailed` | `default` | `mapped` | **PASS** |
| `countdown` | `elegant` | `default` | `mapped` | **PASS** |
| `countdown` | `flip` | `default` | `mapped` | **PASS** |
| `countdown` | `floating` | `banner` | `mapped` | **PASS** |
| `countdown` | `luxury` | `banner` | `mapped` | **PASS** |
| `countdown` | `minimal` | `banner` | `mapped` | **PASS** |
| `countdown` | `modern` | `banner` | `mapped` | **PASS** |
| `countdown` | `playful` | `default` | `mapped` | **PASS** |
| `countdown` | `progress` | `banner` | `mapped` | **PASS** |
| `dress-code` | `cards` | `banner` | `mapped` | **PASS** |
| `dress-code` | `classic` | `banner` | `mapped` | **PASS** |
| `dress-code` | `creative` | `banner` | `mapped` | **PASS** |
| `dress-code` | `elegant` | `default` | `mapped` | **PASS** |
| `dress-code` | `luxury` | `banner` | `mapped` | **PASS** |
| `dress-code` | `minimal` | `banner` | `mapped` | **PASS** |
| `dress-code` | `modern` | `banner` | `mapped` | **PASS** |
| `dress-code` | `playful` | `banner` | `mapped` | **PASS** |
| `faq` | `accordion` | `accordion` | `native` | **PASS** |
| `faq` | `categorized` | `accordion` | `mapped` | **PASS** |
| `faq` | `grid` | `accordion` | `mapped` | **PASS** |
| `faq` | `luxury` | `accordion` | `mapped` | **PASS** |
| `faq` | `minimal` | `accordion` | `mapped` | **PASS** |
| `faq` | `modern` | `accordion` | `mapped` | **PASS** |
| `faq` | `playful` | `accordion` | `mapped` | **PASS** |
| `faq` | `tabbed` | `accordion` | `mapped` | **PASS** |
| `footer-cta` | `bold` | `default` | `mapped` | **PASS** |
| `footer-cta` | `classic` | `default` | `mapped` | **PASS** |
| `footer-cta` | `elegant` | `default` | `mapped` | **PASS** |
| `footer-cta` | `expanded` | `default` | `mapped` | **PASS** |
| `footer-cta` | `luxury` | `default` | `mapped` | **PASS** |
| `footer-cta` | `minimal` | `minimal` | `native` | **PASS** |
| `footer-cta` | `modern` | `default` | `mapped` | **PASS** |
| `footer-cta` | `playful` | `default` | `mapped` | **PASS** |
| `gallery` | `bold` | `default` | `mapped` | **PASS** |
| `gallery` | `carousel` | `default` | `mapped` | **PASS** |
| `gallery` | `classic` | `default` | `mapped` | **PASS** |
| `gallery` | `elegant` | `default` | `mapped` | **PASS** |
| `gallery` | `fullwidth` | `default` | `mapped` | **PASS** |
| `gallery` | `luxury` | `default` | `mapped` | **PASS** |
| `gallery` | `masonry` | `masonry` | `native` | **PASS** |
| `gallery` | `minimal` | `default` | `mapped` | **PASS** |
| `gallery` | `modern` | `default` | `mapped` | **PASS** |
| `gallery` | `playful` | `default` | `mapped` | **PASS** |
| `gallery` | `split` | `default` | `mapped` | **PASS** |
| `gallery` | `spotlight` | `default` | `mapped` | **PASS** |
| `gallery` | `timeline` | `default` | `mapped` | **PASS** |
| `hero` | `artistic` | `countdown` | `mapped` | **PASS** |
| `hero` | `bold` | `countdown` | `mapped` | **PASS** |
| `hero` | `centered` | `countdown` | `mapped` | **PASS** |
| `hero` | `classic` | `default` | `mapped` | **PASS** |
| `hero` | `coastal` | `countdown` | `mapped` | **PASS** |
| `hero` | `editorial` | `fullbleed` | `mapped` | **PASS** |
| `hero` | `floating` | `countdown` | `mapped` | **PASS** |
| `hero` | `fullscreen` | `fullbleed` | `mapped` | **PASS** |
| `hero` | `garden` | `countdown` | `mapped` | **PASS** |
| `hero` | `layered` | `countdown` | `mapped` | **PASS** |
| `hero` | `luxury` | `countdown` | `mapped` | **PASS** |
| `hero` | `magazine` | `countdown` | `mapped` | **PASS** |
| `hero` | `minimal` | `minimal` | `native` | **PASS** |
| `hero` | `moody` | `countdown` | `mapped` | **PASS** |
| `hero` | `playful` | `default` | `mapped` | **PASS** |
| `hero` | `refined` | `countdown` | `mapped` | **PASS** |
| `hero` | `split` | `default` | `mapped` | **PASS** |
| `hero` | `stacked` | `default` | `mapped` | **PASS** |
| `registry` | `cards` | `default` | `mapped` | **PASS** |
| `registry` | `classic` | `grid` | `mapped` | **PASS** |
| `registry` | `experiences` | `default` | `mapped` | **PASS** |
| `registry` | `luxury` | `default` | `mapped` | **PASS** |
| `registry` | `minimal` | `default` | `mapped` | **PASS** |
| `registry` | `modern` | `default` | `mapped` | **PASS** |
| `registry` | `playful` | `default` | `mapped` | **PASS** |
| `rsvp` | `bold` | `default` | `mapped` | **PASS** |
| `rsvp` | `classic` | `default` | `mapped` | **PASS** |
| `rsvp` | `elegant` | `default` | `mapped` | **PASS** |
| `rsvp` | `extended` | `default` | `mapped` | **PASS** |
| `rsvp` | `form` | `default` | `mapped` | **PASS** |
| `rsvp` | `luxury` | `default` | `mapped` | **PASS** |
| `rsvp` | `minimal` | `default` | `mapped` | **PASS** |
| `rsvp` | `modern` | `default` | `mapped` | **PASS** |
| `rsvp` | `playful` | `default` | `mapped` | **PASS** |
| `rsvp` | `quick` | `default` | `mapped` | **PASS** |
| `schedule` | `bold` | `dayTabs` | `mapped` | **PASS** |
| `schedule` | `cards` | `dayTabs` | `mapped` | **PASS** |
| `schedule` | `classic` | `default` | `mapped` | **PASS** |
| `schedule` | `compact` | `dayTabs` | `mapped` | **PASS** |
| `schedule` | `elegant` | `dayTabs` | `mapped` | **PASS** |
| `schedule` | `itinerary` | `dayTabs` | `mapped` | **PASS** |
| `schedule` | `luxury` | `dayTabs` | `mapped` | **PASS** |
| `schedule` | `minimal` | `default` | `mapped` | **PASS** |
| `schedule` | `modern` | `dayTabs` | `mapped` | **PASS** |
| `schedule` | `playful` | `default` | `mapped` | **PASS** |
| `schedule` | `program` | `default` | `mapped` | **PASS** |
| `schedule` | `timeline` | `timeline` | `native` | **PASS** |
| `story` | `bold` | `centered` | `mapped` | **PASS** |
| `story` | `cards` | `centered` | `mapped` | **PASS** |
| `story` | `classic` | `default` | `mapped` | **PASS** |
| `story` | `compact` | `centered` | `mapped` | **PASS** |
| `story` | `editorial` | `timeline` | `mapped` | **PASS** |
| `story` | `elegant` | `centered` | `mapped` | **PASS** |
| `story` | `immersive` | `centered` | `mapped` | **PASS** |
| `story` | `luxury` | `centered` | `mapped` | **PASS** |
| `story` | `magazine` | `centered` | `mapped` | **PASS** |
| `story` | `modern` | `centered` | `mapped` | **PASS** |
| `story` | `playful` | `default` | `mapped` | **PASS** |
| `story` | `split` | `split` | `native` | **PASS** |
| `story` | `timeline` | `timeline` | `native` | **PASS** |
| `travel` | `classic` | `cards` | `mapped` | **PASS** |
| `travel` | `compact` | `default` | `mapped` | **PASS** |
| `travel` | `luxury` | `cards` | `mapped` | **PASS** |
| `travel` | `map` | `cards` | `mapped` | **PASS** |
| `travel` | `modern` | `cards` | `mapped` | **PASS** |
| `travel` | `playful` | `cards` | `mapped` | **PASS** |
| `travel` | `split` | `cards` | `mapped` | **PASS** |
| `venue` | `artistic` | `card` | `mapped` | **PASS** |
| `venue` | `bold` | `card` | `mapped` | **PASS** |
| `venue` | `cards` | `card` | `mapped` | **PASS** |
| `venue` | `cinematic` | `default` | `mapped` | **PASS** |
| `venue` | `classic` | `default` | `mapped` | **PASS** |
| `venue` | `compact` | `card` | `mapped` | **PASS** |
| `venue` | `garden` | `card` | `mapped` | **PASS** |
| `venue` | `immersive` | `card` | `mapped` | **PASS** |
| `venue` | `luxury` | `card` | `mapped` | **PASS** |
| `venue` | `magazine` | `card` | `mapped` | **PASS** |
| `venue` | `minimal` | `card` | `mapped` | **PASS** |
| `venue` | `modern` | `card` | `mapped` | **PASS** |
| `venue` | `playful` | `default` | `mapped` | **PASS** |
| `venue` | `refined` | `card` | `mapped` | **PASS** |
| `venue` | `split` | `default` | `mapped` | **PASS** |
| `venue` | `timeline` | `card` | `mapped` | **PASS** |
| `wedding-party` | `artistic` | `default` | `mapped` | **PASS** |
| `wedding-party` | `cards` | `default` | `mapped` | **PASS** |
| `wedding-party` | `classic` | `default` | `mapped` | **PASS** |
| `wedding-party` | `filmstrip` | `default` | `mapped` | **PASS** |
| `wedding-party` | `grid` | `grid` | `native` | **PASS** |
| `wedding-party` | `luxury` | `default` | `mapped` | **PASS** |
| `wedding-party` | `magazine` | `default` | `mapped` | **PASS** |
| `wedding-party` | `minimal` | `default` | `mapped` | **PASS** |
| `wedding-party` | `modern` | `default` | `mapped` | **PASS** |
| `wedding-party` | `polaroid` | `default` | `mapped` | **PASS** |

## FAIL count by section type

| section type | fail count |
|---|---|
| `accommodations` | 0 |
| `countdown` | 0 |
| `dress-code` | 0 |
| `faq` | 0 |
| `footer-cta` | 0 |
| `gallery` | 0 |
| `hero` | 0 |
| `registry` | 0 |
| `rsvp` | 0 |
| `schedule` | 0 |
| `story` | 0 |
| `travel` | 0 |
| `venue` | 0 |
| `wedding-party` | 0 |

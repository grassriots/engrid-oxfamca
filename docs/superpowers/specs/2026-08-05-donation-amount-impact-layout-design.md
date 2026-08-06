# Donation Amount Impact Layout — Design

**Date:** 2026-08-05
**Status:** Approved for implementation planning

## Goal

Let any Oxfam EN donation page opt into a richer donation amount array: each amount becomes a
full-width row with an icon on the left, the amount (and frequency suffix) beside it, and a line of
impact copy below. The layout is driven entirely by an optional `impactArray` JavaScript variable
added through the EN admin interface as a code component.

When that component is absent, the page must behave exactly as it does today.

Reference mockups live in `mockup/` (gitignored): `impact.png` (full, one-time),
`impact-monthly.png` (full, monthly), `impact-half.png` (half, two-up).

## Context and constraints

Findings gathered from the live page `https://secured.oxfam.ca/page/109198/donate/1?mode=DEMO`.
The rendered DOM differs from source because EN and ENGrid both manipulate it, so these were
verified in a real browser rather than read from markup.

### Real DOM structure

Each amount is an `.en__field__item` containing a radio and its label:

```html
<div class="en__field__item">
  <input id="transaction_donationAmt1" class="en__field__input en__field__input--radio"
         type="radio" name="transaction.donationAmt" value="100" aria-required="true">
  <label for="transaction_donationAmt1" class="en__field__label en__field__label--item">$100</label>
</div>
```

The "Other" option is a normal radio with `value="other"` and label `Other`. A separate,
trailing `.en__field__item--other.en__field__item--hidden` holds the
`transaction.donationAmt.other` text input.

The container is the formblock carrying `radio-to-buttons_donationAmt`, which on this page also
carries `donation-amount_count_3`.

### EN's gift-swap replaces rows on frequency change

Switching frequency swaps the entire amount set — one-time `50/100/250/500/1000` becomes monthly
`10/15/25/50/75` — and `document.body` updates
`data-engrid-transaction-recurring-frequency` (`onetime` → `monthly`) and
`data-engrid-transaction-recurring` (`n` → `y`).

A probe test (tagging nodes, switching frequency, checking survival) established precisely what is
destroyed:

| Node | Outcome |
| --- | --- |
| `.en__field--donationAmt` | same node, survives |
| `.en__field__element` | **same node, survives** |
| `.en__field__item` (radio rows) | destroyed and recreated |
| `.en__field__item--other` (text input) | survives |
| nodes injected into a row | destroyed |

`.en__field__element` surviving for the life of the page is what makes a `MutationObserver`
viable. Any one-shot decoration pass or `setTimeout` approach would silently lose its work on the
first frequency change.

### Existing mechanisms this feature reuses

- **Column count.** ENGrid ships `.donation-amount_count_1` … `_5`, which set
  `--donation-amount__button_count`, consumed by
  `flex-basis: calc(100% / var(--donation-amount__button_count))`
  (`_engrid-donations.scss:361`). No new layout maths is needed.
- **Emergency theming.** `[data-engrid-subtheme="emergency"]` already flips `--color_primary`
  from `#f16e22` to `#ff1d34` (`page-template-styles.scss:783`). The DEMO page runs this subtheme.
- **Checked-state styling.** ENGrid styles `input[type=radio]:checked + label`, so selection state
  is expressible in pure CSS.
- **Optional-component precedent.** `thankYouDonation()` in `src/scripts/main.js` already reads a
  `window`-scoped config object and returns early when its marker is absent.

### Mobile specificity hazard

`src/sass/page-template-styles.scss` forces two columns on small screens. Compiled output:

```css
@media (max-width:425px){
  [data-engrid-theme=oxfamca][data-engrid-layout] .radio-to-buttons_donationAmt{
    --donation-amount__button_count:2
  }
}
```

That selector is specificity (0,3,0); ENGrid's `.donation-amount_count_1` is (0,1,0). Adding
ENGrid's count class alone would therefore lose below 426px, turning full-width impact rows into a
cramped two-up grid. Our stylesheet must own the column count while impact layout is active.

## Config contract

```js
<script>
var impactArray = {
  layout: "full",              // "full" | "half"  — default "full", matched case-insensitively

  otg: [                       // one-time gift amounts
    { amount: 100,
      icon:   "https://…/kit-peach.png",
      impact: "can provide emergency hygiene kits for two families in crisis" },
    { amount: 150,
      icon:   "https://…/water-green.png",
      impact: "can provide clean, safe water for three families in an emergency" },
    { amount: "other",
      label:  "Other amount",
      icon:   "https://…/heart-purple.png",
      impact: "Give what feels right — every dollar fights inequality" }
  ],

  monthly: [ /* same shape, monthly amounts */ ]
};
</script>
```

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `layout` | `"full"` \| `"half"` | no | Defaults to `full`. Unknown values fall back to `full` with a warning. Page-wide, not per-frequency. |
| `otg` | array | no | Entries for the one-time frequency. |
| `monthly` | array | no | Entries for the monthly frequency. |
| `amount` | number \| `"other"` | yes | Matched against the radio's `value`. |
| `icon` | string (URL) | no | PNG containing the tinted tile **and** the glyph. |
| `impact` | string | no | Plain text, rendered below the amount. |
| `label` | string | no | Replaces the displayed amount text. Needed for the Other row. |

### Matching

Entries are found by string-coerced comparison: `String(entry.amount) === input.value`. This gives
one lookup path for both numeric amounts and `"other"`, and absorbs the number-vs-string mismatch
between authored config (`100`) and rendered markup (`value="100"`).

### Frequency selection

Read `document.body[data-engrid-transaction-recurring-frequency]`, lowercased. `onetime` selects
`otg`; `monthly` selects `monthly`. If the attribute is absent (single-frequency page), fall back to
the checked `[name="transaction.recurrfreq"]` radio, then to `onetime`.

Pages may offer frequencies beyond these two — the container carries `recurring-frequency_count_3`.
An active frequency with no corresponding array renders every row plain, the same path as an
unmatched amount.

### The `theme` key was removed

The original sketch included `theme: "emergency" | "normal"`. It is not implemented. Rows derive
their accent from theme tokens instead, so a page already running
`[data-engrid-subtheme="emergency"]` styles itself correctly with no component change, and the two
mechanisms cannot disagree.

## Architecture

**Approach: decorate EN's existing markup in place.** EN's
`.en__field__item > input + label` structure is preserved exactly. The icon and impact nodes are
injected *inside* the existing `<label>`; classes are added to the item and container.

The radio's `name`, `value`, `id` and `aria-required`, and the label's `for`, are never touched.
On a live payment page that matters more than structural elegance: click-to-select, the gift-swap,
form submission, and ENGrid's own amount modules (which bind `.en__field__input--other` and
`.en__field--withOther`) all keep working.

Rejected alternatives:

- **Rebuild the array with custom markup.** Would require faithfully recreating `name`, `value`,
  sequential `id`s, `aria-required` and `for` pairing, and EN's gift-swap overwrites it on every
  frequency change regardless. Unjustifiable risk beside the card fields for a visual outcome.
- **CSS-only via `data-` attributes and pseudo-elements.** Fewest injected nodes, but pseudo-element
  text resists selection and translation, the icon loses its `alt`, multi-line wrapping inside
  `content` is awkward, and it still needs the same observer since attributes live on recreated
  nodes.

### File layout

| File | Responsibility |
| --- | --- |
| `src/scripts/impact-amounts.js` | New module. Exports `initImpactAmounts()`. |
| `src/scripts/main.js` | Imports and calls it in the existing payment-page branch. |
| `src/sass/_impact-amounts.scss` | New partial, all feature styles. |
| `src/sass/main.scss` | Imports the partial after `page-template-styles`. |
| `src/sass/page-template-variables.scss` | Two new SCSS variables for the brand orange and emergency red. |
| `src/sass/page-template-styles.scss` | Two existing `--color_primary` declarations reference those variables. |

`src/scripts/main.js` is a 557-line `customScript` handling a dozen unrelated jobs. This feature
gets its own module rather than being added to that pile. Refactoring the rest of `main.js` is out
of scope.

### Module shape

Logic is separated from DOM work so the tricky parts are independently testable:

| Function | Purity | Responsibility |
| --- | --- | --- |
| `resolveConfig(raw)` | pure | Validate and normalise `window.impactArray`; return `null` if unusable. |
| `selectArray(config, frequency)` | pure | Pick `otg` / `monthly`, or `null`. |
| `findEntry(array, value)` | pure | String-coerced amount match. |
| `buildRow(entry, amountText, period)` | pure | Return the label's inner HTML. |
| `decorate()` | DOM | Apply `buildRow` across current rows; idempotent. |
| `initImpactAmounts()` | DOM | Guard, first pass, wire observers. |

## Decoration lifecycle

Called from the payment-page branch of `main.js` (`main.js:540-549`), alongside
`preSelectDonationValue()` — not on the thank-you page.

### The decorate pass

For each `.en__field__item` containing a `[name="transaction.donationAmt"]` radio:

1. Read display text from the label's `textContent`, preserving EN's own currency formatting.
2. Look up the entry by string-coerced `value`.
3. Rewrite the label's inner HTML as a fixed structure.

Rebuilding from known parts rather than wrapping in place makes the pass inherently idempotent:
no double-wrapping, no accumulation, safe to run any number of times. Rows with no matching entry
get the same structure minus the icon and impact nodes, keeping the amount aligned to the same x so
the column does not jog.

### Re-apply triggers

```js
// 1. gift-swap replaces the rows
new MutationObserver(decorate).observe(fieldElement, { childList: true });   // no subtree

// 2. frequency changed without a gift-swap list configured
new MutationObserver(decorate).observe(document.body, {
  attributes: true,
  attributeFilter: ["data-engrid-transaction-recurring-frequency"]
});
```

The first covers the observed gift-swap. The second covers a page with no swap list, where rows
survive but the active array and the `/ month` suffix must still change. Both call the same
idempotent `decorate()`.

**This cannot loop.** The row observer watches `childList` **without** `subtree`, and injected nodes
are grandchildren of the observed element, so writing them fires nothing. Classes are added but
attributes are not observed on the field. The body observer is filtered to a single attribute the
module never writes.

### Selection state needs no JavaScript

`input:checked + label` drives the accent border, tinted background, accent amount and filled check
badge entirely in CSS. Selection therefore stays correct in the window between EN swapping rows and
the observer firing, and keeps working even if the script fails to run.

## Markup

```html
<div class="en__field__item impact-row impact-row--matched">
  <input type="radio" name="transaction.donationAmt" value="100" id="transaction_donationAmt1">
  <label for="transaction_donationAmt1" class="en__field__label en__field__label--item">
    <img class="impact-row__icon" src="…/kit-peach.png" alt="" aria-hidden="true">
    <span class="impact-row__body">
      <span class="impact-row__amount">$100<span class="impact-row__period">/ month</span></span>
      <span class="impact-row__impact">can provide emergency hygiene kits for two families in crisis</span>
    </span>
    <span class="impact-row__indicator" aria-hidden="true"></span>
  </label>
</div>
```

The container receives `impact-amounts` plus `impact-amounts--full` or `impact-amounts--half`.
EN's own classes, including `donation-amount_count_3`, are left in place — our CSS wins on
specificity rather than by mutating class lists, which avoids depending on stylesheet source order.

`__period` is rendered only when the active frequency is monthly, derived from frequency rather than
config, with `text-transform: uppercase` supplying the mockup's `/ MONTH`.

The indicator is a real element rather than a pseudo-element because ENGrid already claims
`label:before` to hide the native radio dot (`_engrid-donations.scss:150`).

### Accessibility

- Icon is decorative: `alt=""` and `aria-hidden="true"`. The impact copy carries the meaning.
- Indicator is decorative; the real radio conveys state to assistive technology.
- Impact text inside the label makes the accessible name
  "$100 can provide emergency hygiene kits for two families in crisis" — an improvement on today's
  bare "$100".
- Existing focus styling for `.en__field__input--radio:focus + .en__field__label` is preserved.
- In `half`, unselected rows show no indicator (per mockup); state is still conveyed by border and
  background, and by the radio itself.

## Styling

### Tokens

The accent is the theme's own primary colour, referenced rather than restated:

```scss
// src/sass/_impact-amounts.scss
.impact-amounts {
  --impact-row_accent: var(--color_primary);        // #f16e22, → #ff1d34 under emergency
  --impact-row_background_checked: rgba($color_primary_normal, 0.1);
  --impact-row_border-color: #cacaca;
  --impact-row_amount-color: #333;
  --impact-row_impact-color: #555;
  --impact-row_icon-size: 56px;                    // 48px below 426px
}
[data-engrid-subtheme="emergency"] .impact-amounts {
  --impact-row_background_checked: rgba($color_primary_emergency, 0.1);
}
```

**The accent needs no emergency override.** It follows `--color_primary`, which the existing
subtheme already flips. Only the tint needs a second declaration, because SCSS `rgba()` resolves at
build time and cannot read a CSS custom property.

**Theme colours take priority over the mockups.** Where a colour already exists in the theme and is
in use, that value wins over sampling the mockup. The mockup's selected orange reads closer to the
`#f05523` held in `--button_background-color_checked`, but `--color_primary` is the theme's primary
orange, is what the submit button uses, and is the value the emergency subtheme overrides — so it is
the correct source. Any small difference from the mockup is accepted deliberately.

### One source of truth for the two brand colours

So the tint cannot drift from the accent, the two hex values move into SCSS variables and the
existing theme declarations reference them:

```scss
// src/sass/page-template-variables.scss  (imported first by main.scss)
$color_primary_normal:    #f16e22;
$color_primary_emergency: #ff1d34;
```

```scss
// src/sass/page-template-styles.scss
--color_primary: $color_primary_normal;      // was #f16e22        (line 24)
--color_primary: $color_primary_emergency;   // was #ff1d34        (line 788, emergency block)
```

Two one-line edits to existing declarations, in service of this feature: the runtime accent and the
build-time tint now resolve from the same source, so changing a brand colour cannot leave them
inconsistent. `rgba()` at build time also avoids `color-mix()` and any runtime channel arithmetic
entirely.

`color-mix()` was considered and rejected: `.browserslistrc` (`> 2%`, `not IE 11`) resolves only to
very recent browsers, which is an artefact of the usage query rather than evidence that older
browsers never visit a donation page.

### States

Driven by `input:checked + label`, no JavaScript:

| | Unselected | Selected |
| --- | --- | --- |
| Border | 1px `--impact-row_border-color` | 1px `--impact-row_accent` + inset shadow to read as 2px |
| Background | white | `--impact-row_background_checked` |
| Amount | `#333` | `--impact-row_accent` |
| Indicator (full) | 2px grey ring, transparent centre | filled accent, white check |
| Indicator (half) | hidden | filled accent, white check, top-right |

The selected border reads as 2px via `box-shadow: inset 0 0 0 1px` rather than an actual 2px border,
so selecting a row does not shift layout by a pixel.

### Layout

The label becomes `display: flex; align-items: flex-start; gap: 20px`, with icon and `__body` as
siblings — which keeps impact copy from wrapping beneath the icon, matching `impact-half.png`. For
equal-height pairs in `half`, the label takes `height: 100%`.

Border radius uses `var(--button_border-radius)`, which oxfamca sets to `0`, consistent with the
squared cards in the mockups. The icon PNG carries its own rounded corners, so it is only sized.

Column count, at specificity beating both `.donation-amount_count_3` (0,1,0) and the mobile rule
(0,3,0):

```scss
[data-engrid-theme="oxfamca"][data-engrid-layout]
  .radio-to-buttons_donationAmt.impact-amounts {
  --donation-amount__button_count: 1;
  @media (min-width: 426px) {
    &.impact-amounts--half { --donation-amount__button_count: 2; }
  }
}
```

`half` is therefore two-up from 426px and single-column below it.

## The Other row and its revealed input

Reference: `mockup/impact-other-selected.png`.

**The problem found in browser verification.** ENGrid's own deployed stylesheet sets `display: none`
on the `value="other"` radio row. Everything the feature renders into that row — icon, "Other
amount", impact copy — is therefore invisible, while the Other control donors actually see is the
separate `.en__field__item--other` text input, which the feature skips and which keeps ENGrid's dark
button styling. Left alone, the Other row cannot match the mockups on this page.

**Resolution.** The Other radio row is unhidden and styled like every other impact row. Selecting it
reveals the ENGrid text input beneath it. Verified on the live page:

| Behaviour | Owner |
| --- | --- |
| Clicking the Other radio adds `en__field--withOther--active` to the field | ENGrid, already works |
| Selecting it drops `en__field__item--hidden` from the input item | ENGrid, already works |
| Typing an amount updates the submit button ("Give $42") | ENGrid, already works |
| Unhiding the Other radio row | **this feature** |
| Hiding the text input until Other is selected | **this feature** |
| Styling the revealed input | **this feature** |

So no JavaScript is required — ENGrid owns the state, and the feature owns only presentation:

```scss
// ENGrid hides the value="other" radio row outright; inside impact layout it is a
// real row and must show.
.impact-amounts .en__field--donationAmt .en__field__item.impact-row { display: flex !important; }

// The raw text input appears only once Other is actually selected.
.impact-amounts .en__field--donationAmt:not(.en__field--withOther--active)
  .en__field__item--other { display: none !important; }
```

Both need `!important` for the same reason the checked-row rule does: the competing declarations
come from stylesheets this bundle does not control.

**Deliberately out of scope**, flagged rather than silently changed — each is existing behaviour the
mockup happens to depict differently:

- The input placeholder is `"Other"`, set by `preSelectDonationValue()` in `main.js`. The mockup
  shows "Enter amount". Changing it alters behaviour shipped in commit `b634fc9`.
- "Minimum donation $5" helper text. Not currently rendered by this feature or, apparently, the page.
- The submit button reading "Enter an amount" when empty. Today it renders "Give" with a blank
  amount. That label is ENGrid/EN configuration, not this feature.

## Failure modes

The entire init is wrapped in `try/catch`. A malformed config logs a warning and leaves the page
untouched. **No config can take the donation form down** — the module's most important property.

| Condition | Behaviour |
| --- | --- |
| `window.impactArray` undefined or not an object | Return before any DOM write; no class added; page identical to today. |
| No array for the active frequency | All rows plain; warn once naming the frequency. |
| Amount has no matching entry | Plain row, amount aligned; warn once listing unmatched values. |
| `icon` URL 404s | `onerror` removes the `<img>`; row keeps impact text and alignment. |
| Entry missing `impact` or `icon` | Render whichever parts exist; neither is required. |
| Unknown `layout` value | Fall back to `full`; warn. |
| Any exception during decorate | Caught and logged; page left in last good state. |

Unmatched rows keep the impact layout rather than reverting to button styling, so a partially
configured array still reads as one coherent list instead of two mixed designs.

## Verification

No test runner exists in this project. Verification is a manual protocol against the live DEMO page
with the config injected via devtools; the pure functions above are structured so unit tests can be
added later without rework.

1. No config → behaviour identical to today; no `impact-amounts` class present
2. `full` renders per `impact.png`; `half` renders per `impact-half.png` and collapses to one column
   below 426px
3. Frequency switch re-decorates: `50/100/250/500/1000` → `10/15/25/50/75`, `/ month` appears, and
   the correct array is selected
4. Rapid frequency toggling leaves no duplicated or orphaned nodes
5. Selected state remains correct with JS disabled after first paint
6. Unmatched amounts render plain and aligned; console names them
7. Other row shows label, icon and impact; typing an amount still selects it and still submits
8. Emergency and normal pages each pick up the correct accent automatically
9. Keyboard: tab into the group, arrow between rows, focus ring intact
10. Screen reader announces "$100 can provide emergency hygiene kits for two families in crisis"
11. A real DEMO-mode submission completes — the payment path must be untouched

## Decisions on record

| Decision | Rationale |
| --- | --- |
| Icon PNG contains the whole tile | Explains why the same glyph appears in two colourways across mockups; no schema growth, no palette logic, design keeps control. |
| Other row is an entry with `amount: "other"` | One lookup path, no special-casing; `label` supplies "Other amount". |
| `theme` key dropped | `[data-engrid-subtheme="emergency"]` already exists; two mechanisms could disagree. |
| Accent is `var(--color_primary)` | A colour already in the theme and in use takes priority over one sampled from the mockup. `--color_primary` is the theme's primary orange (`#f16e22`), drives the submit button, and is what the emergency subtheme already overrides — so emergency needs no accent override at all. Accepts a small difference from the mockup, which reads nearer `#f05523`. |
| The two brand hexes move into SCSS variables | The accent resolves at runtime from `--color_primary` while the tint resolves at build time via `rgba()`; sharing one source stops them drifting when a brand colour changes. |
| Tint is `rgba(accent, 0.1)`, not `0.4` | At `0.4` the accent amount measures 2.11:1 against its own tint (fails even large-text AA), and impact text on the emergency tint measures 3.99:1 (fails AA). At `0.1` both clear AA comfortably and the result matches the mockup cream. Recorded because `0.4` was initially requested. |
| Unmatched amounts render plain rather than disabling the feature | One typo shouldn't silently remove the whole layout, which reads as broken code. |
| `half` collapses to one column on mobile | Two impact rows on a phone would give each roughly 160px for icon plus two lines of copy. |
| Manual verification, no test runner added | jsdom cannot reproduce EN's gift-swap, which is the riskiest behaviour; pure functions stay testable for later. |

## Out of scope

- Refactoring the rest of `src/scripts/main.js`
- Changing EN gift-swap amounts, or any part of the payment path
- Per-frequency `layout`
- Deploying the built assets to the CDN

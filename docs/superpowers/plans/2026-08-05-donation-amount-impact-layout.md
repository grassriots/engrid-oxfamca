# Donation Amount Impact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional icon-plus-impact-text layout to donation amount arrays on Oxfam EN pages, driven by an `impactArray` variable injected through an EN code component, that is a complete no-op when the component is absent.

**Architecture:** A self-contained ES module decorates EN's existing `.en__field__item > input + label` markup in place — injecting nodes inside each label without touching the radio's `name`, `value`, `id`, `aria-required`, or the label's `for`. Because EN's gift-swap destroys and recreates those rows on every frequency change, decoration re-applies via a `MutationObserver` on the surviving `.en__field__element`. Selection state is pure CSS (`input:checked + label`), so it stays correct even if the script never runs.

**Tech Stack:** Vanilla ES modules bundled by webpack 5 + babel; SCSS compiled via sass-loader; no runtime dependencies added.

**Spec:** `docs/superpowers/specs/2026-08-05-donation-amount-impact-layout-design.md`

## Global Constraints

- **Branch:** `feat/impact-amounts`. Do not commit to `main`.
- **This code runs on a live payment page.** Never modify the radio `input`'s `name`, `value`, `id`, or `aria-required`, and never modify the label's `for`. Never touch the card fields, the submit path, or `transaction.donationAmt.other`.
- **Absent config must be a byte-for-byte behavioural no-op.** If `window.impactArray` is missing or unusable, return before any DOM write and add no classes.
- **All top-level entry code is wrapped in `try/catch`.** No config can throw into the donation form.
- **Build command:** `npx webpack --config webpack.min.js`. Do **not** use `npm run build` — it is `npm run production & npm run minify`, where the single `&` backgrounds the first build and masks its failure.
- **Do not add devDependencies.** No test runner (decided in spec); verification is the manual protocol in Task 8.
- **Do not delete `node_modules`.** A fresh install needs SSH access to the private `grassriots/engrid-scripts-no-history` repo.
- **Do not deploy to the CDN.** Out of scope.
- **Amount matching is string-coerced:** `String(entry.amount) === input.value`.
- **Accent colour is `var(--color_primary)`** — a theme colour already in use takes priority over one sampled from a mockup.
- **Tint alpha is `0.1`, not `0.4`.** At `0.4` the accent amount measures 2.11:1 against its own tint and the emergency tint fails AA at 3.99:1.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/sass/page-template-variables.scss` | **Modify.** Add `$color_primary_normal`, `$color_primary_emergency`. |
| `src/sass/page-template-styles.scss` | **Modify** lines 24 and 788 to reference those variables. |
| `src/scripts/impact-amounts.js` | **Create.** Whole feature: config resolution, row building, decoration, observers. |
| `src/sass/_impact-amounts.scss` | **Create.** All feature styles: column count, tokens, row layout, states. |
| `src/scripts/main.js` | **Modify.** Import and call `initImpactAmounts()` in the payment-page branch. |
| `src/sass/main.scss` | **Modify.** Import the new partial. |

## Reference: the real DOM this code operates on

Verified in-browser on `https://secured.oxfam.ca/page/109198/donate/1?mode=DEMO`.

```html
<div class="en__component en__component--formblock … radio-to-buttons_donationAmt donation-amount_count_3">
  <div class="en__field en__field--radio en__field--recurrfreq">…ONETIME / MONTHLY radios…</div>
  <div class="en__field en__field--radio en__field--withOther en__field--donationAmt en__mandatory">
    <label class="en__field__label">Donation Amount</label>
    <div class="en__field__element en__field__element--radio">
      <div class="en__field__item">
        <input id="transaction_donationAmt0" class="en__field__input en__field__input--radio"
               type="radio" name="transaction.donationAmt" value="50" aria-required="true">
        <label for="transaction_donationAmt0" class="en__field__label en__field__label--item">$50</label>
      </div>
      <!-- … 100, 250, 500, 1000, then value="other" label "Other" … -->
      <div class="en__field__item en__field__item--other en__field__item--hidden">
        <input type="text" name="transaction.donationAmt.other">
      </div>
    </div>
  </div>
</div>
```

**Survival across a frequency change** (probe-tested): `.en__field--donationAmt` and `.en__field__element` keep their identity; every radio `.en__field__item` is destroyed and recreated; `.en__field__item--other` survives; injected nodes are destroyed.

**Frequency signal:** `document.body[data-engrid-transaction-recurring-frequency]` flips `onetime` ↔ `monthly`, and the amount set swaps `50/100/250/500/1000` ↔ `10/15/25/50/75`.

## Reference: verification setup

The CDN URL is hardcoded in the EN page template and there is no `assets=local` loader, so local builds are injected with Chrome DevTools Local Overrides.

1. Build: `npx webpack --config webpack.min.js`
2. Open `https://secured.oxfam.ca/page/109198/donate/1?mode=DEMO`
3. DevTools → **Sources → Overrides** → *Select folder for overrides* → allow access
4. **Network** tab → right-click `engrid.min.js` → **Override content** → replace the contents with your local `dist/engrid.min.js`
5. Repeat for `engrid.min.prod.css` using your local `dist/engrid.min.css`
6. Reload. Overrides persist across reloads, so subsequent rebuilds only need steps 4–5 re-pasted.

**Faster inner loop:** once Task 2 lands, `window.ENGridImpact.init()` re-runs the feature against a fresh `window.impactArray` with no rebuild:

```js
window.impactArray = { layout: "full", otg: [
  { amount: 50,  icon: "https://placehold.co/112x112/FDE9DC/E2601A.png", impact: "can provide emergency hygiene kits for two families in crisis" },
  { amount: 100, icon: "https://placehold.co/112x112/E6F0E0/4A7B28.png", impact: "can provide clean, safe water for three families in an emergency" },
  { amount: "other", label: "Other amount", icon: "https://placehold.co/112x112/EFE6F5/6B3FA0.png", impact: "Give what feels right — every dollar fights inequality" }
], monthly: [
  { amount: 10, icon: "https://placehold.co/112x112/FBF3D4/8A7A1E.png", impact: "can provide school essentials that keep girls learning all year long" },
  { amount: 25, icon: "https://placehold.co/112x112/E6F0E0/4A7B28.png", impact: "can help maintain clean, safe water access for a family" },
  { amount: "other", label: "Other amount", icon: "https://placehold.co/112x112/EFE6F5/6B3FA0.png", impact: "Give what feels right — every dollar fights inequality" }
]};
window.ENGridImpact.init();
```

---

### Task 1: Single source of truth for the two brand colours

The accent resolves at runtime from `--color_primary`; the tint resolves at build time via SCSS `rgba()`. Both must read the same value or they can drift when a brand colour changes.

**Files:**
- Modify: `src/sass/page-template-variables.scss`
- Modify: `src/sass/page-template-styles.scss:24`, `src/sass/page-template-styles.scss:788`

**Interfaces:**
- Consumes: nothing.
- Produces: SCSS globals `$color_primary_normal: #f16e22` and `$color_primary_emergency: #ff1d34`, in scope for every file imported after `page-template-variables` in `main.scss`.

- [ ] **Step 1: Capture a baseline of the compiled CSS**

This task must produce **zero** rendered change — it only moves literals into variables. Capture the baseline to prove that.

```bash
npx webpack --config webpack.min.js
cp dist/engrid.min.css /tmp/impact-baseline.css
```

- [ ] **Step 2: Add the variables**

Append to `src/sass/page-template-variables.scss`:

```scss
// BRAND COLOURS
// Single source of truth. Referenced by the --color_primary custom properties in
// page-template-styles.scss (runtime) and by rgba() tints in _impact-amounts.scss
// (build time). SCSS rgba() cannot read a CSS custom property, so both must resolve
// from these variables or the accent and its tint will drift apart.
$color_primary_normal: #f16e22;
$color_primary_emergency: #ff1d34;
```

- [ ] **Step 3: Point the two declarations at the variables**

`src/sass/page-template-styles.scss:24` — replace `--color_primary: #f16e22;` with:

```scss
  --color_primary: $color_primary_normal;
```

`src/sass/page-template-styles.scss:788` (inside the `&[data-engrid-subtheme="emergency"]` block) — replace `--color_primary: #ff1d34;` with:

```scss
    --color_primary: $color_primary_emergency;
```

- [ ] **Step 4: Rebuild and prove the output is unchanged**

```bash
npx webpack --config webpack.min.js
diff <(tail -c +600 /tmp/impact-baseline.css) <(tail -c +600 dist/engrid.min.css) && echo "IDENTICAL — no rendered change"
```

Expected: `IDENTICAL — no rendered change`. The `tail -c +600` skips the build-date banner, which differs between builds by design.

If the diff is non-empty, the refactor changed rendered output — inspect before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/sass/page-template-variables.scss src/sass/page-template-styles.scss
git commit -m "Extract brand colours into SCSS variables

The impact row accent resolves at runtime from --color_primary while its
tint resolves at build time via rgba(); sharing one source stops them
drifting apart. Compiled CSS is byte-identical."
```

---

### Task 2: Config resolution, frequency detection, and the module entry point

Produces a working module that resolves config and logs what it found, with no DOM writes. This isolates the whole config contract behind one verification step before any markup changes.

**Files:**
- Create: `src/scripts/impact-amounts.js`
- Modify: `src/scripts/main.js` (add import at top; add call in the payment-page branch at line ~540)

**Interfaces:**
- Consumes: `$color_primary_normal` / `$color_primary_emergency` are not used here (Task 5 uses them).
- Produces, all named exports of `src/scripts/impact-amounts.js`:
  - `resolveConfig(raw: unknown) => {layout: "full"|"half", otg: Entry[]|null, monthly: Entry[]|null} | null`
  - `readFrequency() => string` — lowercased, e.g. `"onetime"`, `"monthly"`
  - `selectArray(config, frequency: string) => Entry[] | null`
  - `findEntry(array: Entry[]|null, value: string) => Entry | null`
  - `initImpactAmounts() => void` — idempotent; safe to call repeatedly
  - `Entry` is `{amount: number|string, icon?: string, impact?: string, label?: string}`
  - Global side effect: `window.ENGridImpact = { init: initImpactAmounts }`

- [ ] **Step 1: Create the module**

Create `src/scripts/impact-amounts.js`:

```js
/**
 * Icon + impact-text layout for donation amount arrays.
 *
 * Driven by an optional `window.impactArray` set by an EN code component.
 * When that variable is absent or unusable this module returns before any DOM
 * write, leaving the page exactly as it was.
 *
 * See docs/superpowers/specs/2026-08-05-donation-amount-impact-layout-design.md
 */

const LOG_PREFIX = "[impact-amounts]";

// Maps the value of body[data-engrid-transaction-recurring-frequency] to a config key.
const FREQUENCY_ARRAY_KEYS = {
  onetime: "otg",
  monthly: "monthly",
};

const LAYOUTS = ["full", "half"];

function isUsableEntry(entry) {
  return (
    !!entry &&
    typeof entry === "object" &&
    entry.amount !== undefined &&
    entry.amount !== null
  );
}

function usableArray(value) {
  if (!Array.isArray(value)) return null;
  const entries = value.filter(isUsableEntry);
  return entries.length ? entries : null;
}

/**
 * Validate and normalise raw config. Returns null when there is nothing usable,
 * which callers treat as "leave the page alone".
 */
export function resolveConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const requested = raw.layout === undefined ? "full" : String(raw.layout).toLowerCase();
  const layout = LAYOUTS.indexOf(requested) === -1 ? "full" : requested;
  if (layout !== requested) {
    console.warn(`${LOG_PREFIX} unknown layout "${raw.layout}" - falling back to "full"`);
  }

  const otg = usableArray(raw.otg);
  const monthly = usableArray(raw.monthly);
  if (!otg && !monthly) {
    console.warn(`${LOG_PREFIX} no usable "otg" or "monthly" array - leaving page unchanged`);
    return null;
  }

  return { layout, otg, monthly };
}

/**
 * Current gift frequency, lowercased. ENGrid keeps the body attribute current;
 * the radio and the "onetime" default cover single-frequency pages.
 */
export function readFrequency() {
  const attr = document.body.getAttribute("data-engrid-transaction-recurring-frequency");
  if (attr) return attr.toLowerCase();

  const checked = document.querySelector('[name="transaction.recurrfreq"]:checked');
  if (checked && checked.value) return checked.value.toLowerCase();

  return "onetime";
}

export function selectArray(config, frequency) {
  const key = FREQUENCY_ARRAY_KEYS[frequency];
  if (!key) return null;
  return config[key] || null;
}

/**
 * String-coerced match, so authored `100` finds rendered value="100" and
 * `"other"` finds the Other radio through the same path.
 */
export function findEntry(array, value) {
  if (!array) return null;
  for (let i = 0; i < array.length; i += 1) {
    if (String(array[i].amount) === value) return array[i];
  }
  return null;
}

let state = null;

export function initImpactAmounts() {
  try {
    const config = resolveConfig(window.impactArray);
    if (!config) return;

    if (state) {
      state.config = config;
      console.log(`${LOG_PREFIX} re-initialised`, describe(config));
      return;
    }

    const fields = Array.prototype.slice.call(
      document.querySelectorAll(".en__field--donationAmt")
    );
    if (!fields.length) {
      console.warn(`${LOG_PREFIX} no .en__field--donationAmt on this page - nothing to do`);
      return;
    }

    state = { config, fields, warned: {} };
    console.log(`${LOG_PREFIX} initialised`, describe(config));

    window.ENGridImpact = { init: initImpactAmounts };
  } catch (error) {
    console.warn(`${LOG_PREFIX} initialisation failed; page left unchanged`, error);
  }
}

function describe(config) {
  const frequency = readFrequency();
  const entries = selectArray(config, frequency);
  return {
    layout: config.layout,
    frequency,
    entriesForFrequency: entries ? entries.length : 0,
    amounts: entries ? entries.map((entry) => String(entry.amount)) : [],
  };
}
```

- [ ] **Step 2: Wire it into main.js**

Add as the first line of `src/scripts/main.js`, above `export const customScript`:

```js
import { initImpactAmounts } from "./impact-amounts";
```

Then in the payment-page branch (currently `main.js:540-550`), add the call after `preSelectDonationValue();`:

```js
}else{
  //Payment Page functions
  console.log('On payment page - executing payment functions');
  preSelectDonationValue();
  initImpactAmounts();
  checkDefaultValues();
```

- [ ] **Step 3: Build**

```bash
npx webpack --config webpack.min.js
```

Expected: `compiled with 3 warnings` (the three pre-existing asset-size warnings). No errors.

- [ ] **Step 4: Verify no-op when config is absent**

Load the DEMO page with the override from the *Reference: verification setup* section, without setting `window.impactArray`.

Expected in console: **no** `[impact-amounts]` line at all. Expected in DOM: `document.querySelector(".impact-amounts")` returns `null`. The page looks and behaves exactly as before.

- [ ] **Step 5: Verify config resolution**

The `window.ENGridImpact` hook only exists after a successful init, so the *first* run must have config present before `customScript` executes. Use DevTools Local Overrides on the page document to insert the config snippet from *Reference: verification setup* as an inline `<script>` in `<head>`, then reload. That also mirrors the production ordering, where the EN component's inline script runs during parse.

Once that first init succeeds, the hook is available and every later iteration is just `window.impactArray = {…}; window.ENGridImpact.init()` with no reload.

Expected console output on load:

```
[impact-amounts] initialised {layout: "full", frequency: "onetime", entriesForFrequency: 3, amounts: ["50","100","other"]}
```

Then run these assertions in the console:

```js
const m = window.ENGridImpact;                    // hook exists after a successful init
console.assert(typeof m.init === "function", "init hook missing");
document.getElementById("en__field_transaction_recurrfreq1").click();
setTimeout(() => m.init(), 1500);                 // expect frequency: "monthly", amounts ["10","25","other"]
```

Expected: the second log reports `frequency: "monthly"` with the monthly amounts.

- [ ] **Step 6: Verify malformed config cannot throw**

```js
window.impactArray = "nonsense";      window.ENGridImpact.init();   // warns, no throw
window.impactArray = { layout: "Half", otg: [] };  window.ENGridImpact.init();  // warns twice, no throw
window.impactArray = { layout: "HALF", otg: [{ amount: 50 }] };  window.ENGridImpact.init();  // layout "half"
```

Expected: warnings only, no uncaught exceptions, page unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/impact-amounts.js src/scripts/main.js
git commit -m "Add impact-amounts config resolution

Resolves and validates window.impactArray, detects gift frequency from
the ENGrid body attribute, and selects the matching entry array. Logs
only - no DOM writes yet. Returns before any work when config is absent."
```

---

### Task 3: Layout classes and column count

Makes rows full width. No icons or impact text yet, so this isolates the specificity problem — which is the single easiest thing to get wrong in this feature.

**Files:**
- Create: `src/sass/_impact-amounts.scss`
- Modify: `src/sass/main.scss`
- Modify: `src/scripts/impact-amounts.js`

**Interfaces:**
- Consumes: `initImpactAmounts`, `state` from Task 2.
- Produces: `applyLayout(state) => void`, called from `initImpactAmounts`. Adds `impact-amounts` and `impact-amounts--full|--half` to each `.radio-to-buttons_donationAmt` container ancestor.

- [ ] **Step 1: Create the stylesheet**

Create `src/sass/_impact-amounts.scss`:

```scss
// DONATION AMOUNT IMPACT LAYOUT
// Applied only when an EN code component defines window.impactArray.
// See docs/superpowers/specs/2026-08-05-donation-amount-impact-layout-design.md

// COLUMN COUNT
// ENGrid consumes --donation-amount__button_count via
//   flex-basis: calc(100% / var(--donation-amount__button_count))
// This selector must out-specify two existing rules:
//   .donation-amount_count_3                                              (0,1,0)
//   [data-engrid-theme=oxfamca][data-engrid-layout] .radio-to-buttons_donationAmt
//     inside @media (max-width:425px)                                     (0,3,0)
// The mobile rule is why simply adding .donation-amount_count_1 is not enough:
// full-width rows would silently become two-up on phones.
[data-engrid-theme="oxfamca"][data-engrid-layout]
  .radio-to-buttons_donationAmt.impact-amounts {
  --donation-amount__button_count: 1;

  // half is two-up from 426px and single column below it
  @media (min-width: 426px) {
    &.impact-amounts--half {
      --donation-amount__button_count: 2;
    }
  }
}
```

- [ ] **Step 2: Import the partial**

In `src/sass/main.scss`, add after the `@import "./page-template-styles";` line:

```scss
@import "./impact-amounts";
```

It must come after `page-template-styles` so its rules win ties, and after `page-template-variables` (already first) so the brand variables from Task 1 are in scope.

- [ ] **Step 3: Apply the classes from JS**

In `src/scripts/impact-amounts.js`, add above `let state = null;`:

```js
const CONTAINER_SELECTOR = ".radio-to-buttons_donationAmt";

/**
 * Tag each amount array container so the stylesheet can take over the column
 * count. EN's own classes, including donation-amount_count_*, are left in place:
 * our rules win on specificity rather than by mutating class lists, which avoids
 * depending on stylesheet source order.
 */
export function applyLayout(current) {
  current.fields.forEach((field) => {
    const container = field.closest(CONTAINER_SELECTOR);
    if (!container) return;
    container.classList.add("impact-amounts");
    container.classList.remove("impact-amounts--full", "impact-amounts--half");
    container.classList.add(`impact-amounts--${current.config.layout}`);
  });
}
```

In `initImpactAmounts`, call it in both the re-init and first-init paths:

```js
    if (state) {
      state.config = config;
      applyLayout(state);
      console.log(`${LOG_PREFIX} re-initialised`, describe(config));
      return;
    }
```

and after `state = { config, fields, warned: {} };`:

```js
    applyLayout(state);
```

- [ ] **Step 4: Build**

```bash
npx webpack --config webpack.min.js
```

- [ ] **Step 5: Verify the compiled specificity is present**

```bash
grep -o '@media (min-width:426px){\[data-engrid-theme=oxfamca\][^}]*impact-amounts--half[^}]*}' dist/engrid.min.css
grep -o '\[data-engrid-theme=oxfamca\]\[data-engrid-layout\] .radio-to-buttons_donationAmt.impact-amounts{--donation-amount__button_count:1}' dist/engrid.min.css
```

Expected: both print a match. If the second is missing, the partial was not imported.

- [ ] **Step 6: Verify in browser**

With the override in place and the config set, reload. Then:

```js
const c = document.querySelector(".radio-to-buttons_donationAmt");
console.assert(c.classList.contains("impact-amounts"), "container not tagged");
console.assert(c.classList.contains("impact-amounts--full"), "layout class missing");
getComputedStyle(c).getPropertyValue("--donation-amount__button_count");   // " 1"
```

Expected: each amount button is now full width, stacked one per row, still styled as a plain EN button. Resize below 426px — still one per row. Set `layout: "half"` and re-init: two per row above 426px, one per row below.

- [ ] **Step 7: Commit**

```bash
git add src/sass/_impact-amounts.scss src/sass/main.scss src/scripts/impact-amounts.js
git commit -m "Add impact layout column count

Tags the amount container and takes over --donation-amount__button_count
at specificity that beats both .donation-amount_count_3 and the oxfamca
mobile two-column rule, which would otherwise force two-up under 426px."
```

---

### Task 4: Row markup

**Files:**
- Modify: `src/scripts/impact-amounts.js`

**Interfaces:**
- Consumes: `findEntry`, `selectArray`, `readFrequency`, `state`, `applyLayout` from Tasks 2–3.
- Produces:
  - `buildRow(entry: Entry|null, amountText: string, period: string) => DocumentFragment`
  - `decorate(current) => void` — idempotent; safe to call any number of times
  - Per-item cache: `item.dataset.impactAmountText` holds the original label text

- [ ] **Step 1: Add row building and decoration**

In `src/scripts/impact-amounts.js`, add above `let state = null;`:

```js
const AMOUNT_INPUT_SELECTOR = 'input[name="transaction.donationAmt"]';

function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/**
 * Build a row's label contents.
 *
 * Returns DOM nodes rather than an HTML string: config is author-supplied and
 * would otherwise need escaping before reaching innerHTML, and an inline
 * onerror attribute would break under a page CSP. textContent handles both.
 */
export function buildRow(entry, amountText, period) {
  const fragment = document.createDocumentFragment();

  if (entry && entry.icon) {
    const icon = element("img", "impact-row__icon");
    icon.src = entry.icon;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    fragment.appendChild(icon);
  }

  const body = element("span", "impact-row__body");

  const amount = element("span", "impact-row__amount");
  amount.textContent = entry && entry.label ? entry.label : amountText;
  if (period) {
    const suffix = element("span", "impact-row__period");
    suffix.textContent = period;
    amount.appendChild(suffix);
  }
  body.appendChild(amount);

  if (entry && entry.impact) {
    const impact = element("span", "impact-row__impact");
    impact.textContent = entry.impact;
    body.appendChild(impact);
  }

  fragment.appendChild(body);

  const indicator = element("span", "impact-row__indicator");
  indicator.setAttribute("aria-hidden", "true");
  fragment.appendChild(indicator);

  return fragment;
}

function warnOnce(current, key, message) {
  if (current.warned[key]) return;
  current.warned[key] = true;
  console.warn(message);
}

/**
 * Rewrite every amount row for the current frequency.
 *
 * Idempotent by construction: the label is rebuilt from known parts rather than
 * wrapped in place, and the original amount text is cached on the item the first
 * time it is seen, so a second pass never reads our own generated markup.
 */
export function decorate(current) {
  const frequency = readFrequency();
  const entries = selectArray(current.config, frequency);
  const period = frequency === "monthly" ? "/ month" : "";
  const unmatched = [];

  if (!entries) {
    warnOnce(
      current,
      `frequency:${frequency}`,
      `${LOG_PREFIX} no entries configured for frequency "${frequency}" - rows left plain`
    );
  }

  current.fields.forEach((field) => {
    const items = field.querySelectorAll(".en__field__item");

    Array.prototype.forEach.call(items, (item) => {
      // The trailing .en__field__item--other holds a text input named
      // transaction.donationAmt.other, so this selector skips it.
      const input = item.querySelector(AMOUNT_INPUT_SELECTOR);
      if (!input || input.type !== "radio") return;

      const label = item.querySelector("label");
      if (!label) return;

      if (!item.dataset.impactAmountText) {
        item.dataset.impactAmountText = label.textContent.trim();
      }

      const entry = findEntry(entries, input.value);
      if (!entry) unmatched.push(input.value);

      label.replaceChildren(buildRow(entry, item.dataset.impactAmountText, period));

      item.classList.add("impact-row");
      item.classList.toggle("impact-row--matched", !!entry);

      const icon = label.querySelector(".impact-row__icon");
      if (icon) {
        icon.addEventListener("error", () => icon.remove(), { once: true });
      }
    });
  });

  if (unmatched.length) {
    warnOnce(
      current,
      `unmatched:${frequency}`,
      `${LOG_PREFIX} no entry for ${unmatched.join(", ")} (${frequency}) - rows left plain`
    );
  }
}
```

- [ ] **Step 2: Call it from init**

In `initImpactAmounts`, add `decorate(state);` after each `applyLayout` call — in the re-init path:

```js
    if (state) {
      state.config = config;
      applyLayout(state);
      decorate(state);
      console.log(`${LOG_PREFIX} re-initialised`, describe(config));
      return;
    }
```

and in the first-init path, after `applyLayout(state);`:

```js
    decorate(state);
```

- [ ] **Step 3: Build**

```bash
npx webpack --config webpack.min.js
```

- [ ] **Step 4: Verify the markup**

Reload with the override and config in place, then:

```js
const row = document.querySelector(".impact-row--matched");
console.assert(row.querySelector(".impact-row__icon"), "icon missing");
console.assert(row.querySelector(".impact-row__amount"), "amount missing");
console.assert(row.querySelector(".impact-row__impact"), "impact missing");
console.assert(row.querySelector(".impact-row__indicator"), "indicator missing");

// the input must be untouched
const input = row.querySelector("input");
console.assert(input.name === "transaction.donationAmt", "input name changed");
console.assert(input.getAttribute("aria-required") === "true", "aria-required lost");
console.assert(row.querySelector("label").getAttribute("for") === input.id, "for/id pairing broken");

// unmatched rows keep their amount and gain no icon
const plain = document.querySelector(".impact-row:not(.impact-row--matched)");
console.assert(plain.querySelector(".impact-row__amount").textContent.trim().length, "amount text lost");
console.assert(!plain.querySelector(".impact-row__icon"), "unmatched row should have no icon");
```

Expected: all assertions silent. Console warns `no entry for 250, 500, 1000 (onetime) - rows left plain`.

- [ ] **Step 5: Verify idempotency**

```js
const before = document.querySelectorAll(".impact-row__amount").length;
window.ENGridImpact.init(); window.ENGridImpact.init(); window.ENGridImpact.init();
console.assert(document.querySelectorAll(".impact-row__amount").length === before, "nodes duplicated");
console.assert(!/\$\d+\$\d+/.test(document.body.textContent), "amount text doubled");
document.querySelector(".impact-row__amount").textContent;   // "$50", not "$50$50"
```

Expected: counts unchanged, no doubled text. This is what `item.dataset.impactAmountText` protects.

- [ ] **Step 6: Verify clicking still selects**

Click a row's text. Expected: the radio becomes checked (`document.querySelector('[name="transaction.donationAmt"]:checked').value` matches), because `for`/`id` were never touched.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/impact-amounts.js
git commit -m "Add impact row markup

Rebuilds each amount label as icon, amount, optional period, impact text
and indicator. Builds DOM nodes rather than HTML strings so author copy
needs no escaping and no inline onerror is required. Caches the original
amount text per item so repeat passes stay idempotent."
```

---

### Task 5: Row styling

**Files:**
- Modify: `src/sass/_impact-amounts.scss`

**Interfaces:**
- Consumes: `$color_primary_normal`, `$color_primary_emergency` (Task 1); class names from Task 4.
- Produces: no JS interface.

- [ ] **Step 1: Add tokens and row styles**

Append to `src/sass/_impact-amounts.scss`:

```scss
// TOKENS
// The accent references the theme's own primary colour, so the emergency
// subtheme recolours these rows with no override here. Only the tint needs a
// second declaration, because SCSS rgba() resolves at build time and cannot
// read a CSS custom property.
.impact-amounts {
  --impact-row_accent: var(--color_primary);
  --impact-row_background_checked: rgba($color_primary_normal, 0.1);
  --impact-row_border-color: #cacaca;
  --impact-row_amount-color: #333;
  --impact-row_impact-color: #555;
  --impact-row_icon-size: 56px;
  --impact-row_gap: 20px;
  --impact-row_padding: 20px;
  --impact-row_indicator-size: 28px;

  @media (max-width: 425px) {
    --impact-row_icon-size: 48px;
    --impact-row_gap: 14px;
    --impact-row_padding: 14px;
  }
}

[data-engrid-subtheme="emergency"] .impact-amounts {
  --impact-row_background_checked: rgba($color_primary_emergency, 0.1);
}

// ROW
// ENGrid styles the button label at
//   .radio-to-buttons_donationAmt .en__field--donationAmt.en__field--radio
//     input[type=radio]+label                                            (0,4,1)
// so these rules are deliberately deeper to win.
.impact-amounts .en__field--donationAmt.en__field--radio {
  .en__field__item.impact-row > label.en__field__label--item {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: var(--impact-row_gap);
    width: 100%;
    height: 100%;
    margin: 0;
    padding: var(--impact-row_padding);
    text-align: left;
    background-color: #fff;
    border: 1px solid var(--impact-row_border-color);
    border-radius: var(--button_border-radius);
  }

  // Selected. The inset shadow reads as a 2px border without changing the box
  // model, so selecting a row cannot shift layout by a pixel.
  .en__field__item.impact-row > input:checked + label.en__field__label--item {
    background-color: var(--impact-row_background_checked);
    border-color: var(--impact-row_accent);
    box-shadow: inset 0 0 0 1px var(--impact-row_accent);
  }
}

// ELEMENTS
.impact-row__icon {
  flex: 0 0 auto;
  width: var(--impact-row_icon-size);
  height: var(--impact-row_icon-size);
  object-fit: contain;
}

.impact-row__body {
  flex: 1 1 auto;
  min-width: 0;
}

.impact-row__amount {
  display: block;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--impact-row_amount-color);
}

.impact-row__period {
  margin-left: 6px;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--impact-row_impact-color);
}

.impact-row__impact {
  display: block;
  margin-top: 4px;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.35;
  color: var(--impact-row_impact-color);
}

.impact-row__indicator {
  flex: 0 0 auto;
  align-self: center;
  width: var(--impact-row_indicator-size);
  height: var(--impact-row_indicator-size);
  background-color: transparent;
  border: 2px solid var(--impact-row_border-color);
  border-radius: 50%;
}

.impact-amounts .en__field--donationAmt.en__field--radio
  .en__field__item.impact-row > input:checked + label {
  .impact-row__amount {
    color: var(--impact-row_accent);
  }

  .impact-row__indicator {
    background-color: var(--impact-row_accent);
    border-color: var(--impact-row_accent);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' d='M4 10.5l4 4 8-9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 58%;
  }
}

// HALF LAYOUT
// Per impact-half.png the indicator appears only on the selected card, pinned
// top-right, rather than sitting on every row as it does in full.
.impact-amounts--half {
  .impact-row__indicator {
    display: none;
  }

  .en__field__item.impact-row > input:checked + label .impact-row__indicator {
    position: absolute;
    top: 10px;
    right: 10px;
    display: block;
    align-self: auto;
  }
}
```

- [ ] **Step 2: Build**

```bash
npx webpack --config webpack.min.js
```

- [ ] **Step 3: Verify against the mockups**

Reload with the override and config. Compare to `mockup/impact.png`.

Expected: full-width white cards with a grey border; icon tile left; large dark amount; grey impact line beneath; empty grey ring on the right. Selecting a row turns its border and amount orange, tints the background, and fills the ring with an orange check. Selecting does not nudge any layout.

```js
// selected-state styling is pure CSS - confirm no JS ran to produce it
const label = document.querySelector('[name="transaction.donationAmt"]:checked + label');
getComputedStyle(label).borderColor;      // rgb(241, 110, 34) — or rgb(255, 29, 52) on an emergency page
getComputedStyle(label).backgroundColor;  // rgba tint, alpha 0.1
```

- [ ] **Step 4: Verify monthly and half**

Switch to Monthly and re-init. Expected: `/ MONTH` in small caps beside each amount, per `mockup/impact-monthly.png`.

Set `layout: "half"` and re-init. Expected: two cards per line, equal height within a line, icon still left, indicator only on the selected card at top-right, per `mockup/impact-half.png`. Below 426px, one per line.

- [ ] **Step 5: Verify the emergency accent**

The DEMO page already sets `data-engrid-subtheme="emergency"`, so the accent should be red there. To see the normal orange:

```js
document.body.setAttribute("data-engrid-subtheme", "");
// selected row should turn orange (241,110,34) with no re-init
document.body.setAttribute("data-engrid-subtheme", "emergency");
```

Expected: colours change with no JavaScript re-run, because the accent references `--color_primary`.

- [ ] **Step 6: Commit**

```bash
git add src/sass/_impact-amounts.scss
git commit -m "Style impact rows

Flex row of icon, body and indicator, with selected state driven purely
by input:checked + label. Accent references --color_primary so the
emergency subtheme recolours rows with no override."
```

---

### Task 6: Survive the gift-swap

The feature is visually complete but loses itself on the first frequency change. This task is what makes it real.

**Files:**
- Modify: `src/scripts/impact-amounts.js`

**Interfaces:**
- Consumes: `decorate`, `state` from Task 4.
- Produces: `state.observers` — array of `MutationObserver`; `safeDecorate(current) => void`.

- [ ] **Step 1: Confirm the failure you are fixing**

With the current build loaded and config set, switch frequency and observe. Expected: rows revert to plain EN buttons — icons and impact text gone. That is EN's gift-swap replacing every `.en__field__item`.

- [ ] **Step 2: Add the observers**

In `src/scripts/impact-amounts.js`, add above `let state = null;`:

```js
function safeDecorate(current) {
  try {
    decorate(current);
  } catch (error) {
    console.warn(`${LOG_PREFIX} decorate failed; rows left as they were`, error);
  }
}

/**
 * Re-apply decoration when EN rebuilds the rows.
 *
 * Two triggers, one idempotent handler:
 *  1. EN's gift-swap replaces every .en__field__item on frequency change. The
 *     parent .en__field__element keeps its identity for the life of the page,
 *     which is what makes it a valid observation target.
 *  2. A page with no gift-swap list keeps its rows, but the active array and the
 *     "/ month" suffix must still change.
 *
 * This cannot loop: the row observer watches childList WITHOUT subtree and our
 * nodes are grandchildren of the observed element, so writing them fires
 * nothing. The body observer is filtered to one attribute we never write.
 */
function observe(current) {
  current.observers = [];

  current.fields.forEach((field) => {
    const fieldElement = field.querySelector(".en__field__element");
    if (!fieldElement) return;
    const observer = new MutationObserver(() => safeDecorate(current));
    observer.observe(fieldElement, { childList: true });
    current.observers.push(observer);
  });

  const bodyObserver = new MutationObserver(() => safeDecorate(current));
  bodyObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-engrid-transaction-recurring-frequency"],
  });
  current.observers.push(bodyObserver);
}
```

In `initImpactAmounts`, replace `decorate(state);` in the **first-init path only** with:

```js
    decorate(state);
    observe(state);
```

Leave the re-init path calling `decorate(state)` alone — observers are already wired and must not be duplicated.

Also replace the `decorate(state)` call in the re-init path with `safeDecorate(state)` so console-driven re-inits get the same protection.

- [ ] **Step 3: Build**

```bash
npx webpack --config webpack.min.js
```

- [ ] **Step 4: Verify re-decoration on frequency change**

Reload with the override and config. Switch to Monthly.

Expected: within a moment the monthly amounts (10/25/other) appear **already decorated**, with `/ MONTH` suffixes and the monthly entries' icons and copy. Switch back — one-time amounts return decorated. No manual re-init.

```js
document.getElementById("en__field_transaction_recurrfreq1").click();
setTimeout(() => {
  console.assert(document.querySelectorAll(".impact-row--matched").length >= 2, "monthly rows not decorated");
  console.assert(document.querySelector(".impact-row__period"), "period suffix missing");
  console.log([...document.querySelectorAll(".impact-row__amount")].map(n => n.textContent));
}, 1500);
```

- [ ] **Step 5: Verify no leaks under rapid toggling**

```js
const f0 = document.getElementById("en__field_transaction_recurrfreq0");
const f1 = document.getElementById("en__field_transaction_recurrfreq1");
let n = 0;
const t = setInterval(() => { (n++ % 2 ? f0 : f1).click(); if (n > 11) clearInterval(t); }, 250);
setTimeout(() => {
  const rows = document.querySelectorAll(".impact-row").length;
  const amounts = document.querySelectorAll(".impact-row__amount").length;
  console.assert(rows === amounts, `node leak: ${rows} rows vs ${amounts} amounts`);
  console.assert(!/\$\d+\s*\$\d+/.test(document.body.textContent), "doubled amount text");
  console.log("rows:", rows, "amounts:", amounts);
}, 5000);
```

Expected: one `__amount` per row, no doubled text, no runaway growth. If these diverge, the observer is re-entering — check that `subtree` is absent.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/impact-amounts.js
git commit -m "Re-apply decoration after EN's gift-swap

EN replaces every .en__field__item on frequency change, discarding
injected nodes. Observes the surviving .en__field__element for childList
changes, plus the body frequency attribute for pages with no swap list.
Watching childList without subtree keeps our own writes from re-entering."
```

---

### Task 7: Failure modes

**Files:**
- Modify: `src/scripts/impact-amounts.js`

**Interfaces:**
- Consumes: everything above.
- Produces: no new exports. Hardens existing paths.

- [ ] **Step 1: Guard applyLayout and confirm the try/catch boundary**

`initImpactAmounts` is already wrapped, and `safeDecorate` covers every observer callback. Add the one remaining gap — wrap the body of `applyLayout` so a detached container cannot throw during init:

```js
export function applyLayout(current) {
  try {
    current.fields.forEach((field) => {
      const container = field.closest(CONTAINER_SELECTOR);
      if (!container) return;
      container.classList.add("impact-amounts");
      container.classList.remove("impact-amounts--full", "impact-amounts--half");
      container.classList.add(`impact-amounts--${current.config.layout}`);
    });
  } catch (error) {
    console.warn(`${LOG_PREFIX} could not apply layout classes`, error);
  }
}
```

- [ ] **Step 2: Build**

```bash
npx webpack --config webpack.min.js
```

- [ ] **Step 3: Verify each failure mode**

Run each in the console, reloading between the destructive ones:

```js
// 1. absent config - the headline requirement
delete window.impactArray;
// reload: expect NO [impact-amounts] log, and null for the next line
document.querySelector(".impact-amounts");                       // null

// 2. malformed shapes
window.impactArray = null;                     window.ENGridImpact.init();
window.impactArray = [1, 2, 3];                window.ENGridImpact.init();
window.impactArray = { otg: "not an array" };  window.ENGridImpact.init();
window.impactArray = { otg: [null, undefined, {}] };  window.ENGridImpact.init();
// expect: warnings only, zero uncaught exceptions, page unchanged

// 3. unconfigured frequency
window.impactArray = { layout: "full", otg: [{ amount: 50, impact: "x" }] };
window.ENGridImpact.init();
document.getElementById("en__field_transaction_recurrfreq1").click();
// expect: warns once about "monthly", monthly rows render plain and aligned

// 4. broken icon URL
window.impactArray = { layout: "full", otg: [{ amount: 50, icon: "https://example.invalid/nope.png", impact: "x" }] };
window.ENGridImpact.init();
setTimeout(() => console.assert(!document.querySelector(".impact-row__icon"), "broken icon not removed"), 2000);
// expect: no broken-image glyph; row keeps its impact text and alignment

// 5. entry with neither icon nor impact
window.impactArray = { layout: "full", otg: [{ amount: 50 }] };
window.ENGridImpact.init();
// expect: row renders with just its amount, no errors
```

Expected throughout: the donation form stays fully usable and no exception escapes.

- [ ] **Step 4: Confirm no exceptions escaped**

With DevTools console filtered to **Errors**, repeat step 3. Expected: no new errors beyond the 15 pre-existing ones the page logs on load.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/impact-amounts.js
git commit -m "Harden impact-amounts against malformed config

Wraps applyLayout so a detached container cannot throw during init,
completing the guarantee that no config value can throw into the
donation form."
```

---

### Task 8: Full acceptance pass

**Files:**
- Modify: none unless a check fails.

**Interfaces:**
- Consumes: the complete feature.
- Produces: a verified build and a recorded result for each spec check.

- [ ] **Step 1: Clean build from the committed tree**

```bash
git status --porcelain          # expect empty
npx webpack --config webpack.min.js
ls -l dist/engrid.min.js dist/engrid.min.css
```

Expected: `compiled with 3 warnings`, no errors, clean tree.

- [ ] **Step 2: Work the spec's 11-point checklist**

Load the DEMO page with both overrides. Record pass/fail for each:

1. No config → behaviour identical to today; `document.querySelector(".impact-amounts")` is `null`; no `[impact-amounts]` console line
2. `full` matches `mockup/impact.png`; `half` matches `mockup/impact-half.png` and collapses to one column below 426px
3. Frequency switch re-decorates: `50/100/250/500/1000` → `10/15/25/50/75`, `/ MONTH` appears, correct array selected
4. Rapid frequency toggling leaves no duplicated or orphaned nodes
5. Selected state still correct with JavaScript disabled after first paint
6. Unmatched amounts render plain and aligned; console names them
7. Other row shows its label, icon and impact; typing an amount still selects it and still submits
8. Emergency and normal pages each pick up the correct accent automatically
9. Keyboard: tab into the group, arrow between rows, focus ring intact
10. Screen reader announces "$100 can provide emergency hygiene kits for two families in crisis"
11. A real DEMO-mode submission completes

For check 5:

```js
// after the page has rendered, stop JS from re-running and confirm CSS alone holds the state
document.querySelectorAll('[name="transaction.donationAmt"]').forEach(i => i.addEventListener("click", e => e.stopImmediatePropagation(), true));
// clicking rows should still visually select them
```

For check 9, confirm the focus ring from `page-template-styles.scss`'s accessibility block still shows on `.en__field__input--radio:focus + .en__field__label`.

For check 11, complete a DEMO-mode donation end to end. **This is the check that matters most** — the feature is cosmetic, and a broken payment path is not an acceptable trade for it.

- [ ] **Step 3: Verify against the real EN component path**

Everything so far injected config via console or override. Confirm the production path works: add an EN code component containing a literal `<script>var impactArray = {…}</script>` to a test page, then load that page with the JS/CSS overrides.

Expected: identical result to the console-injected config. This proves the `var` → `window.impactArray` timing holds — the component's inline script runs during parse, before ENGrid's `onLoad` fires `customScript`.

If this fails, the config is being read before it exists; report back rather than papering over it with a timeout.

- [ ] **Step 4: Record results and commit any fixes**

If every check passes, there is nothing to commit — the build output is gitignored (`dist/*`). Note the results in the PR or hand-off summary.

If a check fails, fix it in the task that owns the behaviour, rebuild, and re-run the affected checks before committing.

---

## Self-Review

**Spec coverage.** Config contract → Task 2. Column count and layout classes → Task 3. Markup and accessibility → Task 4. Tokens, states, layout, half-layout indicator → Task 5. Decoration lifecycle and observers → Task 6. Failure modes → Task 7. Verification checklist → Task 8. Brand-colour single source → Task 1.

**Deviations from the spec, deliberate:**
- `buildRow` returns a `DocumentFragment` rather than an HTML string. The spec says "return the label's inner HTML". Building nodes removes the need to escape author-supplied copy before `innerHTML` and avoids an inline `onerror` attribute that a page CSP could block. The interface change is recorded in Task 4.
- `window.ENGridImpact = { init }` is a small global not named in the spec. The approved verification strategy is manual browser testing, which is impractical without a way to re-run the feature against fresh config. Flagged for review.
- Task 1 edits two existing theme declarations. Justified in the spec's styling section; verified by a byte-identical CSS diff so it cannot regress anything.

**Type consistency.** `resolveConfig`, `readFrequency`, `selectArray`, `findEntry`, `buildRow`, `decorate`, `safeDecorate`, `applyLayout`, `observe`, `initImpactAmounts` are each defined once and referenced with matching signatures. `state` carries `{config, fields, warned, observers}`; `observers` is added in Task 6 and read nowhere earlier. Class names `impact-amounts`, `impact-amounts--full|--half`, `impact-row`, `impact-row--matched`, `impact-row__icon|__body|__amount|__period|__impact|__indicator` are consistent between Tasks 3–5.

**Not covered by design:** CDN deployment, per-frequency `layout`, refactoring the rest of `main.js`.

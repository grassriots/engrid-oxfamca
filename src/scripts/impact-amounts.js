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

const CONTAINER_SELECTOR = ".radio-to-buttons_donationAmt";

/**
 * Tag each amount array container so the stylesheet can take over the column
 * count. EN's own classes, including donation-amount_count_*, are left in place:
 * our rules win on specificity rather than by mutating class lists, which avoids
 * depending on stylesheet source order.
 */
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

      // "Other amount / month" is nonsense - the suffix belongs only on real amounts.
      const rowPeriod = input.value === "other" ? "" : period;
      label.replaceChildren(buildRow(entry, item.dataset.impactAmountText, rowPeriod));

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

let state = null;

export function initImpactAmounts() {
  try {
    const config = resolveConfig(window.impactArray);
    if (!config) return;

    if (state) {
      state.config = config;
      applyLayout(state);
      safeDecorate(state);
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
    applyLayout(state);
    decorate(state);
    observe(state);
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

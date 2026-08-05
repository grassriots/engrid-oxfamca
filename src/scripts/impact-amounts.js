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
  current.fields.forEach((field) => {
    const container = field.closest(CONTAINER_SELECTOR);
    if (!container) return;
    container.classList.add("impact-amounts");
    container.classList.remove("impact-amounts--full", "impact-amounts--half");
    container.classList.add(`impact-amounts--${current.config.layout}`);
  });
}

let state = null;

export function initImpactAmounts() {
  try {
    const config = resolveConfig(window.impactArray);
    if (!config) return;

    if (state) {
      state.config = config;
      applyLayout(state);
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

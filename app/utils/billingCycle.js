import {
  addMonths,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  subMonths,
} from "date-fns";

/**
 * @param {unknown} n
 * @returns {number} day of month 1–31
 */
function dayPart(n) {
  const d = Math.floor(Number(n));
  if (!Number.isFinite(d) || d < 1) return 1;
  if (d > 31) return 31;
  return d;
}

/**
 * @param {Date} month0 first day of month
 * @param {number} s
 * @param {number} e
 * @returns {{ start: Date, end: Date } | null}
 */
function buildWindowFromSpanningStart(month0, s, e) {
  s = dayPart(s);
  e = dayPart(e);
  if (e >= s) return null;
  const y = month0.getFullYear();
  const m = month0.getMonth();
  const wStart = startOfDay(safeSetDate(new Date(y, m, 1), s));
  const wEnd = endOfDay(
    safeSetDate(addMonths(firstOfMonth(wStart), 1), e),
  );
  if (wStart.getTime() > wEnd.getTime()) return null;
  return { start: wStart, end: wEnd };
}

/**
 * @param {Date} month0 first day of month
 * @param {number} s
 * @param {number} e
 * @returns {{ start: Date, end: Date } | null}
 */
function buildWindowSameMonth(month0, s, e) {
  s = dayPart(s);
  e = dayPart(e);
  if (e < s) return null;
  if (e === s) {
    const t = safeSetDate(new Date(month0.getFullYear(), month0.getMonth(), 1), s);
    const one = startOfDay(t);
    return { start: one, end: endOfDay(one) };
  }
  const wStart = startOfDay(
    safeSetDate(new Date(month0.getFullYear(), month0.getMonth(), 1), s),
  );
  const wEnd = endOfDay(
    safeSetDate(new Date(month0.getFullYear(), month0.getMonth(), 1), e),
  );
  return { start: wStart, end: wEnd };
}

/**
 * @param {Date} month0
 * @param {number} s
 * @param {number} e
 */
function buildWindow(month0, s, e) {
  s = dayPart(s);
  e = dayPart(e);
  if (e < s) return buildWindowFromSpanningStart(month0, s, e);
  return buildWindowSameMonth(month0, s, e);
}

/**
 * Month containing `d`, first day. Used as anchor to enumerate cycles.
 * @param {Date} d
 * @returns {Date}
 */
function firstOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Statement period containing `ref`, or (if the day is between cycles) the next
 * open period so the list always has a “current” row.
 * @param {Date} [ref] defaults to now
 * @param {number} s billing_cycle_start_day 1–31
 * @param {number} e billing_cycle_end_day 1–31
 * @returns {{ start: Date, end: Date } | null}
 */
export function getStatementWindowContainingOrNext(ref, s, e) {
  s = dayPart(s);
  e = dayPart(e);
  const t0 = startOfDay(ref ?? new Date());
  for (let delta = -1; delta >= -48; delta -= 1) {
    const month0 = addMonths(firstOfMonth(t0), delta);
    const w = buildWindow(month0, s, e);
    if (w && isWithinInterval(t0, { start: w.start, end: w.end })) {
      return w;
    }
  }
  for (let delta = 0; delta <= 24; delta += 1) {
    const month0 = addMonths(firstOfMonth(t0), delta);
    const w = buildWindow(month0, s, e);
    if (w && isWithinInterval(t0, { start: w.start, end: w.end })) {
      return w;
    }
  }
  for (let delta = 0; delta <= 24; delta += 1) {
    const month0 = addMonths(firstOfMonth(t0), delta);
    const w = buildWindow(month0, s, e);
    if (w && t0 < w.start) {
      return w;
    }
  }
  for (let delta = -1; delta >= -60; delta -= 1) {
    const month0 = addMonths(firstOfMonth(t0), delta);
    const w = buildWindow(month0, s, e);
    if (w && t0 < w.start) {
      return w;
    }
  }
  return null;
}

/**
 * `MM-yyyy` of the billing **cycle start** (same rule as the statement menu):
 * a transaction in Jan 26 – Feb 25, 2026 (for 26/25) maps to `01-2026`.
 * @param {Date} transactionDate  calendar day of the line (ideally from local Y-M-D, not raw UTC)
 * @param {number} startDay billing_cycle_start_day 1–31
 * @param {number} endDay billing_cycle_end_day 1–31
 * @returns {string} MM-yyyy
 */
export function getBillingCycleKeyForTransactionDate(
  transactionDate,
  startDay,
  endDay,
) {
  const t0 = startOfDay(
    transactionDate && !Number.isNaN(transactionDate.getTime())
      ? transactionDate
      : new Date(),
  );
  const s = dayPart(startDay);
  const e0 = dayPart(endDay);
  const w = getStatementWindowContainingOrNext(t0, s, e0);
  if (!w) {
    return format(t0, "MM-yyyy");
  }
  return format(w.start, "MM-yyyy");
}

/**
 * The statement that ends the day the given one starts (one step back in time).
 * @param {{ start: Date, end: Date }} w
 * @param {number} s
 * @param {number} e
 * @returns {{ start: Date, end: Date } | null}
 */
function previousStatementWindow(w, s, e) {
  s = dayPart(s);
  e = dayPart(e);
  if (!w?.start) return null;
  if (e < s) {
    const pStart = startOfDay(safeSetDate(subMonths(w.start, 1), s));
    return {
      start: pStart,
      end: endOfDay(
        safeSetDate(addMonths(firstOfMonth(pStart), 1), e),
      ),
    };
  }
  if (e === s) {
    const p = startOfDay(w.start);
    return {
      start: subMonths(p, 1),
      end: endOfDay(subMonths(p, 1)),
    };
  }
  const pStart0 = safeSetDate(
    new Date(
      w.start.getFullYear(),
      w.start.getMonth() - 1,
      1,
    ),
    s,
  );
  return buildWindow(new Date(pStart0.getFullYear(), pStart0.getMonth(), 1), s, e);
}

/**
 * Menu rows for a card’s real billing windows. `id` is MM-yyyy of the **billing
 * cycle start** (first day of the period), e.g. 03-2026 = March–April 2026
 * (starts in March, ends in April; key is the start month).
 * @param {number} startDay
 * @param {number} endDay
 * @param {number} [count=20]
 * @param {Date} [ref]
 * @returns {{ id: string, label: string, start: Date, end: Date }[]}
 */
export function listCardStatementCycleMenuItems(
  startDay,
  endDay,
  count = 20,
  ref = new Date(),
) {
  const s = dayPart(startDay);
  const e = dayPart(endDay);

  const isCrossMonth = s > e;

  const anchor = getStatementWindowContainingOrNext(ref, s, e, isCrossMonth);
  if (!anchor) return [];

  const out = [];
  let w = { start: anchor.start, end: anchor.end };

  for (let i = 0; i < count; i += 1) {
    if (!w) break;

    out.push({
      id: format(w.start, "MM-yyyy"),
      label: `${format(w.start, "MMM d, yyyy")} – ${format(w.end, "MMM d, yyyy")}`,
      start: w.start,
      end: w.end,
    });

    w = previousStatementWindow(w, s, e, isCrossMonth);
  }

  return out;
}

function safeSetDate(date, day) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return new Date(year, month, safeDay);
}

/**
 * Next older cycle key (for trends) from a menu built with `listCardStatementCycleMenuItems`.
 * @param {{ id: string }[]} items
 * @param {string} currentId
 * @returns {string | null}
 */
export function previousCycleIdFromMenuItems(items, currentId) {
  if (!Array.isArray(items) || !currentId) return null;
  const i = items.findIndex((x) => x && x.id === currentId);
  if (i < 0) return null;
  return items[i + 1]?.id ?? null;
}

/**
 * @param {string} key  MM-yyyy of the **billing cycle start** month, e.g. 01-2026
 * @returns {{ month0: number, year: number }}
 */
export function parseBillingCycleKey(key) {
  if (!key || typeof key !== "string") return null;
  const [m, y] = key.split("-");
  if (m == null || y == null) return null;
  const month0 = Number(m) - 1;
  const year = Number(y);
  if (!Number.isInteger(month0) || month0 < 0 || month0 > 11) return null;
  if (!Number.isInteger(year)) return null;
  return { month0, year };
}

/**
 * @param {string} key  MM-yyyy
 */
export function previousBillingCycleKey(key) {
  const p = parseBillingCycleKey(key);
  if (!p) return null;
  const d = new Date(p.year, p.month0, 1);
  d.setMonth(d.getMonth() - 1);
  return format(d, "MM-yyyy");
}

/**
 * Recent months as { id, label } where `id` is MM-yyyy
 * @param {number} [count=14]
 */
export function listRecentBillingCycleKeyItems(count = 14) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = subMonths(now, i);
    out.push({
      id: format(d, "MM-yyyy"),
      label: format(d, "MMMM yyyy"),
    });
  }
  return out;
}

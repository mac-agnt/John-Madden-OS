/* Demo clock helpers. Every timestamp is epoch ms (UTC). Local dates are worked
   out with Intl for the named zone, so daylight-saving changes (Dublin moves to
   GMT on 25 Oct 2026; Manila has none) are never hard-coded. */

export const TZ_OFFICE = "Europe/Dublin";
export const TZ_PH = "Asia/Manila";
export type Zone = typeof TZ_OFFICE | typeof TZ_PH;

const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const partsCache = new Map<string, Intl.DateTimeFormat>();
function partsFmt(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    });
    partsCache.set(tz, f);
  }
  return f;
}

export type LocalParts = { y: number; m: number; d: number; h: number; min: number; s: number; wd: number };

export function localParts(ts: number, tz: string = TZ_OFFICE): LocalParts {
  const p: Record<string, string> = {};
  for (const x of partsFmt(tz).formatToParts(ts)) p[x.type] = x.value;
  const y = +p.year, m = +p.month, d = +p.day;
  return { y, m, d, h: +p.hour, min: +p.minute, s: +p.second, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function offsetAt(ts: number, tz: string) {
  const p = localParts(ts, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ts / 1000) * 1000;
}

/** A wall-clock time in a zone, as an instant. */
export function zoned(y: number, m: number, d: number, h = 17, min = 0, tz: string = TZ_OFFICE, s = 0): number {
  const guess = Date.UTC(y, m - 1, d, h, min, s);
  const o1 = offsetAt(guess, tz);
  let ts = guess - o1;
  const o2 = offsetAt(ts, tz);
  if (o2 !== o1) ts = guess - o2;
  return ts;
}

/** Same wall-clock time, n working days (Mon–Fri) later in the zone. Negative n goes back. */
export function addWorkingDays(ts: number, n: number, tz: string = TZ_OFFICE): number {
  const p = localParts(ts, tz);
  let day = Date.UTC(p.y, p.m - 1, p.d);
  let left = Math.abs(n);
  const step = n < 0 ? -DAY : DAY;
  while (left > 0) {
    day += step;
    const wd = new Date(day).getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  const dd = new Date(day);
  return zoned(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(), p.h, p.min, tz, p.s);
}

/** End of a local day at the given hour. */
export function atLocal(ts: number, h: number, min = 0, tz: string = TZ_OFFICE): number {
  const p = localParts(ts, tz);
  return zoned(p.y, p.m, p.d, h, min, tz);
}

/** Whole working days from a to b (b later = positive). */
export function workingDaysBetween(a: number, b: number, tz: string = TZ_OFFICE): number {
  if (b < a) return -workingDaysBetween(b, a, tz);
  const pa = localParts(a, tz), pb = localParts(b, tz);
  let day = Date.UTC(pa.y, pa.m - 1, pa.d);
  const end = Date.UTC(pb.y, pb.m - 1, pb.d);
  let n = 0;
  while (day < end) {
    day += DAY;
    const wd = new Date(day).getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

/** Calendar days between local dates of a and b. */
export function calendarDaysBetween(a: number, b: number, tz: string = TZ_OFFICE): number {
  const pa = localParts(a, tz), pb = localParts(b, tz);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / DAY);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions) {
  const key = tz + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) { f = new Intl.DateTimeFormat("en-IE", { timeZone: tz, ...opts }); fmtCache.set(key, f); }
  return f;
}

export const zoneLabel = (tz: string) => (tz === TZ_PH ? "Manila" : "Dublin");

export function fmtDate(ts: number | null | undefined, tz: string = TZ_OFFICE): string {
  if (ts == null) return "-";
  return fmt(tz, { weekday: "short", day: "numeric", month: "short" }).format(ts);
}
export function fmtShortDate(ts: number | null | undefined, tz: string = TZ_OFFICE): string {
  if (ts == null) return "-";
  return fmt(tz, { day: "numeric", month: "short" }).format(ts);
}
export function fmtTime(ts: number | null | undefined, tz: string = TZ_OFFICE, secs = false): string {
  if (ts == null) return "-";
  return fmt(tz, { hour: "2-digit", minute: "2-digit", ...(secs ? { second: "2-digit" } : {}), hourCycle: "h23" }).format(ts);
}
export function fmtDateTime(ts: number | null | undefined, tz: string = TZ_OFFICE, withZone = false): string {
  if (ts == null) return "-";
  return fmtShortDate(ts, tz) + ", " + fmtTime(ts, tz) + (withZone ? " " + zoneLabel(tz) : "");
}

/** "2 days overdue", "due in 3 days", "due today 17:00". Based on the demo clock. */
export function dueLabel(due: number, now: number, tz: string = TZ_OFFICE): string {
  const cd = calendarDaysBetween(now, due, tz);
  if (due < now) {
    const late = calendarDaysBetween(due, now, tz);
    return late <= 0 ? "Overdue since " + fmtTime(due, tz) : late === 1 ? "1 day overdue" : late + " days overdue";
  }
  if (cd === 0) return "Due today " + fmtTime(due, tz);
  if (cd === 1) return "Due tomorrow";
  return "Due in " + cd + " days";
}

export function ago(ts: number, now: number): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 0) return "scheduled";
  if (s < 60) return s + "s ago";
  const m = Math.round(s / 60);
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : d + " days ago";
}

/** Demo baseline: Monday 19 October 2026, 09:00 in Dublin. */
export const BASELINE = zoned(2026, 10, 19, 9, 0);
/** Shortcut for a seed date in Dublin. */
export const dub = (m: number, d: number, h = 17, min = 0) => zoned(2026, m, d, h, min, TZ_OFFICE);
export const mnl = (m: number, d: number, h = 17, min = 0) => zoned(2026, m, d, h, min, TZ_PH);

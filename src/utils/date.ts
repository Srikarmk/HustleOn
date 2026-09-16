/**
 * Local-calendar date helpers.
 *
 * Every date this app stores (`workout.date`, `meal.date`, `goal.targetDate`,
 * `profile.dateOfBirth`, …) is a plain `YYYY-MM-DD` string meaning a day on the
 * *user's* calendar. Two JS footguns make that easy to get wrong, and both used
 * to bite us:
 *
 *   - `new Date().toISOString()` gives the **UTC** day, so logging a workout at
 *     9pm in New York stamped it with tomorrow's date.
 *   - `new Date('2026-09-15')` parses as **UTC midnight**, which is the previous
 *     day anywhere west of Greenwich — so a workout logged today read back as
 *     yesterday, breaking streaks and shifting every chart by one day.
 *
 * Use these helpers instead of touching `Date` arithmetic directly. Values that
 * are full ISO timestamps (`createdAt`, `lastSync`, …) already carry a zone and
 * are fine with plain `new Date()`; `parseISODate` passes them through intact.
 */

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number): string => String(n).padStart(2, '0');

/** `YYYY-MM-DD` for a Date on the local calendar (never shifted to UTC). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's local calendar day as `YYYY-MM-DD`. */
export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * Parse a stored date string to **local** midnight.
 * Full ISO timestamps (with a time component) are passed through unchanged.
 */
export function parseISODate(value: string): Date {
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

/** Local midnight for a Date. Returns a copy; does not mutate the input. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Days since the epoch for a date's local calendar day.
 *
 * Normalizing through `Date.UTC` keeps the arithmetic DST-proof: subtracting a
 * fixed 86,400,000 ms from a local timestamp breaks on the two days a year when
 * a local day is 23 or 25 hours long, which silently reset streaks.
 */
export function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return dayNumber(to) - dayNumber(from);
}

/** `n` days after `d` on the local calendar (`n` may be negative). */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

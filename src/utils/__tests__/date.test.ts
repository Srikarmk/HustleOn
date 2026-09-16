import {
  addDays,
  dayNumber,
  daysBetween,
  parseISODate,
  startOfDay,
  toISODate,
  todayISO,
} from '../date';

// jest.setup.js pins TZ to America/New_York (UTC-4/-5, observes DST) so these
// assertions actually exercise the bugs they guard against.

describe('toISODate', () => {
  it('uses the local calendar day, not the UTC day', () => {
    // 9pm local on Sep 15 is already Sep 16 in UTC. toISOString() would have
    // stamped tomorrow's date — that is the bug this guards.
    expect(toISODate(new Date(2026, 8, 15, 21, 0, 0))).toBe('2026-09-15');
    expect(toISODate(new Date(2026, 8, 15, 9, 0, 0))).toBe('2026-09-15');
    expect(toISODate(new Date(2026, 8, 15, 23, 59, 59))).toBe('2026-09-15');
  });

  it('zero-pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseISODate', () => {
  it('parses a date-only string to LOCAL midnight', () => {
    // new Date('2026-09-15') parses as UTC midnight = Sep 14 20:00 local,
    // which made every stored date read back one day early.
    const d = parseISODate('2026-09-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips with toISODate', () => {
    for (const s of ['2026-01-01', '2026-09-15', '2026-12-31', '2026-03-08']) {
      expect(toISODate(parseISODate(s))).toBe(s);
    }
  });

  it('passes full ISO timestamps through unchanged', () => {
    const ts = '2026-09-15T14:30:00.000Z';
    expect(parseISODate(ts).getTime()).toBe(new Date(ts).getTime());
  });
});

describe('todayISO', () => {
  it('agrees with the local calendar', () => {
    const now = new Date();
    expect(todayISO()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`
    );
  });

  it('round-trips through parseISODate to today at local midnight', () => {
    expect(parseISODate(todayISO()).getTime()).toBe(startOfDay(new Date()).getTime());
  });
});

describe('day arithmetic is DST-proof', () => {
  // US DST: starts Sun Mar 8 2026 (23h day), ends Sun Nov 1 2026 (25h day).
  it('counts one day across the spring-forward boundary', () => {
    // Mar 8 2026 is a 23-hour local day — the case that broke streak counting.
    expect(daysBetween(new Date(2026, 2, 7), new Date(2026, 2, 8))).toBe(1);
    expect(daysBetween(new Date(2026, 2, 8), new Date(2026, 2, 9))).toBe(1);
    expect(daysBetween(new Date(2026, 2, 8), new Date(2026, 2, 10))).toBe(2);
  });

  it('counts one day across the fall-back boundary', () => {
    expect(daysBetween(new Date(2026, 9, 31), new Date(2026, 10, 1))).toBe(1);
    expect(daysBetween(new Date(2026, 10, 1), new Date(2026, 10, 2))).toBe(1);
  });

  it('gives consecutive day numbers across a DST transition', () => {
    // Subtracting a fixed 86_400_000ms here is what silently reset streaks.
    const before = dayNumber(new Date(2026, 10, 1));
    const after = dayNumber(new Date(2026, 10, 2));
    expect(after - before).toBe(1);
  });

  it('addDays lands on the right calendar day across DST', () => {
    expect(toISODate(addDays(new Date(2026, 10, 1), 1))).toBe('2026-11-02');
    expect(toISODate(addDays(new Date(2026, 2, 7), 1))).toBe('2026-03-08');
    expect(toISODate(addDays(new Date(2026, 8, 15), -1))).toBe('2026-09-14');
  });

  it('addDays rolls over month and year boundaries', () => {
    expect(toISODate(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(toISODate(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });
});

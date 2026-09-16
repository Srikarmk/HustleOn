import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayISO } from '../utils/date';

/**
 * Today's local calendar day as `YYYY-MM-DD`, kept current while mounted.
 *
 * Screens used to freeze "today" in `useState(...)` at mount, so an app left
 * open (or backgrounded) across midnight kept filing new entries under the
 * previous day. This re-checks on a timer and whenever the app is foregrounded,
 * and only changes identity when the day actually rolls over.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    const check = () => setToday((prev) => (todayISO() === prev ? prev : todayISO()));

    const interval = setInterval(check, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return today;
}

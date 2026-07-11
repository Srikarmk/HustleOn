import { useStore } from '../index';
import type { Workout } from '../../types';

const iso = (d: Date) => d.toISOString().split('T')[0];
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));

const workout = (date: string): Workout => ({
  id: `${date}-${Math.random()}`,
  date,
  exercises: [],
});

beforeEach(() => {
  // Reset the singleton store to a clean baseline before each test.
  useStore.setState({
    workouts: [],
    supplements: [],
    currentStreak: 0,
    dataUpdatedAt: '1970-01-01T00:00:00.000Z',
  });
});

describe('updateStreak', () => {
  it('is 0 with no workouts', () => {
    useStore.getState().updateStreak();
    expect(useStore.getState().currentStreak).toBe(0);
  });

  it('counts consecutive days including today', () => {
    useStore.setState({ workouts: [workout(daysAgo(0)), workout(daysAgo(1)), workout(daysAgo(2))] });
    useStore.getState().updateStreak();
    expect(useStore.getState().currentStreak).toBe(3);
  });

  it('stays alive when the last workout was yesterday (grace day)', () => {
    useStore.setState({ workouts: [workout(daysAgo(1)), workout(daysAgo(2))] });
    useStore.getState().updateStreak();
    expect(useStore.getState().currentStreak).toBe(2);
  });

  it('resets to 0 when the last workout is older than yesterday', () => {
    useStore.setState({ workouts: [workout(daysAgo(3)), workout(daysAgo(4))] });
    useStore.getState().updateStreak();
    expect(useStore.getState().currentStreak).toBe(0);
  });

  it('dedupes multiple workouts on the same day', () => {
    useStore.setState({ workouts: [workout(daysAgo(0)), workout(daysAgo(0)), workout(daysAgo(1))] });
    useStore.getState().updateStreak();
    expect(useStore.getState().currentStreak).toBe(2);
  });
});

describe('addWorkout', () => {
  it('appends a workout, recomputes the streak, and advances the sync clock', () => {
    const before = useStore.getState().dataUpdatedAt;
    useStore.getState().addWorkout(workout(daysAgo(0)));
    const state = useStore.getState();
    expect(state.workouts).toHaveLength(1);
    expect(state.currentStreak).toBe(1);
    expect(new Date(state.dataUpdatedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
  });
});

describe('toggleSupplementTaken', () => {
  it('marks a supplement taken for a date, then untakes it', () => {
    useStore.setState({ supplements: [{ id: 's1', name: 'Creatine', takenDates: [] }] });
    const today = daysAgo(0);

    useStore.getState().toggleSupplementTaken('s1', today);
    expect(useStore.getState().supplements[0].takenDates).toContain(today);

    useStore.getState().toggleSupplementTaken('s1', today);
    expect(useStore.getState().supplements[0].takenDates).not.toContain(today);
  });
});

describe('clearLocalData', () => {
  it('wipes user data and reseeds default supplements', async () => {
    useStore.setState({
      workouts: [workout(daysAgo(0))],
      supplements: [{ id: 's1', name: 'X', takenDates: [] }],
    });

    await useStore.getState().clearLocalData();
    const state = useStore.getState();

    expect(state.workouts).toHaveLength(0);
    expect(state.currentStreak).toBe(0);
    expect(state.dataUpdatedAt).toBe('1970-01-01T00:00:00.000Z');
    // clearLocalData reseeds the default supplement list.
    expect(state.supplements.length).toBeGreaterThan(0);
  });
});

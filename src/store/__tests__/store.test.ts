import { useStore } from '../index';
import type { Workout, Meal, Goal, RemoteSnapshot } from '../../types';

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

describe('meals', () => {
  it('adds and removes a meal', () => {
    useStore.setState({ meals: [] });
    const meal: Meal = { id: 'm1', date: daysAgo(0), time: '12:00', name: 'Eggs', calories: 200 };
    useStore.getState().addMeal(meal);
    expect(useStore.getState().meals).toHaveLength(1);
    useStore.getState().removeMeal('m1');
    expect(useStore.getState().meals).toHaveLength(0);
  });
});

describe('goals', () => {
  it('adds, updates, and removes a goal', () => {
    useStore.setState({ goals: [] });
    const goal: Goal = {
      id: 'g1',
      type: 'weight',
      title: 'Cut',
      targetValue: 75,
      unit: 'kg',
      targetDate: daysAgo(-30),
      createdAt: new Date().toISOString(),
    };
    useStore.getState().addGoal(goal);
    expect(useStore.getState().goals).toHaveLength(1);

    useStore.getState().updateGoal('g1', { targetValue: 72 });
    expect(useStore.getState().goals[0].targetValue).toBe(72);

    useStore.getState().removeGoal('g1');
    expect(useStore.getState().goals).toHaveLength(0);
  });
});

describe('applyRemoteState', () => {
  it('replaces state and sets the clock to the remote value (no bump)', async () => {
    const remoteTs = '2030-01-01T00:00:00.000Z';
    const snapshot = {
      userProfile: null,
      workouts: [workout(daysAgo(0))],
      meals: [],
      bmiRecords: [],
      bodyMeasurements: [],
      progressPhotos: [],
      goals: [],
      integrations: [],
      notificationPreferences: [],
      privacySettings: useStore.getState().privacySettings,
      themeSettings: useStore.getState().themeSettings,
      friends: [],
      supplements: [],
      weeklyGoal: 5,
      calorieGoal: 2500,
    } as unknown as RemoteSnapshot;

    await useStore.getState().applyRemoteState(snapshot, remoteTs);
    const state = useStore.getState();

    expect(state.workouts).toHaveLength(1);
    expect(state.weeklyGoal).toBe(5);
    expect(state.calorieGoal).toBe(2500);
    // The clock reflects the remote timestamp exactly — a pull must not bump it.
    expect(state.dataUpdatedAt).toBe(remoteTs);
  });
});

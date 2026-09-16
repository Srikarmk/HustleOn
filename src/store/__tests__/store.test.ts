import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../index';
import { addDays, toISODate, todayISO } from '../../utils/date';
import type { Workout, Meal, Goal, RemoteSnapshot } from '../../types';

// Dates must be built the same way the app builds them: on the LOCAL calendar.
// Using toISOString() here was what made these tests disagree with the app.
const daysAgo = (n: number) => toISODate(addDays(new Date(), -n));

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

  it('survives the spring-forward DST transition', () => {
    // TZ is pinned to America/New_York in jest.setup.js; DST starts Mar 8 2026.
    // Verified against the previous implementation: this exact input returned 1
    // instead of 3, because it stepped back a fixed 86,400,000ms per day and a
    // local day across the transition is only 23 hours long.
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 10, 12, 0, 0));
    useStore.setState({
      workouts: [workout('2026-03-10'), workout('2026-03-09'), workout('2026-03-08')],
    });
    useStore.getState().updateStreak();
    expect(useStore.getState().currentStreak).toBe(3);
    jest.useRealTimers();
  });

  it('files a workout logged late in the evening under the local day', () => {
    // 9:30pm local is already tomorrow in UTC, so the old
    // `toISOString().split('T')[0]` stamped 2026-09-16 here.
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 15, 21, 30, 0));
    useStore.setState({ workouts: [] });
    useStore.getState().addWorkout(workout(todayISO()));
    expect(useStore.getState().workouts[0].date).toBe('2026-09-15');
    jest.useRealTimers();
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

describe('privacy settings migration', () => {
  it('re-enables cloudSync once for data persisted before the flag was enforced', async () => {
    // The old default was `false` while sync.ts ignored it, so those users' data
    // is already in the cloud — adopting `false` verbatim would silently stop
    // backing them up. No `version` marker = pre-enforcement payload.
    await AsyncStorage.setItem(
      '@hustleon:app_data',
      JSON.stringify({
        privacySettings: { aiDataUsage: true, cloudSync: false, analytics: false, shareDataWithAI: false },
      })
    );

    await useStore.getState().loadData();
    const privacy = useStore.getState().privacySettings as any;

    expect(privacy.cloudSync).toBe(true);
    // Choices the user could actually make are preserved.
    expect(privacy.analytics).toBe(false);
    expect(privacy.shareDataWithAI).toBe(false);
    // The dead field is dropped.
    expect(privacy.aiDataUsage).toBeUndefined();
  });

  it('respects cloudSync: false once the settings carry the version marker', async () => {
    await AsyncStorage.setItem(
      '@hustleon:app_data',
      JSON.stringify({
        privacySettings: { version: 1, cloudSync: false, analytics: true, shareDataWithAI: true },
      })
    );

    await useStore.getState().loadData();
    expect(useStore.getState().privacySettings.cloudSync).toBe(false);
  });

  it('writes the version marker so the migration only runs once', async () => {
    useStore.getState().updatePrivacySettings({ cloudSync: false });
    const raw = await AsyncStorage.getItem('@hustleon:app_data');
    expect(JSON.parse(raw!).privacySettings.version).toBe(1);

    // A second load must now honour the stored value rather than re-migrating.
    await useStore.getState().loadData();
    expect(useStore.getState().privacySettings.cloudSync).toBe(false);
  });
});

describe('clearLocalData (sign-out hygiene)', () => {
  const AI_CHAT_KEY = '@hustleon:ai_chat';

  it('resets per-user settings and removes the AI chat history', async () => {
    await AsyncStorage.setItem(AI_CHAT_KEY, JSON.stringify([{ id: '1', text: 'my weight is 80kg' }]));
    useStore.setState({
      privacySettings: { cloudSync: false, analytics: false, shareDataWithAI: false },
      themeSettings: { darkMode: false, accentColor: '#ff0000', layout: 'compact' },
      notificationPreferences: [{ type: 'workout_reminder', enabled: false, time: '05:00' }],
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
    });

    await useStore.getState().clearLocalData();
    const state = useStore.getState();

    // Settings must not carry over to the next user on a shared device.
    expect(state.privacySettings).toEqual({
      cloudSync: true,
      analytics: true,
      shareDataWithAI: true,
    });
    expect(state.themeSettings.darkMode).toBe(true);
    expect(state.notificationPreferences.length).toBeGreaterThan(1);
    expect(state.lastSyncedAt).toBeNull();

    // The coach conversation contains health details — it must go too.
    expect(await AsyncStorage.getItem(AI_CHAT_KEY)).toBeNull();
  });
});

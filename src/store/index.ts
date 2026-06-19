import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Workout, Meal, BMIRecord, UserProfile, BodyMeasurement, ProgressPhoto, Goal, Integration, NotificationPreference, PrivacySettings, ThemeSettings, Friend, Supplement, RemoteSnapshot } from '../types';

const STORAGE_KEY = '@hustleon:app_data';

export const useStore = create<AppState>((set, get) => ({
  userProfile: null,
  workouts: [],
  meals: [],
  bmiRecords: [],
  bodyMeasurements: [],
  progressPhotos: [],
  goals: [],
  integrations: [
    { id: 'fitbit', name: 'fitbit', connected: false },
    { id: 'apple_health', name: 'apple_health', connected: false },
    { id: 'google_fit', name: 'google_fit', connected: false },
    { id: 'strava', name: 'strava', connected: false },
    { id: 'myfitnesspal', name: 'myfitnesspal', connected: false },
  ],
  notificationPreferences: [
    { type: 'workout_reminder', enabled: true, time: '18:00', days: ['Mon', 'Wed', 'Fri'] },
    { type: 'meal_reminder', enabled: true, time: '12:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    { type: 'goal_milestone', enabled: true },
    { type: 'streak_reminder', enabled: true, time: '20:00' },
    { type: 'weekly_summary', enabled: true },
  ],
  privacySettings: {
    aiDataUsage: true,
    cloudSync: false,
    analytics: true,
    shareDataWithAI: true,
  },
  themeSettings: {
    darkMode: true,
    accentColor: '#7864b4',
    layout: 'comfortable',
  },
  friends: [],
  supplements: [],
  weeklyGoal: 3,
  calorieGoal: 2000,
  currentStreak: 0,
  dataUpdatedAt: '1970-01-01T00:00:00.000Z',

  setUserProfile: (profile) => {
    set({ userProfile: profile });
    get().saveData();
  },

  addWorkout: (workout) => {
    set((state) => ({ workouts: [...state.workouts, workout] }));
    get().updateStreak();
    get().saveData();
  },

  removeWorkout: (id) => {
    set((state) => ({
      workouts: state.workouts.filter((w) => w.id !== id),
    }));
    get().updateStreak();
    get().saveData();
  },

  addMeal: (meal) => {
    set((state) => ({ meals: [...state.meals, meal] }));
    get().saveData();
  },

  removeMeal: (id) => {
    set((state) => ({
      meals: state.meals.filter((m) => m.id !== id),
    }));
    get().saveData();
  },

  addBMIRecord: (record) => {
    set((state) => ({ bmiRecords: [...state.bmiRecords, record] }));
    get().saveData();
  },

  addBodyMeasurement: (measurement) => {
    set((state) => ({ bodyMeasurements: [...state.bodyMeasurements, measurement] }));
    get().saveData();
  },

  addProgressPhoto: (photo) => {
    set((state) => ({ progressPhotos: [...state.progressPhotos, photo] }));
    get().saveData();
  },

  removeProgressPhoto: (id) => {
    set((state) => ({
      progressPhotos: state.progressPhotos.filter((p) => p.id !== id),
    }));
    get().saveData();
  },

  addGoal: (goal) => {
    set((state) => ({ goals: [...state.goals, goal] }));
    get().saveData();
  },

  updateGoal: (id, goal) => {
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...goal } : g)),
    }));
    get().saveData();
  },

  removeGoal: (id) => {
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));
    get().saveData();
  },

  updateIntegration: (id, integration) => {
    set((state) => ({
      integrations: state.integrations.map((i) => (i.id === id ? { ...i, ...integration } : i)),
    }));
    get().saveData();
  },

  updateNotificationPreference: (type, preference) => {
    set((state) => ({
      notificationPreferences: state.notificationPreferences.map((np) =>
        np.type === type ? { ...np, ...preference } : np
      ),
    }));
    get().saveData();
  },

  updatePrivacySettings: (settings) => {
    set((state) => ({
      privacySettings: { ...state.privacySettings, ...settings },
    }));
    get().saveData();
  },

  updateThemeSettings: (settings) => {
    set((state) => ({
      themeSettings: { ...state.themeSettings, ...settings },
    }));
    get().saveData();
  },

  addFriend: (friend) => {
    set((state) => ({ friends: [...state.friends, friend] }));
    get().saveData();
  },

  removeFriend: (id) => {
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== id),
    }));
    get().saveData();
  },

  addSupplement: (supplement) => {
    set((state) => ({ supplements: [...state.supplements, supplement] }));
    get().saveData();
  },

  removeSupplement: (id) => {
    set((state) => ({
      supplements: state.supplements.filter((s) => s.id !== id),
    }));
    get().saveData();
  },

  toggleSupplementTaken: (id, date) => {
    set((state) => ({
      supplements: state.supplements.map((s) => {
        if (s.id !== id) return s;
        const taken = s.takenDates.includes(date);
        return {
          ...s,
          takenDates: taken
            ? s.takenDates.filter((d) => d !== date)
            : [...s.takenDates, date],
        };
      }),
    }));
    get().saveData();
  },

  setWeeklyGoal: (goal) => {
    set({ weeklyGoal: goal });
    get().saveData();
  },

  setCalorieGoal: (goal) => {
    set({ calorieGoal: goal });
    get().saveData();
  },

  updateStreak: () => {
    const workouts = get().workouts;
    if (workouts.length === 0) {
      set({ currentStreak: 0 });
      return;
    }

    const DAY = 1000 * 60 * 60 * 24;

    // Unique workout days (midnight timestamps), most recent first
    const uniqueDays = Array.from(
      new Set(
        workouts.map((w) => {
          const d = new Date(w.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      )
    ).sort((a, b) => b - a);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Streak is only "alive" if the most recent workout was today or yesterday.
    const daysSinceLast = Math.floor((today.getTime() - uniqueDays[0]) / DAY);
    if (daysSinceLast > 1) {
      set({ currentStreak: 0 });
      return;
    }

    // Count consecutive days backwards from the most recent workout.
    let streak = 0;
    let expected = uniqueDays[0];
    for (const day of uniqueDays) {
      if (day === expected) {
        streak++;
        expected -= DAY;
      } else {
        break;
      }
    }

    set({ currentStreak: streak });
  },

  loadData: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          userProfile: parsed.userProfile || null,
          workouts: parsed.workouts || [],
          meals: parsed.meals || [],
          bmiRecords: parsed.bmiRecords || [],
          bodyMeasurements: parsed.bodyMeasurements || [],
          progressPhotos: parsed.progressPhotos || [],
          goals: parsed.goals || [],
          integrations: parsed.integrations || [
            { id: 'fitbit', name: 'fitbit', connected: false },
            { id: 'apple_health', name: 'apple_health', connected: false },
            { id: 'google_fit', name: 'google_fit', connected: false },
            { id: 'strava', name: 'strava', connected: false },
            { id: 'myfitnesspal', name: 'myfitnesspal', connected: false },
          ],
          notificationPreferences: parsed.notificationPreferences || [
            { type: 'workout_reminder', enabled: true, time: '18:00', days: ['Mon', 'Wed', 'Fri'] },
            { type: 'meal_reminder', enabled: true, time: '12:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
            { type: 'goal_milestone', enabled: true },
            { type: 'streak_reminder', enabled: true, time: '20:00' },
            { type: 'weekly_summary', enabled: true },
          ],
          privacySettings: parsed.privacySettings || {
            aiDataUsage: true,
            cloudSync: false,
            analytics: true,
            shareDataWithAI: true,
          },
          themeSettings: parsed.themeSettings || {
            darkMode: true,
            accentColor: '#7864b4',
            layout: 'comfortable',
          },
          friends: parsed.friends || [],
          supplements: parsed.supplements || [],
          weeklyGoal: parsed.weeklyGoal || 3,
          calorieGoal: parsed.calorieGoal || 2000,
          dataUpdatedAt: parsed.dataUpdatedAt || '1970-01-01T00:00:00.000Z',
        });
        get().updateStreak();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  },

  saveData: async () => {
    try {
      // A local mutation just happened — advance the sync clock so this
      // device wins the next last-write-wins reconciliation.
      const now = new Date().toISOString();
      set({ dataUpdatedAt: now });
      const state = get();
      const dataToSave = {
        userProfile: state.userProfile,
        workouts: state.workouts,
        meals: state.meals,
        bmiRecords: state.bmiRecords,
        bodyMeasurements: state.bodyMeasurements,
        progressPhotos: state.progressPhotos,
        goals: state.goals,
        integrations: state.integrations,
        notificationPreferences: state.notificationPreferences,
        privacySettings: state.privacySettings,
        themeSettings: state.themeSettings,
        friends: state.friends,
        supplements: state.supplements,
        weeklyGoal: state.weeklyGoal,
        calorieGoal: state.calorieGoal,
        dataUpdatedAt: now,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  },

  applyRemoteState: async (data: RemoteSnapshot, remoteUpdatedAt: string) => {
    // Replace local state with a remote snapshot pulled during sync.
    // Persist with the remote clock value — do NOT bump (this isn't a local edit).
    set({
      userProfile: data.userProfile,
      workouts: data.workouts,
      meals: data.meals,
      bmiRecords: data.bmiRecords,
      bodyMeasurements: data.bodyMeasurements,
      progressPhotos: data.progressPhotos,
      goals: data.goals,
      integrations: data.integrations,
      notificationPreferences: data.notificationPreferences,
      privacySettings: data.privacySettings,
      themeSettings: data.themeSettings,
      friends: data.friends,
      supplements: data.supplements,
      weeklyGoal: data.weeklyGoal,
      calorieGoal: data.calorieGoal,
      dataUpdatedAt: remoteUpdatedAt,
    });
    get().updateStreak();
    try {
      const state = get();
      const dataToSave = {
        userProfile: state.userProfile,
        workouts: state.workouts,
        meals: state.meals,
        bmiRecords: state.bmiRecords,
        bodyMeasurements: state.bodyMeasurements,
        progressPhotos: state.progressPhotos,
        goals: state.goals,
        integrations: state.integrations,
        notificationPreferences: state.notificationPreferences,
        privacySettings: state.privacySettings,
        themeSettings: state.themeSettings,
        friends: state.friends,
        supplements: state.supplements,
        weeklyGoal: state.weeklyGoal,
        calorieGoal: state.calorieGoal,
        dataUpdatedAt: remoteUpdatedAt,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to persist remote state:', error);
    }
  },
}));


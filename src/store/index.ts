import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Workout, Meal, Supplement, BMIRecord, UserProfile, BodyMeasurement, ProgressPhoto, Goal, Integration, NotificationPreference, PrivacySettings, ThemeSettings, Friend } from '../types';

const STORAGE_KEY = '@hustleon:app_data';

const DEFAULT_SUPPLEMENTS: Supplement[] = [
  { id: 'sup-1', name: 'Vitamin D', takenToday: false },
  { id: 'sup-2', name: 'Multivitamin', takenToday: false },
  { id: 'sup-3', name: 'Protein', takenToday: false },
];

export const useStore = create<AppState>((set, get) => ({
  userProfile: null,
  workouts: [],
  meals: [],
  supplements: [],
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
  weeklyGoal: 3,
  calorieGoal: 2000,
  currentStreak: 0,

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
        const isSameDay = s.date === date;
        return {
          ...s,
          date,
          takenToday: isSameDay ? !s.takenToday : true,
        };
      }),
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

    const sortedWorkouts = [...workouts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const workout of sortedWorkouts) {
      const workoutDate = new Date(workout.date);
      workoutDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
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
          supplements: parsed.supplements?.length ? parsed.supplements : DEFAULT_SUPPLEMENTS,
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
          weeklyGoal: parsed.weeklyGoal || 3,
          calorieGoal: parsed.calorieGoal || 2000,
        });
        get().updateStreak();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  },

  saveData: async () => {
    try {
      const state = get();
      const dataToSave = {
        userProfile: state.userProfile,
        workouts: state.workouts,
        meals: state.meals,
        supplements: state.supplements,
        bmiRecords: state.bmiRecords,
        bodyMeasurements: state.bodyMeasurements,
        progressPhotos: state.progressPhotos,
        goals: state.goals,
        integrations: state.integrations,
        notificationPreferences: state.notificationPreferences,
        privacySettings: state.privacySettings,
        themeSettings: state.themeSettings,
        friends: state.friends,
        weeklyGoal: state.weeklyGoal,
        calorieGoal: state.calorieGoal,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  },
}));


export interface Workout {
  id: string;
  date: string;
  exercises: Exercise[];
  notes?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface Meal {
  id: string;
  date: string;
  time: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export interface BMIRecord {
  id: string;
  date: string;
  weight: number;
  height: number;
  bmi: number;
  unit: 'metric' | 'imperial';
  bodyFatPercent?: number;
  muscleMass?: number;
  waistCircumference?: number;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
  unit: 'metric' | 'imperial';
}

export interface ProgressPhoto {
  id: string;
  date: string;
  uri: string;
  thumbnail?: string;
}

export interface UserProfile {
  name: string;
  age: string;
  dateOfBirth?: string;
  weight: string;
  height: string;
  unit: 'metric' | 'imperial';
  dietaryPreference?: string;
  profilePictureUri?: string;
}

export interface Goal {
  id: string;
  type: 'weight' | 'body_composition' | 'performance' | 'other';
  title: string;
  targetValue: number;
  currentValue?: number;
  unit: string;
  targetDate: string;
  createdAt: string;
}

export interface Integration {
  id: string;
  name: 'fitbit' | 'apple_health' | 'google_fit' | 'strava' | 'myfitnesspal';
  connected: boolean;
  lastSync?: string;
}

export interface NotificationPreference {
  type: 'workout_reminder' | 'meal_reminder' | 'goal_milestone' | 'streak_reminder' | 'weekly_summary';
  enabled: boolean;
  time?: string;
  days?: string[];
}

export interface PrivacySettings {
  aiDataUsage: boolean;
  cloudSync: boolean;
  analytics: boolean;
  shareDataWithAI: boolean;
}

export interface ThemeSettings {
  darkMode: boolean;
  accentColor: string;
  layout: 'compact' | 'comfortable' | 'spacious';
}

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  connectedAt: string;
}

export interface Supplement {
  id: string;
  name: string;
  takenToday: boolean;
  date?: string;
}

export interface AppState {
  userProfile: UserProfile | null;
  workouts: Workout[];
  meals: Meal[];
  supplements: Supplement[];
  bmiRecords: BMIRecord[];
  bodyMeasurements: BodyMeasurement[];
  progressPhotos: ProgressPhoto[];
  goals: Goal[];
  integrations: Integration[];
  notificationPreferences: NotificationPreference[];
  privacySettings: PrivacySettings;
  themeSettings: ThemeSettings;
  friends: Friend[];
  weeklyGoal: number;
  calorieGoal: number;
  currentStreak: number;
  setUserProfile: (profile: UserProfile) => void;
  addWorkout: (workout: Workout) => void;
  removeWorkout: (id: string) => void;
  addMeal: (meal: Meal) => void;
  removeMeal: (id: string) => void;
  addSupplement: (supplement: Supplement) => void;
  removeSupplement: (id: string) => void;
  toggleSupplementTaken: (id: string, date: string) => void;
  addBMIRecord: (record: BMIRecord) => void;
  addBodyMeasurement: (measurement: BodyMeasurement) => void;
  addProgressPhoto: (photo: ProgressPhoto) => void;
  removeProgressPhoto: (id: string) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  updateIntegration: (id: string, integration: Partial<Integration>) => void;
  updateNotificationPreference: (type: string, preference: Partial<NotificationPreference>) => void;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  updateThemeSettings: (settings: Partial<ThemeSettings>) => void;
  addFriend: (friend: Friend) => void;
  removeFriend: (id: string) => void;
  setWeeklyGoal: (goal: number) => void;
  setCalorieGoal: (goal: number) => void;
  updateStreak: () => void;
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
}

export type MainTabParamList = {
  Tracker: undefined;
  Calories: undefined;
  BMI: undefined;
  Summary: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  AIChat: undefined;
};


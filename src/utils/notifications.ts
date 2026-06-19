import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationPreference } from '../types';

// 1 = Sunday, 2 = Monday, ..., 7 = Saturday (iOS DateComponents weekday)
const DAY_TO_WEEKDAY: Record<string, number> = {
  Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7,
};

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

export async function scheduleAllNotifications(
  preferences: NotificationPreference[],
  currentStreak: number
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const streakBody =
    currentStreak > 0
      ? `Keep your ${currentStreak}-day streak going! 🔥`
      : 'Start a streak today!';

  for (const pref of preferences) {
    if (!pref.enabled) continue;

    switch (pref.type) {
      case 'workout_reminder': {
        if (!pref.time || !pref.days?.length) break;
        const [hour, minute] = pref.time.split(':').map(Number);
        for (const day of pref.days) {
          const weekday = DAY_TO_WEEKDAY[day];
          if (!weekday) continue;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Workout Time! 💪',
              body: streakBody,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              repeats: true,
              weekday,
              hour,
              minute,
            } as any,
          });
        }
        break;
      }

      case 'meal_reminder': {
        if (!pref.time) break;
        const [hour, minute] = pref.time.split(':').map(Number);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Log Your Meal 🥗',
            body: 'Stay on track — tap to log what you ate today.',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            repeats: true,
            hour,
            minute,
          } as any,
        });
        break;
      }

      case 'streak_reminder': {
        if (!pref.time) break;
        const [hour, minute] = pref.time.split(':').map(Number);
        await Notifications.scheduleNotificationAsync({
          content: {
            title:
              currentStreak > 0
                ? `${currentStreak}-Day Streak 🔥`
                : "Don't Break the Habit!",
            body: "Don't forget to log today's workout.",
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            repeats: true,
            hour,
            minute,
          } as any,
        });
        break;
      }

      case 'weekly_summary': {
        // Every Sunday at 9 AM
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Weekly Fitness Summary 📊',
            body: 'Check out your progress this week!',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            repeats: true,
            weekday: 1, // Sunday
            hour: 9,
            minute: 0,
          } as any,
        });
        break;
      }

      // goal_milestone is event-driven, not schedulable
      default:
        break;
    }
  }
}

export async function updateBadgeCount(streak: number): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await Notifications.setBadgeCountAsync(streak > 0 ? streak : 0);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0);
  }
}

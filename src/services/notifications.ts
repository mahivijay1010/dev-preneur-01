// Local notification scheduling for Phase 1 reminders:
// workout, meal, weight check-in, and a weekly summary.
// No push server needed — these are on-device scheduled notifications.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface ReminderPrefs {
  workoutHour: number; // 24h
  mealHour: number;
  weightHour: number;
  enabled: boolean;
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  workoutHour: 18,
  mealHour: 12,
  weightHour: 8,
  enabled: false,
};

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function daily(hour: number, title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { hour, minute: 0, repeats: true },
  });
}

// Clears and re-schedules all reminders based on prefs. Safe to call repeatedly.
export async function syncReminders(prefs: ReminderPrefs): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.enabled) return;

  await daily(prefs.weightHour, 'Morning weigh-in', 'Log your weight to keep your average accurate.');
  await daily(prefs.mealHour, 'Meal reminder', "Don't forget to log your meals and protein.");
  await daily(prefs.workoutHour, 'Workout time', "Today's session is waiting. 30 minutes is enough.");

  // Weekly summary every Sunday evening.
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your weekly summary',
      body: 'See how consistent you were this week and what to focus on next.',
    },
    trigger: {
      weekday: 1, // Sunday
      hour: 19,
      minute: 0,
      repeats: true,
    },
  });
}

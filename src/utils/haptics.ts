// Thin, crash-proof wrapper around expo-haptics.
// No-ops on web/simulator or if the module is unavailable.
import * as Haptics from 'expo-haptics';

export const haptics = {
  light() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  selection() {
    Haptics.selectionAsync().catch(() => {});
  },
};

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

export const WorkoutTrackerScreen: React.FC = () => {
  const {
    workouts,
    weeklyGoal,
    currentStreak,
    supplements,
    setWeeklyGoal,
    addWorkout,
    addSupplement,
    removeSupplement,
    toggleSupplementTaken,
    loadData,
  } = useStore();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const workoutsThisWeek = workouts.filter((w) => {
    const workoutDate = new Date(w.date);
    const weekStart = new Date(currentMonth);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return workoutDate >= weekStart && workoutDate <= weekEnd;
  }).length;

  const markedDates: { [key: string]: any } = {};
  workouts.forEach((workout) => {
    markedDates[workout.date] = {
      marked: true,
      dotColor: COLORS.primary,
      selected: workout.date === selectedDate,
      selectedColor: COLORS.primary,
    };
  });

  const handleDatePress = (day: any) => {
    setSelectedDate(day.dateString);
    // Just select the date for viewing, don't add workout
  };

  const totalWorkouts = workouts.length;
  const progress = weeklyGoal > 0 ? workoutsThisWeek / weeklyGoal : 0;
  const todayStr = new Date().toISOString().split('T')[0];

  const handleAddSupplement = () => {
    addSupplement({
      id: `sup-${Date.now()}`,
      name: 'New Supplement',
      takenToday: false,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="barbell" size={SIZES.iconMd} color={COLORS.primary} />
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Gym Tracker</Text>
                <Text style={styles.headerSubtitle}>Build your fitness habit</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton}>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={SIZES.iconSm} color={COLORS.accent} />
                  <Text style={styles.streakText}>{currentStreak}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="notifications-outline" size={SIZES.iconMd} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* I Worked Out Today Button */}
          <View style={styles.workoutButtonContainer}>
            <TouchableOpacity
              style={styles.workoutTodayButton}
              onPress={() => {
                const today = new Date().toISOString().split('T')[0];
                const existingWorkout = workouts.find((w) => w.date === today);
                if (!existingWorkout) {
                  addWorkout({
                    id: Date.now().toString(),
                    date: today,
                    exercises: [],
                  });
                }
              }}
            >
              <View style={styles.workoutTodayButtonGradient}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.workoutTodayButtonText}>I worked out today</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Weekly Goal Card */}
          <View style={styles.card}>
            <View style={styles.goalCardHighlight}>
              <View style={styles.goalHeader}>
                <View style={styles.goalTitleContainer}>
                  <Ionicons name="flag" size={20} color="#fff" />
                  <Text style={styles.goalTitle}>Weekly Goal</Text>
                </View>
                <TouchableOpacity>
                  <Text style={styles.changeButton}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.goalValue}>
                {workoutsThisWeek} / {weeklyGoal} days
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(progress * 100, 100)}%` }]} />
              </View>
              <Text style={styles.goalSubtext}>
                {Math.max(0, weeklyGoal - workoutsThisWeek)} more to reach your goal
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="flame" size={24} color={COLORS.accent} />
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statSubtext}>days</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="barbell" size={SIZES.iconMd} color={COLORS.primary} />
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{totalWorkouts}</Text>
              <Text style={styles.statSubtext}>workouts</Text>
            </View>
          </View>

          {/* Supplement Tracker */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Supplement Tracker</Text>
            <View style={styles.supplementList}>
              {supplements.map((sup) => (
                <View key={sup.id} style={styles.supplementRow}>
                  <TouchableOpacity
                    style={styles.supplementCheck}
                    onPress={() => toggleSupplementTaken(sup.id, todayStr)}
                  >
                    <Ionicons
                      name={sup.date === todayStr && sup.takenToday ? 'checkmark-circle' : 'ellipse-outline'}
                      size={SIZES.iconSm}
                      color={sup.date === todayStr && sup.takenToday ? COLORS.success : COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.supplementName}>{sup.name}</Text>
                  <TouchableOpacity
                    onPress={() => removeSupplement(sup.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle-outline" size={SIZES.iconSm} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addSupplementButton} onPress={handleAddSupplement}>
                <Ionicons name="add-circle-outline" size={SIZES.iconMd} color={COLORS.primary} />
                <Text style={styles.addSupplementText}>Add Supplement</Text>
              </TouchableOpacity>
              <Text style={styles.supplementHint}>
                Track your daily vitamins and supplements
              </Text>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.card}>
            <Calendar
              current={currentMonth.toISOString().split('T')[0]}
              onMonthChange={(month: any) => {
                setCurrentMonth(new Date(month.dateString));
              }}
              markedDates={{
                ...markedDates,
                [selectedDate]: {
                  ...markedDates[selectedDate],
                  selected: true,
                  selectedColor: COLORS.primary,
                },
              }}
              onDayPress={handleDatePress}
              theme={{
                backgroundColor: COLORS.card,
                calendarBackground: COLORS.card,
                textSectionTitleColor: COLORS.text,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: '#fff',
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.text,
                textDisabledColor: COLORS.textSecondary,
                dotColor: COLORS.primary,
                selectedDotColor: '#fff',
                arrowColor: COLORS.primary,
                monthTextColor: COLORS.text,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '500',
              }}
              style={styles.calendar}
            />
            <Text style={styles.calendarHint}>
              View your workout history
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: SIZES.padding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    flex: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONTS.h1,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.lg,
  },
  headerButton: {
    padding: SIZES.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.card,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  streakText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.bold,
    color: COLORS.accent,
  },
  workoutButtonContainer: {
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.lg,
  },
  workoutTodayButton: {
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  workoutTodayButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
    gap: SIZES.sm,
    backgroundColor: COLORS.button,
    borderRadius: SIZES.borderRadius,
  },
  workoutTodayButtonText: {
    color: '#fff',
    fontSize: FONTS.h3,
    fontWeight: FONTS.bold,
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.lg,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  goalCardHighlight: {
    borderRadius: SIZES.borderRadius,
    padding: SIZES.xl,
    backgroundColor: COLORS.highlight,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  goalTitle: {
    fontSize: FONTS.body,
    fontWeight: FONTS.semibold,
    color: '#fff',
  },
  changeButton: {
    fontSize: FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },
  goalValue: {
    fontSize: FONTS.display,
    fontWeight: FONTS.bold,
    color: '#fff',
    marginBottom: SIZES.lg,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: SIZES.xs,
    marginBottom: SIZES.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.xs,
  },
  goalSubtext: {
    fontSize: FONTS.bodySmall,
    color: '#fff',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SIZES.lg,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statLabel: {
    fontSize: FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  statValue: {
    fontSize: FONTS.display,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  statSubtext: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
  },
  calendar: {
    borderRadius: SIZES.borderRadius,
  },
  calendarHint: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.lg,
  },
  sectionTitle: {
    fontSize: FONTS.h3,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.lg,
  },
  supplementList: {
    alignItems: 'stretch',
    gap: SIZES.sm,
  },
  supplementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  supplementCheck: {
    padding: SIZES.xs,
  },
  supplementName: {
    flex: 1,
    fontSize: FONTS.body,
    color: COLORS.text,
  },
  addSupplementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    padding: SIZES.lg,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    width: '100%',
    justifyContent: 'center',
  },
  addSupplementText: {
    fontSize: FONTS.body,
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },
  supplementHint: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
});



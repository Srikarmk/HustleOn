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
import { COLORS, SIZES } from '../../constants/theme';

export const WorkoutTrackerScreen: React.FC = () => {
  const {
    workouts,
    weeklyGoal,
    currentStreak,
    setWeeklyGoal,
    addWorkout,
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="barbell" size={24} color={COLORS.primary} />
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Gym Tracker</Text>
                <Text style={styles.headerSubtitle}>Build your fitness habit</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton}>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={20} color={COLORS.accent} />
                  <Text style={styles.streakText}>{currentStreak}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
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
              <Ionicons name="barbell" size={24} color={COLORS.primary} />
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{totalWorkouts}</Text>
              <Text style={styles.statSubtext}>workouts</Text>
            </View>
          </View>

          {/* Supplement Tracker */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Supplement Tracker</Text>
            <View style={styles.supplementList}>
              <TouchableOpacity style={styles.addSupplementButton}>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
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
    gap: 12,
    flex: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerButton: {
    padding: 5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  workoutButtonContainer: {
    marginHorizontal: SIZES.padding,
    marginBottom: 15,
  },
  workoutTodayButton: {
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  workoutTodayButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
    gap: 10,
    backgroundColor: COLORS.button,
    borderRadius: SIZES.borderRadius,
  },
  workoutTodayButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginBottom: 15,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  goalCardHighlight: {
    borderRadius: SIZES.borderRadius,
    padding: 20,
    backgroundColor: COLORS.highlight,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  changeButton: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  goalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  goalSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginHorizontal: SIZES.padding,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  statSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  calendar: {
    borderRadius: SIZES.borderRadius,
  },
  calendarHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  supplementList: {
    alignItems: 'center',
  },
  addSupplementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    width: '100%',
    justifyContent: 'center',
  },
  addSupplementText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  supplementHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
});



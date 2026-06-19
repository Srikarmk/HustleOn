import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { generateGeminiResponse } from '../../config/gemini';

export const SummaryScreen: React.FC = () => {
  const { workouts, meals } = useStore();
  const navigation = useNavigation<any>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);

  const monthStart = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const monthEnd = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const monthWorkouts = workouts.filter((w) => {
    const workoutDate = new Date(w.date);
    return workoutDate >= monthStart && workoutDate <= monthEnd;
  });

  const totalWorkouts = monthWorkouts.length;
  const monthDays = monthEnd.getDate();
  const monthPercentage = monthDays > 0 ? Math.round((totalWorkouts / monthDays) * 100) : 0;

  // Calculate best streak
  let bestStreak = 0;
  if (monthWorkouts.length > 0) {
    const sortedDates = monthWorkouts
      .map((w) => new Date(w.date).getDate())
      .sort((a, b) => a - b);
    
    let currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      if (sortedDates[i] === sortedDates[i - 1] + 1) {
        currentStreak++;
      } else {
        bestStreak = Math.max(bestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  // Weekly average
  const weeksInMonth = Math.ceil(monthDays / 7);
  const weeklyAverage = weeksInMonth > 0 ? (totalWorkouts / weeksInMonth).toFixed(1) : '0.0';

  // Consistency score (simplified)
  const consistencyScore = Math.min(100, Math.round((totalWorkouts / monthDays) * 100 * 3));

  // Workout days distribution
  const dayCounts: { [key: string]: number } = {
    Sun: 0,
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
  };

  monthWorkouts.forEach((workout) => {
    const date = new Date(workout.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    dayCounts[dayName]++;
  });

  // Dummy trend data when no workouts so charts still show something
  const useDummyTrends = totalWorkouts === 0;
  const displayDayCounts = useDummyTrends
    ? { Sun: 1, Mon: 3, Tue: 2, Wed: 4, Thu: 2, Fri: 3, Sat: 1 }
    : dayCounts;
  const maxDayCount = Math.max(...Object.values(displayDayCounts), 1);

  // Weekly breakdown: bucket workouts into weeks of the month (1-7, 8-14, ...)
  const numWeeks = Math.ceil(monthDays / 7);
  const weeklyBreakdown = Array(numWeeks).fill(0) as number[];
  monthWorkouts.forEach((workout) => {
    const dayOfMonth = new Date(workout.date).getDate();
    const weekIndex = Math.min(numWeeks - 1, Math.floor((dayOfMonth - 1) / 7));
    weeklyBreakdown[weekIndex]++;
  });
  const maxWeekCount = Math.max(...weeklyBreakdown, 1);

  const monthName = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleAskAI = async () => {
    setShowAIModal(true);
    setIsAILoading(true);
    setAiResponse('');

    const prompt = `This month I've completed ${totalWorkouts} workouts out of ${monthDays} days (${monthPercentage}% consistency). My best streak was ${bestStreak} days. Weekly average: ${weeklyAverage} workouts. My consistency score is ${consistencyScore}. Please provide personalized fitness insights and recommendations based on this data.`;

    try {
      const response = await generateGeminiResponse(
        prompt,
        'You are a fitness coach expert. Provide helpful, personalized insights and recommendations based on the user\'s monthly workout summary. Keep responses in medium-sized paragraphs (3-5 sentences). Be encouraging and provide actionable advice.'
      );
      setAiResponse(response);
    } catch (error) {
      setAiResponse('Unable to get AI response. Please try again later.');
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="list" size={24} color={COLORS.primary} />
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Monthly Summary</Text>
                <Text style={styles.headerSubtitle}>Your fitness progress</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerButton} onPress={handleAskAI}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth('prev')}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthName}</Text>
            <TouchableOpacity onPress={() => changeMonth('next')}>
              <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="calendar" size={24} color="#fff" />
              <Text style={styles.statCardLabel}>Total Workouts</Text>
              <Text style={styles.statCardValue}>{useDummyTrends ? 8 : totalWorkouts}</Text>
              <Text style={styles.statCardSubtext}>
                {useDummyTrends ? 'sample' : `${monthPercentage}% of month`}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trophy" size={24} color={COLORS.accent} />
              <Text style={styles.statCardLabel}>Best Streak</Text>
              <Text style={styles.statCardValue}>{useDummyTrends ? 3 : bestStreak}</Text>
              <Text style={styles.statCardSubtext}>days in a row</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={24} color={COLORS.success} />
              <Text style={styles.statCardLabel}>Weekly Avg</Text>
              <Text style={styles.statCardValue}>{useDummyTrends ? '2.1' : weeklyAverage}</Text>
              <Text style={styles.statCardSubtext}>workouts/week</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="list" size={24} color={COLORS.primary} />
              <Text style={styles.statCardLabel}>Consistency</Text>
              <Text style={styles.statCardValue}>{useDummyTrends ? 72 : consistencyScore}</Text>
              <Text style={styles.statCardSubtext}>{useDummyTrends ? 'sample score' : 'score'}</Text>
            </View>
          </View>

          {/* Weekly Breakdown */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
            {useDummyTrends ? (
              <Text style={styles.emptyText}>Sample trend: aim for 3–4 workouts per week. Log workouts to see your real breakdown.</Text>
            ) : totalWorkouts === 0 ? (
              <Text style={styles.emptyText}>No workouts this month</Text>
            ) : (
              weeklyBreakdown.map((count, index) => (
                <View key={index} style={styles.dayRow}>
                  <Text style={styles.weekLabel}>Week {index + 1}</Text>
                  <View style={styles.dayBarContainer}>
                    <View
                      style={[
                        styles.dayBar,
                        {
                          width: `${(count / maxWeekCount) * 100}%`,
                          backgroundColor: count > 0 ? COLORS.primary : COLORS.cardBorder,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.dayCount}>{count}</Text>
                </View>
              ))
            )}
          </View>

          {/* Workout Days Distribution */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Workout Days Distribution</Text>
            {useDummyTrends && (
              <Text style={styles.distributionHint}>
                Sample trend below. Log workouts to see your real distribution.
              </Text>
            )}
            {Object.entries(displayDayCounts).map(([day, count]) => (
              <View key={day} style={styles.dayRow}>
                <Text style={styles.dayName}>{day}</Text>
                <View style={styles.dayBarContainer}>
                  <View
                    style={[
                      styles.dayBar,
                      {
                        width: `${(count / maxDayCount) * 100}%`,
                        backgroundColor:
                          count > 0 ? COLORS.primary : COLORS.cardBorder,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dayCount}>{count}</Text>
              </View>
            ))}
            <Text style={styles.distributionHint}>
              Track which days you workout most often
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* AI Insights Modal */}
      <Modal
        visible={showAIModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Fitness Insights</Text>
              <TouchableOpacity onPress={() => setShowAIModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {isAILoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Analyzing your progress...</Text>
              </View>
            ) : (
              <ScrollView style={styles.aiResponseContainer}>
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    gap: SIZES.sm,
  },
  headerButton: {
    padding: SIZES.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.xxl,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  modalTitle: {
    fontSize: FONTS.h2,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  loadingContainer: {
    padding: SIZES.xxl * 2,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: SIZES.lg,
    fontSize: FONTS.bodySmall,
  },
  aiResponseContainer: {
    maxHeight: 400,
  },
  aiResponseText: {
    color: COLORS.text,
    fontSize: FONTS.body,
    lineHeight: 24,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  monthText: {
    fontSize: FONTS.h3,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.lg,
    gap: SIZES.lg,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statCardLabel: {
    fontSize: FONTS.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  statCardValue: {
    fontSize: FONTS.display,
    fontWeight: FONTS.bold,
    color: '#fff',
    marginBottom: SIZES.xs,
  },
  statCardSubtext: {
    fontSize: FONTS.overline,
    color: 'rgba(255, 255, 255, 0.7)',
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
  sectionTitle: {
    fontSize: FONTS.h3,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.lg,
  },
  emptyText: {
    fontSize: FONTS.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SIZES.xl,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  dayName: {
    width: 40,
    fontSize: FONTS.bodySmall,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
  },
  weekLabel: {
    width: 56,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: SIZES.xs,
    overflow: 'hidden',
  },
  dayBar: {
    height: '100%',
    borderRadius: SIZES.xs,
  },
  dayCount: {
    width: 30,
    fontSize: FONTS.bodySmall,
    color: COLORS.text,
    textAlign: 'right',
  },
  distributionHint: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
});


import React, { useState, useEffect } from 'react';
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
import { useStore } from '../../store';
import { COLORS, SIZES } from '../../constants/theme';
import { generateGeminiResponse } from '../../config/gemini';

export const SummaryScreen: React.FC = () => {
  const { workouts, meals, loadData } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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

  const maxDayCount = Math.max(...Object.values(dayCounts), 1);

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
              <TouchableOpacity style={styles.headerButton}>
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
              <Text style={styles.statCardValue}>{totalWorkouts}</Text>
              <Text style={styles.statCardSubtext}>{monthPercentage}% of month</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trophy" size={24} color={COLORS.accent} />
              <Text style={styles.statCardLabel}>Best Streak</Text>
              <Text style={styles.statCardValue}>{bestStreak}</Text>
              <Text style={styles.statCardSubtext}>days in a row</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={24} color={COLORS.success} />
              <Text style={styles.statCardLabel}>Weekly Avg</Text>
              <Text style={styles.statCardValue}>{weeklyAverage}</Text>
              <Text style={styles.statCardSubtext}>workouts/week</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="list" size={24} color={COLORS.primary} />
              <Text style={styles.statCardLabel}>Consistency</Text>
              <Text style={styles.statCardValue}>{consistencyScore}</Text>
              <Text style={styles.statCardSubtext}>score</Text>
            </View>
          </View>

          {/* Weekly Breakdown */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
            {totalWorkouts === 0 ? (
              <Text style={styles.emptyText}>No workouts this month</Text>
            ) : (
              <Text style={styles.emptyText}>Weekly breakdown chart</Text>
            )}
          </View>

          {/* Workout Days Distribution */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Workout Days Distribution</Text>
            {Object.entries(dayCounts).map(([day, count]) => (
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
    gap: 10,
  },
  headerButton: {
    padding: 5,
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
    padding: 25,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 15,
    fontSize: 14,
  },
  aiResponseContainer: {
    maxHeight: 400,
  },
  aiResponseText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 24,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.padding,
    marginBottom: 15,
    padding: 15,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: SIZES.padding,
    marginBottom: 15,
    gap: 15,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statCardLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 10,
    marginBottom: 5,
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statCardSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  dayName: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayBar: {
    height: '100%',
    borderRadius: 4,
  },
  dayCount: {
    width: 30,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'right',
  },
  distributionHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
    fontStyle: 'italic',
  },
});


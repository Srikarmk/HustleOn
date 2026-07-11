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
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { generateGeminiResponse, AI_DISCLAIMER } from '../../config/gemini';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';
import { haptics } from '../../utils/haptics';

export const CalorieTrackerScreen: React.FC = () => {
  const { meals, calorieGoal, setCalorieGoal, addMeal, removeMeal } = useStore();
  const navigation = useNavigation<any>();
  const [today] = useState(new Date().toISOString().split('T')[0]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [foodAnalysis, setFoodAnalysis] = useState<any>(null);

  const handleAskAI = async () => {
    setShowAIModal(true);
    setIsAILoading(true);
    setAiResponse('');

    const prompt = `I have consumed ${totalCalories} calories today out of my goal of ${calorieGoal} calories. I've had ${todayMeals.length} meals today. ${todayMeals.length > 0 ? `My meals were: ${todayMeals.map(m => m.name).join(', ')}.` : ''} ${remaining > 0 ? `I have ${remaining} calories remaining.` : 'I have exceeded my calorie goal.'} Please provide personalized nutrition advice and meal suggestions.`;

    try {
      const response = await generateGeminiResponse(
        prompt,
        'You are a nutrition expert. Provide helpful, personalized nutrition advice based on the user\'s daily calorie intake. Keep responses in medium-sized paragraphs (3-5 sentences).'
      );
      setAiResponse(response);
    } catch (error) {
      setAiResponse('Unable to get AI response. Please try again later.');
    } finally {
      setIsAILoading(false);
    }
  };

  const todayMeals = meals.filter((m) => m.date === today);
  const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const remaining = Math.max(0, calorieGoal - totalCalories);
  const progress = calorieGoal > 0 ? totalCalories / calorieGoal : 0;

  const averageCalories =
    todayMeals.length > 0 ? Math.round(totalCalories / todayMeals.length) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="nutrition" size={24} color={COLORS.primary} />
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Calorie Tracker</Text>
                <Text style={styles.headerSubtitle}>Monitor your daily nutrition</Text>
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

          {/* Daily Goal Card */}
          <View style={styles.card}>
            <View style={styles.goalCardHighlight}>
              <View style={styles.goalHeader}>
                <View style={styles.goalTitleContainer}>
                  <Ionicons name="eye" size={20} color="#fff" />
                  <Text style={styles.goalTitle}>Daily Goal</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                  <Text style={styles.changeButton}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.goalValue}>
                {totalCalories} / {calorieGoal} cal
              </Text>
              <AnimatedProgressBar
                progress={progress}
                color={COLORS.accent}
                trackStyle={styles.progressBarContainer}
                fillStyle={styles.progressBar}
              />
              <Text style={styles.goalSubtext}>
                {remaining} calories remaining
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="nutrition" size={24} color={COLORS.success} />
              <Text style={styles.statLabel}>Today</Text>
              <Text style={styles.statValue}>{todayMeals.length}</Text>
              <Text style={styles.statSubtext}>meals</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="stats-chart" size={24} color={COLORS.primary} />
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>{averageCalories}</Text>
              <Text style={styles.statSubtext}>cal/meal</Text>
            </View>
          </View>

          {/* Add Meal Button */}
          <PressableScale
            style={styles.addButton}
            onPress={() => setShowAddMealModal(true)}
          >
            <View style={styles.addButtonGradient}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Add Meal or Snack</Text>
            </View>
          </PressableScale>

          {/* Today's Meals */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            {todayMeals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="nutrition-outline" size={64} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No meals logged yet</Text>
                <Text style={styles.emptySubtext}>Start tracking your calories</Text>
              </View>
            ) : (
              <View>
                {todayMeals.map((meal) => (
                  <View key={meal.id} style={styles.mealItem}>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      <Text style={styles.mealTime}>{meal.time}</Text>
                      {meal.protein && (
                        <Text style={styles.macroText}>
                          P: {meal.protein}g | C: {meal.carbs || 0}g | F: {meal.fats || 0}g
                        </Text>
                      )}
                    </View>
                    <View style={styles.mealRight}>
                      <Text style={styles.mealCalories}>{meal.calories} cal</Text>
                      <TouchableOpacity onPress={() => removeMeal(meal.id)}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* AI Advice Modal */}
      <Modal
        visible={showAIModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Nutrition Advice</Text>
              <TouchableOpacity onPress={() => setShowAIModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {isAILoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Getting personalized advice...</Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.aiResponseContainer}>
                  <Text style={styles.aiResponseText}>{aiResponse}</Text>
                </ScrollView>
                <Text style={styles.aiDisclaimer}>{AI_DISCLAIMER}</Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Meal Modal */}
      <Modal
        visible={showAddMealModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowAddMealModal(false);
          setFoodName('');
          setFoodAmount('');
          setFoodAnalysis(null);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food</Text>
              <TouchableOpacity onPress={() => {
                Keyboard.dismiss();
                setShowAddMealModal(false);
                setFoodName('');
                setFoodAmount('');
                setFoodAnalysis(null);
              }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Food Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Grilled Chicken Breast"
              placeholderTextColor={COLORS.textSecondary}
              value={foodName}
              onChangeText={setFoodName}
            />

            <Text style={[styles.inputLabel, { marginTop: 15 }]}>Amount (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 200g or 1 cup"
              placeholderTextColor={COLORS.textSecondary}
              value={foodAmount}
              onChangeText={setFoodAmount}
            />

            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={async () => {
                if (!foodName.trim()) {
                  Alert.alert('Error', 'Please enter a food name');
                  return;
                }
                setIsAnalyzingFood(true);
                setFoodAnalysis(null);
                try {
                  const prompt = `Analyze this food item and provide detailed nutritional information: ${foodName}${foodAmount ? ` (${foodAmount})` : ''}. Provide the response in this exact JSON format: {"calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number, "sugar": number, "sodium": number, "vitamins": "brief list", "minerals": "brief list"}. Only return the JSON, no other text.`;
                  const response = await generateGeminiResponse(prompt, 'You are a nutrition expert. Provide accurate nutritional information in JSON format only.');
                  try {
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      const parsed = JSON.parse(jsonMatch[0]);
                      setFoodAnalysis(parsed);
                    } else {
                      Alert.alert('Error', 'Could not parse nutritional data');
                    }
                  } catch (e) {
                    Alert.alert('Error', 'Could not parse nutritional data');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to analyze food');
                } finally {
                  setIsAnalyzingFood(false);
                }
              }}
              disabled={isAnalyzingFood}
            >
              <View style={styles.analyzeButtonContent}>
                {isAnalyzingFood ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="sparkles" size={20} color="#fff" />
                )}
                <Text style={styles.analyzeButtonText}>
                  {isAnalyzingFood ? 'Analyzing...' : 'Analyze with AI'}
                </Text>
              </View>
            </TouchableOpacity>

            {foodAnalysis && (
              <View style={styles.analysisContainer}>
                <Text style={styles.analysisTitle}>Nutritional Information</Text>
                <View style={styles.macroRow}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Calories</Text>
                    <Text style={styles.macroValue}>{foodAnalysis.calories}</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroValue}>{foodAnalysis.protein}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroValue}>{foodAnalysis.carbs}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Fats</Text>
                    <Text style={styles.macroValue}>{foodAnalysis.fats}g</Text>
                  </View>
                </View>
                {foodAnalysis.fiber && (
                  <Text style={styles.microText}>Fiber: {foodAnalysis.fiber}g | Sugar: {foodAnalysis.sugar || 0}g | Sodium: {foodAnalysis.sodium || 0}mg</Text>
                )}
                {foodAnalysis.vitamins && (
                  <Text style={styles.microText}>Vitamins: {foodAnalysis.vitamins}</Text>
                )}
                {foodAnalysis.minerals && (
                  <Text style={styles.microText}>Minerals: {foodAnalysis.minerals}</Text>
                )}
                <TouchableOpacity
                  style={styles.addFoodButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    const now = new Date();
                    addMeal({
                      id: Date.now().toString(),
                      date: today,
                      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                      name: foodName,
                      calories: foodAnalysis.calories || 0,
                      protein: foodAnalysis.protein,
                      carbs: foodAnalysis.carbs,
                      fats: foodAnalysis.fats,
                    });
                    haptics.success();
                    setShowAddMealModal(false);
                    setFoodName('');
                    setFoodAmount('');
                    setFoodAnalysis(null);
                    Alert.alert('Success', 'Food added to your log!');
                  }}
                >
                  <Text style={styles.addFoodButtonText}>Add to Log</Text>
                </TouchableOpacity>
              </View>
            )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  aiDisclaimer: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
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
  addButton: {
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.lg,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.lg,
    gap: SIZES.sm,
    backgroundColor: COLORS.button,
    borderRadius: SIZES.borderRadius,
  },
  addButtonText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.semibold,
    color: '#fff',
  },
  sectionTitle: {
    fontSize: FONTS.h3,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl * 2,
  },
  emptyText: {
    fontSize: FONTS.body,
    color: COLORS.text,
    marginTop: SIZES.lg,
    marginBottom: SIZES.xs,
  },
  emptySubtext: {
    fontSize: FONTS.bodySmall,
    color: COLORS.textSecondary,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: FONTS.body,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  mealTime: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
  },
  mealCalories: {
    fontSize: FONTS.body,
    fontWeight: FONTS.semibold,
    color: COLORS.primary,
  },
  mealRight: {
    alignItems: 'flex-end',
    gap: SIZES.xs,
  },
  macroText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  inputLabel: {
    fontSize: FONTS.bodySmall,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.lg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    fontSize: FONTS.body,
  },
  analyzeButton: {
    marginTop: SIZES.lg,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  analyzeButtonContent: {
    backgroundColor: COLORS.highlight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.lg,
    gap: SIZES.sm,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: FONTS.body,
    fontWeight: FONTS.semibold,
  },
  analysisContainer: {
    marginTop: SIZES.xl,
    padding: SIZES.lg,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  analysisTitle: {
    fontSize: FONTS.body,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: SIZES.lg,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZES.lg,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  macroValue: {
    fontSize: FONTS.h3,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  microText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    lineHeight: 18,
  },
  addFoodButton: {
    marginTop: SIZES.lg,
    backgroundColor: COLORS.button,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.lg,
    alignItems: 'center',
  },
  addFoodButtonText: {
    color: '#fff',
    fontSize: FONTS.body,
    fontWeight: FONTS.semibold,
  },
});


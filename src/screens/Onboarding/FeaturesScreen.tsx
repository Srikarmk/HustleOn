import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface FeaturesScreenProps {
  onNext: () => void;
  onSkip: () => void;
}

const features = [
  {
    icon: 'barbell',
    title: 'Workout Tracker',
    description: 'Log your workouts, track exercises, and monitor your fitness progress over time.',
    color: COLORS.primary,
  },
  {
    icon: 'nutrition',
    title: 'Calorie Tracker',
    description: 'Track your daily meals and calories with AI-powered meal analysis.',
    color: COLORS.accent,
  },
  {
    icon: 'scale',
    title: 'BMI Calculator',
    description: 'Monitor your Body Mass Index and track your weight goals.',
    color: COLORS.success,
  },
  {
    icon: 'stats-chart',
    title: 'Progress Summary',
    description: 'View detailed statistics and insights about your fitness journey.',
    color: COLORS.primary,
  },
];

export const FeaturesScreen: React.FC<FeaturesScreenProps> = ({ onNext, onSkip }) => {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Track Your Fitness Journey</Text>
        <Text style={styles.subtitle}>
          Everything you need to achieve your health and fitness goals
        </Text>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.iconContainer}>
                <Ionicons name={feature.icon as any} size={40} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={onNext}>
          <View style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    gap: 20,
  },
  featureCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: COLORS.cardLight,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    paddingTop: 20,
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    gap: 10,
    backgroundColor: COLORS.button,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


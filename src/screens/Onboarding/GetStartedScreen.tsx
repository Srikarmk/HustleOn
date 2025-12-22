import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface GetStartedScreenProps {
  onGetStarted: () => void;
}

export const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ onGetStarted }) => {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconGradient}>
            <Ionicons name="rocket" size={60} color="#fff" />
          </View>
        </View>

        <Text style={styles.title}>You're All Set!</Text>
        <Text style={styles.subtitle}>
          Start your fitness journey today. Track your progress, achieve your goals, and become the best version of yourself.
        </Text>

        <View style={styles.benefits}>
          <View style={styles.benefitItem}>
            <Ionicons name="trophy" size={24} color={COLORS.primary} />
            <Text style={styles.benefitText}>Achieve Your Goals</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={24} color={COLORS.primary} />
            <Text style={styles.benefitText}>Track Progress</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="heart" size={24} color={COLORS.primary} />
            <Text style={styles.benefitText}>Stay Healthy</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={onGetStarted}>
        <View style={styles.buttonGradient}>
          <Text style={styles.buttonText}>Let's Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.button,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 50,
  },
  benefits: {
    width: '100%',
    gap: 25,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 15,
    borderRadius: 15,
  },
  benefitText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  button: {
    marginBottom: 50,
    marginHorizontal: 30,
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


import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { WorkoutTrackerScreen } from '../screens/Workout/WorkoutTrackerScreen';
import { CalorieTrackerScreen } from '../screens/Calorie/CalorieTrackerScreen';
import { BMICalculatorScreen } from '../screens/BMI/BMICalculatorScreen';
import { SummaryScreen } from '../screens/Summary/SummaryScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { AIChatScreen } from '../screens/AI/AIChatScreen';
import { FloatingAIButton } from '../components/FloatingAIButton';
import { MainTabParamList, RootStackParamList } from '../types';
import { COLORS } from '../constants/theme';
import { useStore } from '../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Wrapper components to add floating button to each screen
const WorkoutTrackerWithButton = () => (
  <View style={{ flex: 1 }}>
    <WorkoutTrackerScreen />
    <FloatingAIButton />
  </View>
);

const CalorieTrackerWithButton = () => (
  <View style={{ flex: 1 }}>
    <CalorieTrackerScreen />
    <FloatingAIButton />
  </View>
);

const BMICalculatorWithButton = () => (
  <View style={{ flex: 1 }}>
    <BMICalculatorScreen />
    <FloatingAIButton />
  </View>
);

const SummaryWithButton = () => (
  <View style={{ flex: 1 }}>
    <SummaryScreen />
    <FloatingAIButton />
  </View>
);

const ProfileWithButton = () => (
  <View style={{ flex: 1 }}>
    <ProfileScreen />
    <FloatingAIButton />
  </View>
);

export const MainNavigator: React.FC = () => {
  const { loadData } = useStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.cardBorder,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Tracker"
        component={WorkoutTrackerWithButton}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calories"
        component={CalorieTrackerWithButton}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="nutrition" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BMI"
        component={BMICalculatorWithButton}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scale" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Summary"
        component={SummaryWithButton}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileWithButton}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator with Stack for AI Chat Modal
export const MainNavigatorWithStack: React.FC = () => {
  const { loadData } = useStore();

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};


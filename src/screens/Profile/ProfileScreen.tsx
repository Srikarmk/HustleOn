import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useStore } from '../../store';
import { COLORS, SIZES } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { scheduleAllNotifications } from '../../utils/notifications';
import { Goal, Integration, NotificationPreference } from '../../types';

interface UserProfile {
  name: string;
  email: string;
  age: string;
  dateOfBirth?: string;
  weight: string;
  height: string;
  unit: 'metric' | 'imperial';
  dietaryPreference?: string;
  profilePictureUri?: string;
  gender?: 'male' | 'female';
  notifications: boolean;
  darkMode: boolean;
}

export const ProfileScreen: React.FC = () => {
  const { signOut } = useAuth();
  const store = useStore();
  const {
    weeklyGoal,
    calorieGoal,
    setWeeklyGoal,
    setCalorieGoal,
    loadData,
    goals,
    integrations,
    notificationPreferences,
    privacySettings,
    themeSettings,
    friends,
    currentStreak,
    addGoal,
    updateGoal,
    removeGoal,
    updateIntegration,
    updateNotificationPreference,
    updatePrivacySettings,
    updateThemeSettings,
    addFriend,
    removeFriend,
    meals,
    workouts,
  } = store;
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    age: '',
    dateOfBirth: '',
    weight: '',
    height: '',
    unit: 'metric',
    dietaryPreference: '',
    profilePictureUri: '',
    gender: undefined,
    notifications: true,
    darkMode: true,
  });
  const [showWeeklyGoalModal, setShowWeeklyGoalModal] = useState(false);
  const [showCalorieGoalModal, setShowCalorieGoalModal] = useState(false);
  const [tempWeeklyGoal, setTempWeeklyGoal] = useState(weeklyGoal.toString());
  const [tempCalorieGoal, setTempCalorieGoal] = useState(calorieGoal.toString());
  
  // Goal Management State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({
    type: 'weight' as 'weight' | 'body_composition' | 'performance' | 'other',
    title: '',
    targetValue: '',
    targetDate: '',
  });

  // Notification Preferences State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<NotificationPreference | null>(null);

  // Theme State
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  // Privacy State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Friends State
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  useEffect(() => {
    loadProfile();
    loadData();
  }, []);

  const loadProfile = async () => {
    // Load profile from store
    if (store.userProfile) {
      setProfile({
        name: store.userProfile.name || '',
        email: '',
        age: store.userProfile.age || '',
        dateOfBirth: store.userProfile.dateOfBirth || '',
        weight: store.userProfile.weight || '',
        height: store.userProfile.height || '',
        unit: store.userProfile.unit || 'metric',
        dietaryPreference: store.userProfile.dietaryPreference || '',
        profilePictureUri: store.userProfile.profilePictureUri || '',
        gender: store.userProfile.gender,
        notifications: true,
        darkMode: true,
      });
    }
  };

  const saveProfile = () => {
    store.setUserProfile({
      name: profile.name,
      age: profile.age,
      dateOfBirth: profile.dateOfBirth,
      weight: profile.weight,
      height: profile.height,
      unit: profile.unit,
      dietaryPreference: profile.dietaryPreference,
      profilePictureUri: profile.profilePictureUri,
      gender: profile.gender,
    });
    if (themeSettings.darkMode !== profile.darkMode) {
      updateThemeSettings({ darkMode: profile.darkMode });
    }
  };

  const updateProfile = (field: keyof UserProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const pickProfilePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateProfile('profilePictureUri', result.assets[0].uri);
      // Also update in store
      if (store.userProfile) {
        store.setUserProfile({
          ...store.userProfile,
          profilePictureUri: result.assets[0].uri,
        });
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => { signOut(); } },
      ]
    );
  };

  // Export Data
  const exportData = async () => {
    try {
      const allData = {
        profile,
        workouts,
        meals,
        goals,
        integrations,
        notificationPreferences,
        privacySettings,
        themeSettings,
        friends,
        exportedAt: new Date().toISOString(),
      };

      const jsonData = JSON.stringify(allData, null, 2);
      const fileName = `hustleon_export_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Export Complete', `Data exported to: ${fileUri}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  // Save Goal
  const saveGoal = () => {
    if (!goalForm.title || !goalForm.targetValue || !goalForm.targetDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const goal: Goal = {
      id: editingGoal?.id || Date.now().toString(),
      type: goalForm.type,
      title: goalForm.title,
      targetValue: parseFloat(goalForm.targetValue),
      unit: goalForm.type === 'weight' ? (profile.unit === 'metric' ? 'kg' : 'lbs') : goalForm.type === 'body_composition' ? '%' : '',
      targetDate: goalForm.targetDate,
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, goal);
    } else {
      addGoal(goal);
    }

    setShowGoalModal(false);
    setGoalForm({ type: 'weight', title: '', targetValue: '', targetDate: '' });
    setEditingGoal(null);
    Alert.alert('Success', 'Goal saved!');
  };

  // Connect Integration
  const connectIntegration = async (integration: Integration) => {
    Alert.alert(
      'Connect ' + integration.name,
      `This would open ${integration.name} authentication. For now, this is a placeholder.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: () => {
            updateIntegration(integration.id, {
              connected: true,
              lastSync: new Date().toISOString(),
            });
            Alert.alert('Connected', `${integration.name} has been connected (demo mode)`);
          },
        },
      ]
    );
  };

  const handleNotifToggle = (type: string, value: boolean) => {
    updateNotificationPreference(type, { enabled: value });
    const updated = notificationPreferences.map((p) =>
      p.type === type ? { ...p, enabled: value } : p
    );
    scheduleAllNotifications(updated, currentStreak).catch(console.error);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.avatarContainer} onPress={pickProfilePicture}>
                {profile.profilePictureUri ? (
                  <Image source={{ uri: profile.profilePictureUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={32} color="#fff" />
                  </View>
                )}
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Profile & Settings</Text>
                <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Profile Information */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textSecondary}
                value={profile.name}
                onChangeText={(value) => updateProfile('name', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textSecondary}
                value={profile.email}
                onChangeText={(value) => updateProfile('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                placeholderTextColor={COLORS.textSecondary}
                value={profile.age}
                onChangeText={(value) => updateProfile('age', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <Text style={styles.settingSubtext}>Used for body-fat estimates</Text>
              <View style={styles.unitRow}>
                <TouchableOpacity
                  style={styles.unitButton}
                  onPress={() => updateProfile('gender', 'male')}
                >
                  <View style={[styles.unitButtonGradient, profile.gender === 'male' && styles.unitButtonGradientActive]}>
                    <Text style={[styles.unitButtonText, profile.gender === 'male' && styles.unitButtonTextActive]}>
                      Male
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.unitButton}
                  onPress={() => updateProfile('gender', 'female')}
                >
                  <View style={[styles.unitButtonGradient, profile.gender === 'female' && styles.unitButtonGradientActive]}>
                    <Text style={[styles.unitButtonText, profile.gender === 'female' && styles.unitButtonTextActive]}>
                      Female
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {profile.dateOfBirth && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <Text style={styles.readOnlyValue}>
                  {new Date(profile.dateOfBirth).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            )}

            {profile.dietaryPreference && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dietary Preference</Text>
                <Text style={styles.readOnlyValue}>
                  {profile.dietaryPreference.charAt(0).toUpperCase() + profile.dietaryPreference.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Body Measurements */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Body Measurements</Text>
            
            <View style={styles.unitRow}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  profile.unit === 'metric' && styles.unitButtonActive,
                ]}
                onPress={() => updateProfile('unit', 'metric')}
              >
                <View
                  style={[
                    styles.unitButtonGradient,
                    profile.unit === 'metric' && styles.unitButtonGradientActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      profile.unit === 'metric' && styles.unitButtonTextActive,
                    ]}
                  >
                    Metric
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  profile.unit === 'imperial' && styles.unitButtonActive,
                ]}
                onPress={() => updateProfile('unit', 'imperial')}
              >
                <View
                  style={[
                    styles.unitButtonGradient,
                    profile.unit === 'imperial' && styles.unitButtonGradientActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      profile.unit === 'imperial' && styles.unitButtonTextActive,
                    ]}
                  >
                    Imperial
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Weight ({profile.unit === 'metric' ? 'kg' : 'lbs'})
              </Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter weight in ${profile.unit === 'metric' ? 'kg' : 'lbs'}`}
                placeholderTextColor={COLORS.textSecondary}
                value={profile.weight}
                onChangeText={(value) => updateProfile('weight', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Height ({profile.unit === 'metric' ? 'cm' : 'in'})
              </Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter height in ${profile.unit === 'metric' ? 'cm' : 'in'}`}
                placeholderTextColor={COLORS.textSecondary}
                value={profile.height}
                onChangeText={(value) => updateProfile('height', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Enhanced Goal Management */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Goal Management</Text>
              <TouchableOpacity onPress={() => {
                setEditingGoal(null);
                setGoalForm({ type: 'weight', title: '', targetValue: '', targetDate: '' });
                setShowGoalModal(true);
              }}>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                <View style={styles.goalTextContainer}>
                  <Text style={styles.goalLabel}>Weekly Workout Goal</Text>
                  <Text style={styles.goalValue}>{weeklyGoal} days per week</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setTempWeeklyGoal(weeklyGoal.toString());
                  setShowWeeklyGoalModal(true);
                }}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Ionicons name="nutrition" size={20} color={COLORS.accent} />
                <View style={styles.goalTextContainer}>
                  <Text style={styles.goalLabel}>Daily Calorie Goal</Text>
                  <Text style={styles.goalValue}>{calorieGoal} calories</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setTempCalorieGoal(calorieGoal.toString());
                  setShowCalorieGoalModal(true);
                }}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {goals.map((goal) => {
              const daysRemaining = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const progress = goal.currentValue ? (goal.currentValue / goal.targetValue) * 100 : 0;
              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalCardHeader}>
                    <View style={styles.goalCardInfo}>
                      <Ionicons 
                        name={goal.type === 'weight' ? 'scale' : goal.type === 'body_composition' ? 'body' : 'trophy'} 
                        size={20} 
                        color={COLORS.primary} 
                      />
                      <View>
                        <Text style={styles.goalCardTitle}>{goal.title}</Text>
                        <Text style={styles.goalCardTarget}>
                          Target: {goal.targetValue} {goal.unit} by {new Date(goal.targetDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.goalCardActions}>
                      <TouchableOpacity onPress={() => {
                        setEditingGoal(goal);
                        setGoalForm({
                          type: goal.type,
                          title: goal.title,
                          targetValue: goal.targetValue.toString(),
                          targetDate: goal.targetDate,
                        });
                        setShowGoalModal(true);
                      }}>
                        <Ionicons name="create-outline" size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        Alert.alert(
                          'Delete Goal',
                          `Delete "${goal.title}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => removeGoal(goal.id) },
                          ]
                        );
                      }}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {goal.currentValue && (
                    <View style={styles.goalProgress}>
                      <View style={styles.goalProgressBar}>
                        <View style={[styles.goalProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
                      </View>
                      <Text style={styles.goalProgressText}>{progress.toFixed(0)}% complete</Text>
                    </View>
                  )}
                  <Text style={styles.goalDaysRemaining}>
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : daysRemaining === 0 ? 'Due today!' : `${Math.abs(daysRemaining)} days overdue`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Integration Hub */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Integration Hub</Text>
            <Text style={styles.sectionDescription}>Connect your favorite fitness apps</Text>
            {integrations.map((integration) => (
              <View key={integration.id} style={styles.integrationItem}>
                <View style={styles.integrationInfo}>
                  <Ionicons 
                    name={integration.name === 'fitbit' ? 'watch' : integration.name === 'apple_health' ? 'medical' : integration.name === 'google_fit' ? 'fitness' : integration.name === 'strava' ? 'bicycle' : 'restaurant'} 
                    size={24} 
                    color={integration.connected ? COLORS.success : COLORS.textSecondary} 
                  />
                  <View>
                    <Text style={styles.integrationName}>
                      {integration.name === 'fitbit' ? 'Fitbit' : 
                       integration.name === 'apple_health' ? 'Apple Health' : 
                       integration.name === 'google_fit' ? 'Google Fit' : 
                       integration.name === 'strava' ? 'Strava' : 
                       'MyFitnessPal'}
                    </Text>
                    {integration.connected && integration.lastSync && (
                      <Text style={styles.integrationSync}>
                        Last synced: {new Date(integration.lastSync).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                <Switch
                  value={integration.connected}
                  onValueChange={() => {
                    if (integration.connected) {
                      updateIntegration(integration.id, { connected: false });
                    } else {
                      connectIntegration(integration);
                    }
                  }}
                  trackColor={{ false: COLORS.cardBorder, true: COLORS.success }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          {/* Notification Preferences */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <Text style={styles.sectionDescription}>Control when and how you're notified</Text>
            {notificationPreferences.map((pref) => (
              <View key={pref.type} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons 
                    name={pref.type === 'workout_reminder' ? 'barbell' : pref.type === 'meal_reminder' ? 'nutrition' : pref.type === 'goal_milestone' ? 'trophy' : pref.type === 'streak_reminder' ? 'flame' : 'stats-chart'} 
                    size={20} 
                    color={COLORS.primary} 
                  />
                  <View>
                    <Text style={styles.settingLabel}>
                      {pref.type === 'workout_reminder' ? 'Workout Reminders' : 
                       pref.type === 'meal_reminder' ? 'Meal Reminders' : 
                       pref.type === 'goal_milestone' ? 'Goal Milestones' : 
                       pref.type === 'streak_reminder' ? 'Streak Reminders' : 
                       'Weekly Summary'}
                    </Text>
                    {pref.time && (
                      <Text style={styles.settingSubtext}>Time: {pref.time}</Text>
                    )}
                    {pref.days && (
                      <Text style={styles.settingSubtext}>Days: {pref.days.join(', ')}</Text>
                    )}
                  </View>
                </View>
                <Switch
                  value={pref.enabled}
                  onValueChange={(value) => handleNotifToggle(pref.type, value)}
                  trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          {/* Theme Customization */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Theme & Appearance</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon" size={20} color={COLORS.primary} />
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={themeSettings.darkMode}
                onValueChange={(value) => updateThemeSettings({ darkMode: value })}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="color-palette" size={20} color={COLORS.primary} />
                <Text style={styles.settingLabel}>Layout Style</Text>
                <Text style={styles.settingSubtext}>{themeSettings.layout}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowThemeModal(true)}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Units Toggle */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Units</Text>
            <View style={styles.unitRow}>
              <TouchableOpacity
                style={[styles.unitButton, profile.unit === 'metric' && styles.unitButtonActive]}
                onPress={() => updateProfile('unit', 'metric')}
              >
                <Text style={[styles.unitButtonText, profile.unit === 'metric' && styles.unitButtonTextActive]}>
                  Metric (kg, cm)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, profile.unit === 'imperial' && styles.unitButtonActive]}
                onPress={() => updateProfile('unit', 'imperial')}
              >
                <Text style={[styles.unitButtonText, profile.unit === 'imperial' && styles.unitButtonTextActive]}>
                  Imperial (lbs, in)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy Controls */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Privacy & Data</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="sparkles" size={20} color={COLORS.primary} />
                <View>
                  <Text style={styles.settingLabel}>Share Data with AI</Text>
                  <Text style={styles.settingSubtext}>Allow AI to use your data for personalized advice</Text>
                </View>
              </View>
              <Switch
                value={privacySettings.shareDataWithAI}
                onValueChange={(value) => updatePrivacySettings({ shareDataWithAI: value })}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="cloud" size={20} color={COLORS.primary} />
                <View>
                  <Text style={styles.settingLabel}>Cloud Sync</Text>
                  <Text style={styles.settingSubtext}>Sync data across devices</Text>
                </View>
              </View>
              <Switch
                value={privacySettings.cloudSync}
                onValueChange={(value) => updatePrivacySettings({ cloudSync: value })}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="analytics" size={20} color={COLORS.primary} />
                <View>
                  <Text style={styles.settingLabel}>Analytics</Text>
                  <Text style={styles.settingSubtext}>Help improve the app</Text>
                </View>
              </View>
              <Switch
                value={privacySettings.analytics}
                onValueChange={(value) => updatePrivacySettings({ analytics: value })}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
            <TouchableOpacity style={styles.exportButton} onPress={exportData}>
              <Ionicons name="download" size={20} color={COLORS.primary} />
              <Text style={styles.exportButtonText}>Export All Data (GDPR)</Text>
            </TouchableOpacity>
          </View>

          {/* Friend Connections */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friends & Social</Text>
              <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                <Ionicons name="person-add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {friends.length === 0 ? (
              <View style={styles.emptyFriends}>
                <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyFriendsText}>No friends connected yet</Text>
                <Text style={styles.emptyFriendsSubtext}>Add friends to share progress and compete</Text>
              </View>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={styles.friendItem}>
                  <View style={styles.friendAvatar}>
                    <Ionicons name="person" size={24} color="#fff" />
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendDate}>
                      Connected {new Date(friend.connectedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFriend(friend.id)}>
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* App Settings */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={20} color={COLORS.primary} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={profile.notifications}
                onValueChange={(value) => updateProfile('notifications', value)}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon" size={20} color={COLORS.primary} />
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={profile.darkMode}
                onValueChange={(value) => updateProfile('darkMode', value)}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Other Options */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="help-circle" size={20} color={COLORS.text} />
              <Text style={styles.optionText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="document-text" size={20} color={COLORS.text} />
              <Text style={styles.optionText}>Terms & Privacy</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="information-circle" size={20} color={COLORS.text} />
              <Text style={styles.optionText}>About</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <View style={styles.saveButtonGradient}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Weekly Goal Modal */}
        <Modal
          visible={showWeeklyGoalModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowWeeklyGoalModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Weekly Workout Goal</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter days per week"
                placeholderTextColor={COLORS.textSecondary}
                value={tempWeeklyGoal}
                onChangeText={setTempWeeklyGoal}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowWeeklyGoalModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={() => {
                    const goal = parseInt(tempWeeklyGoal);
                    if (goal > 0 && goal <= 7) {
                      setWeeklyGoal(goal);
                      setShowWeeklyGoalModal(false);
                    } else {
                      Alert.alert('Invalid Input', 'Please enter a number between 1 and 7');
                    }
                  }}
                >
                  <View style={styles.modalButtonGradient}>
                    <Text style={styles.modalButtonTextSave}>Save</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Calorie Goal Modal */}
        <Modal
          visible={showCalorieGoalModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCalorieGoalModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Daily Calorie Goal</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter daily calories"
                placeholderTextColor={COLORS.textSecondary}
                value={tempCalorieGoal}
                onChangeText={setTempCalorieGoal}
                keyboardType="numeric"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowCalorieGoalModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={() => {
                    const goal = parseInt(tempCalorieGoal);
                    if (goal > 0 && goal <= 10000) {
                      setCalorieGoal(goal);
                      setShowCalorieGoalModal(false);
                    } else {
                      Alert.alert('Invalid Input', 'Please enter a valid calorie goal');
                    }
                  }}
                >
                  <View style={styles.modalButtonGradient}>
                    <Text style={styles.modalButtonTextSave}>Save</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  avatarContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.button,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
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
  headerButton: {
    padding: 5,
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
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  unitButton: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  unitButtonActive: {},
  unitButtonGradient: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
    borderRadius: SIZES.borderRadius,
  },
  unitButtonGradientActive: {
    backgroundColor: COLORS.button,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  goalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  saveButton: {
    marginHorizontal: SIZES.padding,
    marginBottom: 15,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: 'center',
    backgroundColor: COLORS.button,
    borderRadius: SIZES.borderRadius,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomPadding: {
    height: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    marginTop: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalButtonSave: {},
  modalButtonGradient: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: COLORS.button,
    borderRadius: SIZES.borderRadius,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    padding: 15,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  aiAdviceButton: {
    marginTop: 15,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  aiAdviceButtonContent: {
    backgroundColor: COLORS.highlight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    gap: 8,
  },
  aiAdviceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bmiHistoryContainer: {
    marginTop: 20,
  },
  bmiHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  historyScroll: {
    marginTop: 10,
  },
  historyItem: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  historyBMI: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tipsContainer: {
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
  },
  tipText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: 20,
    textAlign: 'center',
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
  // Comprehensive BMI Styles
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 5,
  },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  metricCard: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  metricCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  insightText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  // Enhanced Profile Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 15,
    lineHeight: 18,
  },
  goalCard: {
    marginTop: 15,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  goalCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  goalCardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  goalCardTarget: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  goalProgress: {
    marginTop: 10,
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  goalProgressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  goalDaysRemaining: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  integrationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  integrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  integrationSync: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  settingSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  exportButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyFriendsText: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 15,
    marginBottom: 5,
  },
  emptyFriendsSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  friendDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  layoutOption: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  layoutOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  layoutOptionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  layoutOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  readOnlyValue: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
});


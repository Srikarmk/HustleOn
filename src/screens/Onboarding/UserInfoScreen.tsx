import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store';
import { COLORS, SIZES } from '../../constants/theme';

interface UserInfoScreenProps {
  onComplete: () => void;
}

export const UserInfoScreen: React.FC<UserInfoScreenProps> = ({ onComplete }) => {
  const { setWeeklyGoal, setCalorieGoal, setUserProfile } = useStore();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
  const [weeklyGoal, setWeeklyGoalLocal] = useState(3);
  const [calorieGoal, setCalorieGoalLocal] = useState(2000);
  const [dietaryPreference, setDietaryPreference] = useState<string>('');
  
  const dietaryOptions = [
    { value: 'omnivore', label: 'Omnivore' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'pescatarian', label: 'Pescatarian' },
    { value: 'keto', label: 'Keto' },
    { value: 'paleo', label: 'Paleo' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'other', label: 'Other' },
  ];

  const handleComplete = () => {
    // Save goals to store
    setWeeklyGoal(weeklyGoal);
    setCalorieGoal(calorieGoal);
    
    // Calculate age from date of birth
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const calculatedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate()) ? age - 1 : age;
    
    // Save user profile data
    if (name.trim()) {
      setUserProfile({
        name: name.trim(),
        age: calculatedAge.toString(),
        dateOfBirth: dateOfBirth.toISOString().split('T')[0],
        weight,
        height,
        unit,
        dietaryPreference,
        gender,
      });
    }
    
    // Navigate to next screen
    onComplete();
  };

  const canProceed = name.trim().length > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="person-circle" size={60} color={COLORS.primary} />
          <Text style={styles.title}>Tell Us About Yourself</Text>
          <Text style={styles.subtitle}>
            Help us personalize your fitness journey
          </Text>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                {dateOfBirth ? dateOfBirth.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select your date of birth'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.unitRow}>
              <TouchableOpacity style={styles.unitButton} onPress={() => setGender('male')}>
                <View style={[styles.unitButtonGradient, gender === 'male' && styles.unitButtonGradientActive]}>
                  <Text style={[styles.unitButtonText, gender === 'male' && styles.unitButtonTextActive]}>
                    Male
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.unitButton} onPress={() => setGender('female')}>
                <View style={[styles.unitButtonGradient, gender === 'female' && styles.unitButtonGradientActive]}>
                  <Text style={[styles.unitButtonText, gender === 'female' && styles.unitButtonTextActive]}>
                    Female
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Body Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Measurements</Text>
          
          <View style={styles.unitRow}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unit === 'metric' && styles.unitButtonActive,
              ]}
              onPress={() => setUnit('metric')}
              >
                <View
                  style={[
                    styles.unitButtonGradient,
                    unit === 'metric' && styles.unitButtonGradientActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unit === 'metric' && styles.unitButtonTextActive,
                    ]}
                  >
                    Metric (kg/cm)
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  unit === 'imperial' && styles.unitButtonActive,
                ]}
                onPress={() => setUnit('imperial')}
              >
                <View
                  style={[
                    styles.unitButtonGradient,
                    unit === 'imperial' && styles.unitButtonGradientActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.unitButtonText,
                      unit === 'imperial' && styles.unitButtonTextActive,
                    ]}
                  >
                    Imperial (lbs/in)
                  </Text>
                </View>
              </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Weight ({unit === 'metric' ? 'kg' : 'lbs'})
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter weight in ${unit === 'metric' ? 'kg' : 'lbs'}`}
              placeholderTextColor={COLORS.textSecondary}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Height ({unit === 'metric' ? 'cm' : 'in'})
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter height in ${unit === 'metric' ? 'cm' : 'in'}`}
              placeholderTextColor={COLORS.textSecondary}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Dietary Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          <View style={styles.optionsGrid}>
            {dietaryOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  dietaryPreference === option.value && styles.optionButtonActive,
                ]}
                onPress={() => setDietaryPreference(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    dietaryPreference === option.value && styles.optionButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Your Goals</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Weekly Workout Goal</Text>
            <Text style={styles.pickerValue}>{weeklyGoal} days per week</Text>
            <View style={styles.pickerContainer}>
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.pickerButton,
                    weeklyGoal === day && styles.pickerButtonActive,
                  ]}
                  onPress={() => setWeeklyGoalLocal(day)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      weeklyGoal === day && styles.pickerButtonTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputHint}>How many days per week do you want to workout?</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Daily Calorie Goal</Text>
            <Text style={styles.pickerValue}>{calorieGoal} calories</Text>
            <View style={styles.pickerContainer}>
              {[1500, 1750, 2000, 2250, 2500, 2750, 3000].map((cal) => (
                <TouchableOpacity
                  key={cal}
                  style={[
                    styles.pickerButton,
                    calorieGoal === cal && styles.pickerButtonActive,
                  ]}
                  onPress={() => setCalorieGoalLocal(cal)}
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      calorieGoal === cal && styles.pickerButtonTextActive,
                    ]}
                  >
                    {cal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputHint}>Your daily calorie target</Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !canProceed && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={!canProceed}
        >
          <View
            style={[
              styles.buttonGradient,
              !canProceed && styles.buttonGradientDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setDateOfBirth(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
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
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
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
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
    paddingTop: 20,
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
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
  buttonGradientDisabled: {
    backgroundColor: COLORS.cardBorder,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: COLORS.text,
    fontSize: 16,
    flex: 1,
  },
  datePlaceholder: {
    color: COLORS.textSecondary,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minWidth: '30%',
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  pickerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  pickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minWidth: 80,
  },
  pickerButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  pickerButtonTextActive: {
    color: '#fff',
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
  modalButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


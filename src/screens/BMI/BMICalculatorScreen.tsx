import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../../store';
import { COLORS, SIZES } from '../../constants/theme';
import { generateGeminiResponse } from '../../config/gemini';
import { BodyMeasurement, ProgressPhoto } from '../../types';

export const BMICalculatorScreen: React.FC = () => {
  const {
    addBMIRecord,
    bmiRecords,
    bodyMeasurements,
    progressPhotos,
    addBodyMeasurement,
    addProgressPhoto,
    userProfile,
    goals,
  } = useStore();
  const navigation = useNavigation<any>();

  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [category, setCategory] = useState<string>('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);

  // Body Measurements State
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<'metric' | 'imperial'>('metric');
  const [measurements, setMeasurements] = useState({
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
  });

  // Photo State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'photos' | 'measurements' | 'trends'>('dashboard');

  const calculateBMI = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);

    if (!w || !h || w <= 0 || h <= 0) {
      Alert.alert('Error', 'Please enter valid weight and height values');
      return;
    }

    let calculatedBMI: number;
    if (unit === 'metric') {
      calculatedBMI = w / ((h / 100) * (h / 100));
    } else {
      calculatedBMI = (w / (h * h)) * 703;
    }

    setBmi(calculatedBMI);

    let cat = '';
    if (calculatedBMI < 18.5) cat = 'Underweight';
    else if (calculatedBMI < 25) cat = 'Normal';
    else if (calculatedBMI < 30) cat = 'Overweight';
    else cat = 'Obese';

    setCategory(cat);

    // Calculate body composition if measurements available
    const latestMeasurements = getLatestMeasurements();
    let bodyFatPercent: number | undefined;
    let muscleMass: number | undefined;
    let waistCircumference: number | undefined;

    if (latestMeasurements?.waist) {
      waistCircumference = latestMeasurements.waist;
      // Deurenberg body-fat estimate from BMI, using the user's real age & gender.
      // BF% = 1.20*BMI + 0.23*age - 10.8*sex - 5.4   (sex: male=1, female=0)
      const age = userProfile?.age ? parseInt(userProfile.age, 10) : 30;
      const sex = userProfile?.gender === 'female' ? 0 : 1;
      bodyFatPercent = 1.2 * calculatedBMI + 0.23 * age - 10.8 * sex - 5.4;
      if (bodyFatPercent < 0) bodyFatPercent = 0;
      if (bodyFatPercent > 50) bodyFatPercent = 50;
    }

    if (bodyFatPercent) {
      muscleMass = calculateMuscleMass(w, bodyFatPercent);
    }

    // Save to store
    addBMIRecord({
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      weight: w,
      height: h,
      bmi: calculatedBMI,
      unit,
      bodyFatPercent,
      muscleMass,
      waistCircumference,
    });
  };

  const handleAskAI = async () => {
    if (!bmi) {
      return;
    }
    setShowAIModal(true);
    setIsAILoading(true);
    setAiResponse('');

    const prompt = `My BMI is ${bmi.toFixed(1)} which is in the ${category} category. My weight is ${weight} ${unit === 'metric' ? 'kg' : 'lbs'} and height is ${height} ${unit === 'metric' ? 'cm' : 'in'}. Please provide personalized health and fitness advice based on my BMI.`;

    try {
      const response = await generateGeminiResponse(
        prompt,
        'You are a health and fitness expert. Provide helpful, personalized advice based on the user\'s BMI. Keep responses in medium-sized paragraphs (3-5 sentences). Always recommend consulting healthcare professionals for medical concerns.'
      );
      setAiResponse(response);
    } catch (error) {
      setAiResponse('Unable to get AI response. Please try again later.');
    } finally {
      setIsAILoading(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Underweight':
        return COLORS.primary;
      case 'Normal':
        return COLORS.success;
      case 'Overweight':
        return COLORS.warning;
      case 'Obese':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  // Body Fat % Calculation (Navy Method - simplified for demo)
  const calculateBodyFat = (weight: number, height: number, waist: number, neck: number, gender: 'male' | 'female' = 'male'): number => {
    if (!waist || !neck) return 0;
    const log10 = Math.log10;
    if (gender === 'male') {
      return 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450;
    } else {
      return 495 / (1.29579 - 0.35004 * log10(waist + 0.221 * height - neck)) - 450;
    }
  };

  // Calculate Muscle Mass (simplified)
  const calculateMuscleMass = (weight: number, bodyFatPercent: number): number => {
    const fatMass = weight * (bodyFatPercent / 100);
    return weight - fatMass;
  };

  // Moving Average Calculation
  const calculateMovingAverage = (records: any[], days: number = 7): number[] => {
    if (records.length === 0) return [];
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const averages: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const window = sorted.slice(Math.max(0, i - days + 1), i + 1);
      const avg = window.reduce((sum, r) => sum + r.weight, 0) / window.length;
      averages.push(avg);
    }
    return averages;
  };

  // Predict Trajectory
  const predictTrajectory = (records: any[], goalWeight: number): { days: number; date: string } | null => {
    if (records.length < 2) return null;
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sorted.slice(-7);
    if (recent.length < 2) return null;

    const weightDiff = recent[recent.length - 1].weight - recent[0].weight;
    const daysDiff = (new Date(recent[recent.length - 1].date).getTime() - new Date(recent[0].date).getTime()) / (1000 * 60 * 60 * 24);
    const ratePerDay = weightDiff / daysDiff;

    if (Math.abs(ratePerDay) < 0.01) return null;

    const currentWeight = recent[recent.length - 1].weight;
    const weightToLose = currentWeight - goalWeight;
    const daysNeeded = Math.abs(weightToLose / ratePerDay);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysNeeded);

    return { days: Math.round(daysNeeded), date: targetDate.toISOString().split('T')[0] };
  };

  // Health Insights
  const getHealthInsights = (): string => {
    if (bmiRecords.length < 2) return '';
    const sorted = [...bmiRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const bmiChange = last.bmi - first.bmi;

    if (Math.abs(bmiChange) < 0.5) return '';

    const riskReduction = Math.abs(bmiChange) * 5; // Simplified calculation
    if (bmiChange < 0) {
      return `Your BMI decreased ${Math.abs(bmiChange).toFixed(1)} points. Equivalent to reducing heart disease risk by approximately ${riskReduction.toFixed(0)}%.`;
    } else {
      return `Your BMI increased ${bmiChange.toFixed(1)} points. Consider focusing on diet and exercise to maintain a healthy BMI.`;
    }
  };

  // Pick Image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const photo: ProgressPhoto = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        uri: result.assets[0].uri,
      };
      addProgressPhoto(photo);
    }
  };

  // Save Measurements
  const saveMeasurements = () => {
    const hasAnyMeasurement = Object.values(measurements).some(v => v.trim() !== '');
    if (!hasAnyMeasurement) {
      Alert.alert('Error', 'Please enter at least one measurement');
      return;
    }

    const measurement: BodyMeasurement = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      chest: measurements.chest ? parseFloat(measurements.chest) : undefined,
      waist: measurements.waist ? parseFloat(measurements.waist) : undefined,
      hips: measurements.hips ? parseFloat(measurements.hips) : undefined,
      arms: measurements.arms ? parseFloat(measurements.arms) : undefined,
      thighs: measurements.thighs ? parseFloat(measurements.thighs) : undefined,
      unit: measurementUnit,
    };

    addBodyMeasurement(measurement);
    setShowMeasurementsModal(false);
    setMeasurements({ chest: '', waist: '', hips: '', arms: '', thighs: '' });
    Alert.alert('Success', 'Measurements saved!');
  };

  // Get Latest Measurements
  const getLatestMeasurements = () => {
    if (bodyMeasurements.length === 0) return null;
    const sorted = [...bodyMeasurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0];
  };

  // Get Latest BMI Record with Body Composition
  const getLatestBMIWithComposition = () => {
    if (bmiRecords.length === 0) return null;
    const sorted = [...bmiRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0];
  };

  // Trajectory prediction uses the user's actual weight goal (if any)
  const weightGoal = goals.find((g) => g.type === 'weight');
  const trajectory = weightGoal ? predictTrajectory(bmiRecords, weightGoal.targetValue) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="scale" size={24} color={COLORS.primary} />
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Body Tracking</Text>
                <Text style={styles.headerSubtitle}>Comprehensive body metrics & progress</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
              onPress={() => setActiveTab('dashboard')}
            >
              <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'photos' && styles.tabActive]}
              onPress={() => setActiveTab('photos')}
            >
              <Text style={[styles.tabText, activeTab === 'photos' && styles.tabTextActive]}>Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'measurements' && styles.tabActive]}
              onPress={() => setActiveTab('measurements')}
            >
              <Text style={[styles.tabText, activeTab === 'measurements' && styles.tabTextActive]}>Measure</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'trends' && styles.tabActive]}
              onPress={() => setActiveTab('trends')}
            >
              <Text style={[styles.tabText, activeTab === 'trends' && styles.tabTextActive]}>Trends</Text>
            </TouchableOpacity>
          </View>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <View style={styles.tabContent}>
              {/* BMI Calculator Input */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>BMI Calculator</Text>
                <View style={styles.unitRow}>
                  <TouchableOpacity
                    style={[styles.unitButton, unit === 'metric' && styles.unitButtonActive]}
                    onPress={() => setUnit('metric')}
                  >
                    <Text style={[styles.unitButtonText, unit === 'metric' && styles.unitButtonTextActive]}>
                      Metric (kg/cm)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitButton, unit === 'imperial' && styles.unitButtonActive]}
                    onPress={() => setUnit('imperial')}
                  >
                    <Text style={[styles.unitButtonText, unit === 'imperial' && styles.unitButtonTextActive]}>
                      Imperial (lbs/in)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Weight ({unit === 'metric' ? 'kg' : 'lbs'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter weight in ${unit === 'metric' ? 'kg' : 'lbs'}`}
                  placeholderTextColor={COLORS.textSecondary}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />

                <Text style={[styles.inputLabel, { marginTop: 15 }]}>Height ({unit === 'metric' ? 'cm' : 'in'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter height in ${unit === 'metric' ? 'cm' : 'in'}`}
                  placeholderTextColor={COLORS.textSecondary}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />

                <TouchableOpacity style={styles.calculateButton} onPress={calculateBMI}>
                  <Text style={styles.calculateButtonText}>Calculate BMI</Text>
                </TouchableOpacity>

                {bmi !== null && (
                  <>
                    <View style={styles.resultContainer}>
                      <Text style={styles.resultLabel}>Your BMI</Text>
                      <Text style={styles.resultValue}>{bmi.toFixed(1)}</Text>
                      <Text style={[styles.resultCategory, { color: getCategoryColor(category) }]}>
                        {category}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.aiAdviceButton} onPress={handleAskAI}>
                      <View style={styles.aiAdviceButtonContent}>
                        <Ionicons name="sparkles" size={20} color="#fff" />
                        <Text style={styles.aiAdviceButtonText}>Get AI Health Advice</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Multi-Metric Dashboard */}
              {getLatestBMIWithComposition() && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Body Composition</Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <Ionicons name="scale" size={24} color={COLORS.primary} />
                      <Text style={styles.metricLabel}>BMI</Text>
                      <Text style={styles.metricValue}>{getLatestBMIWithComposition()!.bmi.toFixed(1)}</Text>
                      <Text style={styles.metricCategory}>
                        {getLatestBMIWithComposition()!.bmi < 18.5
                          ? 'Underweight'
                          : getLatestBMIWithComposition()!.bmi < 25
                          ? 'Normal'
                          : getLatestBMIWithComposition()!.bmi < 30
                          ? 'Overweight'
                          : 'Obese'}
                      </Text>
                    </View>
                    {getLatestBMIWithComposition()!.bodyFatPercent && (
                      <View style={styles.metricCard}>
                        <Ionicons name="water" size={24} color={COLORS.accent} />
                        <Text style={styles.metricLabel}>Body Fat %</Text>
                        <Text style={styles.metricValue}>{getLatestBMIWithComposition()!.bodyFatPercent!.toFixed(1)}%</Text>
                      </View>
                    )}
                    {getLatestBMIWithComposition()!.muscleMass && (
                      <View style={styles.metricCard}>
                        <Ionicons name="barbell" size={24} color={COLORS.success} />
                        <Text style={styles.metricLabel}>Muscle Mass</Text>
                        <Text style={styles.metricValue}>
                          {getLatestBMIWithComposition()!.muscleMass!.toFixed(1)} {unit === 'metric' ? 'kg' : 'lbs'}
                        </Text>
                      </View>
                    )}
                    {getLatestBMIWithComposition()!.waistCircumference && (
                      <View style={styles.metricCard}>
                        <Ionicons name="resize" size={24} color={COLORS.warning} />
                        <Text style={styles.metricLabel}>Waist</Text>
                        <Text style={styles.metricValue}>
                          {getLatestBMIWithComposition()!.waistCircumference!.toFixed(1)} {unit === 'metric' ? 'cm' : 'in'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Health Insights */}
              {getHealthInsights() && (
                <View style={styles.card}>
                  <View style={styles.insightCard}>
                    <Ionicons name="bulb" size={20} color={COLORS.primary} />
                    <Text style={styles.insightText}>{getHealthInsights()}</Text>
                  </View>
                </View>
              )}

              {/* BMI History */}
              {bmiRecords.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>BMI History</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
                    {bmiRecords.slice(-5).reverse().map((record) => (
                      <View key={record.id} style={styles.historyItem}>
                        <Text style={styles.historyDate}>
                          {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={styles.historyBMI}>{record.bmi.toFixed(1)}</Text>
                        <View
                          style={[
                            styles.historyDot,
                            {
                              backgroundColor: getCategoryColor(
                                record.bmi < 18.5
                                  ? 'Underweight'
                                  : record.bmi < 25
                                  ? 'Normal'
                                  : record.bmi < 30
                                  ? 'Overweight'
                                  : 'Obese'
                              ),
                            },
                          ]}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Quick Tips */}
              {bmi !== null && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Quick Tips</Text>
                  {category === 'Underweight' && (
                    <View style={styles.tipItem}>
                      <Ionicons name="arrow-up" size={20} color={COLORS.primary} />
                      <Text style={styles.tipText}>
                        Focus on nutrient-dense foods and strength training to build healthy weight.
                      </Text>
                    </View>
                  )}
                  {category === 'Normal' && (
                    <View style={styles.tipItem}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                      <Text style={styles.tipText}>
                        Great! Maintain your current weight with a balanced diet and regular exercise.
                      </Text>
                    </View>
                  )}
                  {(category === 'Overweight' || category === 'Obese') && (
                    <View style={styles.tipItem}>
                      <Ionicons name="trending-down" size={20} color={COLORS.warning} />
                      <Text style={styles.tipText}>
                        Consider a balanced diet and regular exercise. Consult a healthcare professional for a
                        personalized plan.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* BMI Categories */}
              <View style={styles.card}>
                <View style={styles.categoryHeader}>
                  <Ionicons name="stats-chart" size={20} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>BMI Categories</Text>
                </View>
                {['Underweight', 'Normal', 'Overweight', 'Obese'].map((cat) => (
                  <View
                    key={cat}
                    style={[styles.categoryItem, { backgroundColor: getCategoryColor(cat) + '20' }]}
                  >
                    <Text style={styles.categoryName}>{cat}</Text>
                    <Text style={styles.categoryRange}>
                      {cat === 'Underweight'
                        ? '< 18.5'
                        : cat === 'Normal'
                        ? '18.5 - 24.9'
                        : cat === 'Overweight'
                        ? '25 - 29.9'
                        : '≥ 30'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Progress Photos</Text>
                <TouchableOpacity style={styles.addPhotoButtonLarge} onPress={pickImage}>
                  <Ionicons name="camera" size={32} color={COLORS.primary} />
                  <Text style={styles.addPhotoTextLarge}>Add Progress Photo</Text>
                </TouchableOpacity>

                {progressPhotos.length > 0 && (
                  <View>
                    <Text style={styles.sectionSubtitle}>Photo Timeline</Text>
                    <FlatList
                      horizontal
                      nestedScrollEnabled
                      data={[...progressPhotos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                      keyExtractor={(item) => item.id}
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item, index }) => (
                        <TouchableOpacity
                          style={styles.photoItem}
                          onPress={() => {
                            setSelectedPhotoIndex(index);
                            setShowPhotoViewer(true);
                          }}
                        >
                          <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
                          <Text style={styles.photoDate}>
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Measurements Tab */}
          {activeTab === 'measurements' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Body Measurements</Text>
                <TouchableOpacity
                  style={styles.addMeasurementButton}
                  onPress={() => setShowMeasurementsModal(true)}
                >
                  <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                  <Text style={styles.addMeasurementText}>Add Body Measurements</Text>
                </TouchableOpacity>

                {getLatestMeasurements() && (
                  <View style={styles.measurementsDisplay}>
                    <Text style={styles.sectionSubtitle}>Latest Measurements</Text>
                    <View style={styles.measurementRow}>
                      {getLatestMeasurements()!.chest && (
                        <View style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>Chest</Text>
                          <Text style={styles.measurementValue}>
                            {getLatestMeasurements()!.chest} {measurementUnit === 'metric' ? 'cm' : 'in'}
                          </Text>
                        </View>
                      )}
                      {getLatestMeasurements()!.waist && (
                        <View style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>Waist</Text>
                          <Text style={styles.measurementValue}>
                            {getLatestMeasurements()!.waist} {measurementUnit === 'metric' ? 'cm' : 'in'}
                          </Text>
                        </View>
                      )}
                      {getLatestMeasurements()!.hips && (
                        <View style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>Hips</Text>
                          <Text style={styles.measurementValue}>
                            {getLatestMeasurements()!.hips} {measurementUnit === 'metric' ? 'cm' : 'in'}
                          </Text>
                        </View>
                      )}
                      {getLatestMeasurements()!.arms && (
                        <View style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>Arms</Text>
                          <Text style={styles.measurementValue}>
                            {getLatestMeasurements()!.arms} {measurementUnit === 'metric' ? 'cm' : 'in'}
                          </Text>
                        </View>
                      )}
                      {getLatestMeasurements()!.thighs && (
                        <View style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>Thighs</Text>
                          <Text style={styles.measurementValue}>
                            {getLatestMeasurements()!.thighs} {measurementUnit === 'metric' ? 'cm' : 'in'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <View style={styles.tabContent}>
              {bmiRecords.length >= 2 ? (
                <>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Weight Trend (7-day moving average)</Text>
                    <View style={styles.trendContainer}>
                      {calculateMovingAverage(bmiRecords, 7).map((avg, index) => {
                        const maxWeight = Math.max(...bmiRecords.map((r) => r.weight));
                        const minWeight = Math.min(...bmiRecords.map((r) => r.weight));
                        const range = maxWeight - minWeight || 1;
                        const height = ((avg - minWeight) / range) * 100;
                        return (
                          <View key={index} style={styles.trendBar}>
                            <View style={[styles.trendBarFill, { height: `${height}%` }]} />
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {trajectory && (
                    <View style={styles.card}>
                      <View style={styles.predictionCard}>
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <View>
                          <Text style={styles.predictionText}>
                            Predicted goal achievement: {trajectory.days} days
                          </Text>
                          <Text style={styles.predictionDate}>
                            Target date: {new Date(trajectory.date).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Weight Trend (7-day moving average)</Text>
                    <Text style={styles.dummyTrendHint}>Sample trend. Add 2+ BMI/weight entries to see your real trend.</Text>
                    <View style={styles.trendContainer}>
                      {[78, 77.2, 76.8, 76.2, 75.8, 75.2, 74.8].map((weight, index) => {
                        const minW = 74.8;
                        const maxW = 78;
                        const height = ((weight - minW) / (maxW - minW)) * 100;
                        return (
                          <View key={index} style={styles.trendBar}>
                            <View style={[styles.trendBarFill, { height: `${height}%` }]} />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.card}>
                    <View style={styles.predictionCard}>
                      <Ionicons name="calendar" size={20} color={COLORS.primary} />
                      <View>
                        <Text style={styles.predictionText}>
                          Sample: Predicted goal achievement in ~45 days (add weight data for real prediction)
                        </Text>
                        <Text style={styles.predictionDate}>
                          Target: Log 2+ weight entries to see your trajectory
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          <View style={styles.bottomPadding} />
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
              <Text style={styles.modalTitle}>AI Health Advice</Text>
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
              <ScrollView style={styles.aiResponseContainer}>
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Measurements Modal */}
      <Modal
        visible={showMeasurementsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMeasurementsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Body Measurements</Text>
              <TouchableOpacity onPress={() => setShowMeasurementsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.unitRow}>
              <TouchableOpacity
                style={[styles.unitButton, measurementUnit === 'metric' && styles.unitButtonActive]}
                onPress={() => setMeasurementUnit('metric')}
              >
                <Text style={[styles.unitButtonText, measurementUnit === 'metric' && styles.unitButtonTextActive]}>
                  Metric (cm)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, measurementUnit === 'imperial' && styles.unitButtonActive]}
                onPress={() => setMeasurementUnit('imperial')}
              >
                <Text style={[styles.unitButtonText, measurementUnit === 'imperial' && styles.unitButtonTextActive]}>
                  Imperial (in)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Chest ({measurementUnit === 'metric' ? 'cm' : 'in'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Chest"
              placeholderTextColor={COLORS.textSecondary}
              value={measurements.chest}
              onChangeText={(value) => setMeasurements({ ...measurements, chest: value })}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { marginTop: 15 }]}>Waist ({measurementUnit === 'metric' ? 'cm' : 'in'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Waist"
              placeholderTextColor={COLORS.textSecondary}
              value={measurements.waist}
              onChangeText={(value) => setMeasurements({ ...measurements, waist: value })}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { marginTop: 15 }]}>Hips ({measurementUnit === 'metric' ? 'cm' : 'in'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Hips"
              placeholderTextColor={COLORS.textSecondary}
              value={measurements.hips}
              onChangeText={(value) => setMeasurements({ ...measurements, hips: value })}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { marginTop: 15 }]}>Arms ({measurementUnit === 'metric' ? 'cm' : 'in'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Arms"
              placeholderTextColor={COLORS.textSecondary}
              value={measurements.arms}
              onChangeText={(value) => setMeasurements({ ...measurements, arms: value })}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { marginTop: 15 }]}>Thighs ({measurementUnit === 'metric' ? 'cm' : 'in'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Thighs"
              placeholderTextColor={COLORS.textSecondary}
              value={measurements.thighs}
              onChangeText={(value) => setMeasurements({ ...measurements, thighs: value })}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.calculateButton} onPress={saveMeasurements}>
              <Text style={styles.calculateButtonText}>Save Measurements</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={showPhotoViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoViewer(false)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity style={styles.photoViewerClose} onPress={() => setShowPhotoViewer(false)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {progressPhotos.length > 0 && (
            <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{
                  uri: [...progressPhotos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[
                    selectedPhotoIndex
                  ]?.uri,
                }}
                style={{ width: '100%', height: 400 }}
                resizeMode="contain"
              />
            </View>
          )}
          {progressPhotos.length > 1 && (
            <View style={styles.photoViewerControls}>
              <TouchableOpacity
                onPress={() => setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1))}
                disabled={selectedPhotoIndex === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={30}
                  color={selectedPhotoIndex === 0 ? COLORS.textSecondary : '#fff'}
                />
              </TouchableOpacity>
              <Text style={styles.photoViewerCounter}>
                {selectedPhotoIndex + 1} / {progressPhotos.length}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedPhotoIndex(Math.min(progressPhotos.length - 1, selectedPhotoIndex + 1))}
                disabled={selectedPhotoIndex === progressPhotos.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={30}
                  color={selectedPhotoIndex === progressPhotos.length - 1 ? COLORS.textSecondary : '#fff'}
                />
              </TouchableOpacity>
            </View>
          )}
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
  headerButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.padding,
    marginBottom: 15,
    gap: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
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
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: {
    marginBottom: 15,
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
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  unitButton: {
    flex: 1,
    padding: 12,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  unitButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
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
  calculateButton: {
    marginTop: 15,
    backgroundColor: COLORS.button,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    alignItems: 'center',
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
  },
  resultLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  resultValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  resultCategory: {
    fontSize: 18,
    fontWeight: '600',
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: SIZES.borderRadius,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryRange: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  addPhotoButtonLarge: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  addPhotoTextLarge: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  photoItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 100,
    height: 120,
    borderRadius: SIZES.borderRadius,
    marginBottom: 5,
  },
  photoDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  photoViewerControls: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  photoViewerCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addMeasurementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addMeasurementText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  measurementsDisplay: {
    marginTop: 10,
  },
  measurementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measurementItem: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  measurementLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  measurementValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dummyTrendHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  trendBar: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    minHeight: 2,
  },
  predictionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  predictionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  predictionDate: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 5,
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
  bottomPadding: {
    height: 30,
  },
});

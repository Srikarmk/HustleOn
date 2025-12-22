import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FloatingAIButton: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    navigation.navigate('AIChat');
  };

  // Position in the middle of the tab bar
  // Tab bar total height: 60 + insets.bottom
  // Button is 56px tall, so center it at: (tab bar height / 2) - (button height / 2)
  const tabBarTotalHeight = 60 + insets.bottom;
  const buttonBottom = (tabBarTotalHeight / 2) - 28; // Center the 56px button (28px is half of 56px)

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          bottom: buttonBottom,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        <Ionicons name="sparkles" size={24} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonContent: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


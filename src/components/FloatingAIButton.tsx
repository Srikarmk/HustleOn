import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { haptics } from '../utils/haptics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FloatingAIButton: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const entrance = useRef(new Animated.Value(0)).current; // 0 → 1 pop-in
  const pulse = useRef(new Animated.Value(1)).current; // gentle idle breathing
  const press = useRef(new Animated.Value(1)).current; // tap feedback

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      speed: 12,
      bounciness: 10,
    }).start();

    // Subtle, slow breathing loop — just enough to draw the eye.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [entrance, pulse]);

  const handlePress = () => {
    haptics.light();
    navigation.navigate('AIChat');
  };

  const tabBarTotalHeight = 60 + insets.bottom;
  const buttonBottom = tabBarTotalHeight / 2 - 28;

  return (
    <Pressable
      style={[styles.button, { bottom: buttonBottom }]}
      onPress={handlePress}
      onPressIn={() =>
        Animated.spring(press, { toValue: 0.9, useNativeDriver: true, speed: 40, bounciness: 6 }).start()
      }
      onPressOut={() =>
        Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start()
      }
    >
      <Animated.View
        style={[
          styles.buttonContent,
          { transform: [{ scale: Animated.multiply(Animated.multiply(entrance, pulse), press) }] },
        ]}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
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

import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';
import { haptics } from '../utils/haptics';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale at full press (default 0.96). */
  activeScale?: number;
  /** Fire a light haptic tap on press-in (default true). */
  haptic?: boolean;
}

/**
 * A Pressable that springs down slightly when pressed, with an optional
 * light haptic. Drop-in for primary buttons to make taps feel responsive.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  activeScale = 0.96,
  haptic = true,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  const handlePressIn = (e: GestureResponderEvent) => {
    animateTo(activeScale);
    if (haptic) haptics.light();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    animateTo(1);
    onPressOut?.(e);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
};

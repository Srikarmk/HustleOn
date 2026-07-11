import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleProp, ViewStyle } from 'react-native';

interface AnimatedProgressBarProps {
  /** 0..1 */
  progress: number;
  color: string;
  trackStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
}

/** A progress bar whose fill width eases to the target whenever it changes. */
export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  color,
  trackStyle,
  fillStyle,
}) => {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress || 0));
    Animated.timing(value, {
      toValue: clamped,
      duration: 600,
      useNativeDriver: false, // width is a layout prop
    }).start();
  }, [progress, value]);

  const width = value.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={trackStyle}>
      <Animated.View style={[fillStyle, { width, backgroundColor: color }]} />
    </View>
  );
};

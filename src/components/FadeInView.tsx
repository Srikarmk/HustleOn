import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Stagger delay in ms, e.g. index * 80 for lists. */
  delay?: number;
  /** How far (px) the view rises into place. */
  offset?: number;
  duration?: number;
}

/**
 * Subtle entrance: fades in while rising a few px into place.
 * Native-driven (opacity + translateY), so it's cheap and smooth.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  style,
  delay = 0,
  offset = 12,
  duration = 400,
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay, duration]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [offset, 0],
  });

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, gradient, radius } from "./tokens";

const AGradient = Animated.createAnimatedComponent(LinearGradient);

// Progress track whose gradient fill animates its width to `percent` (0-100).
export function AnimatedBar({ percent, height = 12, colorsOverride, style }: { percent: number; height?: number; colorsOverride?: readonly [string, string]; style?: ViewStyle }) {
  const reduce = useReducedMotion();
  const w = useSharedValue(0);
  useEffect(() => {
    const v = Math.min(Math.max(percent, 0), 100);
    w.value = reduce ? v : withTiming(v, { duration: 800 });
  }, [percent, reduce, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={[styles.track, { height }, style]}>
      <AGradient colors={colorsOverride ?? gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, anim]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.full, backgroundColor: colors.gray100, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
});

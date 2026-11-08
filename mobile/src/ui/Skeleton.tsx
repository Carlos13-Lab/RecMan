import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, radius } from "./tokens";

// Grey block with a light band sweeping across it.
export function Skeleton({ width = "100%", height = 16, rounded = radius.lg, style }: { width?: DimensionValue; height?: number; rounded?: number; style?: ViewStyle }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!reduce) x.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1);
  }, [reduce, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * w * 2 }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ width, height, borderRadius: rounded, backgroundColor: colors.gray200, overflow: "hidden" }, style]}>
      <Animated.View style={[{ ...absoluteFill, width: w }, sweep]}>
        <LinearGradient colors={["transparent", "rgba(255,255,255,0.7)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

const absoluteFill = { position: "absolute", top: 0, bottom: 0, left: 0 } as const;

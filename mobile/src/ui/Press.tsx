import * as Haptics from "expo-haptics";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const APressable = Animated.createAnimatedComponent(Pressable);
type Props = Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; haptic?: boolean; scale?: number };

// Tappable: springs to `scale` while pressed, optional light haptic on press.
export function Press({ style, haptic, scale = 0.97, onPress, onPressIn, onPressOut, ...rest }: Props) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      style={[style, anim]}
      onPressIn={(e) => { s.value = withSpring(scale, { damping: 15, stiffness: 300 }); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, { damping: 12, stiffness: 250 }); onPressOut?.(e); }}
      onPress={(e) => { if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(e); }}
    />
  );
}

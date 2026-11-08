import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

// Entrance: fade + 12px rise, staggered 40ms per `index`. Layout animations run on mount only,
// so it plays once per screen; reanimated skips it when the OS asks for reduced motion.
export function FadeInUp({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(350).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })} style={style}>
      {children}
    </Animated.View>
  );
}

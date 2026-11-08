import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "./tokens";

const OFFSCREEN = 900;

// Modal sheet: dimmed backdrop fades in, panel springs up; closes by backdrop tap / back button.
export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const reduce = useReducedMotion();
  const { bottom } = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(OFFSCREEN);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      fade.value = withTiming(1, { duration: 200 });
      y.value = reduce ? 0 : withSpring(0, { damping: 20, stiffness: 180 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(OFFSCREEN, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => done && runOnJS(setMounted)(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts to `visible` only

  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} statusBarTranslucent animationType="none">
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar" />
        </Animated.View>
        <Animated.View style={[styles.panel, { paddingBottom: bottom + space.lg }, panel]}>
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(20,16,34,0.5)" },
  panel: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: space.lg, paddingTop: space.sm },
  grabber: { alignSelf: "center", width: 48, height: 5, borderRadius: radius.full, backgroundColor: colors.gray200, marginBottom: space.md },
});

import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BootStep } from "../features/session/session";
import { dark, font, gradient, radius, space } from "./tokens";

// Real bootstrap steps mapped to progress (no timers).
const STEPS: Record<BootStep, { pct: number; label: string }> = {
  connect: { pct: 25, label: "Conectando con el servidor…" },
  register: { pct: 55, label: "Registrando dispositivo…" },
  load: { pct: 85, label: "Cargando tu negocio…" },
};

type Props = { step?: BootStep; error?: string | null; onRetry?: () => void };

// Stitch "RecMan Premium Onboarding": dark splash with glow, glass icon and progress.
export function Welcome({ step = "connect", error, onRetry }: Props) {
  const { bottom } = useSafeAreaInsets();
  const { pct, label } = STEPS[step];
  const anim = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 400, useNativeDriver: false }).start();
  }, [pct, anim]);

  return (
    <LinearGradient colors={[dark.bg, "#0f1230", "#1b1433"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.screen, { paddingBottom: bottom + 48 }]}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
        {/* Soft glow: concentric translucent discs stand in for a radial gradient. */}
        <View style={styles.glow} pointerEvents="none">
          {[400, 340, 280, 220, 160, 100].map((d) => (
            <View key={d} style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, backgroundColor: gradient[0], opacity: 0.035 }} />
          ))}
        </View>
            <Image source={require("../../assets/splash-icon.png")} style={styles.icon} />
        </View>
        <Text style={styles.brand}>RecMan</Text>
        <Text style={styles.tagline}>Gestiona tu negocio gastronómico con inteligencia</Text>
      </View>

      {error ? (
        <View style={styles.status}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={onRetry} accessibilityRole="button" style={styles.buttonWrap}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={styles.status}>
          <View style={styles.row}>
            <Text style={styles.system}>Iniciando sistema</Text>
            <Text style={styles.pct}>{pct}%</Text>
          </View>
          <View style={styles.track}>
            <Animated.View style={{ width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }), height: "100%" }}>
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill} />
            </Animated.View>
          </View>
          <Text style={styles.step}>{label}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.xl + 8 },
  iconWrap: { alignItems: "center", justifyContent: "center", marginBottom: space.xl },
  glow: { position: "absolute", alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  icon: { width: 270, height: 270, margin: -95 },
  brand: { fontFamily: font.bold, fontSize: 40, letterSpacing: -0.8, color: dark.text },
  tagline: { fontFamily: font.regular, fontSize: 18, lineHeight: 28, color: dark.muted, textAlign: "center", marginTop: space.md, maxWidth: 240 },
  status: { gap: space.sm },
  row: { flexDirection: "row", justifyContent: "space-between" },
  system: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1.8, textTransform: "uppercase", color: dark.muted },
  pct: { fontFamily: font.semibold, fontSize: 12, color: dark.text },
  track: { height: 6, borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { flex: 1, borderRadius: radius.full },
  step: { fontFamily: font.regular, fontSize: 12, fontStyle: "italic", color: dark.muted, textAlign: "center", marginTop: space.xs },
  error: { fontFamily: font.medium, fontSize: 14, color: "#fca5a5", textAlign: "center", marginBottom: space.sm },
  buttonWrap: { alignSelf: "stretch" },
  button: { height: 56, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: font.bold, fontSize: 16, color: "#fff" },
});

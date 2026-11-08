import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { Press } from "./Press";
import { font, gradient, radius, shadowPrimary } from "./tokens";

type Props = { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; loading?: boolean; disabled?: boolean };

export function GradientButton({ label, onPress, icon, loading, disabled }: Props) {
  const off = disabled || loading;
  return (
    <Press haptic onPress={off ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled: !!off }} style={[styles.wrap, !off && shadowPrimary, off && { opacity: 0.55 }]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : icon ? <MaterialIcons name={icon} size={22} color="#fff" /> : null}
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Press>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xxl },
  btn: { height: 56, borderRadius: radius.xxl, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { fontFamily: font.bold, fontSize: 17, color: "#fff" },
});

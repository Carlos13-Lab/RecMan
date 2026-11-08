import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { font } from "../../ui/tokens";
import { initials, tileStyle } from "./tileStyle";

// Gradient square with a faint category icon and the recipe initials (fallback when a recipe has no photo).
export function RecipeTile({ name, category, size = "100%" }: { name: string; category: string | null; size?: number | `${number}%` }) {
  const t = tileStyle(category);
  const fixed = typeof size === "number";
  return (
    <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, { width: size, aspectRatio: 1 }, fixed && { borderRadius: size * 0.25 }]}>
      <MaterialIcons name={t.icon} size={fixed ? size * 0.5 : 56} color="rgba(255,255,255,0.22)" style={styles.icon} />
      <View style={styles.center}><Text style={[styles.text, fixed && { fontSize: size * 0.36 }]}>{initials(name)}</Text></View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 14, overflow: "hidden" },
  icon: { position: "absolute", right: -6, bottom: -6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontFamily: font.bold, fontSize: 28, color: "#fff", letterSpacing: 1 },
});

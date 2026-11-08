import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "./ScreenHeader";
import { colors, font, gradient, radius, space } from "./tokens";

type Props = { title: string; icon: keyof typeof MaterialIcons.glyphMap; message: string };

export function EmptyState({ title, icon, message }: Props) {
  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <View style={styles.body}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
          <MaterialIcons name={icon} size={36} color="#fff" />
        </LinearGradient>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.hint}>Estamos construyendo esta parte de RecMan.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl, gap: space.sm },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  message: { fontFamily: font.bold, fontSize: 18, color: colors.text, textAlign: "center" },
  hint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: "center" },
});

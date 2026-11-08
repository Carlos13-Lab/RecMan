import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, space } from "./tokens";

export function ScreenHeader({ title, right }: { title: string; right?: string }) {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: top + space.lg }]}>
      <Text style={styles.title}>{title}</Text>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: font.bold, fontSize: 24, letterSpacing: -0.4, color: colors.text },
  right: { fontFamily: font.semibold, fontSize: 14, color: colors.primary },
});

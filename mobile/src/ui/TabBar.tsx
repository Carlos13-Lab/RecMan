import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Press } from "./Press";
import { colors, font, gradient, shadowPrimary } from "./tokens";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
type Icon = keyof typeof MaterialIcons.glyphMap;
const ICONS: Record<string, Icon> = { index: "dashboard", recipes: "menu-book", sales: "receipt-long", inventory: "inventory-2" };
const CENTER = 2; // slot of the raised "+" between the 2nd and 3rd route

// Bottom bar: 2 tabs, raised gradient "+" (quick sale), 2 tabs. A gradient bar slides over the active slot.
export function TabBar({ state, descriptors, navigateToTab, onAdd }: BottomTabBarProps & { onAdd: () => void }) {
  const { bottom } = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const slotOf = (i: number) => (i < CENTER ? i : i + 1);
  const x = slotOf(state.index) * (w / 5) + (w / 5 - 28) / 2; // plain number: worklets cannot call JS helpers
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(x, { damping: 18, stiffness: 200 }) }] }), [x]);

  const tabs = state.routes.map((route, i) => {
    const focused = state.index === i;
    const color = focused ? colors.primary : colors.gray400;
    const { title } = descriptors[route.key].options;
    return (
      <Press
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => navigateToTab(route.key)}
        scale={0.92}
        style={styles.slot}
      >
        <MaterialIcons name={ICONS[route.name] ?? "circle"} size={24} color={color} />
        <Text style={[styles.label, { color }]}>{title ?? route.name}</Text>
      </Press>
    );
  });

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[styles.bar, { paddingBottom: bottom + 8 }]}>
      {w ? <Animated.View style={[styles.indicator, indicator]}><LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} /></Animated.View> : null}
      {tabs.slice(0, CENTER)}
      <View style={styles.slot}>
        <Press haptic onPress={onAdd} accessibilityRole="button" accessibilityLabel="Nueva venta" scale={0.9} style={[styles.fab, shadowPrimary]}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabFill}>
            <MaterialIcons name="add" size={32} color="#fff" />
          </LinearGradient>
        </Press>
      </View>
      {tabs.slice(CENTER)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 10 },
  indicator: { position: "absolute", top: 0, left: 0, width: 28, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, overflow: "hidden" },
  slot: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 2, minHeight: 44 },
  label: { fontFamily: font.bold, fontSize: 10 },
  fab: { position: "absolute", bottom: 2, width: 60, height: 60, borderRadius: 30 },
  fabFill: { flex: 1, borderRadius: 30, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.surface },
});

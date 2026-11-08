import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "../../src/features/sales/Calendar";
import { Journal } from "../../src/features/sales/Journal";
import { isIsoDate, localDateString } from "../../src/shared/dates";
import { Press } from "../../src/ui/Press";
import { colors, font, radius, shadowCard, space } from "../../src/ui/tokens";

type View_ = "journal" | "calendar";
const TABS: { key: View_; label: string }[] = [
  { key: "journal", label: "Diario" },
  { key: "calendar", label: "Calendario" },
];

export default function Sales() {
  const { top } = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; t?: string }>();
  const [view, setView] = useState<View_>("journal");
  const [date, setDate] = useState(localDateString());
  const [tick, setTick] = useState(0);
  const lastToday = useRef(localDateString());
  const [segW, setSegW] = useState(0);

  // Home's "Ver todo" (or any deep link) lands on the journal for the given day.
  useEffect(() => {
    const p = Array.isArray(params.date) ? params.date[0] : params.date;
    if (isIsoDate(p)) {
      setDate(p);
      setView("journal");
    }
  }, [params.date, params.t]);

  // After midnight "today" moves: follow it if the user was on the old today, and re-render the strip and calendar.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      const now = localDateString();
      const old = lastToday.current;
      if (now === old) return;
      lastToday.current = now;
      setDate((d) => (d === old ? now : d));
      setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  const half = (segW - 8) / 2;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(view === "journal" ? 0 : half, { damping: 18, stiffness: 220 }) }] }), [view, half]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top + space.lg }]}>
        <Text style={styles.title}>Ventas</Text>
        <View style={styles.seg} onLayout={(e) => setSegW(e.nativeEvent.layout.width)}>
          {segW ? <Animated.View style={[styles.thumb, { width: half }, thumb]} /> : null}
          {TABS.map((t) => (
            <Press key={t.key} haptic onPress={() => setView(t.key)} accessibilityRole="button" accessibilityState={{ selected: view === t.key }} scale={0.95} style={styles.segBtn}>
              <Text style={[styles.segText, view === t.key && styles.segOn]}>{t.label}</Text>
            </Press>
          ))}
        </View>
      </View>
      <Animated.View key={view} entering={FadeIn.duration(220)} style={styles.flex}>
        {view === "journal" ? (
          <Journal key={tick} date={date} onDate={setDate} />
        ) : (
          <Calendar
            key={tick}
            onOpenJournal={(d) => {
              setDate(d);
              setView("journal");
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.background },
  title: { fontFamily: font.bold, fontSize: 24, letterSpacing: -0.4, color: colors.text },
  seg: { flexDirection: "row", padding: 4, borderRadius: radius.xl, backgroundColor: colors.gray100 },
  thumb: { position: "absolute", top: 4, left: 4, bottom: 4, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadowCard },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 8 },
  segText: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  segOn: { fontFamily: font.bold, color: colors.text },
});

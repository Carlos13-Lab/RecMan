import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { localDateString, localTime, parseLocalDate } from "../../shared/dates";
import { formatBs, formatUsd, toNumber } from "../../shared/money";
import { CountUp } from "../../ui/CountUp";
import { FadeInUp } from "../../ui/FadeInUp";
import { Press } from "../../ui/Press";
import { RecipeImage } from "../../ui/RecipeImage";
import { Skeleton } from "../../ui/Skeleton";
import { colors, font, gradient, radius, shadowCard, shadowPrimary, space } from "../../ui/tokens";
import { useDay } from "../home/queries";
import { dayTotals } from "./sales";

const DAYS = 14;
const ITEM = 52;
const GAP = 6;

function DayStrip({ date, onDate, today }: { date: string; onDate: (d: string) => void; today: string }) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  // Last DAYS days, widened to include the selected date when it falls outside that window.
  const days = useMemo(() => {
    const t = parseLocalDate(today);
    const sel = parseLocalDate(date);
    const from = new Date(Math.min(sel.getTime(), new Date(t.getFullYear(), t.getMonth(), t.getDate() - (DAYS - 1)).getTime()));
    const to = new Date(Math.max(sel.getTime(), t.getTime()));
    const n = Math.round((to.getTime() - from.getTime()) / 86400000) + 1; // round: DST days are 23/25h
    return Array.from({ length: n }, (_, i) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + i));
  }, [today, date]);
  const index = days.findIndex((d) => localDateString(d) === date);
  const focus = (animated: boolean) => ref.current?.scrollTo({ x: Math.max(0, (index - 3) * (ITEM + GAP)), animated });
  useEffect(() => focus(true), [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const pill = useAnimatedStyle(() => ({ opacity: index < 0 ? 0 : 1, transform: [{ translateX: withSpring(Math.max(index, 0) * (ITEM + GAP), { damping: 16, stiffness: 220 }) }] }), [index]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => focus(false)} style={styles.strip} contentContainerStyle={styles.stripContent}>
      <Animated.View style={[styles.pill, shadowPrimary, pill]}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {days.map((d) => {
        const key = localDateString(d);
        const on = key === date;
        const wd = d.toLocaleDateString("es-VE", { weekday: "short" }).replace(".", "");
        return (
          <Press key={key} haptic onPress={() => onDate(key)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={d.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" })} style={styles.dayItem}>
            <Text style={[styles.dayWd, d.getDay() === 0 && { color: colors.danger }, on && styles.dayOn]}>{wd.toUpperCase()}</Text>
            <Text style={[styles.dayNum, on && styles.dayOn]}>{d.getDate()}</Text>
          </Press>
        );
      })}
    </ScrollView>
  );
}

export function Journal({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  const today = localDateString();
  const day = useDay(date);
  // ISO timestamps sort correctly as plain strings.
  const sales = useMemo(() => [...(day.data?.sales ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [day.data]);
  const totals = dayTotals(sales);
  const isToday = date === today;
  const title = isToday ? "Transacciones de hoy" : `Ventas del ${parseLocalDate(date).toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")}`;

  return (
    <View style={styles.flex}>
      <DayStrip date={date} onDate={onDate} today={today} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={day.isRefetching} onRefresh={() => void day.refetch()} colors={[colors.primary]} />}>
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {day.data ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totals.count} {totals.count === 1 ? "venta" : "ventas"} · {totals.units} {totals.units === 1 ? "unidad" : "unidades"}</Text>
            </View>
          ) : null}
        </View>

        {day.isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} height={116} rounded={radius.xl} style={styles.skel} />) : null}
        {day.error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{day.error.message}</Text>
            <Press onPress={() => void day.refetch()} accessibilityRole="button"><Text style={styles.retry}>Reintentar</Text></Press>
          </View>
        ) : null}
        {day.data && sales.length === 0 ? (
          <FadeInUp>
            <View style={[styles.card, styles.empty]}>
              <MaterialIcons name="receipt-long" size={32} color={colors.gray400} />
              <Text style={styles.emptyTitle}>{isToday ? "Aún no hay ventas hoy" : "Sin ventas este día"}</Text>
              <Text style={styles.emptyHint}>Registra una con el botón +</Text>
            </View>
          </FadeInUp>
        ) : null}

        {sales.map((s, i) => (
          <FadeInUp key={s.id} index={Math.min(i, 10)}>
            <View style={[styles.card, styles.row]}>
              <View style={styles.info}>
                <View style={styles.time}>
                  <MaterialIcons name="schedule" size={14} color={colors.primary} />
                  <Text style={styles.timeText}>{localTime(s.createdAt)}</Text>
                </View>
                <Text style={styles.name} numberOfLines={2}>{s.quantity} × {s.recipe?.name ?? "Receta eliminada"}</Text>
                <Text style={styles.unit}>{formatUsd(toNumber(s.totalUsd) / s.quantity)} c/u</Text>
                <Text style={styles.usd}>{formatUsd(s.totalUsd)}</Text>
                <Text style={styles.bs}>{formatBs(s.totalBs)}</Text>
              </View>
              {s.recipe ? <RecipeImage name={s.recipe.name} category={s.recipe.category} imageUrl={s.recipe.imageUrl} size={88} /> : null}
            </View>
          </FadeInUp>
        ))}
        {sales.length ? <Text style={styles.note}>Las ventas registradas no se pueden editar ni eliminar.</Text> : null}
      </ScrollView>

      <View style={styles.total}>
        <View>
          <Text style={styles.totalLabel}>TOTAL DEL DÍA</Text>
          <CountUp value={totals.usd} format={formatUsd} style={styles.totalUsd} />
          <CountUp value={totals.bs} format={formatBs} style={styles.totalBs} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  strip: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  stripContent: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: GAP },
  pill: { position: "absolute", left: space.lg, top: space.md, width: ITEM, height: 64, borderRadius: radius.xxl, overflow: "hidden" },
  dayItem: { width: ITEM, height: 64, alignItems: "center", justifyContent: "center", gap: 2 },
  dayWd: { fontFamily: font.semibold, fontSize: 11, color: colors.muted },
  dayNum: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  dayOn: { color: "#fff" },
  content: { paddingTop: space.lg, paddingBottom: 140 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.xs },
  title: { flex: 1, fontFamily: font.bold, fontSize: 16, color: colors.text },
  badge: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.full, backgroundColor: "#dcfce7" },
  badgeText: { fontFamily: font.semibold, fontSize: 12, color: "#15803d" },
  card: { marginHorizontal: space.lg, marginTop: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadowCard },
  skel: { marginHorizontal: space.lg, marginTop: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  info: { flex: 1 },
  time: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  name: { fontFamily: font.bold, fontSize: 17, color: colors.text, marginTop: 4 },
  unit: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  usd: { fontFamily: font.bold, fontSize: 22, color: colors.primary, marginTop: space.sm },
  bs: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  empty: { alignItems: "center", gap: space.sm, paddingVertical: 40 },
  emptyTitle: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  emptyHint: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  error: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
  retry: { fontFamily: font.semibold, fontSize: 14, color: colors.primary, marginTop: space.sm },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.gray400, textAlign: "center", marginTop: space.xl, paddingHorizontal: space.xl },
  total: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted },
  totalUsd: { fontFamily: font.bold, fontSize: 28, lineHeight: 34, color: colors.primary },
  totalBs: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
});

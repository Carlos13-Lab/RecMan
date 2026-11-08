import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInLeft, SlideInRight } from "react-native-reanimated";
import { capitalize, localDateString, parseLocalDate } from "../../shared/dates";
import { formatBs, formatPercent, formatUsd } from "../../shared/money";
import { CountUp } from "../../ui/CountUp";
import { FadeInUp } from "../../ui/FadeInUp";
import { Press } from "../../ui/Press";
import { Skeleton } from "../../ui/Skeleton";
import { colors, dark, font, gradient, radius, shadowCard, shadowPrimary, space } from "../../ui/tokens";
import { useRange } from "../home/queries";
import { bestTimes, categoryBreakdown, dayTotals, deltaPercent, deltaSpan, estimatedProfit, heatLevel, monthGrid, monthKpis, monthRange, perDayTotals, sameSpan } from "./sales";

const HEAT = ["#f3f4f6", "#ede9fe", "#c4b5fd", "#a78bfa", "#7c5ef3", "#5b3fd6"];
const WEEK = ["D", "L", "M", "M", "J", "V", "S"];
const ALL = "all";

const longDate = (iso: string) => {
  return capitalize(parseLocalDate(iso).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "short" }).replace(/\./g, ""));
};

const plural = (w: string) => (w.endsWith("s") ? w : `${w}s`);

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return <Text style={[styles.delta, { color: up ? colors.success : colors.danger }]}>{up ? "+" : ""}{formatPercent(value)}</Text>;
}

export function Calendar({ onOpenJournal }: { onOpenJournal: (date: string) => void }) {
  const now = new Date();
  const today = localDateString(now);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dir, setDir] = useState(1);
  const [picked, setPicked] = useState(today);
  const [category, setCategory] = useState(ALL);
  const [info, setInfo] = useState(false);

  const cur = monthRange(cursor.y, cursor.m);
  const prevD = new Date(cursor.y, cursor.m - 1, 1);
  const prev = monthRange(prevD.getFullYear(), prevD.getMonth());
  // Compare like with like: the same leading days of the previous month (capped at its length).
  const prevLen = new Date(cursor.y, cursor.m, 0).getDate();
  const cutoff = Math.min(deltaSpan(cursor, now), prevLen);
  const prevMonthName = (style: "long" | "short") => prevD.toLocaleDateString("es-VE", { month: style }).replace(/\./g, "");
  const vsLabel = cutoff === 0 ? "" : cutoff === prevLen ? `vs. ${prevMonthName("long")}` : `vs. 1–${cutoff} ${prevMonthName("short")}`;
  const curQ = useRange(cur.from, cur.to);
  const prevQ = useRange(prev.from, prev.to);

  const all = curQ.data?.sales;
  const cats = useMemo(() => categoryBreakdown(all ?? []), [all]);
  const keep = (list: NonNullable<typeof all>) => (category === ALL ? list : list.filter((s) => (s.recipe?.category || "Sin categoría") === category));
  const sales = useMemo(() => keep(all ?? []), [all, category]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevSales = prevQ.data && cutoff > 0 ? sameSpan(keep(prevQ.data.sales), cutoff) : null;

  const k = monthKpis(sales);
  const profit = estimatedProfit(sales);
  const revDelta = prevSales ? deltaPercent(k.revenueUsd, monthKpis(prevSales).revenueUsd) : null;
  const profitDelta = prevSales ? deltaPercent(profit, estimatedProfit(prevSales)) : null;
  const totals = useMemo(() => perDayTotals(sales), [sales]);
  const max = Math.max(0, ...Object.values(totals));
  const times = bestTimes(sales);
  const daySales = sales.filter((s) => s.date === picked);
  const dayT = dayTotals(daySales);
  const grid = monthGrid(cursor.y, cursor.m);
  const monthLabel = capitalize(new Date(cursor.y, cursor.m, 1).toLocaleDateString("es-VE", { month: "long", year: "numeric" }));
  const loading = curQ.isLoading;

  const go = (d: number) => {
    void Haptics.selectionAsync();
    setDir(d);
    const n = new Date(cursor.y, cursor.m + d, 1);
    setCursor({ y: n.getFullYear(), m: n.getMonth() });
    // Reset the picked day: today if it is in the new month, otherwise day 1.
    const inNow = n.getFullYear() === now.getFullYear() && n.getMonth() === now.getMonth();
    setPicked(inNow ? today : localDateString(n));
  };
  const refresh = () => void Promise.all([curQ.refetch(), prevQ.refetch()]);
  const bestDayLabel = k.bestDay ? capitalize(parseLocalDate(k.bestDay.date).toLocaleDateString("es-VE", { weekday: "short", day: "numeric" }).replace(/\./g, "")) : "—";

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={curQ.isRefetching || prevQ.isRefetching} onRefresh={refresh} colors={[colors.primary]} />}>
      {curQ.error ? (
        <View style={styles.card}>
          <Text style={styles.error}>{curQ.error.message}</Text>
          <Press onPress={refresh} accessibilityRole="button"><Text style={styles.retry}>Reintentar</Text></Press>
        </View>
      ) : null}

      {!curQ.error ? (
      <FadeInUp index={0} style={styles.kpiRow}>
        {loading ? (
          [0, 1].map((i) => <Skeleton key={i} height={112} rounded={radius.xl} style={{ flex: 1 }} />)
        ) : (
          <>
            <View style={[styles.card, styles.kpi]}>
              <Text style={styles.kpiLabel}>INGRESOS DEL MES</Text>
              <View style={styles.kpiValueRow}>
                <CountUp value={k.revenueUsd} format={formatUsd} style={styles.kpiValue} />
                <Delta value={revDelta} />
              </View>
              <CountUp value={k.revenueBs} format={formatBs} style={styles.kpiSub} />
            </View>
            <View style={[styles.card, styles.kpi]}>
              <View style={styles.kpiLabelRow}>
                <Text style={styles.kpiLabel}>GANANCIA ESTIMADA</Text>
                <Press onPress={() => setInfo((v) => !v)} accessibilityRole="button" accessibilityLabel="Cómo se calcula la ganancia estimada" hitSlop={10}>
                  <MaterialIcons name="info-outline" size={14} color={colors.muted} />
                </Press>
              </View>
              <View style={styles.kpiValueRow}>
                <CountUp value={profit} format={formatUsd} style={[styles.kpiValue, { color: colors.success }]} />
                <Delta value={profitDelta} />
              </View>
              {vsLabel ? <Text style={styles.kpiSub}>{vsLabel}</Text> : null}
            </View>
          </>
        )}
      </FadeInUp>
      ) : null}
      {info ? (
        <Animated.View entering={FadeIn} style={styles.infoNote}>
          <Text style={styles.infoText}>Se calcula con el margen actual de cada receta: ganancia = venta − venta / (1 + margen). Si cambias el margen de una receta, el estimado de ventas pasadas también cambia.</Text>
        </Animated.View>
      ) : null}

      {!loading && !curQ.error ? (
        <FadeInUp index={1} style={styles.kpiRow}>
          {[
            { label: "UNIDADES", value: String(k.units) },
            { label: "MEJOR DÍA", value: bestDayLabel, sub: k.bestDay ? formatUsd(k.bestDay.usd) : undefined },
            { label: "PROM. POR DÍA", value: formatUsd(k.avgPerSellingDay), sub: `${k.sellingDays} ${k.sellingDays === 1 ? "día" : "días"} con ventas` },
          ].map((c) => (
            <View key={c.label} style={[styles.card, styles.kpiSmall]}>
              <Text style={styles.kpiLabel}>{c.label}</Text>
              <Text style={styles.kpiSmallValue} numberOfLines={1} adjustsFontSizeToFit>{c.value}</Text>
              {c.sub ? <Text style={styles.kpiSub} numberOfLines={1}>{c.sub}</Text> : null}
            </View>
          ))}
        </FadeInUp>
      ) : null}

      <FadeInUp index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.monthPill, shadowPrimary]}>
            <Text style={styles.monthPillText}>{monthLabel}</Text>
            <MaterialIcons name="calendar-month" size={18} color="#fff" />
          </LinearGradient>
          {[{ category: ALL, label: "Todas" }, ...cats.map((c) => ({ category: c.category, label: `${c.category} · ${formatUsd(c.usd)}` }))].map((c) => {
            const on = category === c.category;
            return (
              <Press key={c.category} haptic onPress={() => setCategory(c.category)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </FadeInUp>

      <FadeInUp index={3}>
        <View style={[styles.card, styles.calCard]}>
          <View style={styles.calHead}>
            <Text style={styles.calTitle}>Rendimiento de ventas</Text>
            <View style={styles.arrows}>
              <Press onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Mes anterior" style={styles.arrow}>
                <MaterialIcons name="chevron-left" size={22} color={colors.text} />
              </Press>
              <Press onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Mes siguiente" style={styles.arrow}>
                <MaterialIcons name="chevron-right" size={22} color={colors.text} />
              </Press>
            </View>
          </View>
          <View style={styles.weekRow}>
            {WEEK.map((w, i) => <Text key={i} style={styles.weekDay}>{w}</Text>)}
          </View>
          <Animated.View key={`${cursor.y}-${cursor.m}`} entering={(dir > 0 ? SlideInRight : SlideInLeft).duration(260)} style={styles.grid}>
            {Array.from({ length: grid.length / 7 }, (_, r) => (
              <View key={r} style={styles.gridRow}>
                {grid.slice(r * 7, r * 7 + 7).map((c) => {
                  const lvl = c.inMonth ? heatLevel(totals[c.date] ?? 0, max) : 0;
                  const sel = c.date === picked && c.inMonth;
                  return (
                    <Press
                      key={c.date}
                      disabled={!c.inMonth}
                      haptic
                      onPress={() => setPicked(c.date)}
                      accessibilityRole="button"
                      accessibilityLabel={longDate(c.date)}
                      accessibilityState={{ selected: sel }}
                      scale={0.9}
                      style={[styles.cell, { backgroundColor: HEAT[lvl] }, !c.inMonth && { opacity: 0.4 }, c.date === today && styles.cellToday, sel && styles.cellSel]}
                    >
                      <Text style={[styles.cellText, lvl >= 4 && { color: "#fff" }]}>{Number(c.date.slice(8))}</Text>
                    </Press>
                  );
                })}
              </View>
            ))}
          </Animated.View>
          {loading ? <Text style={styles.loadingHint}>Cargando ventas…</Text> : null}
          <View style={styles.legend}>
            <Text style={styles.legendText}>MENOS</Text>
            <View style={styles.legendBoxes}>{HEAT.slice(1).map((h) => <View key={h} style={[styles.legendBox, { backgroundColor: h }]} />)}</View>
            <Text style={styles.legendText}>MÁS</Text>
          </View>
        </View>
      </FadeInUp>

      <FadeInUp index={4}>
        <View style={[styles.card, styles.dayCard]}>
          <View style={styles.dayHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dayKicker}>FECHA SELECCIONADA</Text>
              <Text style={styles.dayTitle} numberOfLines={1}>{longDate(picked)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.dayKicker}>INGRESOS DEL DÍA</Text>
              <Text style={styles.dayTitle}>{formatUsd(dayT.usd)}</Text>
            </View>
          </View>
          {daySales.length === 0 ? (
            <Text style={styles.dayEmpty}>Sin ventas este día</Text>
          ) : (
            categoryBreakdown(daySales).map((c) => (
              <View key={c.category} style={styles.catRow}>
                <View style={styles.catIcon}><MaterialIcons name="restaurant" size={20} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName} numberOfLines={1}>{c.category}</Text>
                  <Text style={styles.catSub}>{c.units} {c.units === 1 ? "unidad vendida" : "unidades vendidas"}</Text>
                </View>
                <Text style={styles.catUsd}>{formatUsd(c.usd)}</Text>
              </View>
            ))
          )}
          <Press haptic onPress={() => onOpenJournal(picked)} accessibilityRole="link" style={styles.dayLink}>
            <Text style={styles.dayLinkText}>{dayT.count ? `VER ${dayT.count} ${dayT.count === 1 ? "TRANSACCIÓN" : "TRANSACCIONES"}` : "ABRIR EN EL DIARIO"}</Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
          </Press>
        </View>
      </FadeInUp>

      <FadeInUp index={5}>
        <View style={styles.insight}>
          <View style={styles.insightKicker}>
            <MaterialIcons name="lightbulb" size={16} color={dark.muted} />
            <Text style={styles.insightKickerText}>INSIGHT DE RENDIMIENTO</Text>
          </View>
          <Text style={styles.insightTitle}>Rango óptimo de ventas</Text>
          <Text style={styles.insightBody}>
            {times
              ? `En ${monthLabel.toLowerCase()} tus mejores ventas caen los ${plural(new Date(2026, 0, 4 + times.weekday).toLocaleDateString("es-VE", { weekday: "long" }))}, sobre todo entre las ${String(times.hour).padStart(2, "0")}:00 y las ${String((times.hour + 1) % 24).padStart(2, "0")}:00.`
              : "Cuando registres ventas este mes, aquí verás el día y la hora en que más vendes."}
          </Text>
        </View>
      </FadeInUp>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space.lg, paddingBottom: space.xl },
  card: { padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadowCard },
  kpiRow: { flexDirection: "row", gap: space.md, paddingHorizontal: space.lg, marginBottom: space.md },
  kpi: { flex: 1, gap: 2 },
  kpiLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kpiLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.8, color: colors.muted },
  kpiValueRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 6, marginTop: 4 },
  kpiValue: { fontFamily: font.bold, fontSize: 21, color: colors.text },
  kpiSub: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  delta: { fontFamily: font.bold, fontSize: 11 },
  kpiSmall: { flex: 1, gap: 2, padding: space.md },
  kpiSmallValue: { fontFamily: font.bold, fontSize: 17, color: colors.text, marginTop: 4 },
  infoNote: { marginHorizontal: space.lg, marginBottom: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: "#eceeff" },
  infoText: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, alignItems: "center" },
  monthPill: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: 18, height: 44, borderRadius: radius.full },
  monthPillText: { fontFamily: font.bold, fontSize: 15, color: "#fff" },
  chip: { height: 44, paddingHorizontal: 18, borderRadius: radius.full, justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary + "1A", borderColor: colors.primary },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  chipTextOn: { fontFamily: font.bold, color: colors.primary },
  calCard: { marginHorizontal: space.lg, marginTop: space.sm, padding: space.lg, overflow: "hidden" },
  calHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.md },
  calTitle: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  arrows: { flexDirection: "row", gap: space.sm },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  weekRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  weekDay: { flex: 1, textAlign: "center", fontFamily: font.semibold, fontSize: 12, color: colors.muted },
  grid: { gap: 6 },
  gridRow: { flexDirection: "row", gap: 6 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  cellToday: { borderColor: colors.primary },
  cellSel: { borderColor: colors.text },
  cellText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  loadingHint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: space.sm },
  legend: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.lg },
  legendText: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  legendBoxes: { flexDirection: "row", gap: 4 },
  legendBox: { width: 20, height: 20, borderRadius: 4 },
  dayCard: { marginHorizontal: space.lg, marginTop: space.lg, padding: 0, overflow: "hidden" },
  dayHead: { flexDirection: "row", justifyContent: "space-between", gap: space.md, padding: space.lg, backgroundColor: "#f5f3ff", borderBottomWidth: 1, borderBottomColor: colors.border },
  dayKicker: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.8, color: colors.primary },
  dayTitle: { fontFamily: font.bold, fontSize: 20, color: colors.text, marginTop: 2 },
  dayEmpty: { fontFamily: font.medium, fontSize: 14, color: colors.muted, padding: space.lg },
  catRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  catIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "1A", alignItems: "center", justifyContent: "center" },
  catName: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  catSub: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  catUsd: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  dayLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: space.md, backgroundColor: colors.gray100 },
  dayLinkText: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.8, color: colors.primary },
  insight: { marginHorizontal: space.lg, marginTop: space.lg, padding: 20, borderRadius: radius.xxl, backgroundColor: dark.bg, gap: space.sm },
  insightKicker: { flexDirection: "row", alignItems: "center", gap: space.sm },
  insightKickerText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: dark.muted },
  insightTitle: { fontFamily: font.bold, fontSize: 20, color: dark.text },
  insightBody: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: dark.muted },
  error: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
  retry: { fontFamily: font.semibold, fontSize: 14, color: colors.primary, marginTop: space.sm },
});

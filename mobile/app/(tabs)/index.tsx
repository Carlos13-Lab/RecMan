import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationsSheet } from "../../src/features/notifications/NotificationsSheet";
import { useDay, useNotifications, useRange, useTodayMetrics } from "../../src/features/home/queries";
import { buildDailySeries, buildHourlySeries } from "../../src/features/home/series";
import { TrendChart } from "../../src/features/home/TrendChart";
import { capitalize, localDateString, localTime } from "../../src/shared/dates";
import { formatBs, formatPercent, formatUsd, toNumber } from "../../src/shared/money";
import { AnimatedBar } from "../../src/ui/AnimatedBar";
import { CountUp } from "../../src/ui/CountUp";
import { FadeInUp } from "../../src/ui/FadeInUp";
import { Press } from "../../src/ui/Press";
import { RecipeImage } from "../../src/ui/RecipeImage";
import { Skeleton } from "../../src/ui/Skeleton";
import { colors, font, gradient, radius, shadowCard, shadowGreen, shadowPrimary, space } from "../../src/ui/tokens";

// Stitch "Executive Business Dashboard": tint pairs per metric card.
const TINTS = {
  green: { bg: "#e7f5ed", border: "#bbf7d0", icon: "#16a34a", badgeBg: "#bbf7d0", badge: "#15803d" },
  indigo: { bg: "#eceeff", border: "#c7caff", icon: "#6366F1", badgeBg: "#c7caff", badge: "#4338ca" },
  purple: { bg: "#f3e8ff", border: "#e9d5ff", icon: "#9333ea", badgeBg: "#e9d5ff", badge: "#7e22ce" },
};
const MARGIN_TARGET = 60; // shown in the design as "Meta: 60%"

type Icon = keyof typeof MaterialIcons.glyphMap;

function MetricCard(p: { tint: keyof typeof TINTS; icon: Icon; badge: string; label: string; usd: number; bs: number }) {
  const t = TINTS[p.tint];
  return (
    <Press style={[styles.metric, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={styles.metricTop}>
        <MaterialIcons name={p.icon} size={24} color={t.icon} />
        <Text style={[styles.badge, { color: t.badge, backgroundColor: t.badgeBg }]}>{p.badge}</Text>
      </View>
      <View>
        <Text style={styles.metricLabel}>{p.label}</Text>
        <CountUp value={p.usd} format={formatUsd} style={styles.metricValue} />
        <CountUp value={p.bs} format={formatBs} style={styles.metricSub} />
      </View>
    </Press>
  );
}

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}


type Mode = "daily" | "weekly";

function Toggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View style={styles.toggle}>
      {(["daily", "weekly"] as const).map((m) => (
        <Press key={m} haptic onPress={() => onChange(m)} accessibilityRole="button" accessibilityState={{ selected: mode === m }} style={[styles.toggleBtn, mode === m && styles.toggleOn]}>
          <Text style={[styles.toggleText, mode === m && styles.toggleTextOn]}>{m === "daily" ? "Diario" : "Semanal"}</Text>
        </Press>
      ))}
    </View>
  );
}

export default function Home() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("daily");
  const [bellOpen, setBellOpen] = useState(false);
  const now = new Date();
  const today = localDateString(now);
  const from = buildDailySeries([], now)[0].date;

  const metrics = useTodayMetrics();
  const range = useRange(from, today);
  const day = useDay(today);
  const notifications = useNotifications();

  const { data, error, isLoading } = metrics;
  const refreshing = metrics.isRefetching || range.isRefetching || day.isRefetching;
  const refetchAll = () => void Promise.all([metrics.refetch(), range.refetch(), day.refetch(), notifications.refetch()]);
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  const margin = data?.percentages.profit ?? 0;
  const verdict =
    !data || data.salesCount === 0 ? "Sin ventas hoy" : margin >= MARGIN_TARGET ? "Excelente desempeño" : margin >= 0 ? "Saludable" : "Requiere atención";
  const sales = [...(day.data?.sales ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const points =
    mode === "weekly"
      ? range.data && buildDailySeries(range.data.sales, now).map((p) => ({ label: new Date(`${p.date}T00:00:00`).toLocaleDateString("es-VE", { weekday: "short" }).replace(".", ""), total: p.total }))
      : day.data && buildHourlySeries(day.data.sales, now).map((p) => ({ label: `${String(p.hour).padStart(2, "0")}:00`, total: p.total }));
  const chartError = mode === "weekly" ? range.error : day.error;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top + space.md }]}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.logo, shadowPrimary]}>
          <MaterialIcons name="restaurant" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{capitalize(now.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "short" }))}</Text>
          <Text style={styles.appTitle}>RecMan</Text>
        </View>
        <Press haptic onPress={() => setBellOpen(true)} accessibilityRole="button" accessibilityLabel={`Notificaciones, ${unread} sin leer`} style={styles.bell}>
          <MaterialIcons name={unread ? "notifications" : "notifications-none"} size={26} color={colors.text} />
          {unread ? (
            <Animated.View entering={FadeIn} style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
            </Animated.View>
          ) : null}
        </Press>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} colors={[colors.primary]} />}
      >
        <FadeInUp index={0}>
          <Text style={styles.hello}>{greeting(now)}, Chef</Text>
          <Text style={styles.helloSub}>Este es el desempeño de tu negocio hoy.</Text>
        </FadeInUp>

        {isLoading ? (
          <>
            <View style={styles.metrics}>
              {[0, 1].map((i) => <Skeleton key={i} width={168} height={128} rounded={radius.xl} />)}
            </View>
            <Skeleton height={110} rounded={radius.xl} style={styles.skelPanel} />
          </>
        ) : null}
        {error ? (
          <View style={styles.panel}>
            <Text style={styles.errorText}>{error.message}</Text>
            <Press onPress={refetchAll} accessibilityRole="button">
              <Text style={styles.retry}>Reintentar</Text>
            </Press>
          </View>
        ) : null}

        {data ? (
          <>
            <FadeInUp index={1}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metrics}>
                <MetricCard tint="green" icon="payments" badge={`${data.salesCount} ${data.salesCount === 1 ? "venta" : "ventas"}`} label="Ingresos" {...data.totalRevenue} />
                <MetricCard tint="indigo" icon="inventory-2" badge={formatPercent(data.percentages.expenses)} label="Costos" {...data.totalCost} />
                <MetricCard tint="purple" icon="trending-up" badge={formatPercent(data.percentages.profit)} label="Ganancia" {...data.totalProfit} />
              </ScrollView>
            </FadeInUp>

            <FadeInUp index={2}>
              <View style={styles.panel}>
                <View style={styles.marginHead}>
                  <View style={styles.marginTitle}>
                    <View style={styles.marginIcon}>
                      <MaterialIcons name="pie-chart" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.marginLabel}>Margen de ganancia</Text>
                  </View>
                  <CountUp value={margin} format={formatPercent} style={styles.marginValue} />
                </View>
                <AnimatedBar percent={margin} />
                <View style={styles.marginFoot}>
                  <Text style={styles.verdict}>{verdict}</Text>
                  <Text style={styles.target}>Meta: {MARGIN_TARGET}%</Text>
                </View>
              </View>
            </FadeInUp>
          </>
        ) : null}

        <FadeInUp index={3}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Tendencia de ventas</Text>
            <Toggle mode={mode} onChange={setMode} />
          </View>
          <View style={[styles.panel, styles.chartPanel]}>
            {points ? (
              <Animated.View key={mode} entering={FadeIn.duration(350)}>
                <TrendChart points={points} />
              </Animated.View>
            ) : chartError ? (
              <Text style={styles.errorText}>{chartError.message}</Text>
            ) : (
              <Skeleton height={200} rounded={radius.xl} />
            )}
          </View>
        </FadeInUp>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Ventas de hoy</Text>
          <Press onPress={() => router.navigate({ pathname: "/sales", params: { date: today, t: String(Date.now()) } })} accessibilityRole="link" style={styles.viewAll}>
            <Text style={styles.link}>Ver todo</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
          </Press>
        </View>
        {day.error ? <Text style={[styles.errorText, styles.gutter]}>{day.error.message}</Text> : null}
        {day.isLoading ? [0, 1].map((i) => <Skeleton key={i} height={76} rounded={radius.xl} style={styles.skelPanel} />) : null}
        {day.data && sales.length === 0 ? (
          <View style={[styles.panel, styles.emptySales]}>
            <MaterialIcons name="receipt-long" size={28} color={colors.gray400} />
            <Text style={styles.emptyText}>Aún no hay ventas hoy</Text>
          </View>
        ) : null}
        {sales.map((s, i) => (
          <FadeInUp key={s.id} index={i}>
            <Press style={[styles.panel, styles.saleRow]}>
              {s.recipe ? (
                <RecipeImage name={s.recipe.name} category={s.recipe.category} imageUrl={s.recipe.imageUrl} size={44} />
              ) : (
                <View style={styles.saleIcon}>
                  <MaterialIcons name="restaurant" size={22} color={colors.muted} />
                </View>
              )}
              <View style={styles.saleInfo}>
                <Text style={styles.saleName} numberOfLines={1}>{s.recipe?.name ?? "Receta eliminada"}</Text>
                <Text style={styles.saleQty}>{s.recipe?.category ? `${s.recipe.category} • ` : ""}{s.quantity} {s.quantity === 1 ? "porción" : "porciones"} • {localTime(s.createdAt)}</Text>
              </View>
              <View style={styles.saleTotals}>
                <Text style={styles.saleUsd}>{formatUsd(s.totalUsd)}</Text>
                <Text style={styles.saleBs}>{formatBs(s.totalBs)}</Text>
              </View>
            </Press>
          </FadeInUp>
        ))}
      </ScrollView>
      <NotificationsSheet visible={bellOpen} onClose={() => setBellOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  logo: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  date: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  appTitle: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  content: { paddingTop: space.xl, paddingBottom: space.xl },
  gutter: { paddingHorizontal: space.lg },
  hello: { fontFamily: font.bold, fontSize: 24, letterSpacing: -0.4, color: colors.text, paddingHorizontal: space.lg },
  helloSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: space.xs, paddingHorizontal: space.lg },
  metrics: { gap: space.lg, padding: space.lg },
  metric: { width: 168, gap: space.md, padding: 20, borderRadius: radius.xl, borderWidth: 1, ...shadowGreen },
  metricTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { fontFamily: font.bold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  metricLabel: { fontFamily: font.semibold, fontSize: 12, textTransform: "uppercase", color: colors.text, opacity: 0.7 },
  metricValue: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, color: colors.text, marginTop: space.xs },
  metricSub: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  panel: { marginHorizontal: space.lg, marginTop: space.sm, padding: 20, gap: space.sm, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadowCard },
  marginHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  marginTitle: { flexDirection: "row", alignItems: "center", gap: space.sm },
  marginIcon: { width: 32, height: 32, borderRadius: radius.lg, backgroundColor: colors.primary + "1A", alignItems: "center", justifyContent: "center" },
  marginLabel: { fontFamily: font.bold, fontSize: 14, color: colors.text },
  marginValue: { fontFamily: font.bold, fontSize: 14, color: colors.primary },
  marginFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: space.xs },
  verdict: { fontFamily: font.medium, fontSize: 12, fontStyle: "italic", color: colors.muted },
  target: { fontFamily: font.regular, fontSize: 12, color: colors.gray400 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.xs },
  sectionTitle: { fontFamily: font.bold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
  toggle: { flexDirection: "row", padding: 4, borderRadius: radius.xl, backgroundColor: colors.gray100 },
  toggleBtn: { paddingHorizontal: space.lg, paddingVertical: 6, borderRadius: radius.lg },
  toggleOn: { backgroundColor: colors.surface, ...shadowCard },
  toggleText: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  toggleTextOn: { fontFamily: font.bold, color: colors.text },
  bell: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.background },
  bellBadgeText: { fontFamily: font.bold, fontSize: 10, color: "#fff" },
  skelPanel: { marginHorizontal: space.lg, marginTop: space.sm },
  viewAll: { flexDirection: "row", alignItems: "center" },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors.primary },
  chartPanel: { paddingHorizontal: space.md },
  emptySales: { alignItems: "center", paddingVertical: space.xl },
  emptyText: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  saleRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  saleIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  saleInfo: { flex: 1 },
  saleName: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  saleQty: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
  saleTotals: { alignItems: "flex-end" },
  saleUsd: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  saleBs: { fontFamily: font.medium, fontSize: 11, color: colors.muted, marginTop: 2 },
  errorText: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
  retry: { fontFamily: font.semibold, fontSize: 14, color: colors.primary },
});

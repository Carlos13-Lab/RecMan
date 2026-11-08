import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRange } from "../../src/features/home/queries";
import { invalidateRecipes, useDeleteRecipe, useRecipe } from "../../src/features/recipes/queries";
import { costBreakdown, HEALTHY_MARGIN, marginPercent, marginTone, profitForMargin, salesStats, type Line } from "../../src/features/recipes/recipes";
import { pickPhoto, uploadRecipePhoto } from "../../src/features/sales/pickRecipePhoto";
import { ApiError } from "../../src/shared/http";
import { localDateString } from "../../src/shared/dates";
import { formatBs, formatPercent, formatUsd, toNumber } from "../../src/shared/money";
import { AnimatedBar } from "../../src/ui/AnimatedBar";
import { BottomSheet } from "../../src/ui/BottomSheet";
import { CountUp } from "../../src/ui/CountUp";
import { FadeInUp } from "../../src/ui/FadeInUp";
import { GradientButton } from "../../src/ui/GradientButton";
import { Press } from "../../src/ui/Press";
import { RecipeImage } from "../../src/ui/RecipeImage";
import { Skeleton } from "../../src/ui/Skeleton";
import { colors, font, radius, shadowCard, space } from "../../src/ui/tokens";

const TONE = { good: "#10b981", ok: "#f59e0b", low: "#ef4444" } as const;
const GREEN = ["#10b981", "#34d399"] as const;
const RED = ["#f97316", "#ef4444"] as const;
const HERO_H = 220;
const num = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

const thirtyDaysAgo = () => { const d = new Date(); d.setDate(d.getDate() - 29); return localDateString(d); };

export default function Profitability() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const recipe = useRecipe(id);
  const [from, to] = useMemo(() => [thirtyDaysAgo(), localDateString()], []);
  const range = useRange(from, to);
  const del = useDeleteRecipe(id);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const r = recipe.data;
  const sales = useMemo(() => salesStats(range.data?.sales ?? [], id), [range.data, id]);
  const lines: Line[] = useMemo(() => (r?.ingredients ?? []).map((ri) => ({ ingredientId: ri.ingredient.id, name: ri.ingredient.name, unit: ri.ingredient.unit, priceUsd: ri.ingredient.priceUsd, quantity: ri.quantity })), [r]);
  const rows = useMemo(() => costBreakdown(lines), [lines]);

  const refresh = () => void Promise.all([recipe.refetch(), range.refetch()]);

  const changePhoto = async () => {
    try {
      const photo = await pickPhoto();
      if (!photo) return;
      setUploading(true);
      await uploadRecipePhoto(id, photo);
      await invalidateRecipes(qc);
    } catch (e) {
      Alert.alert("Foto", e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    setDeleteError(null);
    del.mutate(undefined, {
      onSuccess: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setConfirming(false); router.back(); qc.removeQueries({ queryKey: ["recipes", id] }); },
      onError: (e) => setDeleteError(e instanceof ApiError && e.status === 400 ? "No puedes eliminarla: tiene ventas registradas." : e.message),
    });
  };

  const header = (title: string, actions = false) => (
    <View style={[styles.header, { paddingTop: top + space.sm }]}>
      <Press onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={styles.iconBtn}><MaterialIcons name="arrow-back" size={24} color={colors.text} /></Press>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {actions ? (
        <>
          <Press haptic onPress={() => router.push(`/recipe/${id}/edit`)} accessibilityRole="button" accessibilityLabel="Editar receta" style={styles.iconBtn}><MaterialIcons name="edit" size={22} color={colors.text} /></Press>
          <Press haptic onPress={() => { setDeleteError(null); setConfirming(true); }} accessibilityRole="button" accessibilityLabel="Eliminar receta" style={styles.iconBtn}><MaterialIcons name="delete" size={22} color={colors.danger} /></Press>
        </>
      ) : null}
    </View>
  );

  if (!r) {
    return (
      <View style={styles.screen}>
        {header(recipe.error ? "Receta" : "Cargando...")}
        <View style={styles.content}>
          {recipe.error ? (
            <View style={styles.center}>
              <MaterialIcons name="cloud-off" size={40} color={colors.gray400} />
              <Text style={styles.h2}>{recipe.error.message}</Text>
              <GradientButton label="Reintentar" onPress={() => void recipe.refetch()} />
            </View>
          ) : (<><Skeleton height={HERO_H} rounded={24} /><Skeleton height={110} rounded={radius.xxl} /><Skeleton height={200} rounded={radius.xxl} /></>)}
        </View>
      </View>
    );
  }

  const cost = r.costUsd;
  const price = r.priceUsd;
  const profit = price - cost;
  const margin = marginPercent(price, cost);
  const tone = TONE[marginTone(margin)];
  const costPct = price > 0 ? (cost / price) * 100 : 0;
  const side = width - space.lg * 2;
  const healthy = margin >= HEALTHY_MARGIN;

  return (
    <View style={styles.screen}>
      {header(r.name, true)}
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={recipe.isRefetching} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        <FadeInUp index={0}>
          <View style={[styles.hero, { height: HERO_H }]}>
            <View style={{ position: "absolute", left: 0, right: 0, top: (HERO_H - side) / 2 }}>
              <RecipeImage name={r.name} category={r.category} imageUrl={r.imageUrl} />
            </View>
            <LinearGradient colors={["transparent", "rgba(20,16,34,0.85)"]} style={styles.heroShade}>
              {r.category ? <Text style={styles.heroCat}>{r.category}</Text> : null}
              <Text style={styles.heroName} numberOfLines={1}>{r.name}</Text>
            </LinearGradient>
            <Press haptic onPress={() => void changePhoto()} disabled={uploading} accessibilityRole="button" accessibilityLabel="Cambiar foto" style={styles.photoBtn}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="photo-camera" size={18} color="#fff" />}
              <Text style={styles.photoBtnText}>{uploading ? "Subiendo..." : "Cambiar foto"}</Text>
            </Press>
          </View>
        </FadeInUp>

        <FadeInUp index={1} style={styles.kpis}>
          <View style={[styles.kpi, shadowCard]}>
            <View style={styles.kpiHead}><MaterialIcons name="bar-chart" size={16} color={colors.primary} /><Text style={styles.kpiLabel}>Margen bruto</Text></View>
            <CountUp value={margin} format={formatPercent} style={[styles.kpiValue, { color: tone }]} />
            <Text style={styles.kpiSub}>Ganancia sobre el precio</Text>
          </View>
          <View style={[styles.kpi, shadowCard]}>
            <View style={styles.kpiHead}><MaterialIcons name="attach-money" size={16} color={colors.success} /><Text style={styles.kpiLabel}>Ganancia neta</Text></View>
            <CountUp value={profit} format={formatUsd} style={styles.kpiValue} />
            <Text style={styles.kpiSub}>{formatBs(r.priceBs - r.costBs)} por unidad</Text>
          </View>
        </FadeInUp>

        <FadeInUp index={2} style={[styles.card, shadowCard]}>
          <Text style={styles.h2}>Costo vs ganancia</Text>
          <CountUp value={cost} format={formatUsd} style={styles.big} />
          <Text style={styles.kpiSub}>Costo por unidad · <Text style={styles.price}>Precio de venta: {formatUsd(price)} ({formatBs(r.priceBs)})</Text></Text>
          <View style={{ gap: 6 }}>
            <View style={styles.barHead}><Text style={styles.barLabel}>Costo ({formatPercent(costPct)})</Text><Text style={styles.barValue}>{formatUsd(cost)}</Text></View>
            <AnimatedBar percent={costPct} height={12} colorsOverride={RED} />
          </View>
          <View style={{ gap: 6 }}>
            <View style={styles.barHead}><Text style={[styles.barLabel, { color: colors.success }]}>Ganancia ({formatPercent(100 - costPct)})</Text><Text style={[styles.barValue, { color: colors.success }]}>{formatUsd(profit)}</Text></View>
            <AnimatedBar percent={price > 0 ? 100 - costPct : 0} height={12} colorsOverride={GREEN} />
          </View>
        </FadeInUp>

        <FadeInUp index={3} style={[styles.card, shadowCard]}>
          <Text style={styles.h2}>Ventas de los últimos 30 días</Text>
          {range.isLoading ? <Skeleton height={48} /> : range.error ? <Text style={styles.kpiSub}>No se pudieron cargar las ventas.</Text> : (
            <View style={styles.salesRow}>
              <View style={{ flex: 1 }}><CountUp value={sales.units} format={(n) => String(Math.round(n))} style={styles.kpiValue} /><Text style={styles.kpiSub}>{sales.units === 1 ? "unidad vendida" : "unidades vendidas"}</Text></View>
              <View style={{ flex: 1 }}><CountUp value={sales.revenueUsd} format={formatUsd} style={styles.kpiValue} /><Text style={styles.kpiSub}>de ingresos</Text></View>
            </View>
          )}
        </FadeInUp>

        <FadeInUp index={4}>
          <Text style={styles.h1}>Desglose de ingredientes</Text>
          <Text style={styles.kpiSub}>Cuánto aporta cada uno al costo total.</Text>
        </FadeInUp>
        <FadeInUp index={5} style={[styles.card, shadowCard, { gap: space.lg }]}>
          {rows.map((row) => (
            <View key={row.id} style={{ gap: 6 }}>
              <View style={styles.barHead}>
                <View style={{ flex: 1 }}><Text style={styles.ingName} numberOfLines={1}>{row.name}</Text><Text style={styles.kpiSub}>{num(row.quantity)} {row.unit}</Text></View>
                <View style={{ alignItems: "flex-end" }}><Text style={styles.barValue}>{formatUsd(row.costUsd)}</Text><Text style={styles.share}>{formatPercent(row.sharePct)}</Text></View>
              </View>
              <AnimatedBar percent={row.sharePct} height={8} />
            </View>
          ))}
        </FadeInUp>

        <FadeInUp index={6} style={[styles.notice, healthy ? styles.noticeOk : styles.noticeWarn]}>
          <MaterialIcons name={healthy ? "check-circle" : "warning"} size={26} color={healthy ? colors.success : "#d97706"} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.noticeTitle, { color: healthy ? "#14532d" : "#78350f" }]}>{healthy ? "Margen saludable" : "Advertencia de margen"}</Text>
            <Text style={[styles.noticeText, { color: healthy ? "#166534" : "#92400e" }]}>
              {healthy
                ? `Tu margen de ${formatPercent(margin)} supera el mínimo recomendado de ${HEALTHY_MARGIN}%.`
                : `Tu margen de ${formatPercent(margin)} está por debajo del ${HEALTHY_MARGIN}% recomendado. Con una ganancia de ${formatPercent(profitForMargin(HEALTHY_MARGIN))} sobre el costo llegarías al mínimo.`}
            </Text>
          </View>
        </FadeInUp>

        <FadeInUp index={7}>
          <GradientButton label="Actualizar precios" icon="autorenew" onPress={() => router.push(`/recipe/${id}/edit`)} />
        </FadeInUp>
      </ScrollView>

      <BottomSheet visible={confirming} onClose={() => !del.isPending && setConfirming(false)}>
        <View style={{ gap: space.md, paddingBottom: space.sm }}>
          <Text style={styles.h1}>¿Eliminar esta receta?</Text>
          <Text style={styles.kpiSub}>Se eliminará "{r.name}" de tu menú. Esta acción no se puede deshacer.</Text>
          {deleteError ? <View style={styles.error}><MaterialIcons name="error-outline" size={20} color={colors.danger} /><Text style={styles.errorText}>{deleteError}</Text></View> : null}
          <View style={{ flexDirection: "row", gap: space.md }}>
            <Press onPress={() => setConfirming(false)} disabled={del.isPending} accessibilityRole="button" style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Press>
            <Press haptic onPress={remove} disabled={del.isPending} accessibilityRole="button" style={styles.destroy}>
              {del.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.destroyText}>Eliminar</Text>}
            </Press>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingHorizontal: space.sm, paddingBottom: space.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: font.bold, fontSize: 20, color: colors.text },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 48 },
  center: { alignItems: "center", gap: space.md, paddingVertical: 60 },
  hero: { borderRadius: 24, overflow: "hidden", backgroundColor: "#141022" },
  heroShade: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 60, paddingBottom: 16 },
  heroCat: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#b9a8ff" },
  heroName: { fontFamily: font.bold, fontSize: 26, letterSpacing: -0.5, color: "#fff" },
  photoBtn: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: radius.full, backgroundColor: "rgba(20,16,34,0.65)" },
  photoBtnText: { fontFamily: font.semibold, fontSize: 13, color: "#fff" },
  kpis: { flexDirection: "row", gap: space.md },
  kpi: { flex: 1, padding: space.lg, gap: 4, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  kpiHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  kpiLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.muted },
  kpiValue: { fontFamily: font.bold, fontSize: 28, letterSpacing: -0.5, color: colors.text },
  kpiSub: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  card: { padding: space.lg, gap: space.md, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  h1: { fontFamily: font.bold, fontSize: 22, letterSpacing: -0.4, color: colors.text },
  h2: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  big: { fontFamily: font.bold, fontSize: 38, letterSpacing: -1, color: colors.text },
  price: { fontFamily: font.semibold, color: colors.primary },
  barHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  barLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted },
  barValue: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  salesRow: { flexDirection: "row", gap: space.md },
  ingName: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  share: { fontFamily: font.semibold, fontSize: 12, color: colors.primary },
  notice: { flexDirection: "row", gap: space.md, padding: space.lg, borderRadius: radius.xxl, borderWidth: 1 },
  noticeWarn: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  noticeOk: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  noticeTitle: { fontFamily: font.bold, fontSize: 16 },
  noticeText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  error: { flexDirection: "row", alignItems: "center", gap: 8, padding: space.md, borderRadius: radius.xl, backgroundColor: "#fdecea" },
  errorText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.danger },
  cancel: { flex: 1, height: 52, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  destroy: { flex: 1, height: 52, borderRadius: radius.xxl, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  destroyText: { fontFamily: font.bold, fontSize: 16, color: "#fff" },
});

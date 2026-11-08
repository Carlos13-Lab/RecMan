import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { localDateString } from "../../shared/dates";
import { ApiError } from "../../shared/http";
import { formatBs, formatUsd } from "../../shared/money";
import { BottomSheet } from "../../ui/BottomSheet";
import { CountUp } from "../../ui/CountUp";
import { GradientButton } from "../../ui/GradientButton";
import { Press } from "../../ui/Press";
import { Skeleton } from "../../ui/Skeleton";
import { colors, font, gradient, radius, shadowPrimary, space } from "../../ui/tokens";
import { invalidateSales, useRecipes, useTodayMetrics } from "../home/queries";
import { request } from "../session/session";
import { RecipeImage } from "../../ui/RecipeImage";

const MAX_QTY = 99;

function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 503) return "No se pudo obtener la tasa de cambio. Inténtalo de nuevo en unos minutos.";
  // Timeout or dropped connection: the server may have saved the sale, so a blind retry could duplicate it.
  if (e instanceof ApiError && e.status === 0) return "No sabemos si la venta se registró. Revisa las ventas de hoy antes de intentarlo de nuevo.";
  return e instanceof Error ? e.message : "No se pudo registrar la venta";
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const pop = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const step = (d: number) => {
    const n = Math.min(Math.max(value + d, 1), MAX_QTY);
    if (n === value) return;
    void Haptics.selectionAsync();
    pop.value = withSequence(withSpring(1.18, { damping: 10, stiffness: 400 }), withSpring(1));
    onChange(n);
  };
  return (
    <View style={styles.stepper}>
      <Press onPress={() => step(-1)} accessibilityLabel="Disminuir cantidad" style={[styles.stepBtn, styles.stepMinus]}>
        <MaterialIcons name="remove" size={26} color={colors.text} />
      </Press>
      <Animated.Text style={[styles.qty, anim]}>{value}</Animated.Text>
      <Press onPress={() => step(1)} accessibilityLabel="Aumentar cantidad" style={[styles.stepBtn, styles.stepPlus, shadowPrimary]}>
        <MaterialIcons name="add" size={26} color="#fff" />
      </Press>
    </View>
  );
}

export function QuickSaleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const recipes = useRecipes();
  const metrics = useTodayMetrics();
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const check = useSharedValue(0);
  const checkAnim = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: 0.4 + check.value * 0.6 }] }));

  const sell = useMutation({
    mutationFn: () => request("/api/sales", { method: "POST", body: { recipeId, quantity: qty, date: localDateString() } }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      check.value = withSpring(1, { damping: 9, stiffness: 160 });
      void invalidateSales(qc);
      setTimeout(onClose, 900);
    },
    onError: (e) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (e instanceof ApiError && e.status === 0) void invalidateSales(qc); // show the sale if it did land
    },
  });

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setRecipeId(null); setQty(1); setDone(false); check.value = 0; sell.reset();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on open only

  const list = recipes.data ?? [];
  const recipe = list.find((r) => r.id === recipeId);
  const rate = metrics.data?.exchangeRate ?? 0;
  const totalUsd = (recipe?.priceUsd ?? 0) * qty;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text style={styles.title}>Nueva venta</Text>
        <Press onPress={onClose} accessibilityLabel="Cerrar" style={styles.close}>
          <MaterialIcons name="close" size={24} color={colors.muted} />
        </Press>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.md }}>
        <Text style={styles.section}>Seleccionar producto</Text>
        {recipes.isLoading ? (
          <View style={styles.grid}>{[0, 1, 2, 3].map((i) => <View key={i} style={styles.cell}><Skeleton height={110} rounded={14} /></View>)}</View>
        ) : recipes.error ? (
          <Text style={styles.error}>{recipes.error.message}</Text>
        ) : list.length === 0 ? (
          <Text style={styles.empty}>Aún no tienes recetas. Crea una para poder registrar ventas.</Text>
        ) : (
          <View style={styles.grid}>
            {list.map((r) => {
              const on = r.id === recipeId;
              return (
                <Press key={r.id} haptic onPress={() => setRecipeId(r.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.cell}>
                  <View style={[styles.tileWrap, on && styles.tileOn]}><RecipeImage name={r.name} category={r.category} imageUrl={r.imageUrl} /></View>
                  <Text style={[styles.name, on && { color: colors.primary, fontFamily: font.bold }]} numberOfLines={1}>{r.name}</Text>
                </Press>
              );
            })}
          </View>
        )}

        <View style={styles.qtyBox}>
          <Text style={styles.section}>Cantidad</Text>
          <Stepper value={qty} onChange={setQty} />
        </View>

        <View style={styles.rows}>
          <View style={styles.row}><Text style={styles.rowLabel}>Precio unitario</Text><Text style={styles.rowValue}>{recipe ? formatUsd(recipe.priceUsd) : "—"}</Text></View>
          <View style={[styles.row, styles.rowTop]}>
            <Text style={styles.rowLabel}>Total USD</Text>
            <CountUp value={totalUsd} format={formatUsd} style={styles.totalUsd} />
          </View>
          <View style={styles.bsBox}>
            <Text style={styles.bsLabel}>Total en bolívares</Text>
            <CountUp value={totalUsd * rate} format={formatBs} style={styles.bsValue} />
          </View>
        </View>
      </ScrollView>

      {sell.error ? <Text style={styles.error}>{errorMessage(sell.error)}</Text> : null}
      {done ? (
        <Animated.View style={[styles.success, checkAnim]}>
          <MaterialIcons name="check-circle" size={22} color={colors.success} />
          <Text style={styles.successText}>Venta registrada</Text>
        </Animated.View>
      ) : (
        <GradientButton label="Registrar venta" icon="check-circle" loading={sell.isPending} disabled={!recipe || !rate} onPress={() => sell.mutate()} />
      )}
      <Text style={styles.note}>Las ventas no se pueden editar después de guardarlas.</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  title: { fontFamily: font.bold, fontSize: 22, letterSpacing: -0.3, color: colors.text },
  close: { padding: space.sm, borderRadius: radius.full },
  section: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: colors.muted, marginBottom: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  cell: { width: "47.5%" },
  tileWrap: { padding: 3, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  tileOn: { borderColor: colors.primary, ...shadowPrimary },
  name: { fontFamily: font.medium, fontSize: 13, color: colors.text, textAlign: "center", marginTop: 6 },
  qtyBox: { alignItems: "center", marginTop: space.lg, paddingVertical: space.lg, borderRadius: radius.xxl, backgroundColor: "rgba(99,102,241,0.06)" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 28 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  stepMinus: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  stepPlus: { backgroundColor: gradient[0] },
  qty: { minWidth: 100, textAlign: "center", fontFamily: font.bold, fontSize: 56, lineHeight: 64, color: colors.text },
  rows: { marginTop: space.lg, gap: space.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTop: { paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  rowValue: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  totalUsd: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  bsBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.primary + "1A" },
  bsLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.primary },
  bsValue: { fontFamily: font.bold, fontSize: 22, color: colors.primary },
  error: { fontFamily: font.medium, fontSize: 14, color: colors.danger, textAlign: "center", marginBottom: space.sm },
  empty: { fontFamily: font.medium, fontSize: 14, color: colors.muted, textAlign: "center", paddingVertical: space.xl },
  success: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.xxl, backgroundColor: "#e7f5ed" },
  successText: { fontFamily: font.bold, fontSize: 17, color: colors.success },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.gray400, textAlign: "center", marginTop: space.md },
});

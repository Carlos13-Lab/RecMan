import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTodayMetrics } from "../../src/features/home/queries";
import { IngredientSheet } from "../../src/features/inventory/IngredientSheet";
import { categoryTile, filterIngredients, isLowStock, stockPercent, type CategoryFilter, type Ingredient } from "../../src/features/inventory/inventory";
import { useAdjustStock, useIngredients } from "../../src/features/inventory/queries";
import { formatBs, formatUsd, toNumber } from "../../src/shared/money";
import { AnimatedBar } from "../../src/ui/AnimatedBar";
import { FadeInUp } from "../../src/ui/FadeInUp";
import { Press } from "../../src/ui/Press";
import { Skeleton } from "../../src/ui/Skeleton";
import { colors, font, gradient, radius, shadowCard, shadowPrimary, space } from "../../src/ui/tokens";

const RED_BAR = ["#ef4444", "#f87171"] as const;
const num = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

function Card({ item, index, rate, onEdit, onAdjust }: { item: Ingredient; index: number; rate: number; onEdit: () => void; onAdjust: (d: number) => void }) {
  const t = categoryTile(item.category, item.name);
  const cur = toNumber(item.currentStock);
  const min = toNumber(item.minStock);
  const low = isLowStock(item);
  const usd = toNumber(item.priceUsd);
  return (
    <FadeInUp index={index} style={styles.cellWrap}>
      <Press onPress={onEdit} onLongPress={() => onAdjust(-1)} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} style={[styles.card, shadowCard]}>
        <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
          <MaterialIcons name={t.icon} size={44} color={t.iconColor} />
          {low ? <View style={styles.badge}><Text style={styles.badgeText}>Stock bajo</Text></View> : null}
        </LinearGradient>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.price} numberOfLines={1}>{formatUsd(usd)}<Text style={styles.priceBs}>  |  {formatBs(usd * rate)}</Text></Text>
          <View style={styles.stockRow}>
            <Text style={[styles.stockLabel, low && { color: colors.danger, fontFamily: font.semibold }]} numberOfLines={1}>{num(cur)} / {num(min)} {item.unit}</Text>
            <View style={styles.adjust}>
              <Press haptic scale={0.85} onPress={() => onAdjust(-1)} accessibilityLabel={`Restar 1 a ${item.name}`} style={styles.adjBtn}><MaterialIcons name="remove" size={16} color={colors.text} /></Press>
              <Press haptic scale={0.85} onPress={() => onAdjust(1)} accessibilityLabel={`Sumar 1 a ${item.name}`} style={styles.adjBtn}><MaterialIcons name="add" size={16} color={colors.primary} /></Press>
            </View>
          </View>
          <AnimatedBar percent={stockPercent(cur, min)} height={8} colorsOverride={low ? RED_BAR : gradient} />
        </View>
      </Press>
    </FadeInUp>
  );
}

function SkeletonGrid() {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((i) => <View key={i} style={styles.cellWrap}><Skeleton height={230} rounded={radius.xxl} /></View>)}
    </View>
  );
}

export default function Inventory() {
  const { top } = useSafeAreaInsets();
  const ingredients = useIngredients();
  const rate = useTodayMetrics().data?.exchangeRate ?? 0;
  const adjust = useAdjustStock();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [sheet, setSheet] = useState<{ open: boolean; ingredient: Ingredient | null }>({ open: false, ingredient: null });

  const all = ingredients.data ?? [];
  const categories = useMemo(() => [...new Set(all.map((i) => i.category).filter((c): c is string => !!c))].sort(), [all]);
  const shown = useMemo(() => filterIngredients(all, search, filter), [all, search, filter]);
  const chips: { key: CategoryFilter; label: string }[] = [{ key: "all", label: "Todos" }, { key: "low", label: "Stock bajo" }, ...categories.map((c) => ({ key: c, label: c }))];

  const onAdjust = (i: Ingredient, d: number) => {
    const next = Math.max(toNumber(i.currentStock) + d, 0);
    if (next === toNumber(i.currentStock)) return;
    void Haptics.selectionAsync();
    adjust.mutate({ ingredient: i, next });
  };
  const openSheet = (ingredient: Ingredient | null) => setSheet({ open: true, ingredient });

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top + space.lg }]}>
        <View style={styles.titleRow}>
          <LinearGradient colors={gradient} style={styles.logo}><MaterialIcons name="inventory-2" size={22} color="#fff" /></LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Inventario</Text>
            <Text style={styles.subtitle}>Las ventas no descuentan el stock automáticamente</Text>
          </View>
          <Press haptic onPress={() => openSheet(null)} accessibilityRole="button" accessibilityLabel="Nuevo ingrediente" style={[styles.addBtn, shadowPrimary]}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addFill}><MaterialIcons name="add" size={26} color="#fff" /></LinearGradient>
          </Press>
        </View>
        <View style={styles.search}>
          <MaterialIcons name="search" size={22} color={colors.gray400} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Buscar ingredientes..." placeholderTextColor={colors.gray400} style={styles.searchInput} returnKeyType="search" />
          {search ? <Press onPress={() => setSearch("")} accessibilityLabel="Borrar búsqueda"><MaterialIcons name="close" size={20} color={colors.gray400} /></Press> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips.map((c) => {
            const on = filter === c.key;
            return (
              <Press key={c.key} onPress={() => setFilter(c.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
                {c.key === "low" ? <MaterialIcons name="warning-amber" size={16} color={on ? "#fff" : colors.danger} /> : null}
                <Text style={[styles.chipText, on && { color: "#fff" }]}>{c.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {ingredients.isLoading ? (
        <SkeletonGrid />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={ingredients.isRefetching} onRefresh={() => void ingredients.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
          renderItem={({ item, index }) => <Card item={item} index={index} rate={rate} onEdit={() => openSheet(item)} onAdjust={(d) => onAdjust(item, d)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name={ingredients.error ? "cloud-off" : "search-off"} size={40} color={colors.gray400} />
              <Text style={styles.emptyTitle}>{ingredients.error ? ingredients.error.message : all.length === 0 ? "Aún no tienes ingredientes" : "Sin resultados"}</Text>
              <Text style={styles.emptyHint}>{all.length === 0 && !ingredients.error ? "Toca + para agregar el primero." : "Prueba con otra búsqueda o filtro."}</Text>
            </View>
          }
          ListFooterComponent={<Text style={styles.shared}>Ingredientes compartidos entre todos los usuarios</Text>}
        />
      )}
      <IngredientSheet visible={sheet.open} ingredient={sheet.ingredient} categories={categories} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md, backgroundColor: colors.background },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  logo: { width: 44, height: 44, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.bold, fontSize: 24, letterSpacing: -0.4, color: colors.text },
  subtitle: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  addBtn: { width: 44, height: 44, borderRadius: 22 },
  addFill: { flex: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: space.sm, height: 48, paddingHorizontal: space.lg, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.text, padding: 0 },
  chips: { gap: space.sm, paddingRight: space.lg },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  list: { paddingHorizontal: space.lg, paddingBottom: 120, paddingTop: space.xs },
  columns: { gap: space.md, marginBottom: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, paddingHorizontal: space.lg },
  cellWrap: { flex: 1 },
  card: { borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  tile: { height: 104, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 8, right: 8, backgroundColor: colors.danger, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: "#fff" },
  body: { padding: space.md, gap: 4 },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  price: { fontFamily: font.bold, fontSize: 14, color: colors.primary },
  priceBs: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  stockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 2 },
  stockLabel: { flex: 1, fontFamily: font.regular, fontSize: 12, color: colors.muted },
  adjust: { flexDirection: "row", gap: 4 },
  adjBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: space.sm, paddingVertical: 60, paddingHorizontal: space.xl },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: colors.text, textAlign: "center" },
  emptyHint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: "center" },
  shared: { fontFamily: font.regular, fontSize: 11, color: colors.gray400, textAlign: "center", marginTop: space.sm },
});

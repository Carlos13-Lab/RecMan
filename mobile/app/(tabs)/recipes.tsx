import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications, useRecipes } from "../../src/features/home/queries";
import { NotificationsSheet } from "../../src/features/notifications/NotificationsSheet";
import { filterRecipes, marginPercent, marginTone, sortRecipes, type MarginTone, type SortKey } from "../../src/features/recipes/recipes";
import { formatBs, formatPercent, formatUsd } from "../../src/shared/money";
import type { Recipe } from "../../src/shared/types";
import { FadeInUp } from "../../src/ui/FadeInUp";
import { GradientButton } from "../../src/ui/GradientButton";
import { Press } from "../../src/ui/Press";
import { RecipeImage } from "../../src/ui/RecipeImage";
import { Skeleton } from "../../src/ui/Skeleton";
import { colors, font, gradient, radius, shadowPrimary, space } from "../../src/ui/tokens";

const TONE: Record<MarginTone, { bg: string; icon: "trending-up" | "bar-chart" | "trending-down" }> = {
  good: { bg: "#10b981", icon: "trending-up" },
  ok: { bg: "#f59e0b", icon: "bar-chart" },
  low: { bg: "#ef4444", icon: "trending-down" },
};
const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Nombre" },
  { key: "margin-desc", label: "Mayor margen" },
  { key: "margin-asc", label: "Menor margen" },
];

function Card({ recipe, index }: { recipe: Recipe; index: number }) {
  const margin = marginPercent(recipe.priceUsd, recipe.costUsd);
  const tone = TONE[marginTone(margin)];
  return (
    <FadeInUp index={index}>
      <Press onPress={() => router.push(`/recipe/${recipe.id}`)} accessibilityRole="button" accessibilityLabel={`Ver rentabilidad de ${recipe.name}`} style={[styles.card, shadowPrimary]}>
        <RecipeImage name={recipe.name} category={recipe.category} imageUrl={recipe.imageUrl} />
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <MaterialIcons name={tone.icon} size={14} color="#fff" />
          <Text style={styles.badgeText}>{formatPercent(margin)} margen</Text>
        </View>
        <LinearGradient colors={["transparent", "rgba(20,16,34,0.55)", "rgba(20,16,34,0.95)"]} locations={[0, 0.45, 1]} style={styles.overlay}>
          {recipe.category ? <Text style={styles.category} numberOfLines={1}>{recipe.category}</Text> : null}
          <Text style={styles.name} numberOfLines={2}>{recipe.name}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Costo</Text>
              <Text style={styles.value}>{formatUsd(recipe.costUsd)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Precio</Text>
              <Text style={styles.value}>{formatUsd(recipe.priceUsd)}<Text style={styles.bs}>  {formatBs(recipe.priceBs)}</Text></Text>
            </View>
            <View style={styles.chevron}><MaterialIcons name="chevron-right" size={28} color={colors.primary} /></View>
          </View>
        </LinearGradient>
      </Press>
    </FadeInUp>
  );
}

export default function Recipes() {
  const { top } = useSafeAreaInsets();
  const recipes = useRecipes();
  const notifications = useNotifications();
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  const all = recipes.data ?? [];
  const categories = useMemo(() => [...new Set(all.map((r) => r.category).filter((c): c is string => !!c))].sort(), [all]);
  const shown = useMemo(() => sortRecipes(filterRecipes(all, search, category), SORTS[sort].key), [all, search, category, sort]);
  const chips = [{ key: "all", label: "Todas" }, ...categories.map((c) => ({ key: c, label: c }))];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: top + space.md }]}>
        <View style={styles.titleRow}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}><MaterialIcons name="restaurant" size={22} color="#fff" /></LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Recetas</Text>
            <Text style={styles.subtitle}>{all.length} {all.length === 1 ? "receta" : "recetas"} en tu menú</Text>
          </View>
          <Press haptic onPress={() => setBellOpen(true)} accessibilityRole="button" accessibilityLabel={`Notificaciones, ${unread} sin leer`} style={styles.bell}>
            <MaterialIcons name={unread ? "notifications" : "notifications-none"} size={26} color={colors.text} />
            {unread ? <View style={styles.dot} /> : null}
          </Press>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <MaterialIcons name="search" size={22} color={colors.gray400} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Buscar recetas..." placeholderTextColor={colors.gray400} style={styles.searchInput} returnKeyType="search" />
            {search ? <Press onPress={() => setSearch("")} accessibilityLabel="Borrar búsqueda"><MaterialIcons name="close" size={20} color={colors.gray400} /></Press> : null}
          </View>
          <Press haptic onPress={() => setSort((s) => (s + 1) % SORTS.length)} accessibilityRole="button" accessibilityLabel={`Ordenar: ${SORTS[sort].label}`} style={styles.sortBtn}>
            <MaterialIcons name="tune" size={24} color={colors.text} />
          </Press>
        </View>
        <GradientButton label="Crear receta" icon="add-circle" onPress={() => router.push("/recipe/new")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips.map((c) => {
            const on = category === c.key;
            return (
              <Press key={c.key} onPress={() => setCategory(c.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && { color: "#fff" }]}>{c.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
        <Text style={styles.sortHint}>Orden: {SORTS[sort].label}</Text>
      </View>

      {recipes.isLoading ? (
        <View style={styles.list}>{[0, 1].map((i) => <Skeleton key={i} height={380} rounded={24} style={{ marginBottom: space.lg }} />)}</View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={recipes.isRefetching} onRefresh={() => void recipes.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
          renderItem={({ item, index }) => <Card recipe={item} index={index} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name={recipes.error ? "cloud-off" : all.length ? "search-off" : "menu-book"} size={40} color={colors.gray400} />
              <Text style={styles.emptyTitle}>{recipes.error ? recipes.error.message : all.length ? "Sin resultados" : "Aún no tienes recetas"}</Text>
              <Text style={styles.emptyHint}>{all.length || recipes.error ? "Prueba con otra búsqueda o categoría." : "Crea la primera con el botón de arriba."}</Text>
            </View>
          }
        />
      )}
      <NotificationsSheet visible={bellOpen} onClose={() => setBellOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.md, backgroundColor: colors.background },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  logo: { width: 44, height: 44, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.bold, fontSize: 24, letterSpacing: -0.4, color: colors.text },
  subtitle: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 10, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface },
  searchRow: { flexDirection: "row", gap: space.md },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm, height: 48, paddingHorizontal: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.text, padding: 0 },
  sortBtn: { width: 48, height: 48, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chips: { gap: space.sm, paddingRight: space.lg },
  chip: { paddingHorizontal: 20, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  sortHint: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  list: { paddingHorizontal: space.lg, paddingBottom: 120, paddingTop: space.sm },
  card: { borderRadius: 24, overflow: "hidden", marginBottom: space.lg, backgroundColor: "#141022" },
  badge: { position: "absolute", top: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  badgeText: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.4, color: "#fff", textTransform: "uppercase" },
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 80, paddingBottom: 20 },
  category: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "#b9a8ff" },
  name: { fontFamily: font.bold, fontSize: 28, lineHeight: 33, letterSpacing: -0.5, color: "#fff", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 24 },
  label: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.6)" },
  value: { fontFamily: font.bold, fontSize: 20, color: "#fff" },
  bs: { fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.65)" },
  chevron: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: space.sm, paddingVertical: 60, paddingHorizontal: space.xl },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: colors.text, textAlign: "center" },
  emptyHint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: "center" },
});

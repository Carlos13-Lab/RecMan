import { MaterialIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatBs, formatPercent, formatUsd, toNumber } from "../../shared/money";
import { AnimatedBar } from "../../ui/AnimatedBar";
import { CountUp } from "../../ui/CountUp";
import { FadeInUp } from "../../ui/FadeInUp";
import { GradientButton } from "../../ui/GradientButton";
import { Press } from "../../ui/Press";
import { RecipeImage } from "../../ui/RecipeImage";
import { Skeleton } from "../../ui/Skeleton";
import { colors, font, gradient, radius, shadowCard, shadowPrimary, space } from "../../ui/tokens";
import { useRecipes, useTodayMetrics } from "../home/queries";
import { filterIngredients, type Ingredient } from "../inventory/inventory";
import { useIngredients } from "../inventory/queries";
import { pickPhoto, uploadRecipePhoto, type PickedPhoto } from "../sales/pickRecipePhoto";
import { invalidateRecipes, useRecipe, useSaveRecipe } from "./queries";
import { lineCost, marginTone, parseQty, pricing, validateRecipe, type Line } from "./recipes";

type Row = { ing: Ingredient; quantity: string };
const STEPS = ["Info", "Ingredientes", "Revisar"];
const MAX_PROFIT = 200;
const TONE_COLOR = { good: "#10b981", ok: "#f59e0b", low: "#ef4444" } as const;
const num = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

const toLine = ({ ing, quantity }: Row): Line => ({ ingredientId: ing.id, name: ing.name, unit: ing.unit, priceUsd: ing.priceUsd, quantity });

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => setOpen(true));
    const b = Keyboard.addListener("keyboardDidHide", () => setOpen(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return open;
}

function Stepper({ value, onChange, step = 1, min = 0, max = 9999, label, suffix = "" }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; label: string; suffix?: string }) {
  const bump = (d: number) => { void Haptics.selectionAsync(); onChange(Math.min(Math.max(value + d, min), max)); };
  return (
    <View style={styles.stepper}>
      <Press scale={0.85} onPress={() => bump(-step)} accessibilityRole="button" accessibilityLabel={`Disminuir ${label}`} style={styles.stepBtn}><MaterialIcons name="remove" size={22} color={colors.text} /></Press>
      <Text style={styles.stepValue}>{value}{suffix}</Text>
      <Press scale={0.85} onPress={() => bump(step)} accessibilityRole="button" accessibilityLabel={`Aumentar ${label}`} style={styles.stepBtn}><MaterialIcons name="add" size={22} color={colors.primary} /></Press>
    </View>
  );
}

// Touch slider in steps of 5. The track owns the gesture; children ignore touches so locationX stays relative to it.
function Slider({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const [w, setW] = useState(0);
  const pct = Math.min(value / max, 1) * 100;
  const set = (x: number) => {
    if (!w) return;
    const next = Math.round((Math.min(Math.max(x / w, 0), 1) * max) / 5) * 5;
    if (next !== value) { void Haptics.selectionAsync(); onChange(next); }
  };
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => set(e.nativeEvent.locationX)}
      onResponderMove={(e) => set(e.nativeEvent.locationX)}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max, now: value }}
      style={styles.sliderHit}
    >
      <View pointerEvents="none" style={styles.sliderTrack}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct}%`, height: "100%" }} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: `${pct}%` }]} />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

export function RecipeBuilder({ id }: { id?: string }) {
  const { top } = useSafeAreaInsets();
  const qc = useQueryClient();
  const keyboard = useKeyboardOpen();
  const existing = useRecipe(id ?? "");
  const ingredients = useIngredients();
  const recipes = useRecipes();
  const rate = useTodayMetrics().data?.exchangeRate ?? 0;
  const bs = (usd: number) => (rate > 0 ? formatBs(usd * rate) : "—"); // no rate yet: "Bs. 0,00" would be misleading
  const save = useSaveRecipe(id ?? null);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [servings, setServings] = useState(1);
  const [profit, setProfit] = useState(60);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [filled, setFilled] = useState(!id);

  // Editing: fill the form once, when the recipe arrives.
  useEffect(() => {
    const r = existing.data;
    if (!id || !r || filled) return;
    setName(r.name); setCategory(r.category ?? ""); setServings(r.baseServings); setProfit(toNumber(r.profitPercentage));
    setDescription(r.description ?? ""); setNotes(r.notes ?? "");
    setRows(r.ingredients.map((ri) => ({ ing: ri.ingredient, quantity: String(toNumber(ri.quantity)).replace(".", ",") })));
    setFilled(true);
  }, [existing.data, id, filled]);

  const categories = useMemo(() => [...new Set((recipes.data ?? []).map((r) => r.category).filter((c): c is string => !!c))].sort(), [recipes.data]);
  const lines = useMemo(() => rows.map(toLine), [rows]);
  const p = pricing(lines, profit);
  const tone = TONE_COLOR[marginTone(p.marginPct)];
  const matches = useMemo(() => {
    if (!search && !(searching && keyboard)) return [];
    const taken = new Set(rows.map((r) => r.ing.id));
    return filterIngredients(ingredients.data ?? [], search, "all").filter((i) => !taken.has(i.id)).slice(0, 6); // duplicates are rejected by the backend
  }, [ingredients.data, rows, search, searching, keyboard]);

  const addRow = (ing: Ingredient) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRows((r) => [...r, { ing, quantity: "1" }]);
    setSearch("");
    setError(null);
  };
  const setQty = (i: number, quantity: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, quantity } : x)));

  const choosePhoto = async () => {
    try { const a = await pickPhoto(); if (a) setPhoto(a); } catch (e) { Alert.alert("Foto", e instanceof Error ? e.message : "No se pudo elegir la foto."); }
  };

  const submit = async () => {
    const bad = validateRecipe({ name, profit: String(profit), lines: rows.map((r) => ({ ingredientId: r.ing.id, quantity: r.quantity })) });
    if (bad) { setStep(bad.step); setError(bad.message); return; }
    if (submitting.current) return; // two taps in one frame would both pass the `saving` state check
    submitting.current = true;
    setError(null);
    setSaving(true);
    let saved;
    try {
      saved = await save.mutateAsync({
        name: name.trim(), baseServings: servings, profitPercentage: profit,
        description: description.trim(), notes: notes.trim(), ...(id || category.trim() ? { category: category.trim() } : {}), // editing: "" clears it
        ingredients: rows.map((r) => ({ ingredientId: r.ing.id, quantity: parseQty(r.quantity) })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la receta.");
      setSaving(false);
      submitting.current = false;
      return;
    }
    // Saved: whatever happens next, leave the screen.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (photo) {
      try { await uploadRecipePhoto(saved.id, photo); await invalidateRecipes(qc); }
      catch (e) { Alert.alert("Receta guardada", `La foto no se pudo subir: ${e instanceof Error ? e.message : "error desconocido"}. Puedes intentarlo de nuevo desde la receta.`); }
    }
    if (id) router.back(); else router.replace(`/recipe/${saved.id}`);
  };

  const next = () => {
    const bad = step === 0 ? validateRecipe({ name, profit: String(profit), lines: [{ ingredientId: "x", quantity: "1" }] }) : step === 1 ? validateRecipe({ name, profit: String(profit), lines: rows.map((r) => ({ ingredientId: r.ing.id, quantity: r.quantity })) }) : null;
    if (bad) { setError(bad.message); return; }
    setError(null);
    setStep((s) => s + 1);
  };

  if (!filled && existing.error) {
    return (
      <View style={[styles.screen, { paddingTop: top + space.lg, padding: space.lg, gap: space.md, alignItems: "center", justifyContent: "center" }]}>
        <MaterialIcons name="cloud-off" size={40} color={colors.gray400} />
        <Text style={styles.h1}>{existing.error.message}</Text>
        <GradientButton label="Reintentar" onPress={() => void existing.refetch()} />
        <Press onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={{ padding: 8 }}><Text style={styles.saveLink}>VOLVER</Text></Press>
      </View>
    );
  }
  if (!filled) {
    return <View style={[styles.screen, { paddingTop: top + space.lg, padding: space.lg, gap: space.md }]}><Skeleton height={40} /><Skeleton height={56} /><Skeleton height={56} /><Skeleton height={140} rounded={radius.xxl} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: top + space.sm }]}>
        <View style={styles.titleRow}>
          <LinearGradient colors={gradient} style={styles.logo}><MaterialIcons name="restaurant" size={18} color="#fff" /></LinearGradient>
          <Text style={styles.title}>{id ? "Editar receta" : "Nueva receta"}</Text>
          <Press haptic onPress={() => void submit()} disabled={saving} accessibilityRole="button" accessibilityLabel="Guardar receta" style={{ padding: 8 }}>
            <Text style={styles.saveLink}>GUARDAR</Text>
          </Press>
          <Press onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ padding: 6 }}><MaterialIcons name="close" size={26} color={colors.text} /></Press>
        </View>
        <View style={styles.indicator}>
          {STEPS.map((label, i) => (
            <Press key={label} onPress={() => i <= step && setStep(i)} accessibilityRole="button" accessibilityState={{ selected: i === step }} style={styles.indicatorItem}>
              <AnimatedBar percent={i <= step ? 100 : 0} height={6} style={{ alignSelf: "stretch" }} />
              <Text style={[styles.indicatorLabel, i === step && { color: colors.primary }, i < step && { color: colors.text }]}>{label}</Text>
            </Press>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FadeInUp key={step}>
          {step === 0 ? (
            <View style={{ gap: space.lg }}>
              <View>
                <Text style={styles.h1}>Paso 1: Datos básicos</Text>
                <Text style={styles.sub}>Define las propiedades principales de tu receta.</Text>
              </View>
              <Field label="Nombre de la receta">
                <TextInput value={name} onChangeText={setName} placeholder="Ej. Arepa reina pepiada" placeholderTextColor={colors.gray400} style={styles.input} />
              </Field>
              <Field label="Categoría">
                <TextInput value={category} onChangeText={setCategory} placeholder="Escribe una nueva o elige una" placeholderTextColor={colors.gray400} style={styles.input} />
                {categories.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
                    {categories.map((c) => (
                      <Press key={c} onPress={() => setCategory(c)} accessibilityRole="button" accessibilityState={{ selected: category === c }} style={[styles.chip, category === c && styles.chipOn]}>
                        <Text style={[styles.chipText, category === c && { color: "#fff" }]}>{c}</Text>
                      </Press>
                    ))}
                  </ScrollView>
                ) : null}
              </Field>
              <Field label="Rendimiento (porciones)"><Stepper value={servings} onChange={setServings} min={1} label="porciones" /></Field>
              <View style={[styles.card, shadowCard]}>
                <View style={styles.marginHead}>
                  <Text style={styles.marginTitle}>Margen de ganancia objetivo</Text>
                  <Text style={styles.marginValue}>{profit}%</Text>
                </View>
                <Slider value={profit} max={Math.max(MAX_PROFIT, profit)} onChange={setProfit} />
                <View style={styles.sliderLabels}><Text style={styles.sliderLabel}>0% (sin ganancia)</Text><Text style={styles.sliderLabel}>100% (el doble)</Text><Text style={styles.sliderLabel}>200%</Text></View>
                <Stepper value={profit} onChange={setProfit} step={5} label="ganancia" suffix=" %" />
                <Text style={styles.hint}>Es el porcentaje sobre el costo. Con {profit}% ganas {formatPercent(profit / (100 + profit) * 100)} del precio de venta.</Text>
              </View>
              <Field label="Descripción (opcional)">
                <TextInput value={description} onChangeText={setDescription} placeholder="¿De qué trata esta receta?" placeholderTextColor={colors.gray400} multiline style={[styles.input, styles.multiline]} />
              </Field>
              <Field label="Notas (opcional)">
                <TextInput value={notes} onChangeText={setNotes} placeholder="Preparación, trucos, alérgenos..." placeholderTextColor={colors.gray400} multiline style={[styles.input, styles.multiline]} />
              </Field>
              <Field label="Foto (opcional)">
                <Press onPress={() => void choosePhoto()} accessibilityRole="button" accessibilityLabel="Elegir foto" style={styles.photo}>
                  {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    : id && existing.data?.imageUrl ? <RecipeImage name={name} category={category || null} imageUrl={existing.data.imageUrl} />
                    : <View style={styles.photoEmpty}><MaterialIcons name="add-a-photo" size={30} color={colors.primary} /><Text style={styles.photoText}>Tomar o elegir una foto</Text></View>}
                  {photo || existing.data?.imageUrl ? <View style={styles.photoBadge}><MaterialIcons name="edit" size={16} color="#fff" /><Text style={styles.photoBadgeText}>Cambiar</Text></View> : null}
                </Press>
              </Field>
            </View>
          ) : step === 1 ? (
            <View style={{ gap: space.md }}>
              <View>
                <Text style={styles.h1}>Paso 2: Ingredientes</Text>
                <Text style={styles.sub}>Cantidad en la unidad de cada ingrediente.</Text>
              </View>
              <View style={styles.search}>
                <MaterialIcons name="search" size={22} color={colors.gray400} />
                <TextInput value={search} onChangeText={setSearch} onFocus={() => setSearching(true)} onBlur={() => setSearching(false)} placeholder="Buscar ingredientes (ej. Harina)" placeholderTextColor={colors.gray400} style={styles.searchInput} />
                {search ? <Press onPress={() => setSearch("")} accessibilityLabel="Borrar búsqueda"><MaterialIcons name="close" size={20} color={colors.gray400} /></Press> : null}
              </View>
              {ingredients.isLoading ? <Skeleton height={56} rounded={radius.xl} /> : null}
              {matches.length ? (
                <View style={[styles.results, shadowCard]}>
                  {matches.map((i) => (
                    <Press key={i.id} onPress={() => addRow(i)} accessibilityRole="button" accessibilityLabel={`Agregar ${i.name}`} style={styles.result}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{i.name}</Text>
                        <Text style={styles.rowMeta}>{formatUsd(i.priceUsd)} / {i.unit}</Text>
                      </View>
                      <MaterialIcons name="add-circle" size={26} color={colors.primary} />
                    </Press>
                  ))}
                </View>
              ) : searching && search && !ingredients.isLoading ? <Text style={styles.hint}>No hay ingredientes disponibles con ese nombre.</Text> : null}
              <View style={styles.listHead}><Text style={styles.listHeadText}>Ingrediente</Text><Text style={styles.listHeadText}>Subtotal</Text></View>
              {rows.length === 0 ? (
                <View style={styles.emptyRows}><MaterialIcons name="egg-alt" size={32} color={colors.gray400} /><Text style={styles.hint}>Busca y agrega al menos un ingrediente.</Text></View>
              ) : rows.map((r, i) => {
                const cost = lineCost(toLine(r));
                return (
                  <FadeInUp key={r.ing.id} index={i}>
                    <View style={[styles.row, shadowCard]}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.rowName} numberOfLines={1}>{r.ing.name}</Text>
                        <Text style={styles.rowMeta}>{formatUsd(r.ing.priceUsd)} / {r.ing.unit}</Text>
                        <View style={styles.qtyRow}>
                          <TextInput value={r.quantity} onChangeText={(t) => setQty(i, t)} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={`Cantidad de ${r.ing.name}`} style={[styles.qty, parseQty(r.quantity) <= 0 && { borderColor: colors.danger }]} />
                          <Text style={styles.rowMeta}>{r.ing.unit}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <Press onPress={() => setRows((x) => x.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Quitar ${r.ing.name}`} style={{ padding: 4 }}><MaterialIcons name="delete-outline" size={22} color={colors.danger} /></Press>
                        <Text style={styles.rowCost}>{formatUsd(cost)}</Text>
                        <Text style={styles.rowMeta}>{bs(cost)}</Text>
                      </View>
                    </View>
                  </FadeInUp>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: space.lg }}>
              <View>
                <Text style={styles.h1}>Paso 3: Revisar</Text>
                <Text style={styles.sub}>Confirma el costo y el precio antes de guardar.</Text>
              </View>
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadowPrimary]}>
                <Text style={styles.heroLabel}>Precio de venta sugerido ({profit}%)</Text>
                <CountUp value={p.priceUsd} format={formatUsd} style={styles.heroValue} />
                <Text style={styles.heroBs}>{bs(p.priceUsd)}</Text>
              </LinearGradient>
              <View style={styles.kpis}>
                <View style={[styles.kpi, shadowCard]}><Text style={styles.kpiLabel}>Costo</Text><Text style={styles.kpiValue}>{formatUsd(p.costUsd)}</Text><Text style={styles.rowMeta}>{bs(p.costUsd)}</Text></View>
                <View style={[styles.kpi, shadowCard]}><Text style={styles.kpiLabel}>Ganancia</Text><Text style={[styles.kpiValue, { color: colors.success }]}>{formatUsd(p.profitUsd)}</Text><Text style={styles.rowMeta}>{bs(p.profitUsd)}</Text></View>
                <View style={[styles.kpi, shadowCard]}><Text style={styles.kpiLabel}>Margen</Text><Text style={[styles.kpiValue, { color: tone }]}>{formatPercent(p.marginPct)}</Text><Text style={styles.rowMeta}>del precio</Text></View>
              </View>
              <View style={[styles.card, shadowCard]}>
                <Text style={styles.marginTitle}>{name.trim() || "Sin nombre"}</Text>
                <Text style={styles.rowMeta}>{category.trim() || "Sin categoría"} · {servings} {servings === 1 ? "porción" : "porciones"}{photo ? " · con foto nueva" : ""}</Text>
                <View style={styles.divider} />
                {rows.map((r) => (
                  <View key={r.ing.id} style={styles.sumRow}>
                    <Text style={styles.sumName} numberOfLines={1}>{r.ing.name}</Text>
                    <Text style={styles.rowMeta}>{num(parseQty(r.quantity))} {r.ing.unit}</Text>
                    <Text style={styles.sumCost}>{formatUsd(lineCost(toLine(r)))}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </FadeInUp>
        {error ? <View style={styles.error}><MaterialIcons name="error-outline" size={20} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
      </ScrollView>

      {keyboard ? null : (
        <View style={styles.footer}>
          {step < 2 && rows.length ? (
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.total, shadowPrimary]}>
              <View><Text style={styles.totalLabel}>Costo total</Text><Text style={styles.totalValue}>{formatUsd(p.costUsd)}</Text><Text style={styles.totalBs}>{bs(p.costUsd)}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={styles.totalLabel}>Precio sugerido ({profit}%)</Text><Text style={styles.totalValue}>{formatUsd(p.priceUsd)}</Text><Text style={styles.totalBs}>{bs(p.priceUsd)}</Text></View>
            </LinearGradient>
          ) : null}
          <View style={styles.nav}>
            {step > 0 ? (
              <Press haptic onPress={() => { setError(null); setStep(step - 1); }} accessibilityRole="button" style={styles.back}>
                <MaterialIcons name="arrow-back" size={20} color={colors.primary} /><Text style={styles.backText}>Atrás</Text>
              </Press>
            ) : null}
            <View style={{ flex: 1 }}>
              {step < 2 ? (
                <Press haptic onPress={next} accessibilityRole="button" style={styles.next}>
                  <Text style={styles.nextText}>Siguiente</Text><MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </Press>
              ) : (
                <GradientButton label="Guardar receta" icon="check" loading={saving} onPress={() => void submit()} />
              )}
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  logo: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: font.bold, fontSize: 20, color: colors.text },
  saveLink: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1, color: colors.primary },
  indicator: { flexDirection: "row", gap: space.md },
  indicatorItem: { flex: 1, gap: 6, alignItems: "center" },
  indicatorLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.gray400 },
  content: { padding: space.lg, paddingBottom: 40, gap: space.lg },
  h1: { fontFamily: font.bold, fontSize: 26, letterSpacing: -0.5, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 2 },
  fieldLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  input: { minHeight: 52, paddingHorizontal: 16, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontFamily: font.regular, fontSize: 16, color: colors.text },
  multiline: { minHeight: 84, paddingTop: 14, textAlignVertical: "top" },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  stepValue: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  card: { padding: space.lg, gap: space.md, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  marginHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  marginTitle: { fontFamily: font.bold, fontSize: 15, color: colors.text, flexShrink: 1 },
  marginValue: { fontFamily: font.bold, fontSize: 34, color: colors.primary },
  sliderHit: { height: 36, justifyContent: "center" },
  sliderTrack: { height: 10, borderRadius: 5, backgroundColor: "#e6e2fb", overflow: "hidden" },
  thumb: { position: "absolute", width: 26, height: 26, borderRadius: 13, marginLeft: -13, backgroundColor: colors.primary, borderWidth: 3, borderColor: "#fff", ...shadowPrimary },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.3, textTransform: "uppercase", color: colors.muted },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  photo: { height: 160, borderRadius: radius.xxl, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoEmpty: { alignItems: "center", gap: 6 },
  photoText: { fontFamily: font.semibold, fontSize: 14, color: colors.primary },
  photoBadge: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: "rgba(20,16,34,0.7)" },
  photoBadgeText: { fontFamily: font.semibold, fontSize: 12, color: "#fff" },
  search: { flexDirection: "row", alignItems: "center", gap: space.sm, height: 52, paddingHorizontal: space.lg, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.text, padding: 0 },
  results: { borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  result: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  listHead: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  listHeadText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.muted },
  emptyRows: { alignItems: "center", gap: 6, paddingVertical: 28 },
  row: { flexDirection: "row", gap: space.md, padding: space.md, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowName: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  rowMeta: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  rowCost: { fontFamily: font.bold, fontSize: 17, color: colors.text },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qty: { width: 84, height: 40, paddingHorizontal: 10, borderRadius: radius.xl, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200, fontFamily: font.semibold, fontSize: 16, color: colors.text, paddingVertical: 0, textAlignVertical: "center" },
  hero: { padding: space.xl, borderRadius: 24, gap: 2 },
  heroLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" },
  heroValue: { fontFamily: font.bold, fontSize: 44, letterSpacing: -1, color: "#fff" },
  heroBs: { fontFamily: font.medium, fontSize: 16, color: "rgba(255,255,255,0.85)" },
  kpis: { flexDirection: "row", gap: space.md },
  kpi: { flex: 1, padding: space.md, gap: 2, borderRadius: radius.xxl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  kpiLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.muted },
  kpiValue: { fontFamily: font.bold, fontSize: 18, color: colors.text },
  divider: { height: 1, backgroundColor: colors.gray100 },
  sumRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  sumName: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.text },
  sumCost: { width: 70, textAlign: "right", fontFamily: font.bold, fontSize: 14, color: colors.text },
  error: { flexDirection: "row", alignItems: "center", gap: 8, padding: space.md, borderRadius: radius.xl, backgroundColor: "#fdecea", marginTop: space.lg },
  errorText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.danger },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: space.lg, paddingBottom: space.lg, gap: space.md },
  total: { flexDirection: "row", justifyContent: "space-between", padding: space.lg, borderRadius: radius.xxl },
  totalLabel: { fontFamily: font.bold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" },
  totalValue: { fontFamily: font.bold, fontSize: 26, color: "#fff" },
  totalBs: { fontFamily: font.medium, fontSize: 12, color: "rgba(255,255,255,0.8)" },
  nav: { flexDirection: "row", gap: space.md },
  back: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, height: 56, borderRadius: radius.xxl, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  backText: { fontFamily: font.bold, fontSize: 16, color: colors.primary },
  next: { height: 56, borderRadius: radius.xxl, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.text },
  nextText: { fontFamily: font.bold, fontSize: 17, color: "#fff" },
});

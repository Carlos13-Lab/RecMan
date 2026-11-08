import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError } from "../../shared/http";
import { formatBs, toNumber } from "../../shared/money";
import { BottomSheet } from "../../ui/BottomSheet";
import { GradientButton } from "../../ui/GradientButton";
import { Press } from "../../ui/Press";
import { colors, font, radius, space } from "../../ui/tokens";
import { useTodayMetrics } from "../home/queries";
import { parseDecimal, validateIngredient, type FormErrors, type FormValues, type Ingredient } from "./inventory";
import { useDeleteIngredient, useSaveIngredient } from "./queries";

const UNITS = ["kg", "g", "L", "ml", "unidad"];
const OTHER = "__other__";
const NEW = "__new__";
const EMPTY: FormValues = { name: "", unit: "kg", priceUsd: "", currentStock: "0", minStock: "0" };

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: "#fff" }]}>{label}</Text>
    </Press>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function StockStepper({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (v: string) => void }) {
  const step = (d: number) => {
    void Haptics.selectionAsync();
    const n = parseDecimal(value);
    onChange(String(Math.max((Number.isNaN(n) ? 0 : n) + d, 0)));
  };
  return (
    <View style={{ flex: 1 }}>
      <Field label={label} error={error}>
        <View style={[styles.input, styles.stepRow, !!error && styles.inputError]}>
          <Press onPress={() => step(-1)} accessibilityLabel={`Disminuir ${label}`} style={styles.stepBtn}><MaterialIcons name="remove" size={20} color={colors.text} /></Press>
          <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.stepInput} accessibilityLabel={label} />
          <Press onPress={() => step(1)} accessibilityLabel={`Aumentar ${label}`} style={styles.stepBtn}><MaterialIcons name="add" size={20} color={colors.primary} /></Press>
        </View>
      </Field>
    </View>
  );
}

type Props = { visible: boolean; ingredient: Ingredient | null; categories: string[]; onClose: () => void };

export function IngredientSheet({ visible, ingredient, categories, onClose }: Props) {
  const rate = useTodayMetrics().data?.exchangeRate ?? 0;
  const save = useSaveIngredient(ingredient?.id ?? null);
  const del = useDeleteIngredient(ingredient?.id ?? null);
  const [v, setV] = useState<FormValues>(EMPTY);
  const [unitOther, setUnitOther] = useState(false);
  const [category, setCategory] = useState<string>(""); // "" = none, NEW = typing a new one
  const [newCategory, setNewCategory] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setV(ingredient ? { name: ingredient.name, unit: ingredient.unit, priceUsd: String(toNumber(ingredient.priceUsd)), currentStock: String(toNumber(ingredient.currentStock)), minStock: String(toNumber(ingredient.minStock)) } : EMPTY);
    setUnitOther(!!ingredient && !UNITS.includes(ingredient.unit));
    setCategory(ingredient?.category ?? "");
    setNewCategory("");
    setErrors({}); setConfirmDelete(false); save.reset(); del.reset();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on open only

  const set = (k: keyof FormValues) => (t: string) => setV((p) => ({ ...p, [k]: t }));
  const price = parseDecimal(v.priceUsd);
  const finalCategory = category === NEW ? newCategory.trim() : category;

  const done = () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); };
  const onSave = () => {
    const e = validateIngredient(v);
    setErrors(e);
    if (Object.keys(e).length) return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    save.mutate(
      { name: v.name.trim(), unit: v.unit.trim(), priceUsd: price, currentStock: parseDecimal(v.currentStock), minStock: parseDecimal(v.minStock), ...(finalCategory ? { category: finalCategory } : {}) },
      { onSuccess: done },
    );
  };
  const onDelete = () => del.mutate(undefined, { onSuccess: done });
  const deleteError = del.error instanceof ApiError && del.error.status === 400 ? "No puedes eliminarlo: lo usa al menos una receta." : del.error?.message;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Press onPress={onClose} accessibilityLabel="Cerrar" style={styles.close}><MaterialIcons name="close" size={24} color={colors.text} /></Press>
        <Text style={styles.title}>{ingredient ? "Editar ingrediente" : "Nuevo ingrediente"}</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space.lg, paddingBottom: space.lg }}>
        <Text style={styles.section}>Datos básicos</Text>
        <Field label="Nombre del ingrediente" error={errors.name}>
          <TextInput value={v.name} onChangeText={set("name")} placeholder="Ej. Vainilla de Madagascar" placeholderTextColor={colors.gray400} style={[styles.input, styles.text, !!errors.name && styles.inputError]} />
        </Field>

        <Field label="Unidad" error={errors.unit}>
          <View style={styles.chips}>
            {UNITS.map((u) => <Chip key={u} label={u} on={!unitOther && v.unit === u} onPress={() => { setUnitOther(false); set("unit")(u); }} />)}
            <Chip label="Otra" on={unitOther} onPress={() => { setUnitOther(true); set("unit")(UNITS.includes(v.unit) ? "" : v.unit); }} />
          </View>
          {unitOther ? <TextInput value={v.unit} onChangeText={set("unit")} placeholder="Ej. lata, paquete" placeholderTextColor={colors.gray400} style={[styles.input, styles.text, !!errors.unit && styles.inputError]} /> : null}
        </Field>

        <Field label="Categoría">
          <View style={styles.chips}>
            <Chip label="Sin categoría" on={category === ""} onPress={() => setCategory("")} />
            {categories.map((c) => <Chip key={c} label={c} on={category === c} onPress={() => setCategory(c)} />)}
            <Chip label="+ Nueva" on={category === NEW} onPress={() => setCategory(NEW)} />
          </View>
          {category === NEW ? <TextInput value={newCategory} onChangeText={setNewCategory} placeholder="Nombre de la categoría" placeholderTextColor={colors.gray400} style={[styles.input, styles.text]} /> : null}
        </Field>

        <Field label="Precio de compra (USD)" error={errors.priceUsd}>
          <View style={[styles.input, styles.priceRow, !!errors.priceUsd && styles.inputError]}>
            <Text style={styles.dollar}>$</Text>
            <TextInput value={v.priceUsd} onChangeText={set("priceUsd")} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.gray400} style={[styles.text, { flex: 1 }]} accessibilityLabel="Precio en USD" />
          </View>
          <View style={styles.bsBox}>
            <Text style={styles.bsLabel}>Equivalente en Bs.</Text>
            <Text style={styles.bsValue}>{price > 0 && rate ? formatBs(price * rate) : "—"}</Text>
          </View>
          {rate ? <Text style={styles.ref}>Tasa de hoy: 1 USD = {formatBs(rate)}</Text> : null}
        </Field>

        <Text style={styles.section}>Inventario y estado</Text>
        <View style={{ flexDirection: "row", gap: space.md }}>
          <StockStepper label="Stock actual" value={v.currentStock} error={errors.currentStock} onChange={set("currentStock")} />
          <StockStepper label="Stock mínimo" value={v.minStock} error={errors.minStock} onChange={set("minStock")} />
        </View>

        {ingredient && !confirmDelete ? (
          <Press onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={styles.deleteLink}>
            <MaterialIcons name="delete-outline" size={20} color={colors.danger} /><Text style={styles.deleteText}>Eliminar ingrediente</Text>
          </Press>
        ) : null}
        {confirmDelete ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmTitle}>¿Eliminar "{ingredient?.name}"?</Text>
            <Text style={styles.confirmBody}>Esta acción no se puede deshacer y el ingrediente es compartido por todos los usuarios.</Text>
            {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
            <View style={{ flexDirection: "row", gap: space.md }}>
              <Press onPress={() => { setConfirmDelete(false); del.reset(); }} style={[styles.confirmBtn, { backgroundColor: colors.surface }]}><Text style={styles.discardText}>Cancelar</Text></Press>
              <Press haptic onPress={del.isPending ? undefined : onDelete} accessibilityRole="button" style={[styles.confirmBtn, { backgroundColor: colors.danger }]}><Text style={[styles.discardText, { color: "#fff" }]}>{del.isPending ? "Eliminando…" : "Sí, eliminar"}</Text></Press>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {save.error ? <Text style={[styles.error, { textAlign: "center", marginBottom: space.sm }]}>{save.error.message}</Text> : null}
      <View style={styles.actions}>
        <Press onPress={onClose} accessibilityRole="button" style={styles.discard}><Text style={styles.discardText}>Descartar</Text></Press>
        <View style={{ flex: 1.4 }}><GradientButton label="Guardar" icon="save" loading={save.isPending} onPress={onSave} /></View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  close: { padding: space.sm },
  title: { fontFamily: font.bold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
  section: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: colors.muted },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  input: { minHeight: 52, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg },
  inputError: { borderColor: colors.danger },
  text: { fontFamily: font.regular, fontSize: 16, color: colors.text },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  priceRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dollar: { fontFamily: font.medium, fontSize: 18, color: colors.muted },
  bsBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.primary + "1A" },
  bsLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.primary },
  bsValue: { fontFamily: font.bold, fontSize: 20, color: colors.primary },
  ref: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  stepRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stepInput: { flex: 1, textAlign: "center", fontFamily: font.bold, fontSize: 18, color: colors.text, padding: 0 },
  deleteLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: space.md },
  deleteText: { fontFamily: font.semibold, fontSize: 15, color: colors.danger },
  confirm: { gap: space.sm, padding: space.lg, borderRadius: radius.xxl, backgroundColor: "#fdecea", borderWidth: 1, borderColor: "#f8c9c0" },
  confirmTitle: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  confirmBody: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  confirmBtn: { flex: 1, height: 46, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", alignItems: "center", gap: space.md },
  discard: { flex: 1, height: 56, alignItems: "center", justifyContent: "center" },
  discardText: { fontFamily: font.bold, fontSize: 16, color: colors.text },
});

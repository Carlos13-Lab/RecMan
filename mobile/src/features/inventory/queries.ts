import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toNumber } from "../../shared/money";
import { request } from "../session/session";
import type { Ingredient, IngredientBody } from "./inventory";

const KEY = ["ingredients"];
export const useIngredients = () => useQuery({ queryKey: KEY, queryFn: () => request<Ingredient[]>("/api/ingredients") });

// Recipe costs derive from ingredient prices, so recipes refresh too.
const useRefreshAfterWrite = () => {
  const qc = useQueryClient();
  return () => Promise.all([KEY, ["recipes"], ["metrics"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
};

export function useSaveIngredient(id: string | null) {
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationFn: (body: IngredientBody) => request<Ingredient>(id ? `/api/ingredients/${id}` : "/api/ingredients", { method: id ? "PUT" : "POST", body }),
    onSuccess: refresh,
  });
}

export function useDeleteIngredient(id: string | null) {
  const refresh = useRefreshAfterWrite();
  return useMutation({ mutationFn: () => request(`/api/ingredients/${id}`, { method: "DELETE" }), onSuccess: refresh });
}

export const toBody = (i: Ingredient, currentStock: number): IngredientBody => ({
  name: i.name, unit: i.unit, priceUsd: toNumber(i.priceUsd), currentStock, minStock: toNumber(i.minStock), ...(i.category ? { category: i.category } : {}),
});

// Quick +/- on a card: optimistic cache update, rollback if the PUT fails.
export function useAdjustStock() {
  const qc = useQueryClient();
  const refresh = useRefreshAfterWrite();
  return useMutation({
    mutationKey: ["adjust-stock"],
    scope: { id: "adjust-stock" }, // run taps one after another so the server never ends on a stale PUT
    mutationFn: ({ ingredient, next }: { ingredient: Ingredient; next: number }) =>
      request(`/api/ingredients/${ingredient.id}`, { method: "PUT", body: toBody(ingredient, next) }),
    onMutate: async ({ ingredient, next }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Ingredient[]>(KEY);
      qc.setQueryData<Ingredient[]>(KEY, (l) => l?.map((i) => (i.id === ingredient.id ? { ...i, currentStock: String(next) } : i)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(KEY, ctx.prev),
    onSettled: () => { if (qc.isMutating({ mutationKey: ["adjust-stock"] }) <= 1) void refresh(); },
  });
}

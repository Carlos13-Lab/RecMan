import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Recipe } from "../../shared/types";
import { invalidateSales } from "../home/queries";
import { request } from "../session/session";

export type RecipeBody = {
  name: string;
  description?: string;
  notes?: string;
  category?: string;
  baseServings: number;
  profitPercentage: number;
  ingredients: { ingredientId: string; quantity: number }[];
};

export const useRecipe = (id: string) => useQuery({ queryKey: ["recipes", id], enabled: !!id, queryFn: () => request<Recipe>(`/api/recipes/${id}`) });

// Recipes feed Home, Quick Sale and the calendar (sales embed the recipe), so refresh all of them.
// `exceptId` skips that recipe's detail query (deleted: refetching it would 404).
export const invalidateRecipes = (qc: QueryClient, exceptId?: string) =>
  Promise.all([qc.invalidateQueries({ queryKey: ["recipes"], predicate: (q) => !exceptId || q.queryKey[1] !== exceptId }), invalidateSales(qc)]);

export function useSaveRecipe(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecipeBody) => request<Recipe>(id ? `/api/recipes/${id}` : "/api/recipes", { method: id ? "PUT" : "POST", body }),
    onSuccess: () => invalidateRecipes(qc),
  });
}

export function useDeleteRecipe(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request(`/api/recipes/${id}`, { method: "DELETE" }),
    // The detail screen removes the cached recipe itself, after navigating back (a refetch of a deleted recipe would 404).
    onSuccess: () => invalidateRecipes(qc, id),
  });
}

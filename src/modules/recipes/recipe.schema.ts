import { z } from "zod";

export const recipeIngredientInputSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().positive()
});

export const createRecipeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  profitPercentage: z.number().min(0),
  category: z.string().optional(),
  baseServings: z.number().int().min(1).default(1),
  notes: z.string().optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1)
});

export const updateRecipeSchema = createRecipeSchema.partial();

export type CreateRecipeDto = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeDto = z.infer<typeof updateRecipeSchema>;


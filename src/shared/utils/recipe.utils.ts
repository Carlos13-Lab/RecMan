import { safeParseFloat } from "./number.utils";

export interface RecipeIngredientPricing {
  priceUsd: string;
  quantity: string;
}

export interface RecipePricingResult {
  costUsd: number;
  priceUsd: number;
}

/**
 * Calculates the cost and price of a recipe based on ingredients and profit percentage
 */
export function calculateRecipePricing(
  ingredients: RecipeIngredientPricing[],
  profitPercentage: string
): RecipePricingResult {
  const costUsd = ingredients.reduce((sum, ri) => {
    const ingredientPrice = safeParseFloat(ri.priceUsd);
    const quantity = safeParseFloat(ri.quantity);
    return sum + ingredientPrice * quantity;
  }, 0);

  const profitPercent = safeParseFloat(profitPercentage);
  const priceUsd = costUsd * (1 + profitPercent / 100);

  return { costUsd, priceUsd };
}

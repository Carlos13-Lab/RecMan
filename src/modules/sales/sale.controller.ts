import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Sale } from "./sale.entity";
import { Recipe } from "../recipes/recipe.entity";
import { CreateSaleDto } from "./sale.schema";
import { AppError } from "../../shared/errors/AppError";
import { RecipeIngredient } from "../recipes/recipe-ingredient.entity";
import { ExchangeRateService } from "../../shared/services/exchangeRate.service";
import { safeParseFloat } from "../../shared/utils/number.utils";
import { calculateRecipePricing } from "../../shared/utils/recipe.utils";

const saleRepository = AppDataSource.getRepository(Sale);
const recipeRepository = AppDataSource.getRepository(Recipe);
const recipeIngredientRepository =
  AppDataSource.getRepository(RecipeIngredient);

export class SaleController {
  static async list(req: Request, res: Response) {
    const userId = req.userId as string;
    const sales = await saleRepository.find({
      where: { userId },
      order: { date: "DESC" }
    });
    return res.json(sales);
  }

  static async create(req: Request, res: Response) {
    const userId = req.userId as string;
    const body =
      (req.validated?.body as CreateSaleDto | undefined) ??
      (req.body as CreateSaleDto);

    const recipe = await recipeRepository.findOne({
      where: { id: body.recipeId, userId }
    });

    if (!recipe) {
      throw new AppError("Recipe not found for this user", 400);
    }

    // Get recipe ingredients with prices
    const recipeIngredients = await recipeIngredientRepository.find({
      where: { recipeId: recipe.id },
      relations: ["ingredient"]
    });

    if (recipeIngredients.length === 0) {
      throw new AppError("Recipe has no ingredients", 400);
    }

    // Calculate cost and price using helper function
    const pricing = calculateRecipePricing(
      recipeIngredients.map(ri => ({
        priceUsd: ri.ingredient.priceUsd,
        quantity: ri.quantity
      })),
      recipe.profitPercentage
    );

    // Calculate totals based on quantity sold
    const totalUsdNumber = pricing.priceUsd * body.quantity;

    // Convert to Bs using exchange rate
    const totalBsNumber =
      await ExchangeRateService.convertUsdToBs(totalUsdNumber);

    const sale = saleRepository.create({
      recipeId: recipe.id,
      userId,
      quantity: body.quantity,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      totalUsd: totalUsdNumber.toFixed(2),
      totalBs: totalBsNumber.toFixed(2)
    });

    await saleRepository.save(sale);

    return res.status(201).json(sale);
  }
}


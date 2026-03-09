import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Sale } from "../sales/sale.entity";
import { Recipe } from "../recipes/recipe.entity";
import { ExchangeRateService } from "../../shared/services/exchangeRate.service";
import { safeParseFloat } from "../../shared/utils/number.utils";

const saleRepository = AppDataSource.getRepository(Sale);

export class DashboardController {
  static async metrics(req: Request, res: Response) {
    const userId = req.userId as string;

    // Fecha opcional en query: ?date=YYYY-MM-DD, por defecto hoy
    const dateParam = (req.query.date as string | undefined) ??
      new Date().toISOString().slice(0, 10);

    // Obtenemos las ventas del usuario para la fecha indicada, incluyendo la receta
    const sales = await saleRepository.find({
      where: { userId, date: dateParam },
      relations: ["recipe"]
    });

    let totalRevenueUsd = 0;
    let totalCostUsd = 0;

    for (const sale of sales) {
      const revenueUsd = safeParseFloat(sale.totalUsd);
      totalRevenueUsd += revenueUsd;

      // If recipe is not loaded, skip cost calculation
      if (!sale.recipe) continue;

      const profitPercentage = safeParseFloat(sale.recipe.profitPercentage);

      // cost = revenue / (1 + p/100)
      const costUsd = revenueUsd / (1 + profitPercentage / 100);
      totalCostUsd += costUsd;
    }

    const totalProfitUsd = totalRevenueUsd - totalCostUsd;

    // Convertimos a Bs usando la tasa oficial actual
    const rate = await ExchangeRateService.getExchangeRate();
    const totalRevenueBs = totalRevenueUsd * rate;
    const totalCostBs = totalCostUsd * rate;
    const totalProfitBs = totalProfitUsd * rate;

    const expensePercentage =
      totalRevenueUsd > 0 ? (totalCostUsd / totalRevenueUsd) * 100 : 0;
    const profitPercentage =
      totalRevenueUsd > 0 ? (totalProfitUsd / totalRevenueUsd) * 100 : 0;

    return res.json({
      date: dateParam,
      salesCount: sales.length,
      totalRevenue: {
        usd: totalRevenueUsd,
        bs: totalRevenueBs
      },
      totalCost: {
        usd: totalCostUsd,
        bs: totalCostBs
      },
      totalProfit: {
        usd: totalProfitUsd,
        bs: totalProfitBs
      },
      percentages: {
        expenses: expensePercentage,
        profit: profitPercentage
      },
      exchangeRate: rate
    });
  }
}


import { Request, Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { Sale } from "../sales/sale.entity";

const saleRepository = AppDataSource.getRepository(Sale);

export class CalendarController {
  static async getDay(req: Request, res: Response) {
    const userId = req.userId as string;
    const { date } = req.params; // YYYY-MM-DD

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "Invalid date format. Expected YYYY-MM-DD"
      });
    }

    const sales = await saleRepository.find({
      where: { userId, date },
      relations: ["recipe"]
    });

    return res.json({
      date,
      sales
    });
  }

  static async getRange(req: Request, res: Response) {
    const userId = req.userId as string;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "`from` and `to` query params are required" });
    }

    // Validate date formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({
        message: "Invalid date format. Expected YYYY-MM-DD"
      });
    }

    const sales = await saleRepository
      .createQueryBuilder("sale")
      .leftJoinAndSelect("sale.recipe", "recipe")
      .where("sale.user_id = :userId", { userId })
      .andWhere("sale.date BETWEEN :from AND :to", { from, to })
      .orderBy("sale.date", "ASC")
      .addOrderBy("sale.created_at", "ASC")
      .getMany();

    return res.json({
      from,
      to,
      sales
    });
  }
}


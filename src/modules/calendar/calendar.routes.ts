import { Router } from "express";
import { CalendarController } from "./calendar.controller";
import { authMiddleware } from "../auth/auth.middleware";
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

const router = Router();

router.use(authMiddleware);

// Middleware to validate date format
function validateDateParam(req: Request, res: Response, next: NextFunction) {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      message: "Invalid date format. Expected YYYY-MM-DD"
    });
  }
  next();
}

// Ventas del día
router.get("/day/:date", validateDateParam, CalendarController.getDay);

// Ventas en rango de fechas ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/range", CalendarController.getRange);

export default router;


import express from "express";
// Express 4 ignores rejected promises from async handlers; without this, a thrown AppError crashes the process.
import "express-async-errors";
import cors from "cors";
import { json } from "body-parser";
import { errorHandler } from "./shared/errors/error-handler";
import { loggerMiddleware } from "./shared/middlewares/logger.middleware";
import authRoutes from "./modules/auth/auth.routes";
import ingredientRoutes from "./modules/ingredients/ingredient.routes";
import recipeRoutes from "./modules/recipes/recipe.routes";
import saleRoutes from "./modules/sales/sale.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import calendarRoutes from "./modules/calendar/calendar.routes";
import notificationRoutes from "./modules/notifications/notification.routes";

const app = express();

app.use(cors());
app.use(json());

// Logger middleware - debe ir después de json() para tener acceso al body
app.use(loggerMiddleware);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "RecMan API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

export { app };


import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/metrics", DashboardController.metrics);

export default router;


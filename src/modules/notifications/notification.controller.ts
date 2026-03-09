import { Request, Response } from "express";
import { NotificationService } from "./notification.service";
import { AppDataSource } from "../../config/data-source";
import { Notification } from "./notification.entity";
import { z } from "zod";

const registerTokenSchema = z.object({
  fcmToken: z.string().min(1),
});

export class NotificationController {
  /**
   * POST /api/notifications/register-token
   * Registra o actualiza el token FCM de un usuario
   */
  static async registerToken(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const body = registerTokenSchema.parse(req.body);
      await NotificationService.registerToken(userId, body.fcmToken);
      return res.json({ message: "Token registered successfully" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request", errors: error.errors });
      }
      console.error("Error registering token:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * GET /api/notifications
   * Obtiene las notificaciones del usuario autenticado
   */
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await NotificationService.getUserNotifications(userId, limit);
      return res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Marca una notificación como leída
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      await NotificationService.markAsRead(id, userId);
      return res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Marca todas las notificaciones como leídas
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await NotificationService.markAllAsRead(userId);
      return res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * POST /api/notifications/check-low-stock
   * Endpoint manual para verificar stock bajo (también se puede ejecutar con cron)
   */
  static async checkLowStock(req: Request, res: Response) {
    try {
      await NotificationService.checkLowStockIngredients();
      return res.json({ message: "Low stock check completed" });
    } catch (error) {
      console.error("Error checking low stock:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * POST /api/notifications/check-deliveries
   * Endpoint manual para verificar entregas del día (también se puede ejecutar con cron)
   */
  static async checkDeliveries(req: Request, res: Response) {
    try {
      await NotificationService.checkDeliveryDates();
      return res.json({ message: "Delivery check completed" });
    } catch (error) {
      console.error("Error checking deliveries:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

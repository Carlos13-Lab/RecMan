import { AppDataSource } from "../../config/data-source";
import { Notification } from "./notification.entity";
import { User } from "../auth/user.entity";
import { Ingredient } from "../ingredients/ingredient.entity";
import { Sale } from "../sales/sale.entity";
import * as admin from "firebase-admin";

export class NotificationService {
  private static firebaseApp: admin.app.App | null = null;

  static initialize() {
    // Inicializar Firebase Admin si hay credenciales
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Intentar leer desde archivo primero (más seguro)
      const serviceAccountPath = path.join(
        __dirname,
        '../../config/firebase-service-account.json'
      );
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf8')
        );
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin initialized from file");
        return;
      }
      
      // Si no hay archivo, intentar desde variable de entorno
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ Firebase Admin initialized from env");
      }
    } catch (error: any) {
      console.warn("⚠️ Firebase Admin not initialized:", error.message);
      console.warn("💡 Tip: Create RecMan/src/config/firebase-service-account.json with your Firebase service account JSON");
    }
  }

  /**
   * Envía una notificación push a un usuario
   */
  static async sendToUser(
    userId: string,
    title: string,
    body: string,
    type?: string,
    data?: Record<string, any>
  ): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    const notificationRepository = AppDataSource.getRepository(Notification);

    // Obtener usuario con token FCM
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user || !user.fcmToken) {
      console.log(`User ${userId} has no FCM token`);
      return;
    }

    // Guardar notificación en BD
    const notification = notificationRepository.create({
      userId,
      title,
      body,
      type: type || null,
      data: data || null,
      read: false,
    });
    await notificationRepository.save(notification);

    // Enviar push notification si Firebase está configurado
    if (this.firebaseApp) {
      try {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: { title, body },
          data: data
            ? Object.entries(data).reduce(
                (acc, [key, value]) => {
                  acc[key] = String(value);
                  return acc;
                },
                {} as Record<string, string>
              )
            : undefined,
        });
        console.log(`✅ Notification sent to user ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error sending notification:`, error.message);
        // Si el token es inválido, limpiarlo
        if (error.code === "messaging/invalid-registration-token") {
          await userRepository.update({ id: userId }, { fcmToken: null });
        }
      }
    } else {
      console.log("⚠️ Firebase not configured, notification saved but not sent");
    }
  }

  /**
   * Registra o actualiza el token FCM de un usuario
   */
  static async registerToken(userId: string, fcmToken: string): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.update({ id: userId }, { fcmToken });
    console.log(`✅ FCM token registered for user ${userId}`);
  }

  /**
   * Obtiene las notificaciones de un usuario
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    const notificationRepository = AppDataSource.getRepository(Notification);
    return await notificationRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Marca una notificación como leída
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notificationRepository = AppDataSource.getRepository(Notification);
    await notificationRepository.update(
      { id: notificationId, userId },
      { read: true }
    );
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const notificationRepository = AppDataSource.getRepository(Notification);
    await notificationRepository.update(
      { userId, read: false },
      { read: true }
    );
  }

  /**
   * Detecta ingredientes con stock bajo y envía notificaciones
   */
  static async checkLowStockIngredients(): Promise<void> {
    const ingredientRepository = AppDataSource.getRepository(Ingredient);
    const userRepository = AppDataSource.getRepository(User);

    // Obtener todos los ingredientes con stock bajo
    const ingredients = await ingredientRepository
      .createQueryBuilder("ingredient")
      .where("CAST(ingredient.current_stock AS DECIMAL) <= CAST(ingredient.min_stock AS DECIMAL)")
      .andWhere("CAST(ingredient.current_stock AS DECIMAL) > 0")
      .getMany();

    if (ingredients.length === 0) {
      return;
    }

    // Obtener todos los usuarios activos con token FCM
    const users = await userRepository
      .createQueryBuilder("user")
      .where("user.fcm_token IS NOT NULL")
      .getMany();

    if (users.length === 0) {
      return;
    }

    // Enviar notificación a cada usuario
    for (const user of users) {
      for (const ingredient of ingredients) {
        await this.sendToUser(
          user.id,
          "⚠️ Stock Bajo",
          `${ingredient.name} está por debajo del mínimo (${ingredient.currentStock} ${ingredient.unit})`,
          "low_stock",
          {
            screen: "ingredients",
            ingredientId: ingredient.id,
            type: "low_stock",
          }
        );
      }
    }
  }

  /**
   * Detecta entregas programadas para hoy y envía notificaciones
   */
  static async checkDeliveryDates(): Promise<void> {
    const saleRepository = AppDataSource.getRepository(Sale);
    const userRepository = AppDataSource.getRepository(User);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Obtener ventas de hoy (consideradas como entregas)
    const todaySales = await saleRepository.find({
      where: { date: today },
      relations: ["user", "recipe"],
    });

    if (todaySales.length === 0) {
      return;
    }

    // Agrupar por usuario
    const salesByUser = new Map<string, Sale[]>();
    for (const sale of todaySales) {
      if (!salesByUser.has(sale.userId)) {
        salesByUser.set(sale.userId, []);
      }
      salesByUser.get(sale.userId)!.push(sale);
    }

    // Enviar notificación a cada usuario con entregas
    for (const [userId, sales] of salesByUser.entries()) {
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user || !user.fcmToken) {
        continue;
      }

      const totalSales = sales.length;
      const totalAmount = sales.reduce(
        (sum, sale) => sum + parseFloat(sale.totalUsd),
        0
      );

      await this.sendToUser(
        userId,
        "📦 Entregas de Hoy",
        `Tienes ${totalSales} ${totalSales === 1 ? "entrega" : "entregas"} programada${totalSales === 1 ? "" : "s"} por un total de $${totalAmount.toFixed(2)}`,
        "delivery_date",
        {
          screen: "sales",
          date: today,
          type: "delivery_date",
        }
      );
    }
  }
}

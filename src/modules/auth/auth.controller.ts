import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { VerifyAuthDto } from "./auth.schema";

export class AuthController {
  // GET - Verificar si el usuario existe
  static async verify(req: Request, res: Response) {
    try {
      const uuid = req.params.uuid;
      
      if (!uuid) {
        return res.status(400).json({ message: "Missing UUID parameter" });
      }

      const result = await AuthService.verifyUser(uuid);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in verify:", error);
      return res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  }

  // POST - Registrar nuevo usuario
  static async register(req: Request, res: Response) {
    const body = req.validated?.body as VerifyAuthDto | undefined;
    const payload = body ?? (req.body as VerifyAuthDto);

    const token = await AuthService.registerUser(payload);
    return res.status(201).json({
      token
    });
  }

  // POST - Login para usuario existente
  static async login(req: Request, res: Response) {
    const uuid = req.params.uuid;
    
    if (!uuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      return res.status(400).json({ message: "Invalid UUID format" });
    }

    const token = await AuthService.loginUser(uuid);
    return res.status(200).json({
      token
    });
  }
}


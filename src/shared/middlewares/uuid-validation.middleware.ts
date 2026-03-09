import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const uuidSchema = z.string().uuid();

/**
 * Middleware to validate UUID format in route parameters
 * @param paramName - Name of the parameter to validate (default: "id")
 */
export function validateUuidParam(paramName: string = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        message: `Missing ${paramName} parameter`
      });
    }

    const result = uuidSchema.safeParse(id);

    if (!result.success) {
      return res.status(400).json({
        message: `Invalid ${paramName} format (must be UUID)`
      });
    }

    next();
  };
}

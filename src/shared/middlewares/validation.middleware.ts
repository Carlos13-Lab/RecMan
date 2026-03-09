import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../errors/AppError";

type Location = "body" | "params" | "query";

export function validate(schema: ZodSchema, location: Location = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = req[location];
    const result = schema.safeParse(data);

    if (!result.success) {
      const formatted = result.error.format();
      throw new AppError("Validation error", 400, formatted);
    }

    // attach parsed data for type-safety in controllers if needed
    (req as any).validated = {
      ...(req as any).validated,
      [location]: result.data
    };

    next();
  };
}


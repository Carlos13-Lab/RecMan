import { NextFunction, Request, Response } from "express";
import { QueryFailedError } from "typeorm";
import { AppError } from "./AppError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details ?? null
    });
  }

  // Handle TypeORM database errors
  if (err instanceof QueryFailedError) {
    // Unique constraint violation
    if ((err as any).code === "23505") {
      return res.status(409).json({
        message: "Resource already exists",
        details: { constraint: (err as any).constraint }
      });
    }

    // Foreign key constraint violation
    if ((err as any).code === "23503") {
      return res.status(400).json({
        message: "Referenced resource does not exist",
        details: { constraint: (err as any).constraint }
      });
    }

    // Not null constraint violation
    if ((err as any).code === "23502") {
      return res.status(400).json({
        message: "Required field is missing",
        details: { column: (err as any).column }
      });
    }

    // Invalid input syntax
    if ((err as any).code === "22P02") {
      return res.status(400).json({
        message: "Invalid input format"
      });
    }
  }

  console.error("Unhandled error:", err);

  return res.status(500).json({
    message: "Internal server error"
  });
}


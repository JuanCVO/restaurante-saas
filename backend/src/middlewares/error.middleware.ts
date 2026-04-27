import { Request, Response, NextFunction } from "express"
import { ZodError } from "zod"
import { env } from "../lib/env"
import { BusinessError, messages } from "../lib/errors"

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof BusinessError) {
    return res.status(err.status).json({
      code: err.code,
      message: messages[err.code],
      ...(err.details ?? {}),
    })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Datos inválidos",
      issues: err.issues.map(i => ({ path: i.path.join("."), message: i.message })),
    })
  }

  if (env.isProd) {
    console.error(err.message)
    return res.status(500).json({ message: "Error interno del servidor" })
  }

  console.error(err.stack)
  return res.status(500).json({ message: err.message || "Error interno del servidor" })
}

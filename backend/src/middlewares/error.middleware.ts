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

  // errores de la base con un mensaje entendible
  const dbCode = (err as { code?: string }).code
  if (dbCode === "P2003") {
    return res.status(409).json({
      code: "IN_USE",
      message: "No se puede eliminar porque tiene registros asociados (por ejemplo, órdenes anteriores).",
    })
  }
  if (dbCode === "P2002") {
    return res.status(409).json({ code: "DUPLICATE", message: "Ya existe un registro con esos datos." })
  }
  if (dbCode === "P2025") {
    return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Recurso no encontrado." })
  }

  if (env.isProd) {
    console.error(err.message)
    return res.status(500).json({ message: "Error interno del servidor" })
  }

  console.error(err.stack)
  return res.status(500).json({ message: err.message || "Error interno del servidor" })
}

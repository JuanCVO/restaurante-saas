export type ErrorCode =
  | "EMPTY_DAY"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_FOREIGN"
  | "INSUFFICIENT_STOCK"
  | "ORDER_NOT_OPEN"
  | "ORDER_NOT_FOUND"
  | "FORBIDDEN"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "RESOURCE_NOT_FOUND"
  | "DUPLICATE_BASE_CAJA"

export class BusinessError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(code)
    this.name = "BusinessError"
  }
}

export const messages: Record<ErrorCode, string> = {
  EMPTY_DAY:           "No hay datos del día para cerrar.",
  PRODUCT_NOT_FOUND:   "Producto no encontrado.",
  PRODUCT_FOREIGN:     "El producto no pertenece a este restaurante.",
  INSUFFICIENT_STOCK:  "Stock insuficiente.",
  ORDER_NOT_OPEN:      "La orden ya está cerrada.",
  ORDER_NOT_FOUND:     "Orden no encontrada.",
  FORBIDDEN:           "No tienes permiso para esta operación.",
  EMAIL_TAKEN:         "El email ya está registrado.",
  INVALID_CREDENTIALS: "Credenciales inválidas.",
  RESOURCE_NOT_FOUND:  "Recurso no encontrado.",
  DUPLICATE_BASE_CAJA: "La base de caja ya está registrada para hoy.",
}

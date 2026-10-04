import type { Op } from "./escpos"
import { cop } from "./format"

export type ReceiptItem = { name: string; quantity: number; unitPrice: number }

export type ReceiptData = {
  /** "cuenta": para revisar antes de pagar; "pago": ya cobrado */
  kind: "cuenta" | "pago"
  restaurant: string
  table: number | string
  orderCode: string
  waiter?: string
  date: Date
  items: ReceiptItem[]
  subtotal: number
  tip?: number
  paymentMethod?: string
  footer?: string
}

const DEFAULT_FOOTER = "¡Gracias por su visita!"

const fmtDate = (d: Date) =>
  d.toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota",
  })

// Propina cercana al 10 % que deja el TOTAL en billetes (múltiplo de 1.000), para no dar vueltos en monedas:
// 53.500 -> 5.500 (total 59.000), 15.500 -> 1.500 (total 17.000). Si el total queda justo entre dos billetes,
// se baja (155.000 -> 15.000). Todo con enteros, para que no estorben los decimales.
export const suggestedTip = (subtotal: number) => {
  const total = Math.ceil((subtotal * 11 - 5000) / 10000) * 1000
  return Math.max(total - subtotal, 0)
}

export const buildReceipt = (d: ReceiptData): Op[] => {
  const ops: Op[] = []
  ops.push({ t: "text", text: d.restaurant, align: "center", bold: true, big: true })
  ops.push({ t: "text", text: d.kind === "cuenta" ? "CUENTA" : "COMPROBANTE DE PAGO", align: "center", bold: true })
  ops.push({ t: "rule" })
  ops.push({ t: "row", left: "Mesa", right: String(d.table), bold: true })
  ops.push({ t: "row", left: "Fecha", right: fmtDate(d.date) })
  ops.push({ t: "row", left: "Orden", right: "#" + d.orderCode })
  if (d.waiter) ops.push({ t: "row", left: "Atendió", right: d.waiter })
  ops.push({ t: "rule" })

  for (const item of d.items) {
    ops.push({ t: "row", left: `${item.quantity} ${item.name}`, right: cop(item.quantity * item.unitPrice) })
    if (item.quantity > 1) ops.push({ t: "text", text: `${item.quantity} x ${cop(item.unitPrice)}`, indent: 3 })
  }
  ops.push({ t: "rule" })

  if (d.kind === "pago") {
    const tip = d.tip ?? 0
    ops.push({ t: "row", left: "Subtotal", right: cop(d.subtotal) })
    if (tip > 0) ops.push({ t: "row", left: "Propina", right: cop(tip) })
    ops.push({ t: "row", left: "TOTAL", right: cop(d.subtotal + tip), bold: true, big: true })
    if (d.paymentMethod) ops.push({ t: "row", left: "Pago", right: d.paymentMethod })
  } else {
    const tip = suggestedTip(d.subtotal)
    ops.push({ t: "row", left: "TOTAL", right: cop(d.subtotal), bold: true, big: true })
    if (tip > 0) {
      ops.push({ t: "text", text: `Propina voluntaria sugerida (10%): ${cop(tip)}` })
      ops.push({ t: "text", text: `Total con propina: ${cop(d.subtotal + tip)}` })
    }
  }

  ops.push({ t: "rule" })
  ops.push({ t: "text", text: (d.footer ?? "").trim() || DEFAULT_FOOTER, align: "center" })
  ops.push({ t: "feed", lines: 3 })
  ops.push({ t: "cut" })
  return ops
}

export const buildTestReceipt = (restaurant: string, footer?: string): Op[] =>
  buildReceipt({
    kind: "cuenta",
    restaurant: restaurant || "RestaurantOS",
    table: 4,
    orderCode: "PRUEBA",
    waiter: "Laura Méndez",
    date: new Date(),
    items: [
      { name: "Bandeja paisa", quantity: 2, unitPrice: 34000 },
      { name: "Limonada de coco con hielo y menta", quantity: 1, unitPrice: 8500 },
      { name: "Ñoquis a la boloñesa ¡ricos!", quantity: 1, unitPrice: 29000 },
    ],
    subtotal: 105500,
    footer,
  })

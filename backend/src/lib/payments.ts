export type PaymentBuckets = { efectivo: number; datafono: number; nequi: number; bancolombia: number }

export type PaidOrder = {
  total: number
  paymentMethod: string | null
  cashAmount: number | null
  transferMethod: string | null
}

const EMPTY: PaymentBuckets = { efectivo: 0, datafono: 0, nequi: 0, bancolombia: 0 }

// Reparte lo que pagó una orden entre efectivo, Datafono, Nequi y Bancolombia. En un pago mixto, lo que no
// fue en efectivo fue por el medio que se haya elegido. La propina no entra: va aparte.
export const splitPayment = (order: PaidOrder): PaymentBuckets => {
  const out: PaymentBuckets = { ...EMPTY }

  // Antes de oct/2026 "Datafono" era el nombre de lo que hoy es Bancolombia, y por un tiempo el esquema de
  // validación solo aceptó Bancolombia: ninguna orden sin cerrar de esa época pudo quedar guardada como
  // "Datafono". Por eso aquí "Datafono" solo puede significar el medio de pago nuevo, no el viejo.
  const put = (method: string | null, amount: number) => {
    if (method === "Efectivo") out.efectivo += amount
    else if (method === "Datafono") out.datafono += amount
    else if (method === "Nequi") out.nequi += amount
    else if (method === "Bancolombia") out.bancolombia += amount
  }

  if (order.paymentMethod === "Mixto") {
    const cash = order.cashAmount ?? 0
    put("Efectivo", cash)
    put(order.transferMethod, order.total - cash)
  } else {
    put(order.paymentMethod, order.total)
  }
  return out
}

export const sumPayments = (orders: PaidOrder[]): PaymentBuckets =>
  orders.reduce((acc, o) => {
    const p = splitPayment(o)
    return {
      efectivo: acc.efectivo + p.efectivo,
      datafono: acc.datafono + p.datafono,
      nequi: acc.nequi + p.nequi,
      bancolombia: acc.bancolombia + p.bancolombia,
    }
  }, { ...EMPTY })

import { DailySummary } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { getColombiaDayRange } from "../lib/date"
import { BusinessError } from "../lib/errors"

export type CloseDayResult =
  | { kind: "created"; summary: DailySummary }
  | { kind: "idempotent"; summary: DailySummary }

export const closeDayForRestaurant = async (restaurantId: string): Promise<CloseDayResult> => {
  const { today, tomorrow } = getColombiaDayRange()

  const existing = await prisma.dailySummary.findUnique({
    where: { restaurantId_date: { restaurantId, date: today } },
  })
  if (existing) {
    return { kind: "idempotent", summary: existing }
  }

  const summary = await prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      where: {
        restaurantId,
        status: "CERRADA",
        createdAt: { gte: today, lt: tomorrow },
      },
      include: { items: { select: { quantity: true } } },
    })

    const [baseCajaAgg, gastosAgg, pagosAgg] = await Promise.all([
      tx.cashMovement.aggregate({
        where: { restaurantId, type: "BASE_CAJA", createdAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      tx.cashMovement.aggregate({
        where: { restaurantId, type: "GASTO", createdAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      tx.employeePayment.aggregate({
        where: { restaurantId, createdAt: { gte: today, lt: tomorrow } },
        _sum: { salary: true, tip: true },
      }),
    ])

    const baseCaja            = baseCajaAgg._sum.amount ?? 0
    const totalGastos         = gastosAgg._sum.amount ?? 0
    const totalPagosEmpleados = (pagosAgg._sum.salary ?? 0) + (pagosAgg._sum.tip ?? 0)

    if (orders.length === 0 && baseCaja === 0 && totalGastos === 0 && totalPagosEmpleados === 0) {
      throw new BusinessError("EMPTY_DAY", 422)
    }

    const totalPropinas = orders.reduce((s, o) => s + (o.tip ?? 0), 0)
    const totalOrdenes  = orders.length
    const totalPlatos   = orders.reduce(
      (s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0
    )

    const efectivo = orders.filter(o => o.paymentMethod === "Efectivo").reduce((s, o) => s + o.total, 0)
    const datafono = orders.filter(o => o.paymentMethod === "Datafono").reduce((s, o) => s + o.total, 0)
    const nequi    = orders.filter(o => o.paymentMethod === "Nequi").reduce((s, o) => s + o.total, 0)

    const totalIngresos = orders.reduce((s, o) => s + o.total, 0)
                        + baseCaja
                        - totalGastos
                        - totalPagosEmpleados

    const created = await tx.dailySummary.create({
      data: {
        date: today,
        restaurantId,
        totalIngresos,
        totalOrdenes,
        totalPlatos,
        totalPropinas,
        totalGastos,
        totalPagosEmpleados,
        baseCaja,
        efectivo,
        datafono,
        nequi,
      },
    })

    if (orders.length > 0) {
      await tx.order.updateMany({
        where: { restaurantId, status: "CERRADA", createdAt: { gte: today, lt: tomorrow } },
        data: { status: "ARCHIVADA" },
      })
    }

    return created
  }, { timeout: 15_000 })

  return { kind: "created", summary }
}

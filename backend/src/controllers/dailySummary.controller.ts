import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const getColombiaDayRange = () => {
  const now = new Date()
  const colombiaOffset = -5 * 60 * 60 * 1000
  const nowColombia = new Date(now.getTime() + colombiaOffset)
  const startOfDayColombia = new Date(
    Date.UTC(
      nowColombia.getUTCFullYear(),
      nowColombia.getUTCMonth(),
      nowColombia.getUTCDate(),
      0, 0, 0, 0
    )
  )
  const today = new Date(startOfDayColombia.getTime() - colombiaOffset)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  return { today, tomorrow }
}

export const closeDay = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.body.restaurantId as string
    const { today, tomorrow } = getColombiaDayRange()

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: "CERRADA",
        createdAt: { gte: today, lt: tomorrow },
      },
      include: { items: true },
    })

    if (orders.length === 0) {
      return res.status(400).json({ message: "No hay órdenes del día para cerrar." })
    }

    const totalPropinas = orders.reduce((sum, o) => sum + (o.tip ?? 0), 0)
    const totalOrdenes  = orders.length
    const totalPlatos   = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)

    const efectivo = orders
      .filter(o => o.paymentMethod === "Efectivo")
      .reduce((sum, o) => sum + o.total, 0)

    const datafono = orders
      .filter(o => o.paymentMethod === "Datafono")
      .reduce((sum, o) => sum + o.total, 0)

    const nequi = orders
      .filter(o => o.paymentMethod === "Nequi")
      .reduce((sum, o) => sum + o.total, 0)

    const baseCajaAgg = await prisma.cashMovement.aggregate({
      where: {
        restaurantId,
        type: "BASE_CAJA",
        createdAt: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
    })
    const baseCaja = baseCajaAgg._sum.amount ?? 0

    const gastosAgg = await prisma.cashMovement.aggregate({
      where: {
        restaurantId,
        type: "GASTO",
        createdAt: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
    })
    const totalGastos = gastosAgg._sum.amount ?? 0

    const pagosAgg = await prisma.employeePayment.aggregate({
      where: { restaurantId, createdAt: { gte: today, lt: tomorrow } },
      _sum: { salary: true, tip: true },
    })
    const totalPagosEmpleados = (pagosAgg._sum.salary ?? 0) + (pagosAgg._sum.tip ?? 0)

    const totalIngresos = orders.reduce((sum, o) => sum + o.total, 0) + baseCaja - totalGastos - totalPagosEmpleados

    const summary = await prisma.dailySummary.upsert({
      where: {
        restaurantId_date: {
          restaurantId,
          date: today,
        },
      },
      update: {
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
      create: {
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

    await prisma.order.updateMany({
      where: {
        restaurantId,
        status: "CERRADA",
        createdAt: { gte: today, lt: tomorrow },
      },
      data: { status: "ARCHIVADA" },
    })

    await prisma.cashMovement.deleteMany({
      where: { restaurantId, createdAt: { gte: today, lt: tomorrow } },
    })

    return res.status(201).json({ message: "Día cerrado correctamente.", summary })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al cerrar el día." })
  }
}

export const getDailySummaries = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const summaries = await prisma.dailySummary.findMany({
      where: { restaurantId },
      orderBy: { date: "desc" },
    })
    return res.status(200).json(summaries)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al obtener los resúmenes." })
  }
}

export const clearSummaries = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    await prisma.dailySummary.deleteMany({ where: { restaurantId } })
    return res.status(200).json({ message: "Resúmenes eliminados correctamente." })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al limpiar los resúmenes." })
  }
}

export const getSummaryChart = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const period = (req.query.period as string) || "week"
    const { today, tomorrow } = getColombiaDayRange()

    const startDate = new Date(today)
    if (period === "month") {
      startDate.setUTCDate(startDate.getUTCDate() - 29)
    } else {
      startDate.setUTCDate(startDate.getUTCDate() - 6)
    }

    const summaries = await prisma.dailySummary.findMany({
      where: { restaurantId, date: { gte: startDate, lt: tomorrow } },
      orderBy: { date: "asc" },
    })

    const fmtCO = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
    })

    const data = summaries.map((item) => {
      const slice = fmtCO.format(item.date)       // "2026-04-24" in Colombia time
      const [, month, day] = slice.split("-")
      return {
        date:      slice,
        day:       `${day}/${month}`,
        pedidos:   item.totalOrdenes,
        ingresos:  item.totalIngresos,
        platos:    item.totalPlatos,
        propinas:  item.totalPropinas ?? 0,
        baseCaja:  item.baseCaja ?? 0,
        efectivo:  item.efectivo,
        datafono:  item.datafono,
        nequi:     item.nequi,
      }
    })

    return res.status(200).json(data)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al obtener la gráfica del resumen" })
  }
}
export const deleteDailySummary = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    await prisma.dailySummary.delete({ where: { id } })
    return res.json({ message: "Resumen eliminado" })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al eliminar el resumen." })
  }
}

export const getDailySummaryHistory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string

    const summaries = await prisma.dailySummary.findMany({
      where: { restaurantId },
      orderBy: { date: "desc" },
    })

    return res.json(summaries)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al obtener historial de cierres" })
  }
}
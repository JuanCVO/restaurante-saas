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
    const totalIngresos = orders.reduce((sum, o) => sum + o.total + (o.tip ?? 0), 0)
    const totalOrdenes  = orders.length
    const totalPlatos   = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)

    const efectivo = orders
      .filter((o) => o.paymentMethod === "Efectivo")
      .reduce((sum, o) => sum + o.total + (o.tip ?? 0), 0)
    const datafono = orders
      .filter((o) => o.paymentMethod === "Datafono")
      .reduce((sum, o) => sum + o.total + (o.tip ?? 0), 0)
    const nequi = orders
      .filter((o) => o.paymentMethod === "Nequi")
      .reduce((sum, o) => sum + o.total + (o.tip ?? 0), 0)

    const summary = await prisma.dailySummary.upsert({
      where: {
        restaurantId_date: {
          restaurantId,
          date: today,
        },
      },
      update: {
        totalIngresos:  { increment: totalIngresos },
        totalOrdenes:   { increment: totalOrdenes },
        totalPlatos:    { increment: totalPlatos },
        totalPropinas:  { increment: totalPropinas },
        efectivo:       { increment: efectivo },
        datafono:       { increment: datafono },
        nequi:          { increment: nequi },
      },
      create: {
        date: today,
        restaurantId,
        totalIngresos,
        totalOrdenes,
        totalPlatos,
        totalPropinas,
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
    const { today: startDate } = getColombiaDayRange()

    if (period === "month") {
      startDate.setDate(startDate.getDate() - 29)
    } else {
      startDate.setDate(startDate.getDate() - 6)
    }

    const summaries = await prisma.dailySummary.findMany({
      where: { restaurantId, date: { gte: startDate } },
      orderBy: { date: "asc" },
    })

    const data = summaries.map((item) => {
      const iso   = item.date.toISOString()
      const slice = iso.slice(0, 10)
      const [year, month, day] = slice.split("-")
      return {
        date:      slice,
        day:       `${day}/${month}`,
        pedidos:   item.totalOrdenes,
        ingresos:  item.totalIngresos,
        platos:    item.totalPlatos,
        propinas:  item.totalPropinas ?? 0,
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
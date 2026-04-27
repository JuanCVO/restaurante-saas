import { Request, Response } from "express"
import { prisma } from "../lib/prisma"
import { getColombiaDayRange } from "../lib/date"
import { asyncHandler } from "../lib/asyncHandler"
import { BusinessError } from "../lib/errors"
import { closeDayForRestaurant } from "../services/dailyClose.service"

export const closeDay = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = (req.user?.restaurantId ?? req.body.restaurantId) as string
  const result = await closeDayForRestaurant(restaurantId)

  if (result.kind === "idempotent") {
    return res.status(200).json({
      message: "Día ya cerrado previamente.",
      summary: result.summary,
      idempotent: true,
    })
  }
  return res.status(201).json({ message: "Día cerrado correctamente.", summary: result.summary })
})

export const getDailySummaries = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  const summaries = await prisma.dailySummary.findMany({
    where: { restaurantId },
    orderBy: { date: "desc" },
  })
  return res.json(summaries)
})

export const clearSummaries = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  await prisma.dailySummary.deleteMany({ where: { restaurantId } })
  return res.json({ message: "Resúmenes eliminados correctamente." })
})

export const getSummaryChart = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  const period = (req.query.period as string) || "week"
  const { today, tomorrow } = getColombiaDayRange()

  const startDate = new Date(today)
  startDate.setUTCDate(startDate.getUTCDate() - (period === "month" ? 29 : 6))

  const summaries = await prisma.dailySummary.findMany({
    where: { restaurantId, date: { gte: startDate, lt: tomorrow } },
    orderBy: { date: "asc" },
  })

  const fmtCO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
  })

  const data = summaries.map((item) => {
    const slice = fmtCO.format(item.date)
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

  return res.json(data)
})

export const deleteDailySummary = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const summary = await prisma.dailySummary.findUnique({
    where: { id },
    select: { restaurantId: true },
  })
  if (!summary) throw new BusinessError("RESOURCE_NOT_FOUND", 404)
  if (summary.restaurantId !== req.user?.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }
  await prisma.dailySummary.delete({ where: { id } })
  return res.json({ message: "Resumen eliminado" })
})

export const getDailySummaryHistory = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  const summaries = await prisma.dailySummary.findMany({
    where: { restaurantId },
    orderBy: { date: "desc" },
  })
  return res.json(summaries)
})

import { Request, Response } from "express"
import { prisma } from "../lib/prisma"

const getColombiaDayRange = () => {
  const now = new Date()
  const colombiaOffset = -5 * 60 * 60 * 1000
  const nowColombia = new Date(now.getTime() + colombiaOffset)
  const startOfDayColombia = new Date(
    Date.UTC(nowColombia.getUTCFullYear(), nowColombia.getUTCMonth(), nowColombia.getUTCDate(), 0, 0, 0, 0)
  )
  const today = new Date(startOfDayColombia.getTime() - colombiaOffset)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  return { today, tomorrow }
}

export const createEmployeePayment = async (req: Request, res: Response) => {
  try {
    const { userId, restaurantId, salary, tip, notes } = req.body
    if (!userId || !restaurantId || salary === undefined) {
      return res.status(400).json({ message: "userId, restaurantId y salary son obligatorios" })
    }
    const payment = await prisma.employeePayment.create({
      data: {
        userId,
        restaurantId,
        salary: Number(salary),
        tip: Number(tip ?? 0),
        notes: notes || null,
      },
      include: { user: { select: { name: true, role: true } } },
    })
    return res.status(201).json(payment)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al registrar el pago" })
  }
}

export const getTodayPayments = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const { today, tomorrow } = getColombiaDayRange()
    const payments = await prisma.employeePayment.findMany({
      where: { restaurantId, createdAt: { gte: today, lt: tomorrow } },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    })
    return res.json(payments)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al obtener los pagos" })
  }
}

export const deleteEmployeePayment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    await prisma.employeePayment.delete({ where: { id } })
    return res.json({ message: "Pago eliminado" })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al eliminar el pago" })
  }
}

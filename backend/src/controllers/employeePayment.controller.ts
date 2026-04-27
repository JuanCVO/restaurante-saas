import { Request, Response } from "express"
import { prisma } from "../lib/prisma"
import { EmployeePaymentSchema } from "../lib/validators"
import { getColombiaDayRange } from "../lib/date"
import { asyncHandler } from "../lib/asyncHandler"
import { BusinessError } from "../lib/errors"

export const createEmployeePayment = asyncHandler(async (req: Request, res: Response) => {
  const data = EmployeePaymentSchema.parse(req.body)

  const targetUser = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { restaurantId: true },
  })
  if (!targetUser || targetUser.restaurantId !== data.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }

  const payment = await prisma.employeePayment.create({
    data: {
      userId: data.userId,
      restaurantId: data.restaurantId,
      salary: data.salary,
      tip: data.tip ?? 0,
      notes: data.notes ?? null,
    },
    include: { user: { select: { name: true, role: true } } },
  })
  return res.status(201).json(payment)
})

export const getTodayPayments = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  const { today, tomorrow } = getColombiaDayRange()
  const payments = await prisma.employeePayment.findMany({
    where: { restaurantId, createdAt: { gte: today, lt: tomorrow } },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })
  return res.json(payments)
})

export const deleteEmployeePayment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const payment = await prisma.employeePayment.findUnique({
    where: { id },
    select: { restaurantId: true },
  })
  if (!payment) throw new BusinessError("RESOURCE_NOT_FOUND", 404)
  if (payment.restaurantId !== req.user?.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }
  await prisma.employeePayment.delete({ where: { id } })
  return res.json({ message: "Pago eliminado" })
})

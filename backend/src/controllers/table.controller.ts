import { Request, Response } from "express"
import { TableStatus } from "@prisma/client"
import { prisma } from "../lib/prisma"
import { TableSchema } from "../lib/validators"
import { asyncHandler } from "../lib/asyncHandler"

export const getTables = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { number: "asc" },
    include: { orders: { where: { status: "ABIERTA" }, take: 1 } },
  })
  return res.json(tables)
})

export const createTable = asyncHandler(async (req: Request, res: Response) => {
  const data = TableSchema.parse(req.body)
  const table = await prisma.table.create({ data })
  return res.status(201).json(table)
})

export const updateTableStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { status } = req.body as { status: TableStatus }
  if (status !== "DISPONIBLE" && status !== "OCUPADA") {
    return res.status(400).json({ message: "Estado inválido" })
  }
  const table = await prisma.table.update({ where: { id }, data: { status } })
  return res.json(table)
})

export const deleteTable = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  await prisma.table.delete({ where: { id } })
  return res.json({ message: "Mesa eliminada" })
})

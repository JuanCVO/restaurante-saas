import { Request, Response } from 'express'
import { PrismaClient, TableStatus } from '@prisma/client'

const prisma = new PrismaClient()

export const getTables = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const tables = await prisma.table.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: { status: 'ABIERTA' },
          take: 1,
        },
      },
    })
    res.json(tables)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mesas' })
  }
}

export const createTable = async (req: Request, res: Response) => {
  try {
    const { number, restaurantId } = req.body
    const table = await prisma.table.create({
      data: { number, restaurantId },
    })
    res.status(201).json(table)
  } catch (error) {
    res.status(500).json({ message: 'Error al crear mesa' })
  }
}

export const updateTableStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const { status } = req.body as { status: TableStatus }
    const table = await prisma.table.update({
      where: { id },
      data: { status },
    })
    res.json(table)
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar mesa' })
  }
}

export const deleteTable = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    await prisma.table.delete({ where: { id } })
    res.json({ message: 'Mesa eliminada' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar mesa' })
  }
}
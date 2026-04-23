import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const createCashMovement = async (req: Request, res: Response) => {
  try {
    const { type, concept, amount, paymentMethod, notes, restaurantId } = req.body

    if (!type || !concept || !amount || !restaurantId) {
      return res.status(400).json({ message: "type, concept, amount y restaurantId son obligatorios" })
    }

    const movement = await prisma.cashMovement.create({
      data: {
        type,
        concept,
        amount: Number(amount),
        paymentMethod,
        notes,
        restaurantId,
      },
    })

    return res.status(201).json(movement)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al crear movimiento" })
  }
}

export const getCashMovementsByRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string

    const movements = await prisma.cashMovement.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    })

    return res.json(movements)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al obtener movimientos" })
  }
}

export const deleteCashMovement = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string

    await prisma.cashMovement.delete({
      where: { id },
    })

    return res.json({ message: "Movimiento eliminado correctamente" })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error al eliminar movimiento" })
  }
}

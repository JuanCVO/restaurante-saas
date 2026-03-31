import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const getCategories = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" },
    })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener categorías" })
  }
}

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, restaurantId } = req.body
    const category = await prisma.category.create({
      data: { name, restaurantId },
    })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: "Error al crear categoría" })
  }
}

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const  id  = req.params.id as string
    await prisma.category.delete({ where: { id } })
    res.json({ message: "Categoría eliminada" })
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar categoría" })
  }
}
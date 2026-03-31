import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const getProducts = async (req: Request, res: Response) => {
  try {
    const restaurantId  = req.params.restaurantId as string
    const products = await prisma.product.findMany({
      where: { restaurantId },
      include: { category: true },
      orderBy: { name: "asc" },
    })
    res.json(products)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener productos" })
  }
}

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, price, unit, stock, minStock, categoryId, restaurantId } = req.body
    const product = await prisma.product.create({
      data: { name, price, unit, stock, minStock, categoryId, restaurantId },
      include: { category: true },
    })
    res.status(201).json(product)
  } catch (error) {
    res.status(500).json({ message: "Error al crear producto" })
  }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const  id  = req.params.id as string
    const { name, price, unit, stock, minStock, categoryId } = req.body
    const product = await prisma.product.update({
      where: { id },
      data: { name, price, unit, stock, minStock, categoryId },
      include: { category: true },
    })
    res.json(product)
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar producto" })
  }
}

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const  id  = req.params.id as string
    await prisma.product.delete({ where: { id } })
    res.json({ message: "Producto eliminado" })
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar producto" })
  }
}
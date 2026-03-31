import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { tableId, restaurantId } = req.body
    const userId = (req as any).user.userId

    const order = await prisma.order.create({
      data: {
        tableId,
        restaurantId,
        userId,
        total: 0,
        status: 'ABIERTA',
      },
    })

    await prisma.table.update({
      where: { id: tableId },
      data: { status: 'OCUPADA' },
    })

    res.status(201).json(order)
  } catch (error) {
    res.status(500).json({ message: 'Error al crear orden' })
  }
}

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const id  = req.params.id as string
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        table: true,
      },
    })
    if (!order) {
      res.status(404).json({ message: 'Orden no encontrada' })
      return
    }
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener orden' })
  }
}

export const getActiveOrderByTable = async (req: Request, res: Response) => {
  try {
    const  tableId  = req.params.tableId as string
    const order = await prisma.order.findFirst({
      where: { tableId, status: 'ABIERTA' },
      include: {
        items: {
          include: { product: true },
        },
      },
    })
    res.json(order)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener orden de la mesa' })
  }
}

export const addItemToOrder = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const { productId, quantity } = req.body

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      res.status(404).json({ message: 'Producto no encontrado' })
      return
    }

    if (product.stock < quantity) {
      res.status(400).json({ message: `Stock insuficiente. Disponible: ${product.stock}` })
      return
    }

    const item = await prisma.orderItem.create({
      data: {
        orderId: id,
        productId,
        quantity,
        unitPrice: product.price,
      },
      include: { product: true },
    })

    await prisma.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    })

    const allItems = await prisma.orderItem.findMany({ where: { orderId: id } })
    const total = allItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    await prisma.order.update({ where: { id }, data: { total } })

    res.status(201).json(item)
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar ítem' })
  }
}

export const closeOrder = async (req: Request, res: Response) => {
  try {
    const  id  = req.params.id as string
    const  paymentMethod  = req.body.paymentMethod as string

    const order = await prisma.order.update({
      where: { id },
      data: { status: 'CERRADA' , paymentMethod},
      include: { items: { include: { product: true } } },
    })

    if (order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'DISPONIBLE' },
      })
    }

    res.json(order)
  } catch (error) {
    res.status(500).json({ message: 'Error al cerrar orden' })
  }
}
export const removeItemFromOrder = async (req: Request, res: Response) => {
  try {
    const itemId = req.params.itemId as string

    const item = await prisma.orderItem.delete({
      where: { id: itemId },
    })

    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })

    const allItems = await prisma.orderItem.findMany({ where: { orderId: item.orderId } })
    const total = allItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    await prisma.order.update({ where: { id: item.orderId }, data: { total } })

    res.json({ message: 'Ítem eliminado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar ítem' })
  }
}
export const getOrderHistory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: 'CERRADA',  
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        table: true,
        items: { include: { product: true } }
      }
    })
    res.json(orders)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial' })
  }
}
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const ordersToday = await prisma.order.findMany({
      where: {
        restaurantId,
        status: 'CERRADA',  
        createdAt: { gte: startOfDay }
      },
      include: { items: true }
    })

    const tables = await prisma.table.findMany({ where: { restaurantId } })

    const totalIngresos = ordersToday.reduce((sum, o) => sum + o.total, 0)
    const totalPedidos = ordersToday.length
    const totalPlatos = ordersToday.reduce((sum, o) => sum + o.items.length, 0)
    const mesasOcupadas = tables.filter(t => t.status === 'OCUPADA').length
    const totalMesas = tables.length

    res.json({ totalIngresos, totalPedidos, totalPlatos, mesasOcupadas, totalMesas })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener stats' })
  }
}
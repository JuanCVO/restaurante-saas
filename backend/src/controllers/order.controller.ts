import { Request, Response } from "express"
import { prisma } from "../lib/prisma"
import { CreateOrderSchema, AddItemSchema, CloseOrderSchema } from "../lib/validators"
import { asyncHandler } from "../lib/asyncHandler"
import { BusinessError } from "../lib/errors"

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = CreateOrderSchema.parse(req.body)
  const userId = req.user?.userId
  if (!userId) throw new BusinessError("FORBIDDEN", 401)

  const order = await prisma.order.create({
    data: {
      tableId: data.tableId ?? null,
      restaurantId: data.restaurantId,
      userId,
      total: 0,
      status: "ABIERTA",
    },
  })

  return res.status(201).json(order)
})

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, table: true },
  })
  if (!order) throw new BusinessError("ORDER_NOT_FOUND", 404)
  if (order.restaurantId !== req.user?.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }
  return res.json(order)
})

export const getActiveOrderByTable = asyncHandler(async (req: Request, res: Response) => {
  const tableId = req.params.tableId as string
  const order = await prisma.order.findFirst({
    where: { tableId, status: "ABIERTA" },
    include: { items: { include: { product: true } } },
  })
  if (order && order.restaurantId !== req.user?.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }
  return res.json(order)
})

export const addItemToOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { productId, quantity } = AddItemSchema.parse(req.body)

  const order = await prisma.order.findUnique({
    where: { id },
    select: { restaurantId: true, tableId: true },
  })
  if (!order) throw new BusinessError("ORDER_NOT_FOUND", 404)
  if (order.restaurantId !== req.user?.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }

  const item = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } })
    if (!product) throw new BusinessError("PRODUCT_NOT_FOUND", 404)
    if (product.restaurantId !== order.restaurantId) {
      throw new BusinessError("PRODUCT_FOREIGN", 403)
    }
    if (product.stock < quantity) {
      throw new BusinessError("INSUFFICIENT_STOCK", 400, { available: product.stock })
    }

    const existing = await tx.orderItem.findFirst({ where: { orderId: id, productId } })

    const saved = existing
      ? await tx.orderItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: quantity } },
          include: { product: true },
        })
      : await tx.orderItem.create({
          data: { orderId: id, productId, quantity, unitPrice: product.price },
          include: { product: true },
        })

    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    })

    const allItems = await tx.orderItem.findMany({ where: { orderId: id } })
    const total = allItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    await tx.order.update({ where: { id }, data: { total } })

    if (order.tableId) {
      await tx.table.update({ where: { id: order.tableId }, data: { status: "OCUPADA" } })
    }

    return saved
  })

  return res.status(201).json(item)
})

export const closeOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { paymentMethod, tip = 0 } = CloseOrderSchema.parse(req.body)

  const existing = await prisma.order.findUnique({
    where: { id },
    select: { restaurantId: true, status: true },
  })
  if (!existing) throw new BusinessError("ORDER_NOT_FOUND", 404)
  if (existing.restaurantId !== req.user?.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }
  if (existing.status !== "ABIERTA") throw new BusinessError("ORDER_NOT_OPEN", 409)

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: { status: "CERRADA", paymentMethod, tip },
      include: { items: { include: { product: true } }, table: true },
    })
    if (updated.tableId) {
      await tx.table.update({
        where: { id: updated.tableId },
        data: { status: "DISPONIBLE" },
      })
    }
    return updated
  })

  return res.json(order)
})

export const removeItemFromOrder = asyncHandler(async (req: Request, res: Response) => {
  const itemId = req.params.itemId as string

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: { select: { restaurantId: true } } },
  })
  if (!item) throw new BusinessError("RESOURCE_NOT_FOUND", 404)
  if (item.order.restaurantId !== req.user?.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.delete({ where: { id: itemId } })
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })
    const allItems = await tx.orderItem.findMany({ where: { orderId: item.orderId } })
    const total = allItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    await tx.order.update({ where: { id: item.orderId }, data: { total } })
  })

  return res.json({ message: "Ítem eliminado" })
})

export const getOrderHistory = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  const orders = await prisma.order.findMany({
    where: { restaurantId, status: "CERRADA" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { table: true, items: { include: { product: true } } },
  })
  return res.json(orders)
})

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const ordersToday = await prisma.order.findMany({
    where: { restaurantId, status: "CERRADA", createdAt: { gte: startOfDay } },
    include: { items: { select: { quantity: true } } },
  })
  const tables = await prisma.table.findMany({ where: { restaurantId } })

  const totalIngresos = ordersToday.reduce((sum, o) => sum + o.total, 0)
  const totalPropinas = ordersToday.reduce((sum, o) => sum + (o.tip ?? 0), 0)

  return res.json({
    totalIngresos,
    totalPropinas,
    totalRecibido: totalIngresos + totalPropinas,
    totalPedidos:  ordersToday.length,
    totalPlatos:   ordersToday.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0),
    mesasOcupadas: tables.filter(t => t.status === "OCUPADA").length,
    totalMesas:    tables.length,
  })
})

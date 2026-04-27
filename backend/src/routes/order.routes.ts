import { Router } from "express"
import {
  createOrder,
  getOrderById,
  getActiveOrderByTable,
  addItemToOrder,
  closeOrder,
  removeItemFromOrder,
  getOrderHistory,
  getDashboardStats
} from "../controllers/order.controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { sameRestaurant } from "../middlewares/tenant.middleware"

const router = Router()

router.post("/", authMiddleware, sameRestaurant, createOrder)

router.get("/history/:restaurantId", authMiddleware, sameRestaurant, getOrderHistory)
router.get("/stats/:restaurantId", authMiddleware, sameRestaurant, getDashboardStats)
router.get("/table/:tableId", authMiddleware, getActiveOrderByTable)

router.get("/:id", authMiddleware, getOrderById)

router.post("/:id/items", authMiddleware, addItemToOrder)
router.patch("/:id/close", authMiddleware, closeOrder)
router.delete("/items/:itemId", authMiddleware, removeItemFromOrder)

export default router

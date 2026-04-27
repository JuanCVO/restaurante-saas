import { Router } from "express"
import {
  createCashMovement,
  getCashMovementsByRestaurant,
  deleteCashMovement,
} from "../controllers/cashMovement.controller"
import { authMiddleware, adminOnly } from "../middlewares/auth.middleware"
import { sameRestaurant, ownsResource } from "../middlewares/tenant.middleware"
import { prisma } from "../lib/prisma"

const router = Router()

const movementOwner = ownsResource((id) =>
  prisma.cashMovement.findUnique({ where: { id }, select: { restaurantId: true } })
)

router.post("/", authMiddleware, adminOnly, sameRestaurant, createCashMovement)
router.get("/:restaurantId", authMiddleware, sameRestaurant, getCashMovementsByRestaurant)
router.delete("/:id", authMiddleware, adminOnly, movementOwner, deleteCashMovement)

export default router

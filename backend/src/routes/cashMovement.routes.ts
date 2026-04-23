import { Router } from "express"
import {
  createCashMovement,
  getCashMovementsByRestaurant,
  deleteCashMovement,
} from "../controllers/cashMovement.controller"
import { authMiddleware } from "../middlewares/auth.middleware"

const router = Router()

router.post("/", authMiddleware, createCashMovement)
router.get("/:restaurantId", authMiddleware , getCashMovementsByRestaurant)
router.delete("/:id", authMiddleware, deleteCashMovement)

export default router
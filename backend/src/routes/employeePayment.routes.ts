import { Router } from "express"
import { createEmployeePayment, getPeriodPayments, deleteEmployeePayment } from "../controllers/employeePayment.controller"
import { authMiddleware, adminOnly } from "../middlewares/auth.middleware"
import { sameRestaurant } from "../middlewares/tenant.middleware"

const router = Router()

router.post("/", authMiddleware, adminOnly, sameRestaurant, createEmployeePayment)
router.get("/:restaurantId", authMiddleware, adminOnly, sameRestaurant, getPeriodPayments)
router.delete("/:id", authMiddleware, adminOnly, deleteEmployeePayment)

export default router

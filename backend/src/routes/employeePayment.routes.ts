import { Router } from "express"
import { createEmployeePayment, getTodayPayments, deleteEmployeePayment } from "../controllers/employeePayment.controller"
import { authMiddleware, adminOnly } from "../middlewares/auth.middleware"

const router = Router()

router.post("/", authMiddleware, adminOnly, createEmployeePayment)
router.get("/:restaurantId", authMiddleware, adminOnly, getTodayPayments)
router.delete("/:id", authMiddleware, adminOnly, deleteEmployeePayment)

export default router

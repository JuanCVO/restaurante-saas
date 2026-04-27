import { Router } from "express"
import rateLimit from "express-rate-limit"
import { register, login, createEmployee, listUsers, deleteUser } from "../controllers/auth.controller"
import { authMiddleware, adminOnly } from "../middlewares/auth.middleware"
import { sameRestaurant } from "../middlewares/tenant.middleware"

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Intenta más tarde." },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados registros. Intenta más tarde." },
})

router.post("/login", loginLimiter, login)
router.post("/register", registerLimiter, authMiddleware, adminOnly, register)
router.post("/employees", authMiddleware, adminOnly, createEmployee)
router.get("/users/:restaurantId", authMiddleware, adminOnly, sameRestaurant, listUsers)
router.delete("/users/:userId", authMiddleware, adminOnly, deleteUser)

export default router

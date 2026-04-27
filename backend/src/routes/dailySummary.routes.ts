import { Router } from "express"
import { closeDay, getDailySummaries, clearSummaries, getSummaryChart, getDailySummaryHistory, deleteDailySummary } from "../controllers/dailySummary.controller"
import { downloadSummaryPDF, downloadTodayPDF } from "../controllers/pdf.controller"
import { authMiddleware, adminOnly } from "../middlewares/auth.middleware"
import { sameRestaurant } from "../middlewares/tenant.middleware"

const router = Router()

router.post("/close", authMiddleware, adminOnly, sameRestaurant, closeDay)
router.get("/pdf/day/:restaurantId", authMiddleware, adminOnly, sameRestaurant, downloadTodayPDF)
router.get("/pdf/:restaurantId", authMiddleware, adminOnly, sameRestaurant, downloadSummaryPDF)
router.get("/chart/:restaurantId", authMiddleware, sameRestaurant, getSummaryChart)
router.get("/history/:restaurantId", authMiddleware, sameRestaurant, getDailySummaryHistory)

router.delete("/entry/:id", authMiddleware, adminOnly, deleteDailySummary)
router.get("/:restaurantId", authMiddleware, sameRestaurant, getDailySummaries)
router.delete("/:restaurantId", authMiddleware, adminOnly, sameRestaurant, clearSummaries)

export default router

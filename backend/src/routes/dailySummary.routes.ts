import { Router } from "express";
import { closeDay, getDailySummaries, clearSummaries, getSummaryChart, getDailySummaryHistory } from "../controllers/dailySummary.controller";
import { downloadSummaryPDF, downloadTodayPDF } from "../controllers/pdf.controller";
import { authMiddleware, adminOnly } from "../middlewares/auth.middleware";

const router = Router();

router.post("/close", authMiddleware, adminOnly, closeDay);
router.get("/pdf/day/:restaurantId", authMiddleware, adminOnly, downloadTodayPDF);
router.get("/pdf/:restaurantId", authMiddleware, adminOnly, downloadSummaryPDF);
router.get("/chart/:restaurantId", authMiddleware, getSummaryChart);
router.get("/history/:restaurantId", authMiddleware, getDailySummaryHistory);

router.get("/:restaurantId", authMiddleware, getDailySummaries);
router.delete("/:restaurantId", authMiddleware, adminOnly, clearSummaries);

export default router;

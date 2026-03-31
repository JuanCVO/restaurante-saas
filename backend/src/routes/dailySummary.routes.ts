import { Router } from "express";
import { closeDay, getDailySummaries, clearSummaries } from "../controllers/dailySummary.controller";
import { downloadSummaryPDF } from "../controllers/pdf.controller";
import { authMiddleware } from "../middlewares/auth.middleware";


const router = Router();

router.post("/close", authMiddleware, closeDay);
router.get("/pdf/:restaurantId", authMiddleware, downloadSummaryPDF);
router.get("/:restaurantId", authMiddleware, getDailySummaries);
router.delete("/:restaurantId", authMiddleware, clearSummaries);

export default router;
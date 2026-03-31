import { Router } from "express"
import { getCategories, createCategory, deleteCategory } from "../controllers/category.controller"

const router = Router()

router.get("/:restaurantId", getCategories)
router.post("/", createCategory)
router.delete("/:id", deleteCategory)

export default router
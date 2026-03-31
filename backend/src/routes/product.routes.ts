import { Router } from "express"
import { getProducts, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller"

const router = Router()

router.get("/:restaurantId", getProducts)
router.post("/", createProduct)
router.put("/:id", updateProduct)
router.delete("/:id", deleteProduct)

export default router
import { Router } from 'express'
import {
  createOrder,
  getOrderById,
  getActiveOrderByTable,
  addItemToOrder,
  closeOrder,
  removeItemFromOrder,
  getOrderHistory,
  getDashboardStats
} from '../controllers/order.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', authMiddleware, createOrder)

router.get('/history/:restaurantId', authMiddleware, getOrderHistory)
router.get('/stats/:restaurantId', authMiddleware, getDashboardStats)
router.get('/table/:tableId', authMiddleware, getActiveOrderByTable)


router.get('/:id', authMiddleware, getOrderById)

router.post('/:id/items', authMiddleware, addItemToOrder)
router.patch('/:id/close', authMiddleware, closeOrder)
router.delete('/items/:itemId', authMiddleware, removeItemFromOrder)

export default router
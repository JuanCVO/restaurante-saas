import { Router } from 'express'
import { getTables, createTable, updateTableStatus, deleteTable } from '../controllers/table.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router = Router()

router.get('/:restaurantId', authMiddleware, getTables)
router.post('/', authMiddleware, createTable)
router.patch('/:id/status', authMiddleware, updateTableStatus)
router.delete('/:id', authMiddleware, deleteTable)

export default router
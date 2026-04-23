import { Router } from 'express'
import { register, login, createEmployee, listUsers, deleteUser } from '../controllers/auth.controller'
import { authMiddleware, adminOnly } from '../middlewares/auth.middleware'

const router = Router()

router.post('/login', login)
router.post('/register', authMiddleware, adminOnly, register)
router.post('/employees', authMiddleware, adminOnly, createEmployee)
router.get('/users/:restaurantId', authMiddleware, adminOnly, listUsers)
router.delete('/users/:userId', authMiddleware, adminOnly, deleteUser)

export default router

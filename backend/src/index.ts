import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middlewares/error.middleware'
import authRoutes from './routes/auth.routes'
import productRoutes from './routes/product.routes'
import categoryRoutes from './routes/category.routes'
import tableRoutes from './routes/table.routes'
import orderRoutes from './routes/order.routes'
import dailySummaryRoutes from './routes/dailySummary.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = [
  'http://localhost:3000',
  'https://restaurante-saas-five.vercel.app'
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`Origen no permitido por CORS: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API funcionando'
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '🚀 API funcionando'
  })
})

app.use((req, res, next) => {
  console.log(`➡️ [${req.method}] ${req.path} - Origin: ${req.get('Origin')}`)
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/tables', tableRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/daily-summary', dailySummaryRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`)
  console.log(`✅ FRONTEND_URL ENV: ${process.env.FRONTEND_URL || 'NO DEFINIDA'}`)
})
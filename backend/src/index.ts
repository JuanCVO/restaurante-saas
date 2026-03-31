import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middlewares/error.middleware'
import authRoutes from './routes/auth.routes'
import productRoutes from "./routes/product.routes"
import categoryRoutes from "./routes/category.routes" 
import tableRoutes from './routes/table.routes'
import orderRoutes from './routes/order.routes'
import dailySummaryRoutes from "./routes/dailySummary.routes";

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())



app.use('/api/auth', (req, res, next) => {
  console.log("➡️ petición a auth:", req.method, req.path, req.body)
  next()
}, authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/categories", categoryRoutes)
app.use('/api/tables', tableRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/daily-summary', dailySummaryRoutes)

app.use(errorHandler)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '🚀 API funcionando' })
})




app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

export default app
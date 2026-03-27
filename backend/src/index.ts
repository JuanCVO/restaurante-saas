import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middlewares/error.middleware'
import authRoutes from './routes/auth.routes'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())


app.use('/api/auth', authRoutes)


app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '🚀 API funcionando' })
})


app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

export default app
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: string
  role: string
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    res.status(401).json({ message: 'Token no proporcionado' })
    return
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload
    (req as any).user = decoded
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user
  if (user?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Acceso denegado' })
    return
  }
  next()
}
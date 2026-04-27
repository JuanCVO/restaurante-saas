import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { env } from "../lib/env"
import { prisma } from "../lib/prisma"

interface JwtPayload {
  userId: string
  role: "ADMIN" | "EMPLOYEE"
  restaurantId?: string
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" })
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      restaurantId: decoded.restaurantId,
    }
    next()
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" })
  }
}

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenUser = req.user
    if (!tokenUser) return res.status(401).json({ message: "No autenticado" })

    const fresh = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { role: true, restaurantId: true },
    })

    if (!fresh || fresh.role !== "ADMIN") {
      return res.status(403).json({ message: "Acceso denegado" })
    }

    req.user = { userId: tokenUser.userId, role: fresh.role, restaurantId: fresh.restaurantId }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error de autorización" })
  }
}

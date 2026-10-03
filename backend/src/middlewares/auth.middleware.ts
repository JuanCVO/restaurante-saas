import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { env } from "../lib/env"
import { prisma } from "../lib/prisma"
import { getActiveUser } from "../lib/userCache"

interface JwtPayload {
  userId: string
  role: "ADMIN" | "EMPLOYEE"
  restaurantId?: string
}

// Valida el token y que la cuenta siga activa. El rol y el restaurante salen de la base y no del token,
// así quien se elimina o desactiva pierde el acceso enseguida.
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" })
  }

  let decoded: JwtPayload
  try {
    decoded = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as JwtPayload
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" })
  }

  try {
    const user = await getActiveUser(decoded.userId)
    if (!user) {
      return res.status(401).json({ message: "La cuenta ya no está activa" })
    }
    req.user = { userId: user.id, role: user.role, restaurantId: user.restaurantId }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error de autenticación" })
  }
}

// el rol se confirma en la base, sin caché
export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenUser = req.user
    if (!tokenUser) return res.status(401).json({ message: "No autenticado" })

    const fresh = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { role: true, restaurantId: true, active: true },
    })

    if (!fresh || !fresh.active || fresh.role !== "ADMIN") {
      return res.status(403).json({ message: "Acceso denegado" })
    }

    req.user = { userId: tokenUser.userId, role: fresh.role, restaurantId: fresh.restaurantId }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error de autorización" })
  }
}

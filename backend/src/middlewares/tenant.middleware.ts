import { Request, Response, NextFunction } from "express"
import { prisma } from "../lib/prisma"

export const sameRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenUser = req.user
    if (!tokenUser) {
      return res.status(401).json({ message: "No autenticado" })
    }

    const claimed = req.params.restaurantId ?? req.body?.restaurantId
    if (!claimed) {
      return res.status(400).json({ message: "restaurantId requerido" })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { restaurantId: true, role: true },
    })

    if (!dbUser || dbUser.restaurantId !== claimed) {
      return res.status(403).json({ message: "No tienes acceso a este restaurante" })
    }

    req.user = {
      userId: tokenUser.userId,
      role: dbUser.role,
      restaurantId: dbUser.restaurantId,
    }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error de validación de tenant" })
  }
}

export const ownsResource = (
  fetchOwner: (id: string) => Promise<{ restaurantId: string } | null>
) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenUser = req.user
    if (!tokenUser) return res.status(401).json({ message: "No autenticado" })

    const id = req.params.id as string
    if (!id) return res.status(400).json({ message: "id requerido" })

    const dbUser = await prisma.user.findUnique({
      where: { id: tokenUser.userId },
      select: { restaurantId: true, role: true },
    })
    if (!dbUser) return res.status(401).json({ message: "Usuario no válido" })

    const resource = await fetchOwner(id)
    if (!resource) return res.status(404).json({ message: "Recurso no encontrado" })

    if (resource.restaurantId !== dbUser.restaurantId) {
      return res.status(403).json({ message: "No tienes acceso a este recurso" })
    }

    req.user = { userId: tokenUser.userId, role: dbUser.role, restaurantId: dbUser.restaurantId }
    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error de validación de propietario" })
  }
}

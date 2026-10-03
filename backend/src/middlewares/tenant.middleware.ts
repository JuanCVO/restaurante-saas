import { Request, Response, NextFunction } from "express"

// authMiddleware ya trajo el restaurante real del usuario desde la base
export const sameRestaurant = (req: Request, res: Response, next: NextFunction) => {
  const tokenUser = req.user
  if (!tokenUser?.restaurantId) {
    return res.status(401).json({ message: "No autenticado" })
  }

  const claimed = req.params.restaurantId ?? req.body?.restaurantId
  if (!claimed) {
    return res.status(400).json({ message: "restaurantId requerido" })
  }

  if (tokenUser.restaurantId !== claimed) {
    return res.status(403).json({ message: "No tienes acceso a este restaurante" })
  }

  next()
}

export const ownsResource = (
  fetchOwner: (id: string) => Promise<{ restaurantId: string } | null>
) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenUser = req.user
    if (!tokenUser?.restaurantId) return res.status(401).json({ message: "No autenticado" })

    const id = req.params.id as string
    if (!id) return res.status(400).json({ message: "id requerido" })

    const resource = await fetchOwner(id)
    if (!resource) return res.status(404).json({ message: "Recurso no encontrado" })

    if (resource.restaurantId !== tokenUser.restaurantId) {
      return res.status(403).json({ message: "No tienes acceso a este recurso" })
    }

    next()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error de validación de propietario" })
  }
}

import { prisma } from "./prisma"

export type ActiveUser = {
  id: string
  role: "ADMIN" | "EMPLOYEE"
  restaurantId: string
}

// caché corto para no ir a la base en cada petición; forgetUser lo vacía al instante
const TTL_MS = 30_000
const MAX_ENTRIES = 5_000
const cache = new Map<string, { user: ActiveUser | null; at: number }>()

export const getActiveUser = async (id: string): Promise<ActiveUser | null> => {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.user

  const row = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, restaurantId: true, active: true },
  })
  const user = row && row.active ? { id: row.id, role: row.role, restaurantId: row.restaurantId } : null

  if (cache.size >= MAX_ENTRIES) cache.clear()
  cache.set(id, { user, at: Date.now() })
  return user
}

export const forgetUser = (id: string) => {
  cache.delete(id)
}

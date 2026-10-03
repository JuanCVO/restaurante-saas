import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"
import { env } from "../lib/env"
import { LoginSchema, CreateEmployeeSchema, ChangePasswordSchema, ResetPasswordSchema } from "../lib/validators"
import { asyncHandler } from "../lib/asyncHandler"
import { BusinessError } from "../lib/errors"
import { audit } from "../lib/audit"
import { forgetUser } from "../lib/userCache"

const TOKEN_EXPIRES_IN = "12h"
const BCRYPT_ROUNDS = 12

// Se compara igual aunque el correo no exista, para no delatar cuáles están registrados
const DUMMY_HASH = bcrypt.hashSync("contraseña-de-relleno", BCRYPT_ROUNDS)

const signToken = (userId: string, role: "ADMIN" | "EMPLOYEE", restaurantId: string) =>
  jwt.sign({ userId, role, restaurantId }, env.jwtSecret, { expiresIn: TOKEN_EXPIRES_IN })

const findUserByEmailInsensitive = (email: string) =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const data = CreateEmployeeSchema.parse(req.body)
  const adminUser = req.user
  if (!adminUser?.restaurantId) throw new BusinessError("FORBIDDEN", 401)

  const existing = await findUserByEmailInsensitive(data.email)
  if (existing) throw new BusinessError("EMAIL_TAKEN", 400)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      restaurantId: adminUser.restaurantId,
      role: "EMPLOYEE",
    },
  })

  audit(req, "employee.create", { employeeId: user.id })

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  })
})

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string
  const users = await prisma.user.findMany({
    where: { restaurantId, active: true },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  return res.json(users)
})

// Con órdenes o pagos no se puede borrar sin perder el historial: se desactiva
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string
  const adminUser = req.user
  if (!adminUser) throw new BusinessError("FORBIDDEN", 401)

  if (userId === adminUser.userId) {
    return res.status(400).json({ message: "No puedes eliminarte a ti mismo" })
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      restaurantId: true, role: true, email: true,
      _count: { select: { orders: true, employeePayments: true } },
    },
  })
  if (!target) throw new BusinessError("RESOURCE_NOT_FOUND", 404)
  if (target.restaurantId !== adminUser.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }
  if (target.role === "ADMIN") {
    return res.status(403).json({ message: "No se puede eliminar a un administrador." })
  }

  if (target._count.orders > 0 || target._count.employeePayments > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { active: false, email: `${target.email}#inactivo-${Date.now()}` },
    })
    forgetUser(userId)
    audit(req, "employee.deactivate", { employeeId: userId })
    return res.json({ message: "Empleado desactivado. Ya no puede entrar y su historial se conserva.", deactivated: true })
  }

  await prisma.user.delete({ where: { id: userId } })
  forgetUser(userId)
  audit(req, "employee.delete", { employeeId: userId })
  return res.json({ message: "Usuario eliminado" })
})

export const changeOwnPassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body)
  const userId = req.user?.userId
  if (!userId) throw new BusinessError("FORBIDDEN", 401)

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
  const ok = await bcrypt.compare(currentPassword, me?.password ?? DUMMY_HASH)
  if (!me || !ok) throw new BusinessError("WRONG_PASSWORD", 400)

  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) } })
  audit(req, "password.change")
  return res.json({ message: "Contraseña actualizada." })
})

export const resetEmployeePassword = asyncHandler(async (req: Request, res: Response) => {
  const { password } = ResetPasswordSchema.parse(req.body)
  const userId = req.params.userId as string
  const adminUser = req.user
  if (!adminUser) throw new BusinessError("FORBIDDEN", 401)

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { restaurantId: true, role: true } })
  if (!target) throw new BusinessError("RESOURCE_NOT_FOUND", 404)
  if (target.restaurantId !== adminUser.restaurantId) throw new BusinessError("FORBIDDEN", 403)
  if (target.role === "ADMIN") {
    return res.status(403).json({ message: "Tu propia contraseña se cambia desde «Mi contraseña»." })
  }

  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(password, BCRYPT_ROUNDS) } })
  audit(req, "password.reset", { employeeId: userId })
  return res.json({ message: "Contraseña actualizada." })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = LoginSchema.parse(req.body)

  const user = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
    include: { restaurant: { select: { name: true } } },
  })

  const isValidPassword = await bcrypt.compare(data.password, user?.password ?? DUMMY_HASH)
  if (!user || !user.active || !isValidPassword) throw new BusinessError("INVALID_CREDENTIALS", 401)

  const token = signToken(user.id, user.role, user.restaurantId)

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantName: user.restaurant?.name,
    },
  })
})

import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"
import { env } from "../lib/env"
import { LoginSchema, RegisterSchema, CreateEmployeeSchema } from "../lib/validators"
import { asyncHandler } from "../lib/asyncHandler"
import { BusinessError } from "../lib/errors"

const TOKEN_EXPIRES_IN = "8h"
const BCRYPT_ROUNDS = 12

const signToken = (userId: string, role: "ADMIN" | "EMPLOYEE", restaurantId: string) =>
  jwt.sign({ userId, role, restaurantId }, env.jwtSecret, { expiresIn: TOKEN_EXPIRES_IN })

const findUserByEmailInsensitive = (email: string) =>
  prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = RegisterSchema.parse(req.body)

  const existing = await findUserByEmailInsensitive(data.email)
  if (existing) throw new BusinessError("EMAIL_TAKEN", 400)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      restaurantId: data.restaurantId,
      role: "EMPLOYEE",
    },
  })

  const token = signToken(user.id, user.role, user.restaurantId)

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    },
  })
})

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const data = CreateEmployeeSchema.parse(req.body)
  const adminUser = req.user
  if (!adminUser) throw new BusinessError("FORBIDDEN", 401)

  const admin = await prisma.user.findUnique({ where: { id: adminUser.userId } })
  if (!admin) throw new BusinessError("RESOURCE_NOT_FOUND", 404)

  const existing = await findUserByEmailInsensitive(data.email)
  if (existing) throw new BusinessError("EMAIL_TAKEN", 400)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      restaurantId: admin.restaurantId,
      role: "EMPLOYEE",
    },
  })

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
    where: { restaurantId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  return res.json(users)
})

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string
  const adminUser = req.user
  if (!adminUser) throw new BusinessError("FORBIDDEN", 401)

  if (userId === adminUser.userId) {
    return res.status(400).json({ message: "No puedes eliminarte a ti mismo" })
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true },
  })
  if (!target) throw new BusinessError("RESOURCE_NOT_FOUND", 404)
  if (target.restaurantId !== adminUser.restaurantId) {
    throw new BusinessError("FORBIDDEN", 403)
  }

  await prisma.user.delete({ where: { id: userId } })
  return res.json({ message: "Usuario eliminado" })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = LoginSchema.parse(req.body)

  const user = await prisma.user.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
    include: { restaurant: { select: { name: true } } },
  })
  if (!user) throw new BusinessError("INVALID_CREDENTIALS", 401)

  const isValidPassword = await bcrypt.compare(data.password, user.password)
  if (!isValidPassword) throw new BusinessError("INVALID_CREDENTIALS", 401)

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

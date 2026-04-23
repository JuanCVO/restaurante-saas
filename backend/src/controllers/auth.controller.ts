import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { Role } from '@prisma/client'

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, restaurantId , role} = req.body

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
       res.status(400).json({ message: 'El email ya está registrado' })
       return
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, restaurantId , role}

    })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role as Role, restaurantId: user.restaurantId}
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar usuario' })
  }
}

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user
    const { name, email, password } = req.body

    const admin = await prisma.user.findUnique({ where: { id: adminUser.userId } })
    if (!admin) return res.status(404).json({ message: 'Admin no encontrado' })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ message: 'El email ya está registrado' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, restaurantId: admin.restaurantId, role: 'EMPLOYEE' },
    })

    return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
  } catch (error) {
    return res.status(500).json({ message: 'Error al crear el empleado' })
  }
}

export const listUsers = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId as string
    const users = await prisma.user.findMany({
      where: { restaurantId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return res.json(users)
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener los usuarios' })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string
    const adminUser = (req as any).user

    if (userId === adminUser.userId) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' })
    }

    await prisma.user.delete({ where: { id: userId } })
    return res.json({ message: 'Usuario eliminado' })
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el usuario' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: { restaurant: { select: { name: true } } },
    })

    if (!user) {
      res.status(401).json({ message: 'Credenciales inválidas' })
      return
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      res.status(401).json({ message: 'Credenciales inválidas' })
      return
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    )

    res.json({
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
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
}
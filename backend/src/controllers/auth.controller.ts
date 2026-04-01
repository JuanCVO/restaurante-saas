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

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
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
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurantId}
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
}
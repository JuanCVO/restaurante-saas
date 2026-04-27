"use client"

import { useEffect, useState } from "react"
import type { CurrentUser } from "@/types/api"

const USER_KEY  = "user"
const TOKEN_KEY = "token"

const readStored = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const getCurrentUser = (): CurrentUser | null =>
  readStored<CurrentUser>(USER_KEY)

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export const setSession = (token: string, user: CurrentUser) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const authHeaders = () => {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const useCurrentUser = () => {
  const [user, setUser]   = useState<CurrentUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(getCurrentUser())
    setToken(getToken())
    setReady(true)
  }, [])

  return { user, token, ready, restaurantId: user?.restaurantId ?? "" }
}

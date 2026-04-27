"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Sidebar from "@/components/ui/layout/Sidebar"
import { useCurrentUser } from "@/lib/auth"

const ADMIN_ONLY = ["/dashboard", "/inventory", "/purchases", "/employees"]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, token, ready } = useCurrentUser()

  useEffect(() => {
    if (!ready) return
    if (!token) {
      router.replace("/login")
      return
    }
    if (user?.role === "EMPLOYEE") {
      const blocked = ADMIN_ONLY.some(p => pathname.startsWith(p))
      if (blocked) router.replace("/tables")
    }
  }, [ready, token, user, pathname, router])

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden md:pt-0 pt-14">
        {children}
      </div>
    </div>
  )
}

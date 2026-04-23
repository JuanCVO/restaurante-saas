"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Sidebar from "@/components/ui/layout/Sidebar"

const ADMIN_ONLY = ["/dashboard", "/inventory", "/purchases", "/employees"]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/login")
      return
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user.role === "EMPLOYEE") {
      const blocked = ADMIN_ONLY.some(p => pathname.startsWith(p))
      if (blocked) router.replace("/tables")
    }
  }, [pathname])

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  )
}
